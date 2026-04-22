import { useEffect, useMemo, useState, useRef } from "react";
import { authStore, backendApi, type Ride, type RideLocationSocketPayload, type RideMessage, type RideTracking, type UserProfile } from "@/services/backendApi";
import { LiveMap } from "@/components/LiveMap";
import { Navigation, MapPin, Search, Send, Clock, LocateFixed, MessageSquare, Car, CalendarClock } from "lucide-react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { cn } from "@/lib/utils";

interface RealtimePayload {
  event?: string;
  ride?: Ride;
  message?: RideMessage;
}

// Group types for categorizing rides
type RideGroup = "active" | "upcoming" | "past";

const distanceKm = (aLat?: number | null, aLng?: number | null, bLat?: number | null, bLng?: number | null) => {
  if ([aLat, aLng, bLat, bLng].some((v) => typeof v !== "number")) return 0;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad((bLat as number) - (aLat as number));
  const dLng = toRad((bLng as number) - (aLng as number));
  const lat1 = toRad(aLat as number);
  const lat2 = toRad(bLat as number);
  const a = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const moveDistanceMeters = (a?: { lat: number; lng: number } | null, b?: { lat: number; lng: number } | null) => {
  if (!a || !b) return Infinity;
  return distanceKm(a.lat, a.lng, b.lat, b.lng) * 1000;
};

const TrackPage = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [rides, setRides] = useState<Ride[]>([]);
  const [filterGroup, setFilterGroup] = useState<RideGroup>("active");
  const [selectedRideId, setSelectedRideId] = useState("");
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [tracking, setTracking] = useState<RideTracking | null>(null);
  const [messages, setMessages] = useState<RideMessage[]>([]);
  const [chatText, setChatText] = useState("");
  const [error, setError] = useState("");
  const [wsConnected, setWsConnected] = useState(false);
  const [weakGps, setWeakGps] = useState(false);
  const lastSentCustomerLocationRef = useRef<{ lat: number; lng: number; sentAt: number } | null>(null);
  const wsConnectedRef = useRef(false);

  const activeRides = useMemo(() => rides.filter(r => ["accepted", "arriving", "in_progress"].includes(r.status)), [rides]);
  const upcomingRides = useMemo(() => rides.filter(r => ["requested", "pending"].includes(r.status)), [rides]);
  const pastRides = useMemo(() => rides.filter(r => ["completed", "cancelled", "driver_cancelled"].includes(r.status)), [rides]);

  const displayRides = useMemo(() => {
     if (filterGroup === "active") return activeRides;
     if (filterGroup === "upcoming") return upcomingRides;
     return pastRides;
  }, [filterGroup, activeRides, upcomingRides, pastRides]);

  useEffect(() => {
    const load = async () => {
      const token = authStore.getToken();
      if (!token) return;
      try {
        const [profile, rideRows] = await Promise.all([backendApi.me(token), backendApi.listRides(token)]);
        setUser(profile);
        // sort by newest created first
        const sorted = rideRows.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setRides(sorted);
        
        const active = sorted.find((r) => ["accepted", "arriving", "in_progress"].includes(r.status));
        if (active) {
          setFilterGroup("active");
          setSelectedRideId(active.id);
          setSelectedRide(active);
        } else {
           const upcoming = sorted.find((r) => ["requested", "pending"].includes(r.status));
           if (upcoming) {
              setFilterGroup("upcoming");
              setSelectedRideId(upcoming.id);
              setSelectedRide(upcoming);
           }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load rides");
      }
    };
    load();
  }, []);

  useEffect(() => {
    const ride = rides.find((r) => r.id === selectedRideId) || null;
    setSelectedRide(ride);
  }, [selectedRideId, rides]);

  useEffect(() => {
    const token = authStore.getToken();
    if (!token || !selectedRideId) return;

    backendApi.getRideMessages(selectedRideId, token).then(setMessages).catch(() => setMessages([]));
    backendApi.getRideTracking(selectedRideId, token).then(setTracking).catch(() => setTracking(null));

    let ws: WebSocket | null = null;
    const baseWsUrl = backendApi.rideWebsocketUrl(selectedRideId);
    const wsUrl = baseWsUrl && token ? `${baseWsUrl}${baseWsUrl.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}` : null;
    if (wsUrl) {
      try {
        ws = new WebSocket(wsUrl);
        ws.onopen = () => {
          wsConnectedRef.current = true;
          setWsConnected(true);
          setError("");
        };
        ws.onclose = () => {
          wsConnectedRef.current = false;
          setWsConnected(false);
        };
        ws.onerror = () => {
          wsConnectedRef.current = false;
          setWsConnected(false);
        };
        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data) as RealtimePayload & RideLocationSocketPayload;
            if (payload.event === "ride_message_created" && payload.message) {
              setMessages((prev) => [...prev, payload.message as RideMessage]);
            }
            if (payload.event === "ride_status_updated" && payload.ride) {
              setRides((prev) => prev.map((r) => (r.id === payload.ride!.id ? payload.ride! : r)));
            }
            if ((payload.event === "location_update" || payload.type === "location_update") && payload.ride_id === selectedRideId) {
              setTracking((prev) => ({
                ...(prev || { ride_id: selectedRideId, status: selectedRide?.status || "accepted", pickup_location: selectedRide?.pickup_location || "", destination: selectedRide?.destination || "" }),
                ...(payload.driver_live_lat != null ? {
                  driver_live_lat: payload.driver_live_lat,
                  driver_live_lng: payload.driver_live_lng,
                  driver_live_accuracy: payload.driver_live_accuracy,
                  driver_live_heading: payload.driver_live_heading,
                  driver_live_updated_at: payload.driver_live_updated_at,
                } : {}),
                ...(payload.customer_live_lat != null ? {
                  customer_live_lat: payload.customer_live_lat,
                  customer_live_lng: payload.customer_live_lng,
                  customer_live_accuracy: payload.customer_live_accuracy,
                  customer_live_heading: payload.customer_live_heading,
                  customer_live_updated_at: payload.customer_live_updated_at,
                } : {}),
                ...(payload.actor === "driver" ? {
                  driver_live_lat: payload.lat ?? prev?.driver_live_lat ?? null,
                  driver_live_lng: payload.lng ?? prev?.driver_live_lng ?? null,
                  driver_live_accuracy: payload.accuracy ?? prev?.driver_live_accuracy ?? null,
                  driver_live_heading: payload.heading ?? prev?.driver_live_heading ?? null,
                  driver_live_updated_at: payload.ts ?? prev?.driver_live_updated_at ?? null,
                } : {}),
                ...(payload.actor === "customer" ? {
                  customer_live_lat: payload.lat ?? prev?.customer_live_lat ?? null,
                  customer_live_lng: payload.lng ?? prev?.customer_live_lng ?? null,
                  customer_live_accuracy: payload.accuracy ?? prev?.customer_live_accuracy ?? null,
                  customer_live_heading: payload.heading ?? prev?.customer_live_heading ?? null,
                  customer_live_updated_at: payload.ts ?? prev?.customer_live_updated_at ?? null,
                } : {}),
              }));
            }
            if (payload.event === "error" && payload.detail) {
              setError(payload.detail);
            }
          } catch {
            // ignore
          }
        };
      } catch {
        ws = null;
      }
    }

    const pull = window.setInterval(() => {
      if (wsConnectedRef.current) return;
      backendApi.getRideTracking(selectedRideId, token).then(setTracking).catch(() => undefined);
    }, 2500);

    let watchId: number | null = null;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const accuracy = position.coords.accuracy;
          const heading = typeof position.coords.heading === "number" ? position.coords.heading : null;
          setWeakGps(accuracy > 35);

          setTracking((prev) => ({
            ...(prev || { ride_id: selectedRideId, status: selectedRide?.status || "accepted", pickup_location: selectedRide?.pickup_location || "", destination: selectedRide?.destination || "" }),
            customer_live_lat: lat,
            customer_live_lng: lng,
            customer_live_accuracy: accuracy,
            customer_live_heading: heading,
            customer_live_updated_at: new Date().toISOString(),
          }));

          const lastSent = lastSentCustomerLocationRef.current;
          const movedMeters = moveDistanceMeters(lastSent ? { lat: lastSent.lat, lng: lastSent.lng } : null, { lat, lng });
          const now = Date.now();
          if (lastSent && movedMeters < 8 && now - lastSent.sentAt < 1500) {
            return;
          }

          lastSentCustomerLocationRef.current = { lat, lng, sentAt: now };
          const meta = { accuracy, heading, ts: new Date().toISOString() };

          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "customer_location", lat, lng, ...meta }));
          } else {
            backendApi.updateCustomerLocation(selectedRideId, lat, lng, token, meta).catch(() => undefined);
          }
        },
        (geoError) => {
          setWeakGps(false);
          if (geoError.code === geoError.PERMISSION_DENIED) {
            setError("Location permission denied for live tracking");
          }
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 },
      );
    }

    return () => {
      window.clearInterval(pull);
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      ws?.close();
    };
  }, [selectedRideId, selectedRide?.status, selectedRide?.pickup_location, selectedRide?.destination]);

  const sendMessage = async () => {
    const token = authStore.getToken();
    if (!token || !selectedRideId || !user || !chatText.trim()) return;
    try {
      await backendApi.sendRideMessage(
        selectedRideId,
        { message: chatText.trim(), sender_type: user.role === "driver" ? "driver" : "customer" },
        token,
      );
      setChatText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Message send failed");
    }
  };

  const mapStart = useMemo(() => {
    if (tracking?.driver_live_lat != null && tracking?.driver_live_lng != null) {
      return { lat: tracking.driver_live_lat, lng: tracking.driver_live_lng };
    }
    if (tracking?.pickup_lat != null && tracking?.pickup_lng != null) {
      return { lat: tracking.pickup_lat, lng: tracking.pickup_lng };
    }
    return null;
  }, [tracking?.driver_live_lat, tracking?.driver_live_lng, tracking?.pickup_lat, tracking?.pickup_lng]);

  const mapEnd = useMemo(() => {
    if (tracking?.customer_live_lat != null && tracking?.customer_live_lng != null) {
      return { lat: tracking.customer_live_lat, lng: tracking.customer_live_lng };
    }
    if (tracking?.destination_lat != null && tracking?.destination_lng != null) {
      return { lat: tracking.destination_lat, lng: tracking.destination_lng };
    }
    return null;
  }, [tracking?.customer_live_lat, tracking?.customer_live_lng, tracking?.destination_lat, tracking?.destination_lng]);

  const mapDistanceKm = useMemo(
    () => distanceKm(mapStart?.lat, mapStart?.lng, mapEnd?.lat, mapEnd?.lng),
    [mapStart?.lat, mapStart?.lng, mapEnd?.lat, mapEnd?.lng],
  );
  const approxMinutes = Math.max(1, Math.round((mapDistanceKm / 25) * 60));

  const dragControls = useDragControls();
  const [sheetHeight, setSheetHeight] = useState("45vh"); // Changed initial height
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragEnd = (_: any, info: any) => {
    const offset = info.offset.y;
    const velocity = info.velocity.y;

    if (offset > 50 || velocity > 500) {
      setSheetHeight("25vh"); // Snap down
    } else if (offset < -50 || velocity < -500) {
      setSheetHeight("85vh"); // Snap up
    }
  };

  return (
    <div className="relative isolate w-full h-[100vh] overflow-hidden bg-gray-50">
      
       {/* Background Map layer */}
       <div className="absolute inset-0 z-0 h-full w-full">
          <LiveMap
          pickup={mapStart}
          drop={mapEnd}
            interactive
            autoCenter
            followMarker="pickup"
            pickupHeading={tracking?.driver_live_heading}
            dropHeading={tracking?.customer_live_heading}
          pickupLabel={tracking?.pickup_location || selectedRide?.pickup_location}
          dropLabel={tracking?.destination || selectedRide?.destination}
          className="h-full w-full"
         />
       </div>

       {/* Floating Top Controls (like Tabs and Title) */}
       <div className="absolute top-0 inset-x-0 z-10 p-4 pb-0 pointer-events-none">
          <div className="pointer-events-auto flex justify-between items-end bg-white/80  p-3 rounded-2xl shadow-soft mb-3 mt-12">
            <div>
               <h1 className="text-2xl font-black text-gray-900 tracking-tight">Live Track</h1>
               <p className="text-xs font-medium text-gray-500 mt-1">Monitor trip status</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
               <LocateFixed size={20} />
            </div>
          </div>
          
          {(error || weakGps) && (
            <p className={`mb-3 rounded-xl px-4 py-3 text-xs font-medium pointer-events-auto ${error ? "border border-rose-100 bg-rose-50 text-rose-500" : "border border-amber-100 bg-amber-50 text-amber-700"}`}>
              {error || "Weak GPS detected. Refining your live location..."}
            </p>
          )}
          
          {/* Tabs */}
          <div className="flex bg-white/90  p-1 rounded-2xl mb-3 text-xs font-bold shadow-soft pointer-events-auto">
             <button 
               onClick={() => { setFilterGroup("active"); if (activeRides.length > 0) setSelectedRideId(activeRides[0].id); else setSelectedRide(null); }}
               className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 transition-all ${filterGroup === "active" ? "bg-emerald-50 text-emerald-600 shadow-sm" : "text-gray-400"}`}
             >
               <LocateFixed size={16} /> Active
             </button>
             <button 
               onClick={() => { setFilterGroup("upcoming"); if (upcomingRides.length > 0) setSelectedRideId(upcomingRides[0].id); else setSelectedRide(null); }}
               className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 transition-all ${filterGroup === "upcoming" ? "bg-emerald-50 text-emerald-600 shadow-sm" : "text-gray-400"}`}
             >
               <CalendarClock size={16} /> Upcoming
             </button>
          </div>
          
          <div className="bg-white/90  rounded-2xl shadow-soft p-3 pointer-events-auto">
            <div className="relative">
               <select 
                 value={selectedRideId} onChange={(e) => setSelectedRideId(e.target.value)} 
                 className="w-full h-12 bg-gray-50/50 rounded-xl border border-transparent focus:border-emerald-400 outline-none px-3 text-xs font-bold text-gray-900 appearance-none pb-0"
               >
                 {displayRides.length === 0 ? (
                    <option value="" disabled>No {filterGroup} rides</option>
                 ) : (
                    displayRides.map((ride) => (
                      <option key={ride.id} value={ride.id}>
                        {ride.pickup_location} → {ride.destination}
                      </option>
                    ))
                 )}
               </select>
               <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <MapPin size={16} />
               </div>
            </div>
          </div>
       </div>

      {/* Floating Bottom Sheet layer */}
      <AnimatePresence>
        {selectedRide && (
          <motion.div
            key="bottom-sheet"
            className="absolute bottom-0 inset-x-0 bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.1)] rounded-t-[32px] overflow-hidden z-40 flex flex-col touch-none"
            initial={{ y: "100%" }}
            animate={{ height: sheetHeight, y: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
          >
            {/* Drag Handle Area */}
            <div
              className="w-full pt-4 pb-2 flex justify-center items-center cursor-grab active:cursor-grabbing bg-white/95  z-10 shrink-0 border-b border-gray-50"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>

            {/* Scrollable Content inside Sheet */}
            <motion.div
              drag="y"
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              className="flex-1 overflow-y-auto overscroll-contain px-4 pb-20 pt-2 space-y-4 touch-pan-y"
              ref={containerRef}
              onPointerDown={(e) => {
                 // Prevent parent container dragging when interacting with inner scrollable areas or inputs
                 const target = e.target as HTMLElement;
                 if (target.closest('.chat-area') || target.tagName.toLowerCase() === 'input' || target.tagName.toLowerCase() === 'button' || target.tagName.toLowerCase() === 'select') {
                    e.stopPropagation();
                 }
              }}
            >
              <div className="bg-gray-900 text-white rounded-[24px] p-5 shadow-float relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
                <div className="flex justify-between items-start mb-4">
                   <div>
                     <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Ride</p>
                     <p className="text-lg font-black capitalize text-emerald-400">Live Tracking</p>
                   </div>
                   <div className="text-right">
                     <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Agreed Fare</p>
                     <p className="text-lg font-black">₹{new Intl.NumberFormat("en-IN").format(selectedRide.agreed_fare || selectedRide.requested_fare || selectedRide.estimated_fare_max || 0)}</p>
                   </div>
                </div>

                <div className="bg-white/10 rounded-xl p-3 flex justify-between items-center ">
                   <div>
                     <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Driver</p>
                     <p className="text-sm font-bold">{selectedRide.driver_name || "Pending Assignment"}</p>
                   </div>
                   <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${wsConnected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                      {wsConnected ? "Live WS" : "Polling"}
                   </div>
                </div>
              </div>

               <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-[20px] p-3 border border-gray-100 shadow-sm">
                     <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2"><Navigation size={14}/></div>
                     <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Rider Loc</p>
                     <p className="text-xs font-bold text-gray-900 truncate">
                       {tracking?.driver_live_updated_at ? new Date(tracking.driver_live_updated_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "Waiting..."}
                     </p>
                  </div>
                  <div className="bg-white rounded-[20px] p-3 border border-gray-100 shadow-sm">
                     <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2"><MapPin size={14}/></div>
                     <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Your Loc</p>
                     <p className="text-xs font-bold text-gray-900 truncate">
                       {tracking?.customer_live_accuracy != null ? `±${Math.round(tracking.customer_live_accuracy)} m` : "Locating..."}
                     </p>
                  </div>
               </div>

              <div className="bg-gray-50 rounded-[24px] overflow-hidden border border-gray-100 shadow-inner flex flex-col h-[300px] pointer-events-auto">
                <div className="p-3 border-b border-gray-200 bg-white flex items-center gap-2 shrink-0">
                   <MessageSquare size={16} className="text-emerald-500" />
                   <h2 className="text-sm font-bold text-gray-900">Live Chat</h2>
                </div>
                
                <div className="chat-area flex-1 p-4 overflow-y-auto space-y-3 overscroll-contain">
                  {messages.length === 0 && (
                     <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <MessageSquare size={32} className="mb-2 opacity-20" />
                        <p className="text-xs font-semibold">No messages yet</p>
                     </div>
                  )}
                  {messages.map((msg) => {
                     const isMe = msg.sender_type === (user?.role === 'driver' ? 'driver' : 'customer');
                     return (
                        <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                           <div className={`max-w-[80%] p-2.5 rounded-2xl text-xs font-medium ${isMe ? 'bg-emerald-500 text-white rounded-tr-sm shadow-emerald-500/20' : 'bg-white border border-gray-100 text-gray-800 shadow-sm rounded-tl-sm'}`}>
                             {msg.message}
                           </div>
                        </div>
                     );
                  })}
                </div>

                <div className="p-3 bg-white shrink-0">
                  <div className="flex items-center gap-2 bg-gray-50/50 p-1.5 rounded-[20px] focus-within:bg-gray-50 border border-gray-100 focus-within:border-emerald-200 transition-colors">
                     <input
                       type="text"
                       value={chatText}
                       onChange={(e) => setChatText(e.target.value)}
                       onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                       placeholder="Type your message..."
                       className="flex-1 bg-transparent px-3 py-2 text-xs outline-none text-gray-800 placeholder:text-gray-400"
                     />
                     <button
                       onClick={sendMessage}
                       disabled={!chatText.trim()}
                       className="h-9 w-9 rounded-[16px] bg-emerald-500 text-white flex items-center justify-center disabled:bg-gray-200 disabled:text-gray-400 transition-colors shrink-0 shadow-sm"
                     >
                       <Send size={16} className="-ml-0.5" />
                     </button>
                  </div>
                </div>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TrackPage;
