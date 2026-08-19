import { supabase } from "@/integrations/supabase/client";

export interface ProgressCallback {
  (pct: number, message: string): void;
}

export interface ConvertTourResult {
  newTourId: string;
}

function calcHeading(
  from: { latitude?: number | null; longitude?: number | null },
  to: { latitude?: number | null; longitude?: number | null },
): number | null {
  if (!from?.latitude || !from?.longitude || !to?.latitude || !to?.longitude) return null;
  const dLon = to.longitude - from.longitude;
  const dLat = to.latitude - from.latitude;
  if (dLon === 0 && dLat === 0) return null;
  let h = Math.atan2(dLon, dLat) * (180 / Math.PI);
  if (h < 0) h += 360;
  return h;
}

/**
 * Clones a Google Maps tour into a new Custom Tour with all photos duplicated
 * and all connections converted into custom tour hotspots.
 */
export async function pushTourToCustom(
  sourceTourId: string,
  userId: string,
  onProgress?: ProgressCallback,
): Promise<ConvertTourResult> {
  const updateProgress = (pct: number, message: string) => {
    if (onProgress) onProgress(pct, message);
  };

  updateProgress(5, "Fetching Google Maps tour data...");

  // 1. Fetch source tour data
  const { data: sourceTour, error: tourErr } = await supabase
    .from("tours")
    .select("*")
    .eq("id", sourceTourId)
    .single();

  if (tourErr || !sourceTour) {
    throw new Error(tourErr?.message || "Failed to load source tour");
  }

  updateProgress(15, "Loading scenes, connections, and levels...");

  // 2. Fetch associated entities in parallel
  const [islandsRes, photosRes, connsRes] = await Promise.all([
    supabase.from("islands").select("*").eq("tour_id", sourceTourId),
    supabase.from("photos").select("*").eq("tour_id", sourceTourId),
    supabase.from("connections").select("*").eq("tour_id", sourceTourId),
  ]);

  if (photosRes.error) throw new Error("Failed to load photos: " + photosRes.error.message);
  if (connsRes.error) throw new Error("Failed to load connections: " + connsRes.error.message);
  if (islandsRes.error) throw new Error("Failed to load islands/levels: " + islandsRes.error.message);

  const sourceIslands = islandsRes.data || [];
  const sourcePhotos = photosRes.data || [];
  const sourceConnections = connsRes.data || [];

  updateProgress(30, "Creating new Custom Tour record...");

  // 3. Build default / inherited custom_settings for the new custom tour
  let initialCustomSettings: any = null;
  if (sourceTour.custom_settings) {
    try {
      initialCustomSettings = JSON.parse(sourceTour.custom_settings);
    } catch (_) {}
  }

  const customTourName = sourceTour.name.endsWith("Custom Tour")
    ? `${sourceTour.name} (Copy)`
    : `${sourceTour.name} (Custom Tour)`;

  const customSettingsPayload = JSON.stringify({
    branding: {
      name: initialCustomSettings?.branding?.name || sourceTour.name || "Virtual Tour",
      link: initialCustomSettings?.branding?.link || "",
      theme_color: initialCustomSettings?.branding?.theme_color || "#0277bd",
      show_watermark: initialCustomSettings?.branding?.show_watermark !== false,
      logo_url: initialCustomSettings?.branding?.logo_url || sourceTour.nadir_logo_url || "",
    },
    controls: {
      fullscreen: initialCustomSettings?.controls?.fullscreen !== false,
      zoom_in_out: initialCustomSettings?.controls?.zoom_in_out !== false,
      scroll_zoom: initialCustomSettings?.controls?.scroll_zoom !== false,
      autorotate: initialCustomSettings?.controls?.autorotate ?? false,
      autorotate_speed: initialCustomSettings?.controls?.autorotate_speed ?? 10,
    },
    whatsapp: {
      enabled: initialCustomSettings?.whatsapp?.enabled ?? false,
      phone_number: initialCustomSettings?.whatsapp?.phone_number || "",
      message: initialCustomSettings?.whatsapp?.message || "",
      position: initialCustomSettings?.whatsapp?.position || "bottom-right",
    },
    music: {
      enabled: initialCustomSettings?.music?.enabled ?? false,
      track_url: initialCustomSettings?.music?.track_url || "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3",
      track_name: initialCustomSettings?.music?.track_name || "Calm Ambient Lounge",
      volume: initialCustomSettings?.music?.volume ?? 50,
      autoplay: initialCustomSettings?.music?.autoplay !== false,
    },
  });

  // 4. Insert new Tour
  const { data: newTour, error: newTourErr } = await supabase
    .from("tours")
    .insert({
      user_id: userId,
      client_id: sourceTour.client_id,
      name: customTourName,
      type: "custom",
      status: "draft",
      has_been_published: false,
      address: sourceTour.address,
      latitude: sourceTour.latitude,
      longitude: sourceTour.longitude,
      google_place_id: sourceTour.google_place_id,
      google_place_url: sourceTour.google_place_url,
      cid: sourceTour.cid,
      nadir_type: sourceTour.nadir_type || "None",
      nadir_size: sourceTour.nadir_size || "13%",
      nadir_pos: sourceTour.nadir_pos || "btm",
      nadir_logo_url: sourceTour.nadir_logo_url,
      custom_settings: customSettingsPayload,
    } as any)
    .select("id")
    .single();

  if (newTourErr || !newTour) {
    throw new Error(newTourErr?.message || "Failed to create custom tour");
  }

  const newTourId = newTour.id;
  try {
    sessionStorage.setItem(`tour_type_${newTourId}`, "custom");
  } catch (_) {}

  // 5. Clone islands/levels (if any)
  const islandIdMap = new Map<string, string>();
  if (sourceIslands.length > 0) {
    updateProgress(45, `Duplicating ${sourceIslands.length} tour levels/islands...`);

    const islandsToInsert = sourceIslands.map((isl: any) => ({
      user_id: userId,
      tour_id: newTourId,
      name: isl.name,
      order_index: isl.order_index,
      is_level: isl.is_level,
      level_name: isl.level_name,
      level_number: isl.level_number,
      show_scene_names: isl.show_scene_names,
    }));

    const { data: insertedIslands, error: islErr } = await supabase
      .from("islands")
      .insert(islandsToInsert as any)
      .select("id, name, order_index");

    if (islErr) {
      console.warn("Failed to copy islands:", islErr);
    } else if (insertedIslands) {
      // Map old island to new island by index
      sourceIslands.forEach((oldIsl: any, idx: number) => {
        if (insertedIslands[idx]) {
          islandIdMap.set(oldIsl.id, (insertedIslands[idx] as any).id);
        }
      });
    }
  }

  // 6. Duplicate photos
  const photoIdMap = new Map<string, string>();
  const photoMapById = new Map<string, any>();
  sourcePhotos.forEach((p: any) => photoMapById.set(p.id, p));

  if (sourcePhotos.length > 0) {
    updateProgress(55, `Duplicating ${sourcePhotos.length} 360° panoramas...`);

    const photosToInsert = sourcePhotos.map((p: any) => ({
      tour_id: newTourId,
      user_id: userId,
      file_path: p.file_path,
      file_url: p.file_url,
      filename: p.filename,
      order_index: p.order_index,
      latitude: p.latitude,
      longitude: p.longitude,
      heading: p.heading,
      pitch: p.pitch,
      roll: p.roll,
      capture_time: p.capture_time,
      size_bytes: p.size_bytes,
      status: "ready",
      island_id: p.island_id ? islandIdMap.get(p.island_id) || null : null,
      streetview_status: null,
      streetview_photo_id: null,
      streetview_share_link: null,
    }));

    // Insert in batches of 50 to prevent packet size limits
    const batchSize = 50;
    const insertedPhotos: any[] = [];

    for (let i = 0; i < photosToInsert.length; i += batchSize) {
      const batch = photosToInsert.slice(i, i + batchSize);
      const batchPct = Math.round(55 + ((i + batch.length) / photosToInsert.length) * 20);
      updateProgress(batchPct, `Duplicating panoramas (${Math.min(i + batch.length, photosToInsert.length)} of ${photosToInsert.length})...`);

      const { data: resPhotos, error: pErr } = await supabase
        .from("photos")
        .insert(batch as any)
        .select("id, filename, order_index");

      if (pErr) throw new Error("Failed to duplicate photos: " + pErr.message);
      if (resPhotos) insertedPhotos.push(...resPhotos);
    }

    // Build ID map preserving order
    sourcePhotos.forEach((oldP: any, idx: number) => {
      if (insertedPhotos[idx]) {
        photoIdMap.set(oldP.id, (insertedPhotos[idx] as any).id);
      }
    });
  }

  // 7. Convert connections to Hotspots
  if (sourceConnections.length > 0) {
    updateProgress(80, `Converting ${sourceConnections.length} connections to interactive hotspots...`);

    const validConnections = sourceConnections.filter(
      (c: any) => photoIdMap.has(c.from_photo_id) && photoIdMap.has(c.to_photo_id),
    );

    const hotspotsToInsert = validConnections.map((c: any) => {
      const fromOldPhoto = photoMapById.get(c.from_photo_id);
      const targetOldPhoto = photoMapById.get(c.to_photo_id);
      let meta: any = {};
      if (c.metadata) {
        try {
          meta = JSON.parse(c.metadata);
        } catch (_) {}
      }

      // In Google tours, connection heading is geographic. Compute dynamic geographic heading from GPS if available:
      let dynamicHeading = c.heading;
      if (fromOldPhoto && targetOldPhoto) {
        const calcH = calcHeading(fromOldPhoto, targetOldPhoto);
        if (calcH !== null && !c.is_locked) {
          dynamicHeading = calcH;
        }
      }

      // Convert geographic heading to 360 image texture heading (matching the arrow direction in Google Street View)
      const fromPhotoNorthHeading = fromOldPhoto?.heading || 0;
      const arrowHeadingOnImage = Math.round(((dynamicHeading ?? 0) - fromPhotoNorthHeading + 360) % 360);

      const hotspotMeta = JSON.stringify({
        icon_type: meta.icon_type || "arrow",
        label: meta.label || targetOldPhoto?.filename || "",
        pitch: typeof meta.pitch === "number" ? meta.pitch : (c.pitch ?? -10),
        info_content: meta.info_content || "",
      });

      return {
        tour_id: newTourId,
        from_photo_id: photoIdMap.get(c.from_photo_id)!,
        to_photo_id: photoIdMap.get(c.to_photo_id)!,
        heading: arrowHeadingOnImage,
        is_locked: !!c.is_locked,
        spacing: c.spacing || "3m",
        metadata: hotspotMeta,
      };
    });

    if (hotspotsToInsert.length > 0) {
      const batchSize = 50;
      for (let i = 0; i < hotspotsToInsert.length; i += batchSize) {
        const batch = hotspotsToInsert.slice(i, i + batchSize);
        const { error: connErr } = await supabase
          .from("connections")
          .insert(batch as any);

        if (connErr) {
          console.error("Failed to insert converted hotspots batch:", connErr);
          throw new Error("Failed to create tour hotspots: " + connErr.message);
        }
      }
    }
  }

  updateProgress(100, "Custom Tour created successfully! Redirecting...");

  // Give 400ms for user to see 100% completion before returning
  await new Promise((resolve) => setTimeout(resolve, 400));

  return { newTourId };
}
