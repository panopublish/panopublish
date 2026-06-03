import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Image } from "https://deno.land/x/imagescript@1.2.15/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, access_token, ...payload } = await req.json()
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY')
    
    if (!apiKey) throw new Error("GOOGLE_MAPS_API_KEY missing")

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (action === 'publish_photo') {
      const { photo_url, latitude, longitude, heading, pitch, roll, captureTime, placeId, supabase_photo_id } = payload

      // Step 1: Start upload
      const startRes = await fetch(`https://streetviewpublish.googleapis.com/v1/photo:startUpload?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Length': '0'
        }
      })
      const startData = await startRes.json()
      if (!startRes.ok) throw new Error(startData.error?.message || 'Failed to start upload')
      const uploadUrl = startData.uploadUrl

      // Step 2: Fetch photo bytes from storage (handled server-side, no CORS issues!)
      const photoRes = await fetch(photo_url)
      if (!photoRes.ok) throw new Error(`Failed to fetch photo from storage: status ${photoRes.status}`)
      const photoBuffer = await photoRes.arrayBuffer()

      // Nadir / Logo processing
      const { nadir_type, nadir_size, nadir_pos, nadir_logo_url } = payload
      let processedBuffer = photoBuffer
      
      const typeLower = nadir_type ? nadir_type.toLowerCase().trim() : 'none'
      const posLower = nadir_pos ? nadir_pos.toLowerCase().trim() : 'btm'
      
      if (typeLower !== 'none') {
        const isTourLevelWithoutLogo = typeLower === 'tour level' && !nadir_logo_url;
        
        if (!isTourLevelWithoutLogo) {
          try {
            const image = await Image.decode(new Uint8Array(photoBuffer))
            const W = image.width
            const H = image.height
            const imgBitmap = image.bitmap
            const imgW = W
            
            const sizePercent = parseFloat(nadir_size || "13%") / 100
            const h = Math.round(H * sizePercent)
            
            const isBottom = posLower !== 'top'
            const yStart = isBottom ? (H - h) : 0
            
            let logo: any = null;
            let band: any = null;
            
            if (typeLower === 'blur' || typeLower === 'stretch blur') {
              band = new Image(W, h)
              const bandBitmap = band.bitmap
              const bandW = band.width
              
              const startByteIdx = yStart * W * 4
              const copyLen = h * W * 4
              
              // Zero-copy subarray slice to copy the bottom part of the original image
              bandBitmap.set(imgBitmap.subarray(startByteIdx, startByteIdx + copyLen))
              
              for (let y = 0; y < h; y++) {
                const factor = isBottom ? (y / h) : (1 - (y / h))
                for (let x = 0; x < W; x++) {
                  const boundaryY = isBottom ? 0 : (h - 1)
                  
                  const boundaryIdx = (boundaryY * bandW + x) * 4
                  const boundaryR = bandBitmap[boundaryIdx]
                  const boundaryG = bandBitmap[boundaryIdx + 1]
                  const boundaryB = bandBitmap[boundaryIdx + 2]
                  
                  const idx = (y * bandW + x) * 4
                  const origR = bandBitmap[idx]
                  const origG = bandBitmap[idx + 1]
                  const origB = bandBitmap[idx + 2]
                  
                  bandBitmap[idx] = Math.round(boundaryR * factor + origR * (1 - factor))
                  bandBitmap[idx + 1] = Math.round(boundaryG * factor + origG * (1 - factor))
                  bandBitmap[idx + 2] = Math.round(boundaryB * factor + origB * (1 - factor))
                  bandBitmap[idx + 3] = 255
                }
              }
              band.blur(Math.max(10, Math.round(h / 8)))
              
              // Zero-copy set back into original image bitmap
              imgBitmap.set(band.bitmap, startByteIdx)
              
            } else if (typeLower === 'tour level' && nadir_logo_url) {
              const logoRes = await fetch(nadir_logo_url)
              if (logoRes.ok) {
                const logoBuffer = await logoRes.arrayBuffer()
                logo = await Image.decode(new Uint8Array(logoBuffer))
                const D = Math.min(logo.width, logo.height)
                logo.cover(D, D)
                
                const logoBitmap = logo.bitmap
                const logoW = logo.width
                
                const R = D / 2
                for (let y = 0; y < h; y++) {
                  const targetY = yStart + y
                  const distFromPole = isBottom ? (H - 1 - targetY) : targetY
                  const r = (distFromPole / h) * R
                  
                  for (let x = 0; x < W; x++) {
                    const theta = (x / W) * 2 * Math.PI - Math.PI / 2
                    const u = Math.round(R + r * Math.cos(theta))
                    const v = Math.round(R + r * Math.sin(theta))
                    
                    if (u >= 0 && u < D && v >= 0 && v < D && r <= R) {
                      const logoIdx = (v * logoW + u) * 4
                      const logoR = logoBitmap[logoIdx]
                      const logoG = logoBitmap[logoIdx + 1]
                      const logoB = logoBitmap[logoIdx + 2]
                      const logoA = logoBitmap[logoIdx + 3]
                      
                      const borderThickness = R * 0.03
                      const imgIdx = (targetY * imgW + x) * 4
                      
                      if (r >= R - borderThickness) {
                        imgBitmap[imgIdx] = 0
                        imgBitmap[imgIdx + 1] = 0
                        imgBitmap[imgIdx + 2] = 0
                        imgBitmap[imgIdx + 3] = 255
                      } else if (logoA > 0) {
                        const origR = imgBitmap[imgIdx]
                        const origG = imgBitmap[imgIdx + 1]
                        const origB = imgBitmap[imgIdx + 2]
                        
                        const alpha = logoA / 255
                        imgBitmap[imgIdx] = Math.round(logoR * alpha + origR * (1 - alpha))
                        imgBitmap[imgIdx + 1] = Math.round(logoG * alpha + origG * (1 - alpha))
                        imgBitmap[imgIdx + 2] = Math.round(logoB * alpha + origB * (1 - alpha))
                        imgBitmap[imgIdx + 3] = 255
                      }
                    }
                  }
                }
              }
            }
            
            // Reclaim large references in the GC scope prior to WebAssembly encoding to prevent OOM
            logo = null
            band = null
            
            processedBuffer = await image.encodeJPEG(90)
          } catch (nadirErr) {
            console.error("Nadir processing failed, publishing original:", nadirErr)
          }
        }
      }

      const contentLength = processedBuffer.byteLength.toString()

      // Step 3: Upload bytes to Google
      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        body: processedBuffer,
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'image/jpeg',
          'Content-Length': contentLength
        }
      })
      if (!uploadRes.ok) {
        const errorText = await uploadRes.text()
        console.error("Google upload failed:", errorText)
        throw new Error(`Failed to upload bytes to Google: ${errorText || uploadRes.statusText}`)
      }

      // Step 4: Create photo
      const body: any = {
        uploadReference: { uploadUrl },
        pose: {
          latLngPair: { latitude, longitude },
          heading,
          pitch,
          roll
        }
      }
      if (payload.level && typeof payload.level.number === 'number' && payload.level.name) {
        body.pose.level = {
          number: payload.level.number,
          name: payload.level.name.toString().toUpperCase().slice(0, 3)
        }
      }
      if (captureTime) {
        body.captureTime = { seconds: Math.floor(new Date(captureTime).getTime() / 1000) }
      }
      if (placeId) {
        body.places = [{ placeId }]
      }

      const createRes = await fetch(`https://streetviewpublish.googleapis.com/v1/photo?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })
      const createData = await createRes.json()
      if (!createRes.ok) throw new Error(createData.error?.message || 'Failed to create photo')

      if (supabase_photo_id) {
        const { error } = await supabaseClient.from('photos').update({
          streetview_photo_id: createData.photoId?.id,
          streetview_share_link: createData.shareLink,
          streetview_status: 'PROCESSING'
        }).eq('id', supabase_photo_id)
        if (error) console.error("Error updating photo status:", error)
      }

      return new Response(JSON.stringify(createData), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'publish_photo_bytes') {
      const { photo_base64, latitude, longitude, heading, pitch, roll, captureTime, placeId, supabase_photo_id, level } = payload

      // Step 1: Start upload
      const startRes = await fetch(`https://streetviewpublish.googleapis.com/v1/photo:startUpload?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Length': '0'
        }
      })
      const startData = await startRes.json()
      if (!startRes.ok) throw new Error(startData.error?.message || 'Failed to start upload')
      const uploadUrl = startData.uploadUrl

      // Step 2: Decode JPEG bytes from base64
      const binaryString = atob(photo_base64)
      const processedBuffer = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        processedBuffer[i] = binaryString.charCodeAt(i)
      }
      const contentLength = processedBuffer.byteLength.toString()

      // Step 3: Upload bytes to Google (Server-to-Server bypasses CORS!)
      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        body: processedBuffer,
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'image/jpeg',
          'Content-Length': contentLength
        }
      })
      if (!uploadRes.ok) {
        const errorText = await uploadRes.text()
        console.error("Google upload failed:", errorText)
        throw new Error(`Failed to upload bytes to Google: ${errorText || uploadRes.statusText}`)
      }

      // Step 4: Create photo
      const body: any = {
        uploadReference: { uploadUrl },
        pose: {
          latLngPair: { latitude, longitude },
          heading,
          pitch,
          roll
        }
      }
      if (level && typeof level.number === 'number' && level.name) {
        body.pose.level = {
          number: level.number,
          name: level.name.toString().toUpperCase().slice(0, 3)
        }
      }
      if (captureTime) {
        body.captureTime = { seconds: Math.floor(new Date(captureTime).getTime() / 1000) }
      }
      if (placeId) {
        body.places = [{ placeId }]
      }

      const createRes = await fetch(`https://streetviewpublish.googleapis.com/v1/photo?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })
      const createData = await createRes.json()
      if (!createRes.ok) throw new Error(createData.error?.message || 'Failed to create photo')

      if (supabase_photo_id) {
        const { error } = await supabaseClient.from('photos').update({
          streetview_photo_id: createData.photoId?.id,
          streetview_share_link: createData.shareLink,
          streetview_status: 'PROCESSING'
        }).eq('id', supabase_photo_id)
        if (error) console.error("Error updating photo status:", error)
      }

      return new Response(JSON.stringify(createData), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'start_upload') {
      const res = await fetch(`https://streetviewpublish.googleapis.com/v1/photo:startUpload?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Length': '0'
        }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to start upload')
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'create_photo') {
      const { uploadUrl, latitude, longitude, heading, pitch, roll, captureTime, placeId, supabase_photo_id, level } = payload
      
      const body: any = {
        uploadReference: { uploadUrl },
        pose: {
          latLngPair: { latitude, longitude },
          heading,
          pitch,
          roll
        }
      }
      if (level && typeof level.number === 'number' && level.name) {
        body.pose.level = {
          number: level.number,
          name: level.name.toString().toUpperCase().slice(0, 3)
        }
      }
      if (captureTime) {
        body.captureTime = { seconds: Math.floor(new Date(captureTime).getTime() / 1000) }
      }
      if (placeId) {
        body.places = [{ placeId }]
      }

      const res = await fetch(`https://streetviewpublish.googleapis.com/v1/photo?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to create photo')

      if (supabase_photo_id) {
        const { error } = await supabaseClient.from('photos').update({
          streetview_photo_id: data.photoId?.id,
          streetview_share_link: data.shareLink,
          streetview_status: 'PROCESSING'
        }).eq('id', supabase_photo_id)
        if (error) console.error("Error updating photo status:", error)
      }

      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'update_connections') {
      const { connections } = payload
      const updatePhotoRequests = connections.map((c: any) => {
        const photo: any = {
          photoId: { id: c.streetview_photo_id },
          connections: (c.connected_ids || []).map((id: string) => ({ target: { id } }))
        }
        
        let updateMask = "connections"
        
        if (c.pose) {
          photo.pose = {
            latLngPair: {
              latitude: c.pose.latitude,
              longitude: c.pose.longitude
            },
            heading: c.pose.heading,
            pitch: c.pose.pitch,
            roll: c.pose.roll
          }
          updateMask += ",pose.latLngPair,pose.heading,pose.pitch,pose.roll"
          
          if (c.pose.level) {
            photo.pose.level = {
              number: c.pose.level.number,
              name: c.pose.level.name
            }
            updateMask += ",pose.level"
          }
        }
        
        return {
          photo,
          updateMask
        }
      })

      const res = await fetch(`https://streetviewpublish.googleapis.com/v1/photos:batchUpdate?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ updatePhotoRequests })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to update connections')

      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'get_photo_status') {
      const { streetview_photo_id } = payload
      const res = await fetch(`https://streetviewpublish.googleapis.com/v1/photo/${streetview_photo_id}?key=${apiKey}&view=BASIC`, {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to get photo status')

      let status = 'PROCESSING'
      if (data.mapsPublishStatus === 'PUBLISHED') status = 'PUBLISHED'
      else if (data.mapsPublishStatus === 'REJECTED_UNKNOWN' || data.mapsPublishStatus === 'REJECTED') status = 'FAILED'

      return new Response(JSON.stringify({ status, shareLink: data.shareLink, data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'list_photos') {
      const res = await fetch(`https://streetviewpublish.googleapis.com/v1/photos?key=${apiKey}&view=BASIC`, {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to list photos')
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'delete_photo') {
      const { streetview_photo_id } = payload
      const res = await fetch(`https://streetviewpublish.googleapis.com/v1/photo/${streetview_photo_id}?key=${apiKey}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      })
      if (!res.ok) {
        try {
          const data = await res.json()
          throw new Error(data.error?.message || 'Failed to delete photo')
        } catch (_) {
          throw new Error(`Failed to delete photo: status ${res.status}`)
        }
      }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error: any) {
    console.error("Error in streetview-publish:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
