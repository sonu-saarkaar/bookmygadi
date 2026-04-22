import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { riderApi, type RiderActiveRide, type RiderTracking, type RiderRequest, type RideMessage } from "@/services/riderApi";
import { backendApi } from "@/services/backendApi";
import { notifyEvent, playSound } from "@/services/notificationCenter";
import { MapPin, Navigation, Phone, MessageSquare, CheckCircle2, ChevronRight, User, X, Flag, ChevronUp, ChevronDown, Siren, Car, ArrowLeft, Send, Maximize2, Menu, ShieldAlert, Disc, FileText } from "lucide-react";
import { motion, AnimatePresence, useDragControls, useAnimation, useMotionValue, useTransform } from "framer-motion";
import { LiveMap } from "@/components/LiveMap";
type SheetSnap = "up" | "mid" | "down";

const toRad = (v: number) => (v * Math.PI) / 180;
const distanceKm = (lat1?: number | null, lon1?: number | null, lat2?: number | null, lon2?: number | null) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371; const dLat = toRad(lat2 - lat1); const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); return R * c;
};

const formatRideStatusLabel = (status?: string | null) => {
  const value = String(status || "").toLowerCase();
  if (value === "pending") return "Pending";
  if (value === "accepted") return "Accepted";
  if (value === "arriving") return "On The Way";
  if (value === "in_progress") return "Ride Started";
  if (value === "completed") return "Completed";
  if (value === "cancelled" || value === "canceled") return "Cancelled";
  if (value === "rejected") return "Rejected";
  return "Active Ride";
};

const SlidableAction = ({
   label,
   colorClass,
   trackClass,
   labelClass,
   doneClass,
   onPerform,
   disabled,
   isDoneText = "Done",
}: any) => {
   const [done, setDone] = useState(false);
   const [busy, setBusy] = useState(false);
   const containerRef = useRef<HTMLDivElement>(null);
   const x = useMotionValue(0);
   const controls = useAnimation();
   
   // Fades out the background text as you drag the handle
   const textOpacity = useTransform(x, [0, 120], [1, 0]);

   const resetSlider = () => {
      setDone(false);
      setBusy(false);
      controls.start({ x: 0, transition: { type: "spring", stiffness: 400, damping: 25 } });
   };

   const handleDragEnd = async (_e: any, info: any) => {
      const containerWidth = containerRef.current?.offsetWidth || 300;
      // You must slide 65% of the bar's length to trigger it
      const threshold = containerWidth * 0.65;

      if (x.get() >= threshold) {
         setDone(true);
         setBusy(true);
         // Move to the very end instantly
         await controls.start({ x: containerWidth - 60, transition: { duration: 0.2 } });
         const success = await onPerform();
         if (!success) {
            resetSlider();
            return;
         }
         setBusy(false);
      } else {
         // Snaps back smoothly if you didn't reach the threshold
         controls.start({ x: 0, transition: { type: "spring", stiffness: 400, damping: 25 } });
      }
   };

   return (
      <div ref={containerRef} className={`relative w-[105%] -ml-[2.5%] h-[70px] rounded-[28px] p-1.5 flex items-center overflow-hidden mb-3 isolate border shadow-[inset_0_4px_16px_rgba(15,23,42,0.18),0_16px_32px_rgba(37,99,235,0.14)] ${trackClass || "bg-blue-600 border-blue-500/30"}`}>
         {/* Background Label */}
         <motion.div style={{ opacity: done ? 0 : textOpacity }} className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className={`text-[12px] font-black uppercase tracking-[0.22em] pl-6 drop-shadow-sm ${labelClass || "text-blue-50"}`}>
               Slide to {label}
            </span>
         </motion.div>

         {/* Done Label */}
         <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-500 ease-out ${done ? 'opacity-100' : 'opacity-0'}`}>
            <span className={`text-[12px] font-black uppercase tracking-[0.22em] ${doneClass || "text-slate-950"} drop-shadow-sm`}>
               {busy ? isDoneText : "Completed"}
            </span>
         </div>

         {/* Draggable Handle */}
         {!disabled && !done && (
            <motion.div
               drag="x"
               dragConstraints={containerRef}
               dragElastic={0} // Removes the "pulling a mountain" rubber-band resistance
               dragSnapToOrigin={false} // We handle the snap-back custom with spring physics
               onDragEnd={handleDragEnd}
               animate={controls}
               style={{ x }}
               whileTap={{ scale: 0.94 }}
               className={`relative z-10 w-[58px] h-[58px] rounded-[22px] bg-gradient-to-b ${colorClass} flex items-center justify-center shadow-[0_10px_24px_rgba(2,6,23,0.35)] cursor-grab active:cursor-grabbing border border-white/20`}
            >
               <ChevronRight className="text-white drop-shadow-md" size={28} strokeWidth={2.5} />
            </motion.div>
         )}
      </div>
   );
};

const RiderRideDetailsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { rideId = "", bookingId = "" } = useParams();
  const routeRideKey = decodeURIComponent(bookingId || rideId || "").trim();
  const [ride, setRide] = useState<RiderActiveRide | RiderRequest | null>(location.state?.ride || null);
  const [resolvedRideId, setResolvedRideId] = useState(location.state?.ride?.id || "");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [tracking, setTracking] = useState<RiderTracking | null>(null);
  const [showCustomerDetails, setShowCustomerDetails] = useState(true);
  const [counterAmount, setCounterAmount] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [chatText, setChatText] = useState("");
  const [messages, setMessages] = useState<RideMessage[]>([]);
   const [showOtpModal, setShowOtpModal] = useState(false);
   const [otpValue, setOtpValue] = useState("");
    const [sheetSnap, setSheetSnap] = useState<SheetSnap>("mid");
   const sheetRef = useRef<HTMLDivElement | null>(null);
    const otpInputRef = useRef<HTMLInputElement | null>(null);
   const [maxSheetDragY, setMaxSheetDragY] = useState(0);
   const [mapFullscreen, setMapFullscreen] = useState(false);
   const [fabMenuState, setFabMenuState] = useState<"hidden" | "main" | "vehicle">("hidden");
   const sosClicksRef = useRef({ count: 0, lastTime: 0 });
   const terminalNavigationRef = useRef(false);
   const sheetDragControls = useDragControls();

   const getRiderSnap = (current: SheetSnap, direction: "up" | "down"): SheetSnap => {
      const order: SheetSnap[] = ["up", "mid", "down"];
      const index = order.indexOf(current);
      if (direction === "up") return order[Math.max(0, index - 1)];
      return order[Math.min(order.length - 1, index + 1)];
   };

  const rideStatus = (ride?.status || "").toLowerCase();
  
  useEffect(() => {
     try {
        if (rideStatus && !["pending", "completed", "cancelled", "canceled"].includes(rideStatus)) {
           (window as any).AndroidInterface?.showFloatingButton();
        } else {
           (window as any).AndroidInterface?.hideFloatingButton();
        }
     } catch (e) {
        console.warn("Android bridge failed", e);
     }
  }, [rideStatus]);

  useEffect(() => {
     return () => {
        try {
           (window as any).AndroidInterface?.hideFloatingButton();
        } catch (e) {}
     };
  }, []);

  const isRideStarted = rideStatus === "in_progress" || rideStatus === "completed" || rideStatus === "cancelled";

  const stepIndex = useMemo(() => {
    if (!ride) return 0;
    if (ride.status === "accepted") return 1;
    if (ride.status === "arriving") return 2;
    if (ride.status === "in_progress") return 3;
    if (ride.status === "completed") return 4;
    return 0;
  }, [ride]);

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return "";
    const h = new Date(isoString).getHours();
    const m = new Date(isoString).getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hr = h % 12 || 12;
    return `${hr}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  const steps = [
    { label: "Request", short: "Match", time: formatTime(ride?.created_at) },
    { label: "Accepted", short: "Accepted", time: formatTime(ride?.accepted_at) },
    { label: "Arriving", short: "On Way", time: formatTime(ride?.arrived_at) },
    { label: "Started", short: "Trip Start", time: formatTime(ride?.started_at) },
    { label: "Completed", short: "Done", time: formatTime(ride?.completed_at) },
  ];

  const loadRide = async () => {
    try {
      const activeRows = await riderApi.listActiveRides();
      let found = activeRows.find((r) => r.id === routeRideKey || r.booking_display_id === routeRideKey);
      if (!found) {
        const pendingRows = await riderApi.listRequests();
        found = pendingRows.find((r) => r.id === routeRideKey || r.booking_display_id === routeRideKey) as any;
      }
      if (found) {
        setRide(found);
        setResolvedRideId(found.id);
      }
    } catch { }
  };

  useEffect(() => {
    if (!routeRideKey) { navigate("/rider/home", { replace: true }); return; }
    loadRide(); 

    let disposed = false;
    let ws: WebSocket | null = null;
    const wsTimer = window.setTimeout(() => {
      if (disposed) return;
      const wsUrl = backendApi.rideWebsocketUrl(resolvedRideId || routeRideKey);
      if (!wsUrl) return;

      try {
        ws = new WebSocket(wsUrl);
        ws.onmessage = (event) => {
           try {
              const data = JSON.parse(event.data);
              if ((data.event === "ride_status_updated" || data.event === "ride_created") && data.ride) {
                 setRide(data.ride);
              } else if (data.event === "chat_message_created" && data.message) {
                 setMessages(m => [...m, data.message]);
                 if (data.message.sender_type !== "driver") {
                    notifyEvent("New Message", "Customer sent a message", "message");
                    if (!showChat) setNotice("New message from Customer");
                 }
              }
           } catch {
              // ignore malformed realtime messages
           }
        };

        ws.onopen = () => {
          if (disposed) {
            ws?.close();
          }
        };
      } catch {
        ws = null;
      }
    }, 120);

    const loadChat = async () => {
      try {
        const activeId = resolvedRideId || routeRideKey;
        const msgs = await riderApi.getMessages(activeId);
        setMessages(msgs);
      } catch { }
    };
    if (showChat) loadChat();

    const id = window.setInterval(() => {
        loadRide();
        if (showChat) loadChat();
    }, 3000); 

    return () => {
            disposed = true;
            window.clearTimeout(wsTimer);
        window.clearInterval(id);
            if (ws && ws.readyState === WebSocket.OPEN) {
               ws.close();
            }
    };
  }, [routeRideKey, resolvedRideId, navigate, showChat]);

  // Driver Location Transmitter
  useEffect(() => {
    const activeId = resolvedRideId || routeRideKey;
    if (!activeId || rideStatus === "pending" || rideStatus === "cancelled" || rideStatus === "completed") return;
    let watchId: number;
    let lastSent = 0;
    
    if ("geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const now = Date.now();
          if (now - lastSent > 3000) { // throttle to max 1 request every 3s
            riderApi.updateDriverLocation(activeId, position.coords.latitude, position.coords.longitude).catch(() => {});
            lastSent = now;
          }
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [resolvedRideId, routeRideKey, rideStatus]);

  const sendMessage = async () => {
    const activeId = resolvedRideId || routeRideKey;
    if (!chatText.trim() || !activeId) return;
    try {
      const msg = await riderApi.sendMessage(activeId, chatText.trim());
      setMessages(m => [...m, msg]);
      setChatText("");
    } catch {
      setNotice("Failed to send message");
    }
  };

  useEffect(() => {
    const activeId = resolvedRideId || routeRideKey;
    if (!activeId) return;
    const loadTracking = async () => { try { const data = await riderApi.getActiveTracking(activeId); setTracking(data); } catch { } };
    loadTracking(); const id = window.setInterval(loadTracking, 3000); return () => window.clearInterval(id);
  }, [resolvedRideId, routeRideKey]);

  useEffect(() => {
    if (isRideStarted) setShowCustomerDetails(false);
  }, [isRideStarted]);

   useEffect(() => {
      if (!ride || !rideId || terminalNavigationRef.current) return;

      if (["cancelled", "canceled", "rejected"].includes(rideStatus)) {
         terminalNavigationRef.current = true;
         setNotice(rideStatus === "rejected" ? "Ride request rejected" : "Ride cancelled");
         playSound("cancel");
         const timeoutId = window.setTimeout(() => {
            navigate("/rider/home", { replace: true });
         }, 700);
         return () => window.clearTimeout(timeoutId);
      }
   }, [ride, rideId, rideStatus, navigate]);

   useEffect(() => {
      if (showOtpModal) {
         window.setTimeout(() => otpInputRef.current?.focus(), 50);
      } else {
         setOtpValue("");
      }
   }, [showOtpModal]);

   useEffect(() => {
      const updateSheetLimit = () => {
         if (sheetRef.current) {
            setMaxSheetDragY(sheetRef.current.offsetHeight * 0.5);
         }
      };
      updateSheetLimit();
      window.addEventListener("resize", updateSheetLimit);
      return () => window.removeEventListener("resize", updateSheetLimit);
   }, []);

  const updateStatus = async (status: "arriving" | "in_progress" | "completed" | "cancelled", startOtp?: string) => {
    if (!ride) return false;
    setLoading(true);
    try {
      const updated = await riderApi.updateActiveRideStatusWithOtp(ride.id, status, startOtp);
      setRide(updated);
      playSound("confirmation");
      setNotice("");
      if (status === "completed") {
         const paymentSummary = {
            rideId: updated.id,
            pickup: updated.pickup_location,
            destination: updated.destination,
            vehicleType: updated.vehicle_type,
            fare: updated.agreed_fare || updated.estimated_fare_max || updated.estimated_fare_min || 0,
            status: updated.status,
            driverName: updated.customer_name || "Customer",
         };
         sessionStorage.setItem("bmg_rider_payment_summary", JSON.stringify(paymentSummary));
         navigate(`/rider/payment/${ride.id}`, { state: paymentSummary });
      }
      if (status === "cancelled") {
        navigate("/rider/home");
      }
      return true;
    } catch (error) { 
      setNotice(error instanceof Error ? error.message : "Update failed"); 
      setTimeout(() => setNotice(''), 3000);
      return false;
    } finally { setLoading(false); }
  };

  const handleCancel = () => {
    if (window.confirm("ARE YOU SURE YOU WANT TO CANCEL THIS RIDE? This may affect your rider score.")) {
      void updateStatus("cancelled");
    }
  };

   const onCallPolice = () => (window.location.href = "tel:112");

   const onBMGSupport = async () => {
      const complaintSummary = [
         "Late arrival / no show",
         "Unsafe driving dispute",
         "Customer behavior issue",
         "Route/fare dispute",
         "Payment dispute",
         "Pickup/drop mismatch",
         "Other ride-related grievance",
      ].join(", ");

      try {
         await riderApi.createRideSupportTicket(resolvedRideId || routeRideKey, {
            issue_type: "complaint",
            title: `Complaint Regarding Ride · ${ride?.booking_display_id || rideId}`,
            description: `Auto complaint registered from rider panel. Selected complaint buckets: ${complaintSummary}.`,
            severity: "high",
            source_panel: "rider",
         });
         setNotice("Complaint registered. Admin notified.");
      } catch (error) {
         setNotice(error instanceof Error ? error.message : "Unable to register complaint");
      }
   };

   const onVehicleIssue = async () => {
      const vehicleIssueSummary = [
         "Tyre puncture / wheel issue",
         "Engine overheating / breakdown",
         "Battery start issue",
         "Brake issue",
         "Lights or indicator issue",
         "AC failure",
         "Fuel leakage / shortage",
         "Door lock or window issue",
         "Other urgent vehicle issue",
      ].join(", ");

      try {
         await riderApi.createRideSupportTicket(resolvedRideId || routeRideKey, {
            issue_type: "vehicle_issue",
            title: `Vehicle Issue · ${ride?.booking_display_id || rideId}`,
            description: `Vehicle issue auto-registered from rider panel. Issue buckets: ${vehicleIssueSummary}.`,
            severity: "critical",
            source_panel: "rider",
         });
         setNotice("Vehicle issue reported. Admin notified.");
      } catch (error) {
         setNotice(error instanceof Error ? error.message : "Unable to report vehicle issue");
      }
   };

  const slideAction = useMemo(() => {
    if (rideStatus === "accepted") {
      return {
        label: "ARRIVED AT PICKUP",
        next: "arriving" as const,
        color: "from-slate-900 to-slate-700",
        trackClass: "bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 border-blue-300/30",
        labelClass: "text-white",
        doneClass: "text-slate-950",
      };
    }
    if (rideStatus === "arriving") {
      return {
        label: "VERIFY OTP & START",
        next: "in_progress" as const,
        color: "from-slate-900 to-slate-700",
        trackClass: "bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400 border-amber-200/40",
        labelClass: "text-slate-950",
        doneClass: "text-slate-950",
      };
    }
    if (rideStatus === "in_progress") {
      return {
        label: "COMPLETE RIDE",
        next: "completed" as const,
        color: "from-slate-900 to-slate-700",
        trackClass: "bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 border-emerald-200/40",
        labelClass: "text-slate-950",
        doneClass: "text-slate-950",
      };
    }
    return {
      label: "RIDE FINISHED",
      next: null,
      color: "from-slate-700 to-slate-600",
      trackClass: "bg-slate-200 border-slate-300",
      labelClass: "text-slate-700",
      doneClass: "text-slate-900",
    };
  }, [rideStatus]);

  const pickupToDropKm = distanceKm(tracking?.pickup_lat, tracking?.pickup_lng, tracking?.destination_lat, tracking?.destination_lng);
  
  const onCall = () => (ride as RiderActiveRide)?.customer_phone && (window.location.href = `tel:${(ride as RiderActiveRide).customer_phone}`);
  const onMessage = () => setShowChat(true);

  const onAccept = async () => {
    if (!ride) return;
    setLoading(true);
    try {
      const acceptedRide = await riderApi.acceptRequest(
        ride.id,
        ride.agreed_fare || (ride as RiderRequest).latest_offer_amount || ride.estimated_fare_max || undefined,
      );
      playSound("confirmation");
      setNotice("Ride accepted!");
      setRide(acceptedRide);
      loadRide();
    } catch (e: any) {
      setNotice(e.message || "Accept failed");
    } finally {
      setLoading(false);
    }
  };

  const onReject = async () => {
    if (!ride) return;
    if (!window.confirm("Reject this request?")) return;
    setLoading(true);
    try {
      await riderApi.rejectRequest(ride.id);
      playSound("cancel");
      navigate("/rider/home");
    } catch (e: any) {
      setNotice(e.message || "Reject failed");
    } finally {
      setLoading(false);
    }
  };

  const onQuickCancelRide = async () => {
    if (!ride) return;
    if (rideStatus === "pending") {
      await onReject();
      return;
    }
    handleCancel();
  };

  const onNegotiate = async () => {
    if (!ride) return;
    const amount = Number(counterAmount.replace(/,/g, ""));
    if (!amount || amount < 1) return;
    setLoading(true);
    try {
      await riderApi.negotiateRequest(ride.id, amount);
      setNotice("Counter offer sent!");
      loadRide();
      setCounterAmount("");
    } catch (e: any) {
      setNotice(e.message || "Negotiation failed");
    } finally {
      setLoading(false);
    }
  };

   const triggerRideAction = async () => {
      if (!slideAction.next || loading) return false;
      if (slideAction.next === "in_progress") {
         setShowOtpModal(true);
         return false;
      }
      return await updateStatus(slideAction.next);
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
         playSound("confirmation"); // simple tick
         return;
      }
      
      // Fire SOS!
      sosClicksRef.current.count = 0;
      playSound("cancel");
      setNotice(`🚨 SOS SENT TO ADMIN & EMERGENCY CONTACTS! 🚨`);
      
      try {
         await riderApi.createRideSupportTicket(resolvedRideId || routeRideKey, {
            issue_type: "sos_emergency",
            title: `🚨 CRITICAL SOS: RIDER · ${ride?.booking_display_id || rideId}`,
            description: `EMERGENCY SOS triggered by RIDER. Please immediately trace Live Location: Lat ${tracking?.driver_live_lat}, Lng ${tracking?.driver_live_lng}. Alert their emergency contacts. Current Status: ${rideStatus}. Mobile Data Received.`,
            severity: "critical",
            source_panel: "rider"
         });
      } catch (err) {}
      setFabMenuState("hidden");
   };

   // Connect Android Action to Handle SOS automatically
   useEffect(() => {
      const handleNativeMessage = async (event: MessageEvent) => {
         if (event.data?.type === "NATIVE_SOS_TRIGGER") {
            sosClicksRef.current.count = 3;
            sosClicksRef.current.lastTime = Date.now();
            handleSOS();
         } else if (event.data?.type === "NATIVE_COMPLETE_RIDE") {
            if (rideStatus === "in_progress") {
               try {
                  await updateStatus("completed");
               } catch (err: any) {
                  setNotice(err.message || "Failed to complete ride");
               }
            } else {
               setNotice("Cannot complete: Ride is not in progress.");
            }
         } else if (event.data?.type === "NATIVE_ISSUE") {
            setNotice("Vehicle Issue reported! Contacting Support...");
            // Support call mapping can go here
         } else if (event.data?.type === "NATIVE_CANCEL_RIDE") {
            if (rideStatus === "pending" || rideStatus === "accepted") {
               try {
                  await updateStatus("cancelled");
               } catch (err: any) {}
            }
         }
      };
      
      window.addEventListener("message", handleNativeMessage);
      return () => window.removeEventListener("message", handleNativeMessage);
   }, [resolvedRideId, routeRideKey, tracking, rideStatus]);

   const confirmOtpAndStart = async () => {
      const otp = otpValue.replace(/\s+/g, "").trim();
      if (!otp) return;
      setShowOtpModal(false);
      await updateStatus("in_progress", otp);
   };

   useEffect(() => {
   }, [rideStatus, loading]);

  if (!ride) {
    return (
      <div className="fixed inset-0 bg-[#f3f5f7] flex flex-col items-center justify-center transition-opacity opacity-0 animate-[fadeIn_1s_ease-in]">
      </div>
    );
  }

   const driverPoint = tracking?.driver_live_lat != null && tracking?.driver_live_lng != null
      ? { lat: tracking.driver_live_lat, lng: tracking.driver_live_lng }
      : tracking?.pickup_lat != null && tracking?.pickup_lng != null
         ? { lat: tracking.pickup_lat, lng: tracking.pickup_lng }
         : null;

   const customerPoint = tracking?.customer_live_lat != null && tracking?.customer_live_lng != null
      ? { lat: tracking.customer_live_lat, lng: tracking.customer_live_lng }
      : tracking?.pickup_lat != null && tracking?.pickup_lng != null
         ? { lat: tracking.pickup_lat, lng: tracking.pickup_lng }
         : null;

   const destinationPoint = tracking?.destination_lat != null && tracking?.destination_lng != null
      ? { lat: tracking.destination_lat, lng: tracking.destination_lng }
      : null;

   const isTripInProgress = rideStatus === "in_progress" || rideStatus === "completed";
   const mapStartPoint = isTripInProgress ? driverPoint : customerPoint;
   const mapEndPoint = isTripInProgress ? (destinationPoint || customerPoint) : driverPoint;
   const liveRouteKm = distanceKm(mapStartPoint?.lat, mapStartPoint?.lng, mapEndPoint?.lat, mapEndPoint?.lng);
   const liveEtaMins = liveRouteKm != null ? Math.max(1, Math.round((liveRouteKm / 24) * 60)) : null;

  return (
      <div className="fixed inset-0 z-40 bg-[#f2f4f7]">
         <div className="relative mx-auto h-[100vh] w-full max-w-md bg-white overflow-hidden shadow-2xl">
      <AnimatePresence>
         {notice && (
           <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 bg-gray-900 text-white rounded-full text-sm font-bold shadow-2xl whitespace-nowrap">
             {notice}
           </motion.div>
         )}
      </AnimatePresence>

      <AnimatePresence>
         {showOtpModal && (
            <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 z-[110] bg-slate-950/70 backdrop-blur-md flex items-end sm:items-center justify-center px-3"
            >
               <motion.div
                  initial={{ y: 40, scale: 0.96, opacity: 0 }}
                  animate={{ y: 0, scale: 1, opacity: 1 }}
                  exit={{ y: 32, scale: 0.98, opacity: 0 }}
                  transition={{ type: "spring", damping: 24, stiffness: 260 }}
                  className="w-full max-w-[340px] rounded-[20px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.35)] overflow-hidden border border-slate-200"
               >
                  <div className="relative bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-3 text-white">
                     <div className="relative flex items-center justify-between gap-3">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-100">PIN</h3>
                        <button
                           type="button"
                           onClick={() => setShowOtpModal(false)}
                           className="relative z-10 w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center border border-white/15 hover:bg-white/15 transition-colors"
                           aria-label="Close OTP dialog"
                        >
                           <X size={15} />
                        </button>
                     </div>
                  </div>

                  <div className="p-4 bg-white">
                     <div className="rounded-[16px] border border-slate-200 bg-slate-50 px-3 py-4 shadow-inner">
                        <div className="relative">
                           <input
                              ref={otpInputRef}
                              value={otpValue}
                              onChange={(event) => setOtpValue(event.target.value.replace(/\D/g, "").slice(0, 4))}
                              onKeyDown={(event) => {
                                 if (event.key === "Enter") {
                                    event.preventDefault();
                                    void confirmOtpAndStart();
                                 }
                              }}
                              inputMode="numeric"
                              autoComplete="one-time-code"
                              placeholder="0000"
                              maxLength={4}
                              className="peer relative z-10 w-full rounded-[14px] border border-transparent bg-transparent px-2 py-3 text-center text-3xl font-black tracking-[0.9em] text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-300 focus:ring-0"
                           />
                           <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 px-2 py-3 text-3xl font-black tracking-[0.9em] text-transparent">
                              {Array.from({ length: 4 }).map((_, index) => (
                                 <span key={index} className="flex h-12 w-12 items-center justify-center rounded-[12px] border border-slate-300 bg-white text-slate-500 shadow-sm">
                                    {otpValue[index] || ""}
                                 </span>
                              ))}
                           </div>
                        </div>
                     </div>

                     <div className="mt-3 grid grid-cols-2 gap-3">
                        <button
                           type="button"
                           onClick={() => setShowOtpModal(false)}
                           className="h-11 rounded-[14px] border border-slate-200 bg-white text-slate-700 font-black uppercase tracking-wide shadow-sm hover:bg-slate-50 transition-colors"
                        >
                           Cancel
                        </button>
                        <button
                           type="button"
                           onClick={() => { void confirmOtpAndStart(); }}
                           disabled={otpValue.replace(/\s+/g, "").trim().length < 4 || loading}
                           className="h-11 rounded-[14px] bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-black uppercase tracking-wide shadow-[0_12px_26px_rgba(16,185,129,0.28)] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                           {loading ? "Verifying..." : "Start Ride"}
                        </button>
                     </div>
                  </div>
               </motion.div>
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

            <div className="absolute top-4 left-4 z-30 pointer-events-auto">
               <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => navigate("/rider/home")}
                  className="w-10 h-10 rounded-full bg-white text-gray-900 shadow-md border border-gray-100 flex items-center justify-center"
               >
                  <ArrowLeft size={18} />
               </motion.button>
            </div>

            <div className="absolute top-4 right-4 z-30 flex items-center gap-2 pointer-events-auto">
               <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setMapFullscreen(true)}
                  className="w-10 h-10 rounded-full bg-white text-gray-900 shadow-md border border-gray-100 flex items-center justify-center"
               >
                  <Maximize2 size={16} />
               </motion.button>
            </div>
         </div>

         <motion.div
            ref={sheetRef}
            drag="y"
            dragControls={sheetDragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: maxSheetDragY }}
            dragMomentum={false}
            dragTransition={{ bounceStiffness: 260, bounceDamping: 26, power: 0.15, timeConstant: 220 }}
            dragElastic={0.06}
            onDragEnd={(_, info) => {
               if (info.offset.y < -50) setSheetSnap((prev) => getRiderSnap(prev, "up"));
               if (info.offset.y > 50) setSheetSnap((prev) => getRiderSnap(prev, "down"));
            }}
            initial={false}
            animate={{ y: Number.parseInt(sheetSnap === "up" ? "10" : sheetSnap === "mid" ? "37.5" : "60") + "vh" }}
            transition={{ type: "spring", damping: 34, stiffness: 250, mass: 0.75 }}
            style={{ touchAction: "pan-y", willChange: "transform" }}
            className="absolute left-0 right-0 bottom-0 z-40 bg-white rounded-t-[30px] px-4 pt-3 pb-6 shadow-[0_-16px_36px_rgba(0,0,0,0.14)] h-[90vh] flex flex-col"
         >
            <button
               type="button"
               onPointerDown={(event) => sheetDragControls.start(event)}
               className="mx-auto w-16 h-6 flex items-center justify-center mb-2 touch-none cursor-grab active:cursor-grabbing shrink-0"
               aria-label="Toggle ride details"
            >
               <span className="block w-12 h-1.5 rounded-full bg-gray-300" />
            </button>

            <div className="flex-1 overflow-y-auto overscroll-contain pr-1 space-y-4 scroll-smooth touch-pan-y" style={{ WebkitOverflowScrolling: "touch", paddingBottom: "124px" }}
              onPointerDown={(e) => {
                 // Prevent parent container dragging when interacting with inner scrollable areas or inputs
                 const target = e.target as HTMLElement;
                 if (target.closest('.chat-area') || target.tagName.toLowerCase() === 'input' || target.tagName.toLowerCase() === 'button' || target.tagName.toLowerCase() === 'select') {
                    e.stopPropagation();
                 }
              }}
            >
               {rideStatus !== "pending" && (
                  <div className="bg-white rounded-[22px] p-4 border border-gray-100">
                     <div className="flex justify-between items-center relative gap-1 px-1">
                        {steps.map((s, i) => {
                           const completed = i < stepIndex;
                           const active = i === stepIndex;
                           return (
                              <div key={s.label} className="flex flex-col items-center gap-1.5 flex-1 relative z-10">
                                 <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${completed ? "bg-indigo-600 text-white" : active ? "bg-indigo-600 text-white ring-4 ring-indigo-50" : "bg-gray-100 text-gray-400"}`}>
                                    {completed ? <CheckCircle2 size={16} strokeWidth={3} /> : <span className="text-[10px] font-black">{i + 1}</span>}
                                 </div>
                                 <div className="flex flex-col items-center">
                                   <span className={`text-[8px] font-black uppercase tracking-tight text-center ${active ? "text-indigo-600" : "text-gray-400"}`}>{s.short}</span>
                                   {s.time && (completed || active) && <span className="text-[8px] font-semibold text-gray-400 mt-0.5">{s.time}</span>}
                                 </div>
                              </div>
                           );
                        })}
                        <div className="absolute top-4 left-6 right-6 h-[2px] bg-gray-100 -z-0">
                           <motion.div initial={{ width: 0 }} animate={{ width: `${(stepIndex / (steps.length - 1)) * 100}%` }} className="h-full bg-indigo-600" />
                        </div>
                     </div>
                  </div>
               )}

               {slideAction.next && rideStatus !== "pending" && rideStatus !== "completed" && rideStatus !== "cancelled" ? (
                  <SlidableAction
                     key={slideAction.next}
                     label={slideAction.label}
                     colorClass={slideAction.color}
                     trackClass={slideAction.trackClass}
                     labelClass={slideAction.labelClass}
                     doneClass={slideAction.doneClass}
                     onPerform={triggerRideAction}
                     disabled={loading}
                     isDoneText="Updating ride..."
                  />
               ) : (
                  <div className="bg-[#EEF2FF] rounded-[22px] p-4 border border-indigo-100 shadow-sm">
                     <div className="flex justify-between items-center">
                        <div>
                           <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Booking ID</p>
                           <p className="text-sm font-black text-indigo-900">{ride.booking_display_id || ride.id}</p>
                        </div>
                        <div className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter border bg-white text-indigo-600 border-indigo-100">
                           {formatRideStatusLabel(ride.status)}
                        </div>
                     </div>
                  </div>
               )}

               <div className="bg-white rounded-[22px] p-4 border border-gray-100">
                  <div className="flex items-center gap-3 mb-3">
                     <div className="w-14 h-14 rounded-full bg-indigo-100 border-4 border-indigo-50 flex items-center justify-center text-indigo-600">
                        <User size={28} />
                     </div>
                     <div className="flex-1">
                        <h3 className="text-lg font-black text-gray-900 leading-tight">{(ride as RiderActiveRide).customer_name || "Customer Request"}</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">ID: {ride.booking_display_id || ride.id}</p>
                        <p className="text-[10px] font-black text-indigo-500 uppercase">{ride.vehicle_type}</p>
                     </div>
                  </div>

                  <button onClick={() => setShowCustomerDetails(!showCustomerDetails)} className="w-full flex items-center justify-between text-xs font-black text-gray-900 mb-2">
                     TRIP PREFERENCES {showCustomerDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  <AnimatePresence>
                     {showCustomerDetails && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-2 pt-1 text-xs">
                           <div className="flex justify-between items-center"><span className="text-gray-400 font-bold">Vehicle Mode</span><span className="text-gray-900 font-black uppercase text-indigo-600">AC Required</span></div>
                           {ride.preference?.urgency_type && <div className="flex justify-between items-center"><span className="text-gray-400 font-bold">Booking Type</span><span className="text-gray-900 font-black uppercase">{ride.preference.urgency_type}</span></div>}
                           {ride.preference?.booking_mode && <div className="flex justify-between items-center"><span className="text-gray-400 font-bold">Priority</span><span className="text-rose-500 font-black uppercase">{ride.preference.booking_mode}</span></div>}
                           <div className="flex justify-between items-center"><span className="text-gray-400 font-bold">Estimated Payment</span><span className="text-emerald-500 font-black">₹{ride.agreed_fare || (ride as RiderRequest).latest_offer_amount || ride.estimated_fare_max}</span></div>
                        </motion.div>
                     )}
                  </AnimatePresence>

                  {rideStatus !== "pending" && rideStatus !== "completed" && rideStatus !== "cancelled" && (
                     <div className="grid grid-cols-2 gap-2 pt-3">
                        <button onClick={onCall} className="h-11 rounded-xl bg-emerald-500 text-white font-black flex items-center justify-center gap-1.5"><Phone size={16} fill="currentColor" /> Call</button>
                        <button onClick={onMessage} className="h-11 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center gap-1.5"><MessageSquare size={16} fill="currentColor" /> Message</button>
                     </div>
                  )}
               </div>

               <div className="bg-white rounded-[22px] p-4 flex flex-col gap-4 border border-gray-100 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-bl-full -z-0"></div>

                  <div className="z-10 flex items-center justify-between">
                     <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5 mb-0">
                        <FileText size={14} className="text-indigo-400" />
                        Trip Summary
                     </p>
                     <div className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase tracking-wider">
                        {rideStatus === "completed" ? "Invoice" : "Estimation"}
                     </div>
                  </div>

                  <div className="z-10 grid grid-cols-2 gap-y-3 gap-x-2 bg-gray-50/80 rounded-xl p-3 border border-gray-100">
                     <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase mb-0.5">Booking Type</p>
                        <p className="text-xs font-black text-gray-800 capitalize">
                           {ride.preference?.urgency_type === "reserve" ? "Reservation" : "Instant Ride"}
                        </p>
                     </div>
                     <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase mb-0.5">Trip Type</p>
                        <p className="text-xs font-black text-gray-800 capitalize">
                           {ride.preference?.trip_type === "round-trip" ? "Round Trip" : "One Way"}
                        </p>
                     </div>
                     <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase mb-0.5">Vehicle</p>
                        <p className="text-xs font-black text-gray-800 capitalize">
                           {ride.vehicle_type || "Any Vehicle"}
                        </p>
                     </div>
                     <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase mb-0.5">Quantity</p>
                        <p className="text-xs font-black text-gray-800">
                           {ride.preference?.vehicle_count && ride.preference.vehicle_count > 1 
                              ? `${ride.preference.vehicle_count} Vehicles` 
                              : "Single Vehicle"}
                        </p>
                     </div>
                  </div>

                  <div className="z-10 relative pl-2 border-l-2 border-dashed border-gray-200 ml-2 space-y-4 py-1">
                     <div className="relative">
                        <div className="absolute -left-[13px] top-0.5 w-[8px] h-[8px] rounded-full bg-blue-500 ring-4 ring-white"></div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Rider Location</p>
                        <p className="text-xs font-black text-gray-800 leading-tight">
                           {tracking?.customer_live_lat && tracking?.customer_live_lng 
                              ? `${tracking.customer_live_lat.toFixed(4)}, ${tracking.customer_live_lng.toFixed(4)}`
                              : "Fetching Live Data..."}
                        </p>
                     </div>

                     <div className="relative">
                        <div className="absolute -left-[13px] top-0.5 w-[8px] h-[8px] rounded-full bg-emerald-500 ring-4 ring-white"></div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Pickup Location</p>
                        <p className="text-xs font-black text-gray-800 leading-tight pr-2">
                           {ride.pickup_location || "-"}
                        </p>
                     </div>

                     <div className="relative">
                        <div className="absolute -left-[13px] top-0.5 w-[8px] h-[8px] rounded-full bg-rose-500 ring-4 ring-white"></div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Drop Location</p>
                        <p className="text-xs font-black text-gray-800 leading-tight pr-2">
                           {ride.destination || "-"}
                        </p>
                     </div>
                  </div>

                  <div className="z-10 mt-1 pt-3 border-t border-gray-100 grid grid-cols-3 gap-2 text-center items-center">
                     <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="text-[9px] font-bold text-gray-400 uppercase mb-0.5">Distance</span>
                        <span className="text-sm font-black text-gray-800">
                           {pickupToDropKm ? pickupToDropKm.toFixed(1) : "-"} <span className="text-[10px]">km</span>
                        </span>
                     </div>
                     
                     <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="text-[9px] font-bold text-gray-400 uppercase mb-0.5">Duration</span>
                        <span className="text-sm font-black text-gray-800">
                           {(() => {
                              if (ride.started_at && ride.completed_at) {
                                 const ms = new Date(ride.completed_at).getTime() - new Date(ride.started_at).getTime();
                                 const mins = Math.floor(ms / 60000);
                                 if (mins > 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
                                 return `${mins} min`;
                              } else if (ride.started_at) {
                                 const ms = new Date().getTime() - new Date(ride.started_at).getTime();
                                 const mins = Math.floor(ms / 60000);
                                 if (mins > 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
                                 return `${mins} min`;
                              }
                              return "--";
                           })()}
                        </span>
                     </div>
                     
                     <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                        <span className="text-[9px] font-bold text-emerald-600 uppercase mb-0.5">Total Fare</span>
                        <span className="text-[15px] font-black text-emerald-600 drop-shadow-sm">
                           ₹{new Intl.NumberFormat("en-IN").format(ride.agreed_fare || ride.estimated_fare_max || 0)}
                        </span>
                     </div>
                  </div>

                  <div className="z-10 mt-1">
                     <button
                        onClick={() => window.open(`https://maps.google.com/?q=${tracking?.pickup_lat || ""},${tracking?.pickup_lng || ""}`)}
                        className="w-full h-11 rounded-[14px] bg-indigo-50 text-indigo-700 text-xs font-black uppercase tracking-wide flex items-center justify-center gap-2 border border-indigo-100"
                     >
                        <Navigation size={14} className="stroke-[2.5]" /> Start Navigation
                     </button>
                  </div>
               </div>

               {/* Quick Support Menu */}
               <div className="bg-white rounded-[22px] p-4 border border-gray-100 shadow-sm mt-4">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                     Quick Support
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                     <button onClick={handleSOS} className="flex flex-col flex-1 items-center justify-center py-2.5 rounded-xl bg-red-50 border border-red-100 active:scale-95 transition-transform">
                        <Siren size={20} className="text-red-500 mb-1" />
                        <span className="text-[9px] font-black text-red-600 uppercase">SOS</span>
                     </button>
                     <button onClick={onCallPolice} className="flex flex-col flex-1 items-center justify-center py-2.5 rounded-xl bg-blue-50 border border-blue-100 active:scale-95 transition-transform">
                        <ShieldAlert size={20} className="text-blue-500 mb-1" />
                        <span className="text-[9px] font-black text-blue-600 uppercase">Call 112</span>
                     </button>
                     <button onClick={onQuickCancelRide} className="flex flex-col flex-1 items-center justify-center py-2.5 rounded-xl bg-amber-50 border border-amber-100 active:scale-95 transition-transform">
                        <X size={20} className="text-amber-500 mb-1" />
                        <span className="text-[9px] font-black text-amber-600 uppercase">Cancel Ride</span>
                     </button>
                     <button onClick={onBMGSupport} className="flex flex-col flex-1 items-center justify-center py-2.5 rounded-xl bg-gray-50 border border-gray-200 active:scale-95 transition-transform">
                        <Menu size={20} className="text-gray-500 mb-1" />
                        <span className="text-[9px] font-black text-gray-600 uppercase">Support</span>
                     </button>
                  </div>
               </div>

            </div>
         </motion.div>

         {/* Map Fullscreen Layer */}
         <AnimatePresence>
            {mapFullscreen && (
               <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[90] bg-black"
               >
                  <LiveMap
                     className="absolute inset-0 h-full w-full"
                     pickup={mapStartPoint}
                     drop={mapEndPoint}
                     distance={liveRouteKm != null ? `${liveRouteKm.toFixed(1)} KM` : "-"}
                     duration={liveEtaMins != null ? `${liveEtaMins} MINS` : "-"}
                     showMetrics={false}
                     pickupMarkerMode={isTripInProgress ? "hidden" : "user"}
                     dropMarkerMode={isTripInProgress ? "default" : "hidden"}
                     showDriverMarker={Boolean(mapStartPoint)}
                     driverMarkerAt={isTripInProgress ? "pickup" : "drop"}
                  />
                  <button
                     onClick={() => setMapFullscreen(false)}
                     className="absolute top-5 right-5 w-11 h-11 rounded-full bg-white text-gray-900 shadow-lg border border-gray-100 flex items-center justify-center"
                     aria-label="Close full map"
                  >
                     <X size={18} />
                  </button>
               </motion.div>
            )}
         </AnimatePresence>

         {/* Chat Overlay */}
      {createPortal(
        <AnimatePresence>
          {showChat && (
            <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} className="fixed inset-0 z-[100000] bg-gray-900/40 backdrop-blur-sm flex flex-col justify-end sm:items-center sm:justify-center">
               <div className="bg-white w-full sm:w-[400px] h-[85vh] sm:h-[600px] rounded-t-[32px] sm:rounded-[32px] shadow-2xl flex flex-col overflow-hidden">
                  <div className="bg-gray-900 p-4 border-b border-gray-800 flex items-center justify-between shadow-soft">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 border border-blue-500/30">
                         <MessageSquare size={18} />
                      </div>
                      <div>
                         <h3 className="text-white font-black text-sm tracking-wide">Chat with Customer</h3>
                         <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest">{(ride as RiderActiveRide)?.customer_name || "Customer"}</p>
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
                        <p className="text-xs text-gray-400 text-center px-6 mt-1 flex-wrap">Say hi to the customer regarding location or time</p>
                     </div>
                  )}
                  {messages.map((msg) => {
                     const isMe = msg.sender_type === "driver";
                     return (
                        <div key={msg.id} className={`flex w-full shrink-0 ${isMe ? 'justify-end' : 'justify-start'}`}>
                           <div className={`max-w-[75%] p-3 sm:p-4 rounded-[20px] text-sm font-medium leading-relaxed ${isMe ? 'bg-blue-600 text-white rounded-tr-sm shadow-md shadow-blue-500/20' : 'bg-white border border-gray-100 text-gray-800 shadow-soft rounded-tl-sm'}`}>
                             {msg.message}
                           </div>
                        </div>
                     )
                  })}
                </div>
                
                {/* Default Messages (Quick Replies) */}
                <div className="bg-white px-4 pt-3 pb-1 flex gap-2 overflow-x-auto no-scrollbar shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
                  {["I've arrived", "Where exactly are you?", "Traffic is heavy, be there soon", "Okay", "Please call me"].map(text => (
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
                    className="h-14 flex-1 rounded-2xl bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 px-4 text-sm font-bold text-gray-900 placeholder:text-gray-400 outline-none transition-all" 
                    placeholder="Type a message..." 
                  />
                  <button onClick={sendMessage} disabled={!chatText.trim()} className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center disabled:opacity-50 shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-600 active:scale-95 shrink-0">
                     <Send size={20} className="-ml-0.5" />
                  </button>
                </div>
             </div>
          </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Bottom Sticky Action Button */}
         {rideStatus === "pending" && (
            <div className="fixed bottom-[98px] left-0 right-0 px-6 pb-safe z-50 bg-white/90 backdrop-blur-lg pt-4 border-t border-gray-100">
           <div className="flex gap-2 mb-3">
              <input 
                value={counterAmount} onChange={(e) => setCounterAmount(e.target.value)}
                placeholder="Enter counter fare..." className="flex-1 h-14 bg-gray-50 border border-gray-200 rounded-2xl px-4 text-sm font-bold text-gray-900 outline-none focus:border-blue-400" 
              />
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={onNegotiate} 
                disabled={loading} 
                className="px-6 bg-gray-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg"
              >
                 Negotiate
              </motion.button>
           </div>
           
           <div className="flex gap-3">
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={onReject} 
                disabled={loading} 
                className="w-[80px] h-[64px] rounded-2xl border-2 border-rose-100 bg-rose-50 text-rose-500 font-black flex items-center justify-center"
              >
                 <X size={24} />
              </motion.button>
              <motion.button 
                whileTap={{ scale: 0.98 }}
                onClick={onAccept} 
                disabled={loading} 
                className="flex-1 h-[64px] rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-600/20 font-black text-sm tracking-widest uppercase flex items-center justify-center gap-2"
              >
                 Accept Ride <ChevronRight size={20} />
              </motion.button>
           </div>
        </div>
      )}

         </div>
      </div>
  );
};

export default RiderRideDetailsPage;
