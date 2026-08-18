// Google Places & CID / Maps URL Resolution Utilities

export interface ResolvedPlace {
  name?: string;
  address?: string;
  place_id?: string;
  cid?: string;
  url?: string;
  lat?: number;
  lng?: number;
}

/**
 * Parse any user input (Google Maps URL, Place ID, Coordinates, CID, or text)
 */
export function parseMapsInput(input: string): {
  type: "url" | "place_id" | "cid" | "coords" | "text";
  placeId?: string;
  cid?: string;
  name?: string;
  lat?: number;
  lng?: number;
  raw: string;
} {
  const trimmed = (input || "").trim();
  if (!trimmed) return { type: "text", raw: "" };

  // 1. Check if input is a direct Place ID (e.g. ChIJFaVbtnerwTsR59vqVZb8MuI)
  if (/^ChIJ[a-zA-Z0-9_-]{20,}$/.test(trimmed)) {
    return { type: "place_id", placeId: trimmed, raw: trimmed };
  }

  // 2. Check if input is a numeric CID (e.g. 16299367724023995367)
  if (/^[0-9]{10,25}$/.test(trimmed)) {
    return { type: "cid", cid: trimmed, raw: trimmed };
  }

  // 3. Check if input is coordinates (e.g. "16.6934458, 74.2084837" or "16.6934458,74.2084837")
  const coordsMatch = trimmed.match(/^(-?[0-9]{1,3}\.[0-9]+)\s*,\s*(-?[0-9]{1,3}\.[0-9]+)$/);
  if (coordsMatch) {
    return {
      type: "coords",
      lat: parseFloat(coordsMatch[1]),
      lng: parseFloat(coordsMatch[2]),
      raw: trimmed,
    };
  }

  // 4. Check if input is a URL (Google Maps or shortened)
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.includes("google.com/maps") ||
    trimmed.includes("maps.app.goo.gl") ||
    trimmed.includes("goo.gl/maps")
  ) {
    let cid: string | undefined;
    let placeId: string | undefined;
    let name: string | undefined;
    let lat: number | undefined;
    let lng: number | undefined;

    // CID from URL parameter ?cid=16299367724023995367
    const cidParam = trimmed.match(/[?&]cid=([0-9]+)/);
    if (cidParam) cid = cidParam[1];

    // CID from ftid=0x...:0x...
    const ftidParam = trimmed.match(/ftid=(0x[0-9a-fA-F]+):(0x[0-9a-fA-F]+)/);
    if (ftidParam && ftidParam[2]) {
      try {
        cid = BigInt(ftidParam[2]).toString();
      } catch {}
    }

    // CID / FID from data=!1s0x...:0x...
    const dataHexMatch = trimmed.match(/!1s(0x[0-9a-fA-F]+):(0x[0-9a-fA-F]+)/);
    if (dataHexMatch && dataHexMatch[2]) {
      try {
        cid = BigInt(dataHexMatch[2]).toString();
      } catch {}
    }

    // Place ID from query_place_id=... or place_id:...
    const placeIdMatch = trimmed.match(/(?:query_place_id|place_id)[=:]\s*([a-zA-Z0-9_-]{20,})/);
    if (placeIdMatch) placeId = placeIdMatch[1];

    // Coordinates from @lat,lng
    const atCoords = trimmed.match(/@(-?[0-9.]+),(-?[0-9.]+)/);
    if (atCoords) {
      lat = parseFloat(atCoords[1]);
      lng = parseFloat(atCoords[2]);
    }

    // Coordinates from !3dlat!4dlng
    const dataCoords = trimmed.match(/!3d(-?[0-9.]+)!4d(-?[0-9.]+)/);
    if (dataCoords) {
      lat = parseFloat(dataCoords[1]);
      lng = parseFloat(dataCoords[2]);
    }

    // Place name from /maps/place/Name+Here/
    const placeNameMatch = trimmed.match(/\/maps\/place\/([^/@?]+)/);
    if (placeNameMatch) {
      try {
        name = decodeURIComponent(placeNameMatch[1].replace(/\+/g, " "));
      } catch {}
    }

    return {
      type: "url",
      cid,
      placeId,
      name,
      lat,
      lng,
      raw: trimmed,
    };
  }

  return { type: "text", raw: trimmed };
}

/**
 * Resolves location details using Google Places & Geocoder API
 */
export function resolveLocationFromInput(
  input: string,
  onResolved: (place: ResolvedPlace) => void,
  onError?: (err: string) => void
) {
  if (typeof window === "undefined" || !window.google?.maps) {
    if (onError) onError("Google Maps API not loaded");
    return;
  }

  const parsed = parseMapsInput(input);
  const placesService = new window.google.maps.places.PlacesService(document.createElement("div"));
  const geocoder = new window.google.maps.Geocoder();

  // 1. Direct Place ID
  if (parsed.placeId) {
    placesService.getDetails(
      {
        placeId: parsed.placeId,
        fields: ["place_id", "geometry", "name", "formatted_address", "url"],
      },
      (place: any, status: any) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          onResolved({
            place_id: place.place_id,
            name: place.name,
            address: place.formatted_address,
            url: place.url,
            lat: place.geometry?.location?.lat(),
            lng: place.geometry?.location?.lng(),
            cid: parsed.cid,
          });
        } else if (onError) {
          onError("Could not fetch details for Place ID");
        }
      }
    );
    return;
  }

  // 2. URL or Coordinates with Name
  if (parsed.lat && parsed.lng) {
    const lat = parsed.lat;
    const lng = parsed.lng;
    const name = parsed.name;

    // Try finding place from query if name exists near coords
    if (name) {
      placesService.findPlaceFromQuery(
        {
          query: name,
          fields: ["place_id", "name", "geometry", "formatted_address"],
          locationBias: new window.google.maps.LatLng(lat, lng),
        },
        (results: any, status: any) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && results && results[0]) {
            const res = results[0];
            onResolved({
              place_id: res.place_id,
              name: res.name || name,
              address: res.formatted_address,
              lat: res.geometry?.location?.lat() || lat,
              lng: res.geometry?.location?.lng() || lng,
              cid: parsed.cid,
            });
            return;
          }

          // Fallback to Reverse Geocoding
          geocoder.geocode({ location: { lat, lng } }, (geoResults: any, geoStatus: any) => {
            if (geoStatus === window.google.maps.GeocoderStatus.OK && geoResults && geoResults[0]) {
              const geo = geoResults[0];
              onResolved({
                place_id: geo.place_id,
                name: name,
                address: geo.formatted_address,
                lat,
                lng,
                cid: parsed.cid,
              });
            } else {
              onResolved({
                name: name,
                lat,
                lng,
                cid: parsed.cid,
              });
            }
          });
        }
      );
      return;
    }

    // Coordinates without name -> Reverse Geocode
    geocoder.geocode({ location: { lat, lng } }, (geoResults: any, geoStatus: any) => {
      if (geoStatus === window.google.maps.GeocoderStatus.OK && geoResults && geoResults[0]) {
        const geo = geoResults[0];
        onResolved({
          place_id: geo.place_id,
          name: geo.formatted_address?.split(",")[0] || `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          address: geo.formatted_address,
          lat,
          lng,
          cid: parsed.cid,
        });
      } else {
        onResolved({
          name: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          lat,
          lng,
          cid: parsed.cid,
        });
      }
    });
    return;
  }

  // 3. CID or Text Query
  const searchQuery = parsed.name || parsed.raw;
  if (!searchQuery) {
    if (onError) onError("Please enter a business name, address, or Google Maps URL");
    return;
  }

  // Try FindPlaceFromQuery first
  placesService.findPlaceFromQuery(
    {
      query: searchQuery,
      fields: ["place_id", "name", "geometry", "formatted_address"],
    },
    (results: any, status: any) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results && results[0]) {
        const res = results[0];
        placesService.getDetails(
          {
            placeId: res.place_id,
            fields: ["place_id", "geometry", "name", "formatted_address", "url"],
          },
          (placeDetail: any, detailStatus: any) => {
            if (detailStatus === window.google.maps.places.PlacesServiceStatus.OK && placeDetail) {
              onResolved({
                place_id: placeDetail.place_id,
                name: placeDetail.name,
                address: placeDetail.formatted_address,
                url: placeDetail.url,
                lat: placeDetail.geometry?.location?.lat(),
                lng: placeDetail.geometry?.location?.lng(),
                cid: parsed.cid,
              });
            } else {
              onResolved({
                place_id: res.place_id,
                name: res.name,
                address: res.formatted_address,
                lat: res.geometry?.location?.lat(),
                lng: res.geometry?.location?.lng(),
                cid: parsed.cid,
              });
            }
          }
        );
        return;
      }

      // Fallback to Geocoder
      geocoder.geocode({ address: searchQuery }, (geoResults: any, geoStatus: any) => {
        if (geoStatus === window.google.maps.GeocoderStatus.OK && geoResults && geoResults[0]) {
          const geo = geoResults[0];
          onResolved({
            place_id: geo.place_id,
            name: searchQuery,
            address: geo.formatted_address,
            lat: geo.geometry?.location?.lat(),
            lng: geo.geometry?.location?.lng(),
            cid: parsed.cid,
          });
        } else if (onError) {
          onError(`No Google Maps location found for "${searchQuery}". Try adding the city name.`);
        }
      });
    }
  );
}
