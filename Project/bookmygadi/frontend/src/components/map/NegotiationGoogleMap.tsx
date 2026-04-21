import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface NegotiationGoogleMapProps {
  pickup: { lat: number; lng: number } | null;
  drop: { lat: number; lng: number } | null;
  nearbyRiders?: Array<{ id: string; lat: number; lng: number; label?: string; heading?: number }>;
  className?: string;
  radiusKm?: number;
}

type MapPoint = { lat: number; lng: number };

const isValidCoord = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isValidPoint = (
  point: { lat: number; lng: number } | null | undefined,
): point is { lat: number; lng: number } =>
  !!point && isValidCoord(point.lat) && isValidCoord(point.lng);

const calculateDistanceKm = (from: MapPoint, to: MapPoint) => {
  const earthRadiusKm = 6371;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((from.lat * Math.PI) / 180) *
      Math.cos((to.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const isAndroidWebView =
  typeof navigator !== "undefined" &&
  /Android/i.test(navigator.userAgent) &&
  (/\bwv\b/i.test(navigator.userAgent) || /BookMyGadi/i.test(navigator.userAgent));

const riderMarkerHtml = `<div class="leaflet-rider-marker">
  <div class="leaflet-rider-marker__shadow"></div>
  <div class="leaflet-rider-marker__badge">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M5 16L6.6 11.6C6.95 10.63 7.88 10 8.92 10H15.08C16.12 10 17.05 10.63 17.4 11.6L19 16" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M7.5 10L9.3 7.65C9.77 7.03 10.5 6.67 11.28 6.67H12.72C13.5 6.67 14.23 7.03 14.7 7.65L16.5 10" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round"/>
      <rect x="4.5" y="12" width="15" height="5.75" rx="2.2" fill="#ffffff"/>
      <path d="M7.25 14.9H9.2M14.8 14.9H16.75" stroke="#0f172a" stroke-width="1.6" stroke-linecap="round"/>
      <circle cx="7.9" cy="18.2" r="1.55" fill="#0f172a"/>
      <circle cx="16.1" cy="18.2" r="1.55" fill="#0f172a"/>
    </svg>
  </div>
</div>`;

const userMarkerHtml = `<div class="leaflet-user-pin">
  <span class="leaflet-user-pin__pulse"></span>
  <div class="leaflet-user-pin__core">
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 21C16.2 16.47 18.3 12.99 18.3 10.14C18.3 6.75 15.55 4 12 4C8.45 4 5.7 6.75 5.7 10.14C5.7 12.99 7.8 16.47 12 21Z" fill="#2563eb"/>
      <circle cx="12" cy="10.2" r="2.75" fill="#ffffff"/>
    </svg>
  </div>
</div>`;

const riderIcon = L.divIcon({
  html: riderMarkerHtml,
  className: "leaflet-car-icon",
  iconSize: [42, 42],
  iconAnchor: [21, 21],
});

const pickupIcon = L.divIcon({
  html: userMarkerHtml,
  className: "leaflet-user-marker",
  iconSize: [44, 44],
  iconAnchor: [22, 36],
});

const dropIcon = L.divIcon({
  html: `<div style="width:20px;height:20px;border-radius:50%;background:#ef4444;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
  className: "leaflet-custom-marker",
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

export const NegotiationGoogleMap: React.FC<NegotiationGoogleMapProps> = ({
  pickup,
  drop,
  nearbyRiders = [],
  className,
  radiusKm = 10,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const dropMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const routeBgLineRef = useRef<L.Polyline | null>(null);
  const radiusCircleRef = useRef<L.Circle | null>(null);
  const riderMarkersRef = useRef<L.Marker[]>([]);
  const resizeTimersRef = useRef<number[]>([]);
  const [mapInitError, setMapInitError] = useState<string | null>(null);

  const fitToPickupRadius = (map: L.Map, point: MapPoint) => {
    try {
      map.invalidateSize({ pan: false, animate: false });
      const zoom = radiusKm <= 3 ? 14 : radiusKm <= 6 ? 13 : radiusKm <= 10 ? 12 : 11;
      map.setView([point.lat, point.lng], zoom, {
        animate: !isAndroidWebView,
      });
    } catch (e) {}
  };

  const scheduleMapResize = (map: L.Map) => {
    const delays = [0, 150, 400, 900];
    for (const delay of delays) {
      const id = window.setTimeout(() => {
        if (mapRef.current === map) {
          try {
            map.invalidateSize({ pan: false, animate: false });
          } catch (e) {}
        }
      }, delay);
      resizeTimersRef.current.push(id);
    }
  };

  // Init map
  useEffect(() => {
    if (!mapContainer.current) return;

    const container = mapContainer.current as HTMLDivElement & { _leaflet_id?: unknown };
    if (container._leaflet_id != null) {
      container._leaflet_id = undefined;
    }

    const center: [number, number] = isValidPoint(pickup)
      ? [pickup.lat, pickup.lng]
      : [20.5937, 78.9629];

    let map: L.Map;
    try {
      map = L.map(container, {
        center,
        zoom: pickup ? 13 : 5,
        attributionControl: false,
        zoomControl: false,
        preferCanvas: false,
        zoomAnimation: !isAndroidWebView,
        fadeAnimation: !isAndroidWebView,
        markerZoomAnimation: !isAndroidWebView,
        inertia: !isAndroidWebView,
      });
      setMapInitError(null);
    } catch (error) {
      console.error("NegotiationGoogleMap initialization failed", error);
      setMapInitError("Map initialization failed");
      return;
    }

    let fallbackLayer: L.TileLayer | null = null;
    let tileErrorCount = 0;
    const primaryLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      updateWhenIdle: true,
    });
    primaryLayer.on("tileerror", () => {
      tileErrorCount += 1;
      if (tileErrorCount < 4 || fallbackLayer) return;
      fallbackLayer = L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 20,
        subdomains: "abcd",
      }).addTo(map);
      console.warn("NegotiationGoogleMap switched to fallback tile source after repeated tile errors");
    });
    primaryLayer.addTo(map);

    mapRef.current = map;
    map.whenReady(() => {
      scheduleMapResize(map);
    });

    const handleResize = () => {
      scheduleMapResize(map);
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        scheduleMapResize(map);
      }
    };
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      document.removeEventListener("visibilitychange", handleVisibility);
      resizeTimersRef.current.forEach((id) => window.clearTimeout(id));
      resizeTimersRef.current = [];
      try {
        map.remove();
      } catch (e) {}
      mapRef.current = null;
    };
  }, []);

  // Update route, markers, circle when pickup/drop change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isValidPoint(pickup)) return;

    // -- Pickup marker --
    if (pickupMarkerRef.current) {
      pickupMarkerRef.current.setLatLng([pickup.lat, pickup.lng]);
    } else {
      pickupMarkerRef.current = L.marker([pickup.lat, pickup.lng], { icon: pickupIcon }).addTo(map);
    }

    // -- Radius circle --
    if (radiusCircleRef.current) {
      radiusCircleRef.current.setLatLng([pickup.lat, pickup.lng]);
      radiusCircleRef.current.setRadius(radiusKm * 1000);
    } else {
      radiusCircleRef.current = L.circle([pickup.lat, pickup.lng], {
        radius: radiusKm * 1000,
        fillColor: "#3b82f6",
        fillOpacity: 0.12,
        color: "#2563eb",
        weight: 2,
        opacity: 0.6,
      }).addTo(map);
    }

    fitToPickupRadius(map, pickup);

    if (!isValidPoint(drop)) {
      if (dropMarkerRef.current) {
        dropMarkerRef.current.remove();
        dropMarkerRef.current = null;
      }
      if (routeBgLineRef.current) {
        routeBgLineRef.current.remove();
        routeBgLineRef.current = null;
      }
      if (routeLineRef.current) {
        routeLineRef.current.remove();
        routeLineRef.current = null;
      }
      return;
    }

    // -- Drop marker --
    if (dropMarkerRef.current) {
      dropMarkerRef.current.setLatLng([drop.lat, drop.lng]);
    } else {
      dropMarkerRef.current = L.marker([drop.lat, drop.lng], { icon: dropIcon }).addTo(map);
    }

    // Fetch route from OSRM
    const fetchRoute = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 3500);
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${drop.lng},${drop.lat}?overview=full&geometries=geojson`,
          { signal: controller.signal }
        );
        window.clearTimeout(timeoutId);
        if (!response.ok) throw new Error("Route fetch failed");
        const data = await response.json();

        if (data.routes && data.routes[0]) {
          const coordinates = data.routes[0].geometry.coordinates as [number, number][];
          const latLngs: [number, number][] = coordinates.map(([lng, lat]) => [lat, lng]);

          if (routeBgLineRef.current) {
            routeBgLineRef.current.setLatLngs(latLngs);
          } else {
            routeBgLineRef.current = L.polyline(latLngs, {
              color: "#ffffff",
              weight: 9,
              opacity: 0.95,
            }).addTo(map);
          }

          if (routeLineRef.current) {
            routeLineRef.current.setLatLngs(latLngs);
          } else {
            routeLineRef.current = L.polyline(latLngs, {
              color: "#0f172a",
              weight: 5,
              opacity: 0.9,
            }).addTo(map);
          }
        } else {
          // Fallback straight line
          drawFallbackLine(map, pickup, drop);
        }
      } catch {
        drawFallbackLine(map, pickup, drop);
      }
    };

    void fetchRoute();
  }, [pickup?.lat, pickup?.lng, drop?.lat, drop?.lng, radiusKm]);

  // Nearby riders
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isValidPoint(pickup)) return;

    // Clear old
    riderMarkersRef.current.forEach((m) => m.remove());
    riderMarkersRef.current = [];

    const markers = nearbyRiders
      .filter((rider) => calculateDistanceKm(pickup, { lat: rider.lat, lng: rider.lng }) <= radiusKm)
      .filter((rider) => isValidCoord(rider.lat) && isValidCoord(rider.lng))
      .map((rider) => L.marker([rider.lat, rider.lng], { icon: riderIcon, zIndexOffset: 500 }).addTo(map));
    riderMarkersRef.current = markers;
  }, [nearbyRiders, pickup?.lat, pickup?.lng, radiusKm]);

  const drawFallbackLine = (map: L.Map, p: { lat: number; lng: number }, d: { lat: number; lng: number }) => {
    const latLngs: [number, number][] = [
      [p.lat, p.lng],
      [d.lat, d.lng],
    ];

    if (routeBgLineRef.current) {
      routeBgLineRef.current.setLatLngs(latLngs);
    } else {
      routeBgLineRef.current = L.polyline(latLngs, {
        color: "#ffffff",
        weight: 9,
        opacity: 0.95,
      }).addTo(map);
    }

    if (routeLineRef.current) {
      routeLineRef.current.setLatLngs(latLngs);
    } else {
      routeLineRef.current = L.polyline(latLngs, {
        color: "#0f172a",
        weight: 5,
        opacity: 0.9,
      }).addTo(map);
    }
  };

  const openNavigation = () => {
    if (!isValidPoint(pickup) || !isValidPoint(drop)) return;

    const androidInterface = (window as any).AndroidInterface;
    if (androidInterface && typeof androidInterface.openNavigation === "function") {
      try {
        androidInterface.openNavigation(pickup.lat, pickup.lng, drop.lat, drop.lng);
        return;
      } catch (error) {
        console.error("Android navigation bridge failed", error);
      }
    }

    const origin = `${pickup.lat},${pickup.lng}`;
    const destination = `${drop.lat},${drop.lng}`;
    window.open(
      `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <div className={className ? `relative ${className}` : "relative w-full h-full"}>
      <div ref={mapContainer} className="w-full h-full" />
      {mapInitError ? (
        <div className="absolute inset-0 z-[1200] bg-white/95 flex items-center justify-center px-5 text-center">
          <p className="text-[11px] font-black uppercase tracking-widest text-rose-500">{mapInitError}</p>
        </div>
      ) : null}
    </div>
  );
};
