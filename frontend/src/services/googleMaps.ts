export interface GoogleAddressSuggestion {
  display_name: string;
  primary_name: string;
  secondary_name: string;
  lat: number;
  lon: number;
}

const uniqueNonEmpty = (parts: Array<string | undefined | null>): string[] => {
  const seen = new Set<string>();
  const rows: string[] = [];
  for (const part of parts) {
    const value = String(part || "").trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(value);
  }
  return rows;
};

const GOOGLE_MAPS_API_KEY = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "").trim();

const getComponent = (components: any[] | undefined, type: string): string | undefined =>
  components?.find((item) => Array.isArray(item?.types) && item.types.includes(type))?.short_name;

const isRoadLikeLabel = (value?: string | null): boolean =>
  /\b(road|rd|street|st|marg|lane|ln|nagar|chowk)\b/i.test(String(value || "").trim());

const buildPreciseGoogleLabel = (result: any): string | null => {
  const components = Array.isArray(result?.address_components) ? result.address_components : [];
  const micro = uniqueNonEmpty([
    getComponent(components, "premise"),
    getComponent(components, "subpremise"),
    getComponent(components, "point_of_interest"),
    getComponent(components, "establishment"),
    getComponent(components, "sublocality_level_3"),
    getComponent(components, "sublocality_level_2"),
    getComponent(components, "sublocality_level_1"),
    getComponent(components, "neighborhood"),
  ]);
  const macro = uniqueNonEmpty([
    getComponent(components, "locality"),
    getComponent(components, "administrative_area_level_2"),
  ]);
  const route = getComponent(components, "route");
  const exact = uniqueNonEmpty([
    ...micro.slice(0, 2),
    ...macro.slice(0, 2),
  ]);
  if (exact.length > 0) return exact.slice(0, 3).join(", ");
  if (route && !isRoadLikeLabel(macro[0])) {
    return uniqueNonEmpty([route, ...macro]).slice(0, 3).join(", ");
  }
  return null;
};

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
    const precise = buildPreciseGoogleLabel(first);
    if (precise) return precise;
    const formatted = formatGoogleResult(first);
    if (formatted.primary_name && formatted.secondary_name && formatted.primary_name !== formatted.secondary_name) {
      return `${formatted.primary_name}, ${formatted.secondary_name}`;
    }
    return formatted.display_name || formatted.primary_name || null;
  } catch {
    return null;
  }
};

export const formatPreciseReverseAddress = (
  data: any,
  fallbackLat?: number,
  fallbackLon?: number,
): string | null => {
  const addr = data?.address || {};
  const micro = uniqueNonEmpty([
    data?.name,
    addr.house_name,
    addr.building,
    addr.amenity,
    addr.shop,
    addr.office,
    addr.tourism,
    addr.leisure,
    addr.hamlet,
    addr.allotments,
    addr.neighbourhood,
    addr.suburb,
    addr.quarter,
    addr.residential,
  ]);
  const macro = uniqueNonEmpty([
    addr.city_district,
    addr.state_district,
    addr.county,
    addr.village,
    addr.town,
    addr.city,
    data?.locality,
    data?.city,
    data?.principalSubdivision,
  ]);
  const route = uniqueNonEmpty([
    addr.road,
    addr.pedestrian,
    addr.footway,
  ]).find((value) => !isRoadLikeLabel(macro[0]) || !isRoadLikeLabel(value));
  const exact = uniqueNonEmpty([
    ...micro.slice(0, 2),
    ...macro.slice(0, 2),
  ]);

  if (exact.length > 0) return exact.slice(0, 3).join(", ");
  if (route || macro.length > 0) {
    return uniqueNonEmpty([route, ...macro]).slice(0, 3).join(", ");
  }
  if (data?.display_name) return String(data.display_name).split(",").slice(0, 3).join(", ").trim();
  if (Number.isFinite(fallbackLat) && Number.isFinite(fallbackLon)) {
    return `${Number(fallbackLat).toFixed(5)}, ${Number(fallbackLon).toFixed(5)}`;
  }
  return null;
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
