import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const leafletCssOverrides =
  ".leaflet-container { z-index: 0 !important; } .leaflet-pane { z-index: 10 !important; } .leaflet-top, .leaflet-bottom { z-index: 20 !important; } .leaflet-control { z-index: 30 !important; }";

interface LiveMapProps {
  pickup: { lat: number; lng: number } | null;
  drop?: { lat: number; lng: number } | null;
  className?: string;
  interactive?: boolean;
  pickupLabel?: string;
  dropLabel?: string;
  radiusCenter?: { lat: number; lng: number } | null;
  radiusKm?: number;
  showNearbyOverlay?: boolean;
  nearbyRiders?: Array<{ id: string; lat: number; lng: number; label?: string }>;
  autoCenter?: boolean;
  pickupHeading?: number | null;
  dropHeading?: number | null;
  followMarker?: "pickup" | "drop" | "both";
}

const createDotIcon = (color: string) =>
  L.divIcon({
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 0 10px rgba(0,0,0,0.22);transform:translate(-50%,-50%);"></div>`,
    className: "",
    iconSize: [0, 0],
  });

const createCarIcon = (heading = 0) =>
  L.divIcon({
    html: `<div style="transform: translate(-50%, -50%) rotate(${heading}deg); transition: transform 300ms linear;"><div style="background:white; padding:6px; border-radius:999px; box-shadow:0 6px 18px rgba(0,0,0,0.18);"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg></div></div>`,
    className: "bmg-car-marker",
    iconSize: [0, 0],
  });

const animateMarker = (marker: L.Marker, target: L.LatLngExpression, durationMs: number) => {
  const start = marker.getLatLng();
  const end = L.latLng(target);
  const startedAt = performance.now();
  let frameId = 0;

  const step = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / durationMs);
    const lat = start.lat + (end.lat - start.lat) * progress;
    const lng = start.lng + (end.lng - start.lng) * progress;
    marker.setLatLng([lat, lng]);
    if (progress < 1) {
      frameId = window.requestAnimationFrame(step);
    }
  };

  frameId = window.requestAnimationFrame(step);
  return () => window.cancelAnimationFrame(frameId);
};

export const LiveMap: React.FC<LiveMapProps> = ({
  pickup,
  drop,
  className = "",
  radiusCenter,
  radiusKm = 10,
  showNearbyOverlay = false,
  nearbyRiders = [],
  autoCenter = true,
  pickupHeading,
  dropHeading,
  followMarker = "both",
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.FeatureGroup | null>(null);
  const overlayLayerRef = useRef<L.FeatureGroup | null>(null);
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const dropMarkerRef = useRef<L.Marker | null>(null);
  const cleanupPickupAnimRef = useRef<(() => void) | null>(null);
  const cleanupDropAnimRef = useRef<(() => void) | null>(null);
  const hasCenteredRef = useRef(false);

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true,
      dragging: true,
    });

    map.setView([20.5937, 78.9629], 5);
    L.tileLayer("https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
      maxZoom: 20,
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
    }).addTo(map);

    markerLayerRef.current = L.featureGroup().addTo(map);
    overlayLayerRef.current = L.featureGroup().addTo(map);
    leafletMap.current = map;

    window.setTimeout(() => map.invalidateSize(), 200);

    return () => {
      cleanupPickupAnimRef.current?.();
      cleanupDropAnimRef.current?.();
      map.remove();
      leafletMap.current = null;
    };
  }, []);

  useEffect(() => {
    const map = leafletMap.current;
    const markerLayer = markerLayerRef.current;
    if (!map || !markerLayer) return;

    if (pickup) {
      if (!pickupMarkerRef.current) {
        pickupMarkerRef.current = L.marker([pickup.lat, pickup.lng], {
          icon: createCarIcon(pickupHeading ?? 0),
          zIndexOffset: 1000,
        }).addTo(markerLayer);
      } else {
        cleanupPickupAnimRef.current?.();
        cleanupPickupAnimRef.current = animateMarker(
          pickupMarkerRef.current,
          [pickup.lat, pickup.lng],
          1400,
        );
        pickupMarkerRef.current.setIcon(createCarIcon(pickupHeading ?? 0));
      }
    } else if (pickupMarkerRef.current) {
      markerLayer.removeLayer(pickupMarkerRef.current);
      pickupMarkerRef.current = null;
    }

    if (drop) {
      if (!dropMarkerRef.current) {
        dropMarkerRef.current = L.marker([drop.lat, drop.lng], {
          icon: createDotIcon("#2563eb"),
        }).addTo(markerLayer);
      } else {
        cleanupDropAnimRef.current?.();
        cleanupDropAnimRef.current = animateMarker(dropMarkerRef.current, [drop.lat, drop.lng], 1400);
        dropMarkerRef.current.setIcon(createDotIcon("#2563eb"));
      }
    } else if (dropMarkerRef.current) {
      markerLayer.removeLayer(dropMarkerRef.current);
      dropMarkerRef.current = null;
    }

    if (!autoCenter) return;

    const target =
      followMarker === "pickup"
        ? pickup
        : followMarker === "drop"
          ? drop
          : null;

    if (target) {
      map.panTo([target.lat, target.lng], { animate: true, duration: 1.2 });
      return;
    }

    if (!hasCenteredRef.current && markerLayer.getLayers().length > 0) {
      hasCenteredRef.current = true;
      window.setTimeout(() => {
        map.invalidateSize();
        map.fitBounds(markerLayer.getBounds(), { padding: [40, 40], animate: true, duration: 1.2 });
      }, 180);
    }
  }, [pickup?.lat, pickup?.lng, pickupHeading, drop?.lat, drop?.lng, dropHeading, autoCenter, followMarker]);

  useEffect(() => {
    const map = leafletMap.current;
    const overlayLayer = overlayLayerRef.current;
    if (!map || !overlayLayer) return;

    overlayLayer.clearLayers();

    const center = radiusCenter || pickup;
    if (showNearbyOverlay && center) {
      overlayLayer.addLayer(
        L.circle([center.lat, center.lng], {
          radius: radiusKm * 1000,
          color: "#2563eb",
          weight: 2,
          fillColor: "#60a5fa",
          fillOpacity: 0.15,
          interactive: false,
        }),
      );

      nearbyRiders.forEach((rider) => {
        const dist = map.distance([center.lat, center.lng], [rider.lat, rider.lng]);
        if (dist > radiusKm * 1000) return;
        overlayLayer.addLayer(
          L.marker([rider.lat, rider.lng], {
            icon: createDotIcon("#f59e0b"),
          }),
        );
      });

      if (autoCenter) {
        window.setTimeout(() => {
          map.invalidateSize();
          map.fitBounds(overlayLayer.getBounds(), { padding: [30, 30], animate: true, duration: 1.2 });
        }, 150);
      }
    }
  }, [pickup?.lat, pickup?.lng, radiusCenter?.lat, radiusCenter?.lng, showNearbyOverlay, radiusKm, nearbyRiders, autoCenter]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: leafletCssOverrides }} />
      <div
        ref={mapRef}
        className={`w-full h-full relative isolate ${className}`}
        style={{ zIndex: 0 }}
      />
    </>
  );
};
