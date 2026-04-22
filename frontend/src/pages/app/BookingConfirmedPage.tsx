import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { authStore, backendApi, type Ride, type RideTracking, type RideMessage } from "@/services/backendApi";
import { notifyEvent, playSound } from "@/services/notificationCenter";
import { MapPin, Navigation, Phone, MessageSquare, ShieldAlert, CheckCircle2, Wallet, X, ChevronUp, ChevronDown, AlertTriangle, MessageCircle, User, Send, Menu } from "lucide-react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { LiveMap } from "@/components/LiveMap";
import { formatBookingDateTime, formatBookingTimeOnly } from "@/utils/datetime";

interface BookingState {
   rideId: string;
   pickup: string;
   destination: string;
   vehicleType: string;
   offerPrice: number;
   bookedAt?: string;
}
type SheetSnap = "up" | "mid" | "down";
const ACTIVE_BOOKING_STORAGE_KEY = "bmg_active_booking";
const ACTIVE_BOOKING_TOKEN_STORAGE_KEY = "bmg_active_booking_customer_token";

const readStoredBooking = (): BookingState | null => {
  const raw = localStorage.getItem(ACTIVE_BOOKING_STORAGE_KEY) || sessionStorage.getItem(ACTIVE_BOOKING_STORAGE_KEY); if (!raw) return null;
  try { return JSON.parse(raw) as BookingState; } catch { return null; }
};

const toRad = (v: number) => (v * Math.PI) / 180;
const distanceKm = (lat1?: number | null, lon1?: number | null, lat2?: number | null, lon2?: number | null) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371; const dLat = toRad(lat2 - lat1); const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); return R * c;
};

const BookingConfirmedPage = () => {
  const navigate = useNavigate(); const { state } = useLocation();
  const { bookingId = "" } = useParams();
  const payloadFromRoute = state as BookingState | null; const payload = payloadFromRoute || readStoredBooking();
  const safePayload = payload || { rideId: "", pickup: "", destination: "", vehicleType: "", offerPrice: 0 };
  const routeBookingId = decodeURIComponent(bookingId || "").trim();
  const [resolvedRideId, setResolvedRideId] = useState(safePayload.rideId || "");
  const [ride, setRide] = useState<Ride | null>(null); const [tracking, setTracking] = useState<RideTracking | null>(null);
  const effectiveRideId = resolvedRideId || safePayload.rideId || "";
  
  const fare = ride?.agreed_fare || ride?.estimated_fare_max || safePayload.offerPrice;
  const [notice, setNotice] = useState("");
  const [showVehicleDetails, setShowVehicleDetails] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [fabMenuState, setFabMenuState] = useState<"hidden" | "main" | "complaint">("hidden");
  const sosClicksRef = useRef({ count: 0, lastTime: 0 });
   const terminalNavigationRef = useRef(false);
  const [chatText, setChatText] = useState("");
  const [messages, setMessages] = useState<RideMessage[]>([]);
   const [sheetHeight, setSheetHeight] = useState("45%"); // Snap to height directly
   const sheetRef = useRef<HTMLDivElement | null>(null);
   const sheetDragControls = useDragControls();

   useEffect(() => {
     if (!safePayload.rideId && !routeBookingId) {
       navigate("/app/home", { replace: true });
     }
   }, [safePayload.rideId, routeBookingId, navigate]);

  useEffect(() => {
    const token = localStorage.getItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY) || sessionStorage.getItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY) || authStore.getToken();
    if (!token) return;
    if (safePayload.rideId && !resolvedRideId) {
      setResolvedRideId(safePayload.rideId);
      return;
    }
    if (!routeBookingId || resolvedRideId) return;

    backendApi.listRides(token).then((rows) => {
      const found = rows.find((row) => row.booking_display_id === routeBookingId || row.id === routeBookingId);
      if (!found) {
        navigate("/app/home", { replace: true });
        return;
      }
      setResolvedRideId(found.id);
      setRide(found);
      const nextPayload = {
        rideId: found.id,
        pickup: found.pickup_location,
        destination: found.destination,
        vehicleType: found.vehicle_type,
        offerPrice: found.agreed_fare || found.estimated_fare_max || found.estimated_fare_min || safePayload.offerPrice || 0,
        bookedAt: found.created_at,
      };
      localStorage.setItem(ACTIVE_BOOKING_STORAGE_KEY, JSON.stringify(nextPayload));
      sessionStorage.setItem(ACTIVE_BOOKING_STORAGE_KEY, JSON.stringify(nextPayload));
    }).catch(() => undefined);
  }, [routeBookingId, resolvedRideId, safePayload.rideId, safePayload.offerPrice, navigate]);

  const handleDragEnd = (_: any, info: any) => {
    const offset = info.offset.y;
    const velocity = info.velocity.y;

    if (offset > 50 || velocity > 500) {
      setSheetHeight("25%"); // Snap down
    } else if (offset < -50 || velocity < -500) {
      setSheetHeight("85%"); // Snap up
    }
  };
  
   const riderName = ride?.driver_name || "Assigning Rider...";
  const rideStatus = (ride?.status || "").toLowerCase();
  const isRideStarted = rideStatus === "in_progress" || rideStatus === "completed"; 
  const isRideCompleted = rideStatus === "completed";
   const riderId = ride?.driver_id ? `R${ride.driver_id.slice(-4).toUpperCase()}` : `R0${safePayload.rideId.slice(-2)}`;
   const bookedAtLabel = formatBookingDateTime(ride?.created_at || safePayload.bookedAt);
   
   // Fallback to preference if driver's actual vehicle details are not available yet
   const modelLabel = ride?.driver_vehicle_details?.model || ride?.preference?.vehicle_model || ride?.vehicle_type || safePayload.vehicleType;
   const colorLabel = ride?.driver_vehicle_details?.color || ride?.preference?.preferred_color || "-";
   const conditionLabel = ride?.driver_vehicle_details?.condition || ride?.preference?.vehicle_condition || "-";
   const seaterLabel = ride?.driver_vehicle_details?.seater ? `${ride.driver_vehicle_details.seater}` : (ride?.preference?.seater_required ? `${ride.preference.seater_required}` : "-");
   const vehicleNumberLabel = ride?.driver_vehicle_details?.number || (ride?.id ? `BMG-${ride.id.slice(-4).toUpperCase()}` : "-");

   const plannedDistanceKm = useMemo(() => {
      if (!tracking) return null;
      return distanceKm(tracking.pickup_lat, tracking.pickup_lng, tracking.destination_lat, tracking.destination_lng);
   }, [tracking]);
   const etaMins = useMemo(() => {
      if (plannedDistanceKm == null) return null;
      return Math.max(2, Math.round(plannedDistanceKm * 3.5));
   }, [plannedDistanceKm]);

  // Stepper logic
  const stepIndex = useMemo(() => {
    if (rideStatus === "accepted") return 1; 
    if (rideStatus === "arriving") return 2; 
    if (rideStatus === "in_progress") return 3; 
    if (rideStatus === "completed") return 4; 
    return 0; // Searching/Requested
  }, [rideStatus]);

  const advanceAmount = Math.round(fare * 0.3);
  const isAdvancePaid = ride?.preference?.advance_payment_status === "paid";

  const formatTime = (isoString?: string | null) => {
     return formatBookingTimeOnly(isoString);
   };

  const steps = [
    { label: "Request", short: "Searching", time: formatTime(ride?.created_at) },
    { label: "Accepted", short: "Accepted", time: formatTime(ride?.accepted_at) },
    { label: "Arriving", short: "ArriveSoon", time: formatTime(ride?.arrived_at) },
    { label: "Started", short: "Ride Start", time: formatTime(ride?.started_at) },
    { label: "Completed", short: "Completed", time: formatTime(ride?.completed_at) },
  ];

   useEffect(() => {
      if (!effectiveRideId) { navigate("/app/home", { replace: true }); return; }
      const token = localStorage.getItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY) || sessionStorage.getItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY) || authStore.getToken();
      if (!token) return;
    const load = async () => {
      try {
            const [found, track] = await Promise.all([
               backendApi.getRide(effectiveRideId, token),
               backendApi.getRideTracking(effectiveRideId, token).catch(() => null),
            ]);
            if (found) setRide(found);
            if (track) setTracking(track);
      } catch { }
    };
      load();

      let ws: WebSocket | null = null;
      const wsUrl = backendApi.rideWebsocketUrl(effectiveRideId);
      if (wsUrl) {
         try {
            ws = new WebSocket(wsUrl);
            ws.onmessage = (event) => {
               try {
                  const data = JSON.parse(event.data);
                  if ((data.event === "ride_status_updated" || data.event === "ride_created") && data.ride) {
                     setRide(data.ride);
                  } else if (data.event === "chat_message_created" && data.message) {
                     setMessages(m => [...m, data.message]);
                     if (data.message.sender_type !== "customer") {
                        notifyEvent({ event: "searching", title: "New Message", body: "Driver sent a message", tag: `chat-${effectiveRideId}` }).catch(() => undefined);
                        if (!showChat) setNotice("New message from Driver");
                     }
                  }
               } catch {
                  // ignore malformed realtime messages
               }
            };
         } catch {
            ws = null;
         }
      }

      const loadChat = async () => {
        try {
          const msgs = await backendApi.getRideMessages(effectiveRideId, token);
          setMessages(msgs);
        } catch { }
      };
      if (showChat) loadChat();

    // Also poll overall ride status. E.g. what happens if a ride is marked 'completed' while in this view?
    const checkCompletion = async () => {
       try {
          const r = await backendApi.getRide(effectiveRideId, token);
               if (r.status === 'completed' || r.status === 'cancelled') {
             localStorage.removeItem(ACTIVE_BOOKING_STORAGE_KEY);
             sessionStorage.removeItem(ACTIVE_BOOKING_STORAGE_KEY);
             localStorage.removeItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY);
             sessionStorage.removeItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY);
                      if (r.status === 'cancelled') {
                         navigate('/app/booking-cancelled', { replace: true, state: { ...safePayload, status: 'cancelled', reason: 'Ride cancelled' } });
                      } else {
                         navigate(`/app/payment/${effectiveRideId}`, { replace: true, state: { rideId: effectiveRideId } });
                      }
          }
       } catch {}
    };

    const id = window.setInterval(() => {
       load(); 
       checkCompletion();
       if (showChat) loadChat(); 
    }, 3000);
      return () => {
         window.clearInterval(id);
         ws?.close();
      };
   }, [navigate, effectiveRideId, showChat]);

   useEffect(() => {
      if (!ride || !effectiveRideId || terminalNavigationRef.current) return;

      if (rideStatus === "cancelled" || rideStatus === "canceled") {
         terminalNavigationRef.current = true;
         localStorage.removeItem(ACTIVE_BOOKING_STORAGE_KEY);
         sessionStorage.removeItem(ACTIVE_BOOKING_STORAGE_KEY);
         localStorage.removeItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY);
         sessionStorage.removeItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY);
         navigate('/app/booking-cancelled', { replace: true, state: { ...safePayload, status: 'cancelled', reason: 'Ride cancelled' } });
         return;
      }

      if (rideStatus === "rejected") {
         terminalNavigationRef.current = true;
         localStorage.removeItem(ACTIVE_BOOKING_STORAGE_KEY);
         sessionStorage.removeItem(ACTIVE_BOOKING_STORAGE_KEY);
         localStorage.removeItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY);
         sessionStorage.removeItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY);
         navigate('/app/booking-rejected', { replace: true, state: { ...safePayload, status: 'rejected' } });
         return;
      }

      if (rideStatus === "completed") {
         terminalNavigationRef.current = true;
         localStorage.removeItem(ACTIVE_BOOKING_STORAGE_KEY);
         sessionStorage.removeItem(ACTIVE_BOOKING_STORAGE_KEY);
         localStorage.removeItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY);
         sessionStorage.removeItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY);
         navigate(`/app/payment/${effectiveRideId}`, { replace: true, state: { rideId: effectiveRideId } });
      }
   }, [ride, rideStatus, safePayload, effectiveRideId, navigate]);

   useEffect(() => {
      if (!effectiveRideId || rideStatus === "cancelled" || rideStatus === "completed") return;

      let watchId: number | null = null;
      let nativeInterval: number | null = null;
      let lastSentAt = 0;

      const updateLocation = (lat: number, lng: number) => {
         const now = Date.now();
         if (now - lastSentAt < 3000) return;

         const token =
            localStorage.getItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY) ||
            sessionStorage.getItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY) ||
            authStore.getToken();
         if (!token) return;

         setTracking((prev) =>
            prev
               ? {
                    ...prev,
                    customer_live_lat: lat,
                    customer_live_lng: lng,
                  }
               : prev,
         );
         backendApi.updateCustomerLocation(effectiveRideId, lat, lng, token).catch(() => undefined);
         lastSentAt = now;
      };

      // 1. Try Native Bridge
      const androidInterface = (window as any).AndroidInterface;
      if (androidInterface && typeof androidInterface.getNativeLocation === 'function') {
         const fetchNative = () => {
            try {
               const locStr = androidInterface.getNativeLocation();
               if (locStr && locStr !== "null") {
                  const { lat, lng } = JSON.parse(locStr);
                  updateLocation(lat, lng);
               }
            } catch (e) {
               console.error("Native tracking failed", e);
            }
         };
         
         fetchNative();
         nativeInterval = window.setInterval(fetchNative, 3500);
      } else if ("geolocation" in navigator) {
         // 2. Fallback to Browser Geolocation
         watchId = navigator.geolocation.watchPosition(
            (position) => {
               updateLocation(position.coords.latitude, position.coords.longitude);
            },
            () => undefined,
            { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 },
         );
      }

      return () => {
         if (watchId != null) navigator.geolocation.clearWatch(watchId);
         if (nativeInterval != null) window.clearInterval(nativeInterval);
      };
   }, [effectiveRideId, rideStatus]);

   const sendMessage = async () => {
      if (!chatText.trim() || !safePayload.rideId) return;
      const token = localStorage.getItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY) || sessionStorage.getItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY) || authStore.getToken();
    if (!token) return;
    try {
      const msg = await backendApi.sendRideMessage(safePayload.rideId, { message: chatText.trim(), sender_type: "customer" }, token);
      setMessages(m => [...m, msg]);
      setChatText("");
    } catch {
      setNotice("Failed to send message");
    }
  };

  // Logic: Hide vehicle details once ride starts
  useEffect(() => {
    if (isRideStarted) setShowVehicleDetails(false);
  }, [isRideStarted]);



  const onCall = () => ride?.driver_phone && (window.location.href = `tel:${ride.driver_phone}`);
  const onMessage = () => setShowChat(true);

   const cancelRideFromUser = async () => {
      if (!safePayload.rideId) return;
      const shouldCancel = window.confirm("Are you sure you want to cancel this ride?");
      if (!shouldCancel) return;
      const token = localStorage.getItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY) || sessionStorage.getItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY) || authStore.getToken();
      if (!token) {
         setNotice("Session expired. Please login again.");
         return;
      }
      try {
         await backendApi.updateRideStatus(safePayload.rideId, { status: "cancelled" }, token);
         playSound("cancel");
         localStorage.removeItem(ACTIVE_BOOKING_STORAGE_KEY);
         sessionStorage.removeItem(ACTIVE_BOOKING_STORAGE_KEY);
         localStorage.removeItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY);
         sessionStorage.removeItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY);
         navigate("/app/booking-cancelled", { replace: true, state: { ...safePayload, status: "cancelled", reason: "Cancelled by user" } });
      } catch (error) {
         setNotice(error instanceof Error ? error.message : "Unable to cancel ride");
      }
   };

   const handleSOS = async () => {
      const now = Date.now();
      if (now - sosClicksRef.current.lastTime > 4000) {
         sosClicksRef.current.count = 0;
      }
      sosClicksRef.current.lastTime = now;
      sosClicksRef.current.count += 1;
      
      const remaining = 3 - sosClicksRef.current.count;
      if (remaining > 0) {
         setNotice(`⚠️ Tap ${remaining} more time(s) for SOS Alert! ⚠️`);
         playSound("confirmation"); 
         return;
      }
      
      sosClicksRef.current.count = 0;
      playSound("cancel");
      setNotice(`🚨 SOS SENT TO ADMIN & EMERGENCY CONTACTS! 🚨`);
      
      try {
         const token = localStorage.getItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY) || sessionStorage.getItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY) || authStore.getToken();
         if (token && safePayload.rideId) {
            await backendApi.createRideSupportTicket(safePayload.rideId, {
               issue_type: "sos_emergency",
               title: `🚨 CRITICAL SOS: CUSTOMER · ${ride?.booking_display_id || safePayload.rideId}`,
               description: `EMERGENCY SOS triggered by CUSTOMER. Please immediately trace Live Location: Lat ${liveLat}, Lng ${liveLng}. Alert their emergency contacts. Current Status: ${rideStatus}. Mobile Data Received.`,
               severity: "critical",
               source_panel: "user"
            }, token);
         }
      } catch (err) {}
      setFabMenuState("hidden");
   };

   const reportRideComplaint = async () => {
      if (!safePayload.rideId) return;
      const token = localStorage.getItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY) || sessionStorage.getItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY) || authStore.getToken();
      if (!token) {
         setNotice("Session expired. Please login again.");
         return;
      }

      const complaintSummary = [
         "Late arrival / no show",
         "Unsafe driving / rude behavior",
         "Wrong route issue",
         "Fare mismatch issue",
         "Vehicle hygiene/condition issue",
         "Pickup/drop confusion",
         "Payment issue",
         "Other ride-related issue",
      ].join(", ");

      try {
         await backendApi.createRideSupportTicket(
            safePayload.rideId,
            {
               issue_type: "complaint",
               title: `Complaint Regarding Ride · ${ride?.booking_display_id || safePayload.rideId}`,
               description: `Auto complaint registered from user panel. Selected complaint buckets: ${complaintSummary}.`,
               severity: "high",
               source_panel: "user",
            },
            token,
         );
         setNotice("Complaint registered successfully. Admin notified.");
      } catch (error) {
         setNotice(error instanceof Error ? error.message : "Unable to register complaint");
      }
   };

   const callPolice = () => {
      window.location.href = "tel:112";
   };

   const callEmergency = () => {
      window.location.href = "tel:112";
   };

   if (!safePayload.rideId) {
      return (
         <div className="fixed inset-0 z-[9999] bg-[#f2f4f7] flex items-center justify-center px-6">
            <div className="text-center">
               <p className="text-sm font-black uppercase tracking-[0.14em] text-gray-500">Redirecting To Home...</p>
            </div>
         </div>
      );
   }

   const pickupPoint = tracking?.pickup_lat != null && tracking?.pickup_lng != null
      ? { lat: tracking.pickup_lat, lng: tracking.pickup_lng }
      : null;
   const customerPoint = tracking?.customer_live_lat != null && tracking?.customer_live_lng != null
      ? { lat: tracking.customer_live_lat, lng: tracking.customer_live_lng }
      : pickupPoint;
   const riderPoint = tracking?.driver_live_lat != null && tracking?.driver_live_lng != null
      ? { lat: tracking.driver_live_lat, lng: tracking.driver_live_lng }
      : customerPoint;
   const destinationPoint = tracking?.destination_lat != null && tracking?.destination_lng != null
      ? { lat: tracking.destination_lat, lng: tracking.destination_lng }
      : null;
   const isTripInProgress = rideStatus === "in_progress" || rideStatus === "completed";
   const mapStartPoint = isTripInProgress ? riderPoint : customerPoint;
   const mapEndPoint = isTripInProgress ? (destinationPoint || customerPoint) : riderPoint;
   const liveRouteKm = distanceKm(mapStartPoint?.lat, mapStartPoint?.lng, mapEndPoint?.lat, mapEndPoint?.lng);
   const liveEtaMins = liveRouteKm != null ? Math.max(1, Math.round((liveRouteKm / 24) * 60)) : null;
  return (
        <div className="fixed inset-0 z-[9999] bg-[#f2f4f7]">
           <div className="relative mx-auto h-full w-full max-w-md bg-white overflow-hidden shadow-2xl">
      <AnimatePresence>
         {notice && (
           <motion.div initial={{ opacity: 1, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 bg-gray-900 text-white rounded-full text-sm font-bold shadow-2xl whitespace-nowrap">
             {notice}
           </motion.div>
         )}
      </AnimatePresence>
         <div className="absolute inset-x-0 top-0 h-full z-0 pointer-events-none">
            <LiveMap
               className="absolute inset-0 h-full w-full pointer-events-auto"
               pickup={mapStartPoint}
               drop={mapEndPoint}
               distance={liveRouteKm != null ? `${liveRouteKm.toFixed(1)} KM` : "-"}
               duration={liveEtaMins != null ? `${liveEtaMins} MINS` : "-"}
               showMetrics={false}
               interactive
               autoCenter
               followMarker={isTripInProgress ? "pickup" : "drop"}
               pickupMarkerMode={isTripInProgress ? "hidden" : "user"}
               dropMarkerMode={isTripInProgress ? "default" : "hidden"}
               showDriverMarker={Boolean(mapStartPoint)}
               driverMarkerAt={isTripInProgress ? "pickup" : "drop"}
            />
         </div>

         <motion.div
            ref={sheetRef}
            drag="y"
            dragControls={sheetDragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragMomentum={false}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            initial={false}
            animate={{ height: sheetHeight, y: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            style={{ touchAction: "pan-y", willChange: "transform" }}
            className="absolute left-0 right-0 bottom-0 z-40 bg-white rounded-t-[30px] px-4 pt-3 pb-4 shadow-[0_-16px_36px_rgba(0,0,0,0.14)] h-[90vh] flex flex-col"
         >
            <button
               type="button"
               onPointerDown={(event) => sheetDragControls.start(event)}
               className="mx-auto w-16 h-6 flex items-center justify-center mb-2 touch-none cursor-grab active:cursor-grabbing shrink-0"
               aria-label="Toggle booking details"
            >
               <span className="block w-12 h-1.5 rounded-full bg-gray-300" />
            </button>

            <div className="flex-1 overflow-y-auto overscroll-contain pr-1 space-y-4 pb-4 scroll-smooth touch-pan-y" style={{ WebkitOverflowScrolling: "touch", paddingBottom: "144px" }}
              onPointerDown={(e) => {
                 const target = e.target as HTMLElement;
                 if (target.closest('.chat-area') || target.tagName.toLowerCase() === 'input' || target.tagName.toLowerCase() === 'button') {
                    e.stopPropagation();
                 }
              }}
            >
               <div className="bg-white rounded-[22px] p-4 border border-gray-100">
                  <div className="flex justify-between items-center relative gap-1 px-1">
                     {steps.map((s, i) => {
                        const completed = i < stepIndex;
                        const active = i === stepIndex;
                        return (
                           <div key={s.label} className="flex flex-col items-center gap-1.5 flex-1 relative z-10">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${completed ? "bg-emerald-500 text-white" : active ? "bg-emerald-500 text-white ring-4 ring-emerald-50" : "bg-gray-100 text-gray-400"}`}>
                                 {completed ? <CheckCircle2 size={16} strokeWidth={3} /> : <span className="text-[10px] font-black">{i + 1}</span>}
                              </div>
                              <div className="flex flex-col items-center">
                                <span className={`text-[8px] font-black uppercase tracking-tight text-center ${active ? "text-emerald-600" : "text-gray-400"}`}>{s.short}</span>
                                {s.time && (completed || active) && <span className="text-[8px] font-semibold text-gray-400 mt-0.5">{s.time}</span>}
                              </div>
                           </div>
                        );
                     })}
                     <div className="absolute top-4 left-6 right-6 h-[2px] bg-gray-100 -z-0">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${(stepIndex / (steps.length - 1)) * 100}%` }} className="h-full bg-emerald-500 transition-all duration-700" />
                     </div>
                  </div>
               </div>

               {!isRideStarted && (
                  <div className="bg-[#EFF6FF] rounded-[22px] p-4 border border-blue-100">
                     <div className="flex justify-between items-center mb-3">
                        <div>
                           <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Booking PIN</p>
                           <p className="text-xl font-black text-blue-900 tracking-widest">{ride?.start_otp || "----"}</p>
                        </div>
                        <div className="text-right">
                           <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Booking ID</p>
                           <p className="text-sm font-black text-blue-900">{ride?.booking_display_id || safePayload.rideId}</p>
                        </div>
                     </div>
                     <div className="bg-emerald-500 text-white py-2 rounded-xl text-center font-black text-xs">Booking Confirmed</div>
                  </div>
               )}

               <div className="bg-white rounded-[22px] p-4 border border-gray-100">
                  <div className="flex items-center gap-3 mb-3">
                     <div className="w-14 h-14 rounded-full bg-emerald-100 border-4 border-emerald-50 flex items-center justify-center text-emerald-600">
                        <User size={28} />
                     </div>
                     <div className="flex-1">
                        <h3 className="text-lg font-black text-gray-900 leading-tight">{riderName}</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Rider ID: {riderId} {ride?.driver_phone ? `| ${ride.driver_phone}` : ""}</p>
                        <p className="text-[10px] font-bold text-gray-500">4.8 | HINDI, ENGLISH</p>
                     </div>
                  </div>
                  {!isRideCompleted && rideStatus !== "cancelled" && (
                     <div className="grid grid-cols-2 gap-2 pt-1">
                        <button onClick={onCall} className="h-11 rounded-xl bg-emerald-500 text-white font-black flex items-center justify-center gap-1.5"><Phone size={16} fill="currentColor" /> Call</button>
                        <button onClick={onMessage} className="h-11 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center gap-1.5"><MessageSquare size={16} fill="currentColor" /> Message</button>
                     </div>
                  )}
               </div>

               <div className="bg-white rounded-[22px] p-4 border border-gray-100">
                  <button onClick={() => setShowVehicleDetails(!showVehicleDetails)} className="w-full flex items-center justify-between text-xs font-black text-gray-900 mb-3">
                     VEHICLE DETAILS {showVehicleDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  <AnimatePresence>
                     {showVehicleDetails && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-2 text-xs">
                           <div className="flex justify-between"><span className="text-gray-400 font-bold">Vehicle Count</span><span className="font-black">{ride?.preference?.vehicle_count || 1} Vehicle(s)</span></div>
                           <div className="flex justify-between"><span className="text-gray-400 font-bold">Car Name</span><span className="font-black capitalize">{modelLabel}</span></div>
                           <div className="flex justify-between"><span className="text-gray-400 font-bold">Condition</span><span className="font-black text-emerald-600 uppercase">{conditionLabel}</span></div>
                           <div className="flex justify-between"><span className="text-gray-400 font-bold">Number</span><span className="font-black uppercase">{vehicleNumberLabel}</span></div>
                           <div className="flex justify-between"><span className="text-gray-400 font-bold">Seater</span><span className="font-black">{seaterLabel}</span></div>
                           <div className="flex justify-between"><span className="text-gray-400 font-bold">Colour</span><span className="font-black">{colorLabel}</span></div>
                        </motion.div>
                     )}
                  </AnimatePresence>
               </div>

               <div className="bg-white rounded-[22px] p-4 border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Ride Location</p>
                  <div className="space-y-3">
                     <div className="flex items-start gap-3"><MapPin size={14} className="text-emerald-500 mt-0.5" /><div><p className="text-[10px] font-bold text-gray-400 uppercase">Pickup</p><p className="text-sm font-black text-gray-900">{safePayload.pickup}</p></div></div>
                     <div className="flex items-start gap-3"><Navigation size={14} className="text-rose-500 mt-0.5" /><div><p className="text-[10px] font-bold text-gray-400 uppercase">Drop</p><p className="text-sm font-black text-gray-900">{safePayload.destination}</p></div></div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between text-xs font-black">
                     <span>{plannedDistanceKm != null ? `${plannedDistanceKm.toFixed(1)} km` : "-"}</span>
                     <span>{etaMins != null ? `${etaMins} mins` : "-"}</span>
                     <span className="text-emerald-600">₹{new Intl.NumberFormat("en-IN").format(fare)}</span>
                  </div>
                  <p className="mt-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">{bookedAtLabel}</p>
               </div>

               {ride?.preference?.urgency_type === "reserve" && !isAdvancePaid && (
                  <div className="bg-indigo-900 text-white rounded-[22px] p-4 shadow-lg mb-2">
                     <div className="flex items-center justify-between mb-3"><p className="text-sm font-black">Advance Payment</p><Wallet size={18} className="text-indigo-200" /></div>
                     <p className="text-2xl font-black mb-3">₹{advanceAmount}</p>
                     <button onClick={() => setNotice("Redirecting to secured payment gateway...")} className="w-full h-11 bg-white text-indigo-900 rounded-xl font-black">Proceed to Pay</button>
                  </div>
               )}

               <div className="bg-white rounded-[22px] p-4 border border-gray-100 shadow-sm mt-2 mb-6">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                     Quick Support
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                     <button onClick={handleSOS} className="flex flex-col flex-1 items-center justify-center py-2.5 rounded-xl bg-red-50 border border-red-100 active:scale-95 transition-transform">
                        <AlertTriangle size={20} className="text-red-500 mb-1" />
                        <span className="text-[9px] font-black text-red-600 uppercase">SOS</span>
                     </button>
                     <button onClick={callPolice} className="flex flex-col flex-1 items-center justify-center py-2.5 rounded-xl bg-blue-50 border border-blue-100 active:scale-95 transition-transform">
                        <ShieldAlert size={20} className="text-blue-500 mb-1" />
                        <span className="text-[9px] font-black text-blue-600 uppercase">112</span>
                     </button>
                     <button onClick={cancelRideFromUser} className="flex flex-col flex-1 items-center justify-center py-2.5 rounded-xl bg-rose-50 border border-rose-100 active:scale-95 transition-transform">
                        <X size={20} className="text-rose-500 mb-1" />
                        <span className="text-[9px] font-black text-rose-600 uppercase">Cancel</span>
                     </button>
                     <button onClick={reportRideComplaint} className="flex flex-col flex-1 items-center justify-center py-2.5 rounded-xl bg-indigo-50 border border-indigo-100 active:scale-95 transition-transform">
                        <MessageCircle size={20} className="text-indigo-500 mb-1" />
                        <span className="text-[9px] font-black text-indigo-600 uppercase text-center leading-tight">Report</span>
                     </button>
                  </div>
               </div>
            </div>
         </motion.div>

      {/* Chat Overlay */}
      {createPortal(
        <AnimatePresence>
          {showChat && (
            <motion.div initial={{ opacity: 1, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} className="fixed inset-0 z-[100000] bg-gray-900/60 flex flex-col justify-end sm:items-center sm:justify-center">
                 <div className="bg-white w-full sm:w-[400px] h-[85%] sm:h-[600px] rounded-t-[32px] sm:rounded-[32px] shadow-2xl flex flex-col overflow-hidden">
                  <div className="bg-gray-900 p-4 border-b border-gray-800 flex items-center justify-between shadow-soft">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/30">
                         <MessageSquare size={18} />
                      </div>
                      <div>
                         <h3 className="text-white font-black text-sm tracking-wide">Chat with Rider</h3>
                         <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">{riderName}</p>
                      </div>
                   </div>
                   <button onClick={() => setShowChat(false)} className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors">
                      <X size={20} />
                   </button>
                </div>
                <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-gray-50 flex flex-col">
                  {messages.length === 0 && (
                     <div className="flex-1 flex flex-col items-center justify-center text-gray-400 mt-10 shrink-0">
                        <MessageSquare size={40} className="mb-3 opacity-20" />
                        <p className="text-sm font-bold tracking-tight">No messages yet</p>
                        <p className="text-xs text-gray-400 text-center px-6 mt-1 flex-wrap">Say hi to coordinate pickup location or timings</p>
                     </div>
                  )}
                  {messages.map((msg) => {
                     const isMe = msg.sender_type === "customer";
                     return (
                        <div key={msg.id} className={`flex w-full shrink-0 ${isMe ? 'justify-end' : 'justify-start'}`}>
                           <div className={`max-w-[75%] p-3 sm:p-4 rounded-[20px] text-sm font-medium leading-relaxed ${isMe ? 'bg-emerald-500 text-white rounded-tr-sm shadow-md shadow-emerald-500/20' : 'bg-white border border-gray-100 text-gray-800 shadow-soft rounded-tl-sm'}`}>
                             {msg.message}
                           </div>
                        </div>
                     )
                  })}
                </div>

                {/* Default Messages (Quick Replies) */}
                <div className="bg-white px-4 pt-3 pb-1 flex gap-2 overflow-x-auto no-scrollbar shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
                  {["I'm at the location", "Where are you?", "Please call me", "Okay!"].map(text => (
                    <button 
                      key={text} 
                      onClick={() => setChatText(text)}
                      className="whitespace-nowrap px-4 py-2 rounded-full border border-gray-200 bg-gray-50 text-xs font-bold text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors shrink-0"
                    >
                      {text}
                    </button>
                  ))}
                </div>

                <div className="p-4 bg-white border-t border-gray-100 flex gap-2 shrink-0 pb-safe">
                  <input 
                    value={chatText} onChange={(e) => setChatText(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    className="h-14 flex-1 rounded-2xl bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 px-4 text-sm font-bold text-gray-900 placeholder:text-gray-400 outline-none transition-all" 
                    placeholder="Type a message..." 
                  />
                  <button onClick={sendMessage} disabled={!chatText.trim()} className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center disabled:opacity-50 shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-600 active:scale-95 shrink-0">
                     <Send size={20} className="-ml-0.5" />
                  </button>
                </div>
             </div>
          </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
         </div>
      </div>
  );
};

export default BookingConfirmedPage;

