export async function syncStreetViewConnections(supabaseClient: any, tourId: string, accessToken: string) {
  // 1. Fetch tour location fallbacks
  const { data: tour } = await supabaseClient
    .from('tours')
    .select('latitude, longitude')
    .eq('id', tourId)
    .maybeSingle();
    
  if (!tour) throw new Error("Tour not found");

  // 2. Fetch connection mappings
  const { data: connections } = await supabaseClient
    .from('connections')
    .select('*')
    .eq('tour_id', tourId);
    
  if (!connections || connections.length === 0) {
    console.log("No connections to sync for tour", tourId);
    return;
  }

  // 3. Fetch latest photos with Google photo IDs
  const { data: latestPhotos } = await supabaseClient
    .from("photos")
    .select("id, streetview_photo_id, latitude, longitude, heading, pitch, roll, island_id")
    .eq("tour_id", tourId);
    
  if (!latestPhotos) throw new Error("Failed to fetch photos");

  // 4. Fetch islands to determine floor/level mapping
  const { data: islands } = await supabaseClient
    .from("islands")
    .select("*")
    .eq("tour_id", tourId);
    
  const islandsList = islands || [];

  const svConnections: Record<string, string[]> = {};
  
  connections.forEach((conn: any) => {
    const fromP = latestPhotos.find(p => p.id === conn.from_photo_id);
    const toP = latestPhotos.find(p => p.id === conn.to_photo_id);
    if (fromP?.streetview_photo_id && toP?.streetview_photo_id) {
      if (!svConnections[fromP.streetview_photo_id]) svConnections[fromP.streetview_photo_id] = [];
      if (!svConnections[toP.streetview_photo_id]) svConnections[toP.streetview_photo_id] = [];
      
      svConnections[fromP.streetview_photo_id].push(toP.streetview_photo_id);
      svConnections[toP.streetview_photo_id].push(fromP.streetview_photo_id); // bidirectional
    }
  });

  const formattedConnections = latestPhotos
    .filter(p => p.streetview_photo_id)
    .map(p => {
      let level = undefined;
      if (p.island_id) {
        const island = islandsList.find(i => i.id === p.island_id);
        if (island?.is_level && island.level_name) {
          level = {
            number: island.level_number ?? 0,
            name: island.level_name.toString().toUpperCase().slice(0, 3)
          };
        }
      }

      return {
        streetview_photo_id: p.streetview_photo_id,
        connected_ids: Array.from(new Set((p.streetview_photo_id && svConnections[p.streetview_photo_id]) || [])),
        pose: {
          latitude: p.latitude || tour.latitude,
          longitude: p.longitude || tour.longitude,
          heading: p.heading || 0,
          pitch: p.pitch || 0,
          roll: p.roll || 0,
          level
        }
      };
    });

  if (formattedConnections.length > 0) {
    const { data: connData, error: connError } = await supabaseClient.functions.invoke("streetview-publish", {
      body: { 
        action: "update_connections", 
        access_token: accessToken,
        connections: formattedConnections
      }
    });
    
    if (connError) throw connError;
    if (connData?.error || connData?.success === false) throw new Error(connData.error || "Failed to update connections");
    
    // Mark connections as synced
    await supabaseClient.from("tours").update({ streetview_connections_synced: true } as any).eq("id", tourId);
  }
}
