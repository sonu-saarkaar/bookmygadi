import codecs

content = '''import React, { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix generic Leaflet z-index overflow issues which usually spill into Modals/other sections
const leafletCssOverrides = \
  .leaflet-container {
    z-index: 0 !important;
  }
  .leaflet-pane {
    z-index: 10 !important;
  }
  .leaflet-top, .leaflet-bottom {
    z-index: 20 !important;
  }
  .leaflet-control {
    z-index: 30 !important;
  }
\;

interface LiveMapProps {
  pickup: { lat: number; lng: number } | null;
  drop?: { lat: number; lng: number } | null;
  distance?: string;
  duration?: string;
  className?: string;
  radiusCenter?: { lat: number; lng: number } | null;
  radiusKm?: number;
  showNearbyOverlay?: boolean;
  nearbyRiders?: Array<{ id: string; lat: number; lng: number; label?: string }>;
  autoCenter?: boolean;
}

export const LiveMap: React.FC<LiveMapProps> = ({
  pickup,
  drop,
  className = "",
  radiusCenter,
  radiusKm = 10,
  showNearbyOverlay = false,
  nearbyRiders = [],
  autoCenter = true
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  
  // Layers
  const groupLayerRef = useRef<L.FeatureGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    // Use Google Maps Tiles
    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,  // prevent accidental zoom scrolling
      dragging: false, // we might want to keep it false for presentation or true for interactivity. we keep true for now
    });
    
    // Enabling interaction so user can pan
    map.scrollWheelZoom.enable();
    map.dragging.enable();

    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    }).addTo(map);

    groupLayerRef.current = L.featureGroup().addTo(map);
    leafletMap.current = map;

    return () => {
      map.remove();
      leafletMap.current = null;
    };
  }, []);

  // Update Markers & Radius Circle
  useEffect(() => {
    const map = leafletMap.current;
    const group = groupLayerRef.current;
    if (!map || !group) return;

    // Clear old layers
    group.clearLayers();

    // 1. Draw 10km Radius Circle around pickup/radius center
    const center = radiusCenter || pickup;
    if (showNearbyOverlay && center) {
      const circle = L.circle([center.lat, center.lng], {
        radius: radiusKm * 1000,
        color: '#2563eb', // Next JS Blue
        weight: 2,
        fillColor: '#60a5fa',
        fillOpacity: 0.15,
        interactive: false,
      });
      group.addLayer(circle);

      // User Pin (Center highlight)
      const userHtml = \
        <div style="transform: translate(-50%, -100%); width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" fill="#1d4ed8"/>
            <circle cx="12" cy="9" r="2.5" fill="white"/>
          </svg>
        </div>\;
      const userIcon = L.divIcon({ html: userHtml, className: "bg-transparent border-none", iconSize: [0, 0] });
      group.addLayer(L.marker([center.lat, center.lng], { icon: userIcon, zIndexOffset: 1000 }));
    } 
    else if (pickup && !showNearbyOverlay) {
        // Fallback marker if just routing
        const puIcon = L.divIcon({ html: \<div style="width:16px;height:16px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 0 5px rgba(0,0,0,0.5);transform:translate(-50%,-50%);"></div>\, className: "", iconSize: [0,0]});
        group.addLayer(L.marker([pickup.lat, pickup.lng], { icon: puIcon }));
    }

    // 2. Add Nearby Riders within bounding box / radius
    if (showNearbyOverlay && center && nearbyRiders.length > 0) {
      nearbyRiders.forEach(rider => {
          
        // Check if inside circle strictly mathematically to honor "10km ke ander"
        const dist = map.distance([center.lat, center.lng], [rider.lat, rider.lng]);
        if (dist <= radiusKm * 1000) {
            const carSVG = \
              <div style="background:white; padding:4px; border-radius:50%; box-shadow:0 2px 5px rgba(0,0,0,0.2); transform: translate(-50%, -50%);">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-500">
                   <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>
                </svg>
              </div>\;
            const driverIcon = L.divIcon({ html: carSVG, className: "bg-transparent", iconSize: [0, 0] });
            group.addLayer(L.marker([rider.lat, rider.lng], { icon: driverIcon }));
        }
      });
    }

    // Fit map bounds EXACTLY to the group/circle area seamlessly with padding
    if (autoCenter && group.getLayers().length > 0) {
      // Small delay to ensure bounds are correctly retrieved after container sizing
      setTimeout(() => {
          map.fitBounds(group.getBounds(), { padding: [30, 30], animate: true, duration: 1.5 });
      }, 100);
    }
  }, [pickup, drop, radiusCenter, showNearbyOverlay, radiusKm, nearbyRiders, autoCenter]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: leafletCssOverrides }} />
      <div 
        ref={mapRef} 
        className={\w-full h-full relative isolate \\} 
        style={{ zIndex: 0 }}
      />
    </>
  );
};
'''

with codecs.open('frontend/src/components/LiveMap.tsx', 'w', 'utf-8') as f:
    f.write(content)
