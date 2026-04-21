export interface GoogleAddressSuggestion {
  display_name: string;
  primary_name: string;
  secondary_name: string;
  lat: number;
  lon: number;
}

const GOOGLE_MAPS_API_KEY = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "").trim();

const getComponent = (components: any[] | undefined, type: string): string | undefined =>
  components?.find((item) => Array.isArray(item?.types) && item.types.includes(type))?.short_name;

const formatGoogleResult = (result: any): GoogleAddressSuggestion => {
  const components = Array.isArray(result?.address_components) ? result.address_components : [];
  const primaryName =
    getComponent(components, "premise") ||
    getComponent(components, "point_of_interest") ||
    getComponent(components, "establishment") ||
    getComponent(components, "sublocality_level_1") ||
    getComponent(components, "neighborhood") ||
    getComponent(components, "route") ||
    result?.formatted_address?.split(",")?.[0]?.trim() ||
    "Unknown Location";

  const city =
    getComponent(components, "locality") ||
    getComponent(components, "administrative_area_level_2") ||
    getComponent(components, "administrative_area_level_1") ||
    "";

  const secondaryName = city || String(result?.formatted_address || "").split(",").slice(1, 3).join(",").trim();
  const location = result?.geometry?.location || {};

  return {
    display_name: String(result?.formatted_address || primaryName),
    primary_name: String(primaryName),
    secondary_name: String(secondaryName || primaryName),
    lat: Number(location.lat),
    lon: Number(location.lng),
  };
};

export const hasGoogleMapsApiKey = (): boolean => GOOGLE_MAPS_API_KEY.length > 0;

export const reverseGeocodeWithGoogle = async (
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<string | null> => {
  if (!hasGoogleMapsApiKey()) return null;

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${GOOGLE_MAPS_API_KEY}`,
      { signal },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const first = data?.results?.[0];
    if (!first) return null;
    const formatted = formatGoogleResult(first);
    if (formatted.primary_name && formatted.secondary_name && formatted.primary_name !== formatted.secondary_name) {
      return `${formatted.primary_name}, ${formatted.secondary_name}`;
    }
    return formatted.display_name || formatted.primary_name || null;
  } catch {
    return null;
  }
};

export const geocodeAddressWithGoogle = async (
  query: string,
  signal?: AbortSignal,
): Promise<GoogleAddressSuggestion[]> => {
  if (hasGoogleMapsApiKey()) {
    try {
      // Use textsearch (Places) instead of standard Geocoding, which handles autocomplete and partial matching vastly better
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}`,
        { signal },
      );
      if (res.ok) {
        const data = await res.json();
        const rows = Array.isArray(data?.results) ? data.results : [];
        if (rows.length > 0) {
          return rows.map((row: any) => {
            const loc = row.geometry?.location || {};
            return {
              display_name: String(row.formatted_address || row.name),
              primary_name: String(row.name),
              secondary_name: String(row.formatted_address || row.name).replace(String(row.name), '').replace(/^,\s*/, '').trim() || "Location",
              lat: Number(loc.lat),
              lon: Number(loc.lng),
            };
          }).filter((row) => Number.isFinite(row.lat) && Number.isFinite(row.lon)).slice(0, 8);
        }
      }
    } catch {
      console.warn("Google TextSearch failed, falling back to Photon...");
    }
  }

  // Fallback to OSM / Photon which is much better for autocomplete client-side requests and doesn't block localhost
  try {
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6&lang=en&lon=79&lat=22&zoom=5`,
      { signal },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const features = Array.isArray(data?.features) ? data.features : [];
    return features.map((item: any) => {
      const props = item.properties || {};
      const pName = props.name || props.street || props.city || props.state || "Unknown";
      const sName = [props.city, props.state, props.country].filter(Boolean).join(", ");
      return {
        display_name: `${pName}, ${sName}`,
        primary_name: pName,
        secondary_name: sName || "Location",
        lat: item.geometry.coordinates[1],
        lon: item.geometry.coordinates[0],
      };
    });
  } catch {
    return [];
  }
};
