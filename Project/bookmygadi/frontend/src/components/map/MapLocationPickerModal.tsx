import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { X, Check, MapPin, Search, ArrowLeft } from "lucide-react";
import { reverseGeocodeWithGoogle, geocodeAddressWithGoogle, GoogleAddressSuggestion } from "@/services/googleMaps";

interface MapLocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (location: { lat: number; lng: number; address: string }) => void;
  initialCoords?: { lat: number; lng: number } | null;
  title?: string;
}

const userMarkerHtml = `<div class="leaflet-user-pin">
  <span class="leaflet-user-pin__pulse"></span>
  <div class="leaflet-user-pin__core">
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 21C16.2 16.47 18.3 12.99 18.3 10.14C18.3 6.75 15.55 4 12 4C8.45 4 5.7 6.75 5.7 10.14C5.7 12.99 7.8 16.47 12 21Z" fill="#2563eb"/>
      <circle cx="12" cy="10.2" r="2.75" fill="#ffffff"/>
    </svg>
  </div>
</div>`;

const pickupIcon = L.divIcon({
  html: userMarkerHtml,
  className: "leaflet-user-marker",
  iconSize: [44, 44],
  iconAnchor: [22, 36],
});

export const MapLocationPickerModal: React.FC<MapLocationPickerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  initialCoords,
  title = "Select Map Location",
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const centralMarkerRef = useRef<L.Marker | null>(null);

  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [currentAddress, setCurrentAddress] = useState<string>("Loading address...");
  const [isDragging, setIsDragging] = useState(false);
  const [isFetchingAddress, setIsFetchingAddress] = useState(true); // Default true until first resolve

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GoogleAddressSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!isOpen) return;

    // Use a small delay so layout finishes before map init
    const timerId = setTimeout(() => {
        if (!mapContainer.current) return;
        const container = mapContainer.current;
        if ((container as any)._leaflet_id) {
          (container as any)._leaflet_id = undefined;
        }

        const defaultCenter = initialCoords || { lat: 21.1458, lng: 79.0882 };
        
        const map = L.map(container, {
          center: [defaultCenter.lat, defaultCenter.lng],
          zoom: 15,
          attributionControl: false,
          zoomControl: false,
        });

        L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
          maxZoom: 20,
        }).addTo(map);

        mapRef.current = map;
        setCurrentCoords(defaultCenter);

        // Add marker tied to map center
        const marker = L.marker([defaultCenter.lat, defaultCenter.lng], { icon: pickupIcon }).addTo(map);
        centralMarkerRef.current = marker;

        // Force a resize right after loading
        setTimeout(() => map.invalidateSize(), 200);

        map.on("movestart", () => {
          setIsDragging(true);
        });

        map.on("move", () => {
          const center = map.getCenter();
          marker.setLatLng(center);
          setCurrentCoords({ lat: center.lat, lng: center.lng });
        });

        map.on("moveend", () => {
          setIsDragging(false);
          const center = map.getCenter();
          marker.setLatLng(center);
          setCurrentCoords({ lat: center.lat, lng: center.lng });
        });

        if (!initialCoords && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              map.setView([pos.coords.latitude, pos.coords.longitude], 15);
            },
            (err) => console.warn("GPS failed", err),
            { enableHighAccuracy: true, timeout: 5000 }
          );
        }
    }, 50);

    return () => {
      clearTimeout(timerId);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isOpen]);

  // Reverse Geocode
  useEffect(() => {
    if (!isOpen || !currentCoords || isDragging) return;

    let isMounted = true;
    setIsFetchingAddress(true);

    const lat = currentCoords.lat;
    const lng = currentCoords.lng;
    
    // Using a tiny timeout to debounce movement
    const timeoutId = setTimeout(() => {
      reverseGeocodeWithGoogle(lat, lng)
        .then((addr) => {
          if (isMounted) {
            setCurrentAddress(addr || "Unknown location");
            setIsFetchingAddress(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            setCurrentAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            setIsFetchingAddress(false);
          }
        });
    }, 500);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [currentCoords, isDragging, isOpen]);

  useEffect(() => {
    if (!searchQuery.trim() || !isOpen) {
      setSuggestions([]);
      return;
    }
    
    setIsSearching(true);
    const timeoutId = setTimeout(() => {
      const abortController = new AbortController();
      geocodeAddressWithGoogle(searchQuery, abortController.signal)
        .then((res) => {
          setSuggestions(res || []);
          setIsSearching(false);
        })
        .catch((err) => {
          if (err.name !== "AbortError") {
            console.error("Geocode error", err);
            setSuggestions([]);
            setIsSearching(false);
          }
        });
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, isOpen]);

  const handleSelectSuggestion = (item: GoogleAddressSuggestion) => {
    if (!mapRef.current) return;
    mapRef.current.setView([item.lat, item.lon], 16, { animate: true });
    setSearchQuery("");
    setSuggestions([]);
  };

  const handleConfirm = () => {
    if (currentCoords && currentAddress) {
      onSelect({ lat: currentCoords.lat, lng: currentCoords.lng, address: currentAddress });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100000] flex flex-col bg-white">
      {/* Header with Search */}
      <div className="flex flex-col bg-white shadow-md z-20 relative pt-2 pb-2">
        <div className="flex items-center px-3">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 mr-2">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          
          <div className="flex-1 bg-gray-100 rounded-xl flex items-center px-3 py-2 mr-2">
            <Search className="w-4 h-4 text-gray-500 mr-2 shrink-0" />
            <input 
              className="flex-1 bg-transparent outline-none text-gray-900 placeholder:text-gray-500 text-sm font-bold placeholder:font-medium"
              placeholder="Search destination on map..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="p-1 hover:bg-gray-200 rounded-full text-gray-500 ml-1">
                <X className="w-4 h-4" />
              </button>
            )}
            {isSearching && <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin ml-2 shrink-0" />}
          </div>
        </div>
        
        {/* Full screen suggestions dropdown when typing */}
        {suggestions.length > 0 && searchQuery && (
           <div className="absolute top-full left-0 right-0 max-h-[60vh] bg-white overflow-y-auto border-t border-gray-100 shadow-xl flex flex-col z-50 rounded-b-3xl">
             {suggestions.map((item, i) => (
               <div 
                 key={i} 
                 className="px-5 py-3 border-b border-gray-100 last:border-0 flex items-center gap-4 hover:bg-gray-50 active:bg-gray-100 cursor-pointer"
                 onClick={() => handleSelectSuggestion(item)}
               >
                 <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                   <MapPin className="w-4 h-4 text-blue-600" />
                 </div>
                 <div className="flex-1 min-w-0">
                   <p className="text-[15px] font-bold text-gray-900 truncate tracking-tight">{item.primary_name}</p>
                   <p className="text-[13px] font-medium text-gray-500 truncate">{item.secondary_name}</p>
                 </div>
               </div>
             ))}
           </div>
        )}
      </div>

      {/* Map Area */}
      <div className="flex-1 relative bg-gray-100 w-full z-10">
        <div ref={mapContainer} className="w-full h-full inset-0 absolute overflow-hidden" />
      </div>

      {/* Footer address confirmation */}
      <div className="bg-white p-6 rounded-t-[32px] shadow-[0_-15px_40px_rgba(0,0,0,0.12)] z-20 relative mt-[-20px] pb-10">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100 shadow-sm mt-1">
            <MapPin className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0 pr-2">
            <h4 className="text-[10px] uppercase tracking-[0.15em] font-extrabold text-blue-600 mb-1">
              {isDragging ? "Moving Pin..." : "Selected Location"}
            </h4>
            <p className="text-[15px] font-bold text-gray-900 leading-snug line-clamp-2 break-words">
              {isFetchingAddress ? "Locating..." : currentAddress}
            </p>
          </div>
        </div>

        <button
          onClick={handleConfirm}
          disabled={isDragging || isFetchingAddress || !currentCoords}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-50 disabled:opacity-100 text-white font-extrabold py-4 px-6 rounded-2xl transition duration-200 shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 text-[16px] active:scale-[0.98] mb-4"
        >
          <Check className="w-5 h-5" /> 
          {isDragging ? "Drop Pin First" : "Confirm Destination"}
        </button>
      </div>
    </div>
  );
};
