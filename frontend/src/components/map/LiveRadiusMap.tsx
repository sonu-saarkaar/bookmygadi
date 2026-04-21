import React, { useEffect, useState, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { authStore } from "@/services/backendApi";
import { resolveApiBaseUrl } from "@/services/network";
import { Crosshair } from "lucide-react";

interface RadarDriver {
  id: string;
  lat: number;
  lng: number;
  distance: number;
  type: string;
  eta_mins: number;
}

// Vehicle emojis/icons
const getVehicleSvg = (type: string) => {
  const emoji = type === "bike" ? "🏍️" : type === "auto" ? "🛺" : "🚗";
  return `<div style="font-size:24px;line-height:1;text-align:center;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">${emoji}</div>`;
};

const createVehicleIcon = (type: string) =>
  L.divIcon({
    html: getVehicleSvg(type),
    className: "leaflet-vehicle-emoji",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

const userLocationIcon = L.divIcon({
  html: `<div style="width:24px;height:24px;position:relative;">
    <div style="position:absolute;inset:-4px;border-radius:50%;border:3px solid #10b981;opacity:0.4;animation:pulse 2s infinite;"></div>
    <div style="width:24px;height:24px;border-radius:50%;background:#10b981;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>
  </div>`,
  className: "leaflet-user-marker",
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// 10 KM coverage
const RADIUS_METERS = 10000;

export const LiveRadiusMap: React.FC = () => {
  const apiBaseUrl = resolveApiBaseUrl(import.meta.env.VITE_API_URL);
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const radiusCircleRef = useRef<L.Circle | null>(null);
  const driverMarkersRef = useRef<L.Marker[]>([]);
  const resizeTimersRef = useRef<number[]>([]);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [drivers, setDrivers] = useState<RadarDriver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<RadarDriver | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [mapInitError, setMapInitError] = useState<string | null>(null);

  const scheduleMapResize = (map: L.Map) => {
    const delays = [0, 150, 400, 900];
    for (const delay of delays) {
      const id = window.setTimeout(() => {
        if (mapRef.current === map) {
          map.invalidateSize({ pan: false, animate: false });
        }
      }, delay);
      resizeTimersRef.current.push(id);
    }
  };

  const fetchNearbyDrivers = async (lat: number, lng: number) => {
    try {
      const token = authStore.getToken();
      const res = await fetch(`${apiBaseUrl}/api/v1/radar/nearby?lat=${lat}&lng=${lng}&radius_km=10`, {
        headers: {
          Authorization: `Bearer ${token || ""}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setDrivers(data.drivers || []);
      }
    } catch (e) {
      console.error("Failed to fetch drivers", e);
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    const container = mapContainer.current as HTMLDivElement & { _leaflet_id?: unknown };
    if (container._leaflet_id != null) {
      container._leaflet_id = undefined;
    }

    let map: L.Map;
    try {
      map = L.map(container, {
        center: [21.1458, 79.0882],
        zoom: 13,
        attributionControl: false,
        zoomControl: true,
        preferCanvas: true,
      });
      setMapInitError(null);
    } catch (error) {
      console.error("LiveRadiusMap initialization failed", error);
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
      console.warn("LiveRadiusMap switched to fallback tile source after repeated tile errors");
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
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Get user location
  useEffect(() => {
    let watchId: number | null = null;
    let nativeInterval: number | null = null;

    const handleLocationUpdate = (lat: number, lng: number) => {
      setUserLocation({ lat, lng });
      fetchNearbyDrivers(lat, lng);
      setErrorMsg("");
    };

    const handleDefaultLocation = () => {
      const defaultLat = 21.1458;
      const defaultLng = 79.0882;
      setUserLocation({ lat: defaultLat, lng: defaultLng });
      fetchNearbyDrivers(defaultLat, defaultLng);
      setErrorMsg("Location unavailable. Drag marker to set location.");
    };

    const detectLocation = (forceBrowser = false) => {
      // 1. Try Android Native Bridge
      const androidInterface = (window as any).AndroidInterface;
      if (androidInterface && typeof androidInterface.getNativeLocation === "function" && !forceBrowser) {
        const fetchNative = () => {
          try {
            const locStr = androidInterface.getNativeLocation();
            if (locStr && locStr !== "null") {
              const { lat, lng } = JSON.parse(locStr);
              handleLocationUpdate(lat, lng);
              return true;
            }
          } catch (e) {
            console.error("Native location fetch failed", e);
          }
          return false;
        };

        if (fetchNative()) {
          // Poll native location every 4 seconds for live updates
          nativeInterval = window.setInterval(fetchNative, 4000);
          return;
        }
      }

      // 2. Browser Geolocation - ONLY if forced by user click
      if (forceBrowser) {
        if (navigator.geolocation) {
          setErrorMsg("Requesting GPS...");
          watchId = navigator.geolocation.watchPosition(
            (pos) => {
              handleLocationUpdate(pos.coords.latitude, pos.coords.longitude);
            },
            (err) => {
              console.warn("Geolocation watch error", err);
              setErrorMsg("GPS Permission Denied");
              if (!userLocation) handleDefaultLocation();
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
          );
        } else {
          handleDefaultLocation();
        }
      } else {
        // Silent fallback on mount if native fails
        if (!userLocation) handleDefaultLocation();
      }
    };

    detectLocation(false);

    // Expose manual trigger to window for the button
    (window as any).radarLocateMe = () => detectLocation(true);

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (nativeInterval !== null) window.clearInterval(nativeInterval);
      delete (window as any).radarLocateMe;
    };
  }, []);

  // Poll for live movements
  useEffect(() => {
    if (!userLocation) return;
    const interval = setInterval(() => {
      fetchNearbyDrivers(userLocation.lat, userLocation.lng);
    }, 5000);
    return () => clearInterval(interval);
  }, [userLocation]);

  // Update map markers when userLocation or drivers change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation) return;

    // Center map
    map.setView([userLocation.lat, userLocation.lng], 13, { animate: true });

    // User marker (draggable)
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
    } else {
      userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
        icon: userLocationIcon,
        draggable: true,
        zIndexOffset: 1000,
      }).addTo(map);

      userMarkerRef.current.on("dragend", () => {
        const pos = userMarkerRef.current?.getLatLng();
        if (pos) {
          setUserLocation({ lat: pos.lat, lng: pos.lng });
          fetchNearbyDrivers(pos.lat, pos.lng);
        }
      });
    }

    // Radius circle
    if (radiusCircleRef.current) {
      radiusCircleRef.current.setLatLng([userLocation.lat, userLocation.lng]);
    } else {
      radiusCircleRef.current = L.circle([userLocation.lat, userLocation.lng], {
        radius: RADIUS_METERS,
        fillColor: "#3b82f6",
        fillOpacity: 0.1,
        color: "#2563eb",
        weight: 2,
        opacity: 0.5,
      }).addTo(map);
    }
  }, [userLocation]);

  // Update driver markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old
    driverMarkersRef.current.forEach((m) => m.remove());
    driverMarkersRef.current = [];

    drivers.forEach((driver) => {
      if (driver.lat == null || driver.lng == null) return;
      const marker = L.marker([driver.lat, driver.lng], {
        icon: createVehicleIcon(driver.type),
        zIndexOffset: 500,
      })
        .bindPopup(
          `<div style="text-align:center;min-width:120px;padding:4px;">
            <p style="font-weight:800;color:#111;text-transform:capitalize;font-size:14px;margin:0 0 4px;">${driver.type}</p>
            <p style="font-weight:600;color:#10b981;font-size:12px;margin:0 0 2px;">ETA: ${driver.eta_mins} mins</p>
            <p style="font-weight:700;color:#6b7280;font-size:10px;text-transform:uppercase;margin:0;">${driver.distance.toFixed(1)} KM away</p>
          </div>`,
          { closeButton: false }
        )
        .on("click", () => setSelectedDriver(driver))
        .addTo(map);
      driverMarkersRef.current.push(marker);
    });
  }, [drivers]);

  const nearestDrivers = useMemo(() => {
    return [...drivers].sort((a, b) => a.distance - b.distance).slice(0, 3);
  }, [drivers]);

  return (
    <div className="relative w-full h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Floating Badges */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] flex flex-col items-center gap-2">
        <div className="bg-white/90 backdrop-blur-md px-6 py-3 rounded-full shadow-lg border border-gray-100 flex items-center gap-3 animate-fade-in-down">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-gray-800 tracking-tight">10 KM Radius</span>
          <span className="text-gray-300">•</span>
          <span className="font-extrabold text-blue-600">{drivers.length} Vehicles Nearby</span>
        </div>

        {errorMsg && (
          <div className="bg-rose-500/90 text-white px-4 py-2 rounded-full text-[10px] font-black shadow-md border border-rose-400">
            {errorMsg}
          </div>
        )}

        {!userLocation && (
          <button 
            onClick={() => (window as any).radarLocateMe?.()}
            className="bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl font-black text-xs flex items-center gap-2 animate-bounce"
          >
            <Crosshair size={16} />
            Locate Me to See Vehicles
          </button>
        )}
      </div>

      <div className="flex-1 w-full relative">
        <div ref={mapContainer} className="w-full h-full" />
        {mapInitError ? (
          <div className="absolute inset-0 z-[1200] bg-white/95 flex items-center justify-center px-5 text-center">
            <p className="text-[11px] font-black uppercase tracking-widest text-rose-500">{mapInitError}</p>
          </div>
        ) : null}
      </div>

      {/* Nearest Drivers Highlight Panel */}
      <div className="absolute bottom-6 w-full px-6 flex justify-center pointer-events-none z-[1000]">
        <div className="bg-white/95 backdrop-blur-xl pointer-events-auto rounded-[24px] shadow-2xl p-4 w-full max-w-sm border border-white/40">
          <h3 className="font-black text-gray-900 text-sm mb-3 uppercase tracking-wider text-center">Fastest Available</h3>
          <div className="flex gap-3 overflow-x-auto pb-1 hide-scrollbar">
            {nearestDrivers.length === 0 ? (
              <div className="w-full text-center text-gray-400 text-xs font-bold py-2">Searching area...</div>
            ) : (
              nearestDrivers.map((driver) => (
                <div
                  key={driver.id}
                  className="min-w-[100px] flex-1 bg-gray-50 rounded-xl p-3 flex flex-col items-center justify-center border border-gray-100 hover:border-emerald-200 transition-colors cursor-pointer"
                  onClick={() => {
                    const map = mapRef.current;
                    if (map) map.setView([driver.lat, driver.lng], 15, { animate: true });
                    setSelectedDriver(driver);
                  }}
                >
                  <div className="text-2xl">{driver.type === "bike" ? "🏍️" : driver.type === "auto" ? "🛺" : "🚗"}</div>
                  <div className="text-xs font-black text-emerald-600 mt-2">{driver.eta_mins} min</div>
                  <div className="text-[10px] font-bold text-gray-400 mt-0.5">{driver.distance.toFixed(1)} km</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
