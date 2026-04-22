import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authStore, backendApi, type RideNegotiation } from "@/services/backendApi";
import { notifyEvent, playSound } from "@/services/notificationCenter";
import { X, Navigation, CheckCircle2, Zap, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SearchingState { rideId: string; pickup: string; destination: string; vehicleType: string; offerPrice: number; distance?: number | string; }
const ACTIVE_BOOKING_STORAGE_KEY = "bmg_active_booking";
const ACTIVE_BOOKING_TOKEN_STORAGE_KEY = "bmg_active_booking_customer_token";

const readStoredBooking = (): SearchingState | null => {
  const raw = localStorage.getItem(ACTIVE_BOOKING_STORAGE_KEY) || sessionStorage.getItem(ACTIVE_BOOKING_STORAGE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as SearchingState; } catch { return null; }
};

const searchingMessages = ["Checking nearby drivers...", "Matching best route...", "Confirming fare & ETA...", "Connecting your ride..."];
const confirmedStatuses = new Set(["accepted", "in_progress", "arriving", "completed"]);
const rejectedStatuses = new Set(["rejected", "declined", "failed", "no_driver", "timeout", "expired"]);
type SheetSnap = "up" | "mid" | "down";

const SearchingPage = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const payloadFromRoute = state as SearchingState | null;
  const payload = payloadFromRoute || readStoredBooking();
  const safePayload = payload || { rideId: "", pickup: "", destination: "", vehicleType: "", offerPrice: 0, distance: "" };
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(15);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [notice, setNotice] = useState("");
  const [offerInput, setOfferInput] = useState(String(safePayload.offerPrice));
  const [latestNegotiation, setLatestNegotiation] = useState<RideNegotiation | null>(null);
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>("mid");

  const getSearchingSnap = (current: SheetSnap, direction: "up" | "down"): SheetSnap => {
    const order: SheetSnap[] = ["up", "mid", "down"];
    const index = order.indexOf(current);
    if (direction === "up") return order[Math.max(0, index - 1)];
    return order[Math.min(order.length - 1, index + 1)];
  };

  useEffect(() => {
    if (payloadFromRoute?.rideId) {
      sessionStorage.setItem(ACTIVE_BOOKING_STORAGE_KEY, JSON.stringify(payloadFromRoute));
      localStorage.setItem(ACTIVE_BOOKING_STORAGE_KEY, JSON.stringify(payloadFromRoute));
    }
  }, [payloadFromRoute]);

  useEffect(() => {
    // Persist the customer token used for booking so status checks remain correct across tabs/sessions.
    const token = authStore.getToken();
    if (token) {
      sessionStorage.setItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY, token);
      localStorage.setItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY, token);
    }
  }, []);

  useEffect(() => {
    if (!safePayload.rideId) { navigate("/app/home", { replace: true }); return; }
    const msgId = window.setInterval(() => setMessageIndex((prev) => (prev + 1) % searchingMessages.length), 3000);
    const progressId = window.setInterval(() => setProgress((prev) => (prev >= 95 ? 95 : prev + 4)), 1000);
    return () => { window.clearInterval(msgId); window.clearInterval(progressId); };
  }, [navigate, safePayload.rideId]);

  useEffect(() => {
    if (!payload?.rideId) return;
    notifyEvent({ event: "searching", title: "Searching Rider", body: "BookMyGadi is finding nearby riders.", tag: `search-${safePayload.rideId}` }).catch(() => undefined);
    const id = window.setInterval(() => playSound("searching"), 9000);
    return () => window.clearInterval(id);
  }, [payload?.rideId]);

  useEffect(() => {
    if (!payload?.rideId) return;
    const token = localStorage.getItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY) || sessionStorage.getItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY) || authStore.getToken();
    if (!token) return;
    const checkStatus = async () => {
      try {
        const ride = await backendApi.getRide(safePayload.rideId, token);
        const status = ride.status.toLowerCase();

        if (confirmedStatuses.has(status)) {
          notifyEvent({ event: "confirmation", title: "Ride Confirmed", body: "A rider accepted your booking.", tag: `confirmed-${safePayload.rideId}` }).catch(() => undefined);
          localStorage.removeItem(ACTIVE_BOOKING_STORAGE_KEY);
          sessionStorage.removeItem(ACTIVE_BOOKING_STORAGE_KEY);
          localStorage.removeItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY);
          sessionStorage.removeItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY);
          navigate(`/app/booking-confirmed/${ride.booking_display_id || ride.id}`, { replace: true, state: { ...safePayload, status: ride.status, agreedFare: ride.agreed_fare ?? safePayload.offerPrice, isReserved: ride.preference?.urgency_type === 'reserve' } }); return;
        }
        if (rejectedStatuses.has(status)) {
          localStorage.removeItem(ACTIVE_BOOKING_STORAGE_KEY);
          sessionStorage.removeItem(ACTIVE_BOOKING_STORAGE_KEY);
          localStorage.removeItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY);
          sessionStorage.removeItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY);
          navigate("/app/booking-rejected", { replace: true, state: { ...safePayload, status: ride.status } }); return;
        }
        if (status === "cancelled") {
          localStorage.removeItem(ACTIVE_BOOKING_STORAGE_KEY);
          sessionStorage.removeItem(ACTIVE_BOOKING_STORAGE_KEY);
          localStorage.removeItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY);
          sessionStorage.removeItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY);
          navigate("/app/booking-cancelled", { replace: true, state: { ...safePayload, status: ride.status } });
        }
      } catch { /* ignore */ }
    };
    checkStatus(); const intervalId = window.setInterval(checkStatus, 1200);
    return () => window.clearInterval(intervalId);
  }, [navigate, safePayload.rideId]);

  useEffect(() => {
    if (!payload?.rideId) return;
    const token = localStorage.getItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY) || sessionStorage.getItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY) || authStore.getToken(); 
    if (!token) return;
    const loadNegotiations = async () => {
      try { const rows = await backendApi.listRideNegotiations(safePayload.rideId, token); setLatestNegotiation(rows.length > 0 ? rows[0] : null); } catch { /* ignore */ }
    };
    loadNegotiations(); const id = window.setInterval(loadNegotiations, 3000);
    return () => window.clearInterval(id);
  }, [payload?.rideId]);

  const dynamicMessage = useMemo(() => searchingMessages[messageIndex], [messageIndex]);

  const onCancelRide = async () => {
    if (!payload?.rideId) return;
    const token = localStorage.getItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY) || sessionStorage.getItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY) || authStore.getToken(); 
    if (!token) return;
    setLoading(true);
    try {
      await backendApi.updateRideStatus(safePayload.rideId, { status: "cancelled" }, token);
      playSound("cancel");
      localStorage.removeItem(ACTIVE_BOOKING_STORAGE_KEY);
      sessionStorage.removeItem(ACTIVE_BOOKING_STORAGE_KEY);
      localStorage.removeItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY);
      navigate("/app/booking-cancelled", { replace: true, state: { ...safePayload, status: "cancelled", reason: "Cancelled by user" } });
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to cancel"); } finally { setLoading(false); }
  };

  const submitOffer = async () => {
    if (!payload?.rideId) return;
    const token = localStorage.getItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY) || sessionStorage.getItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY) || authStore.getToken(); 
    if (!token) return;
    const amount = Number(offerInput);
    if (!amount || amount < 1) { setNotice("Enter valid amount"); return; }
    setActing(true);
    try {
      const row = await backendApi.createRideNegotiation(safePayload.rideId, amount, token);
      setLatestNegotiation(row); setNotice("Counter offer sent!");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to send"); } finally { setActing(false); setTimeout(() => setNotice(''), 3000); }
  };

  const respondToOffer = async (action: "accept" | "reject") => {
    if (!payload?.rideId || !latestNegotiation) return;
    const token = localStorage.getItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY) || sessionStorage.getItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY) || authStore.getToken(); 
    if (!token) return;
    setActing(true);
    try {
      const updated = await backendApi.actionRideNegotiation(safePayload.rideId, latestNegotiation.id, action, token);
      setLatestNegotiation(updated);
      setNotice(action === "accept" ? "Offer accepted." : "Offer rejected.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to respond"); } finally { setActing(false); setTimeout(() => setNotice(''), 3000); }
  };

  if (!safePayload.rideId) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#f3f5f7] flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-[0.14em] text-gray-500">Redirecting To Home...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-[#f3f5f7]">
      <div className="relative mx-auto h-full w-full max-w-md bg-white overflow-hidden shadow-2xl">
      <AnimatePresence>
         {notice && (
           <motion.div initial={{ opacity: 1, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 bg-gray-900 text-white rounded-full text-sm font-bold shadow-2xl whitespace-nowrap">
             {notice}
           </motion.div>
         )}
      </AnimatePresence>

      <div className="absolute inset-0 top-0 h-[40%] w-full flex flex-col items-center justify-center px-4 pb-8">
        <div className="relative mb-8 flex items-center justify-center">
           <div className="absolute w-40 h-40 bg-emerald-500 rounded-full blur-[50px] opacity-20 search-pulse"></div>
           <div className="w-32 h-32 rounded-[2rem] bg-white shadow-2xl border border-emerald-100 flex items-center justify-center relative z-10">
              <Navigation size={42} className="text-emerald-500 search-car-float" strokeWidth={1.5} />
           </div>
           <div className="absolute w-48 h-48 border-[3px] border-emerald-50 rounded-[2.5rem] opacity-50 z-0"></div>
           <div className="absolute w-64 h-64 border-2 border-emerald-50/50 rounded-[3.5rem] opacity-30 z-0"></div>
        </div>

        <AnimatePresence mode="wait">
           <motion.h2 key={messageIndex} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="text-2xl font-black text-gray-900 tracking-tight text-center mb-4">
             {dynamicMessage}
           </motion.h2>
        </AnimatePresence>

        <div className="w-full max-w-[280px] h-2 bg-gray-100 rounded-full mb-2 overflow-hidden">
           <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out relative overflow-hidden" style={{ width: `${progress}%` }}>
              <div className="absolute inset-0 bg-white/30 skew-x-[-20deg] animate-[shimmer_2s_infinite]"></div>
           </div>
        </div>
      </div>

      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 520 }}
        dragMomentum={false}
        dragTransition={{ bounceStiffness: 260, bounceDamping: 26, power: 0.15, timeConstant: 220 }}
        dragElastic={0.06}
        onDragEnd={(_, info) => {
          if (info.offset.y < -50) setSheetSnap((prev) => getSearchingSnap(prev, "up"));
          if (info.offset.y > 50) setSheetSnap((prev) => getSearchingSnap(prev, "down"));
        }}
        initial={false}
        animate={{ y: sheetSnap === "up" ? "0%" : sheetSnap === "mid" ? "20%" : "40%" }}
        transition={{ type: "spring", damping: 34, stiffness: 250, mass: 0.75 }}
        style={{ touchAction: "pan-y", willChange: "transform" }}
        className="absolute left-0 right-0 bottom-0 z-[1001] bg-white rounded-t-[30px] px-4 pt-3 pb-5 shadow-[0_-14px_38px_rgba(0,0,0,0.14)] h-auto max-h-[85%] flex flex-col"
      >
        <button
          type="button"
          onClick={() => setSheetSnap((prev) => (prev === "down" ? "mid" : prev === "mid" ? "up" : "down"))}
          className="mx-auto w-12 h-1.5 rounded-full bg-gray-300 mb-3 shrink-0"
          aria-label="Toggle ride details"
        />

        <div className="flex-1 min-h-0 shrink overflow-y-auto overflow-x-hidden overscroll-contain pr-1 pb-3 scroll-smooth touch-pan-y" style={{ WebkitOverflowScrolling: "touch" }}>
        <div className="w-full bg-white rounded-3xl p-4 border border-gray-100 mb-4">
           <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 mb-3">Ride Summary</p>

           <div className="grid grid-cols-2 gap-3 mb-4">
             <div className="rounded-2xl bg-gray-50 border border-gray-100 p-3">
               <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Your Offer</p>
               <p className="text-2xl font-black text-gray-900 mt-1">₹{new Intl.NumberFormat("en-IN").format(safePayload.offerPrice)}</p>
             </div>
               <div className="rounded-2xl bg-gray-50 border border-gray-100 p-3 text-right flex flex-col items-end">
                 <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Vehicle</p>
                 <div className="mt-1 flex items-center justify-end gap-1.5 flex-wrap">
                    <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                      {localStorage.getItem("bmg_service_mode") === "reserved" || localStorage.getItem("bmg_service_mode") === "reserve" ? "Reserve" : "Instant"}
                    </span>
                    <span className="text-base font-black text-gray-900 capitalize">
                      {localStorage.getItem("bmg_vehicle_type") || String(safePayload.vehicleType).toLowerCase()}
                    </span>
                 </div>
             </div>
           </div>

           <div className="rounded-2xl border border-gray-100 bg-white px-3 py-3 relative">
             <div className="flex items-start gap-3 relative z-10">
               <span className="mt-1 w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
               <div className="min-w-0 pr-14">
                 <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Pickup</p>
                 <p className="text-sm font-bold text-gray-800 truncate">{safePayload.pickup}</p>
               </div>
             </div>
             
             <div className="ml-[5px] my-1 w-[1px] h-5 bg-gray-200 relative z-10"></div>
             
             <div className="flex items-start gap-3 relative z-10">
               <span className="mt-1 w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></span>
               <div className="min-w-0 pr-14">
                 <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Drop</p>
                 <p className="text-sm font-bold text-gray-800 truncate">{safePayload.destination}</p>
               </div>
             </div>

             {safePayload.distance && (
               <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 shadow-sm flex items-center justify-center z-20">
                 <span className="text-[10px] font-black text-gray-400 tracking-wider whitespace-nowrap">
                   {safePayload.distance} KM
                 </span>
               </div>
             )}
           </div>
        </div>

        {latestNegotiation && (
            <div className="w-full bg-gray-900 rounded-3xl p-4 shadow-2xl mb-2 text-white relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/20 blur-2xl rounded-full mb-10 -mt-10 pointer-events-none"></div>
             <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1 flex items-center gap-1">New Counter Offer</p>
             <p className="text-xl font-bold mb-4">Driver asks for <span className="text-amber-400 font-black">₹{new Intl.NumberFormat("en-IN").format(latestNegotiation.amount)}</span></p>
             
             {latestNegotiation.status === "pending" && latestNegotiation.offered_by === "driver" ? (
               <div className="grid grid-cols-2 gap-3 relative z-10">
                 <button disabled={acting} onClick={() => respondToOffer("reject")} className="h-11 rounded-2xl bg-white/10 text-white font-bold">Decline</button>
                 <button disabled={acting} onClick={() => respondToOffer("accept")} className="h-11 rounded-2xl bg-amber-500 text-gray-900 font-bold shadow-float flex items-center justify-center gap-2"><CheckCircle2 size={16}/> Accept</button>
               </div>
             ) : (
               <div className="bg-white/10 rounded-xl p-3 text-sm text-center font-semibold capitalize">{latestNegotiation.status}</div>
             )}
          </div>
        )}

        {(!latestNegotiation || latestNegotiation?.status !== "pending") && (
            <div className="w-full rounded-3xl border border-emerald-100 bg-emerald-50/50 p-3 mb-2">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700 mb-2">Revise Fare</p>
            <div className="flex gap-2">
               <input value={offerInput} onChange={(e) => setOfferInput(e.target.value)} type="number" className="h-12 flex-1 rounded-xl bg-white border border-emerald-100 px-4 text-sm font-bold text-gray-900 outline-none focus:border-emerald-400" placeholder="Enter new offer (₹)" />
               <button disabled={acting} onClick={submitOffer} className="h-12 px-5 rounded-xl bg-emerald-600 text-white font-bold disabled:opacity-50">Send</button>
            </div>
          </div>
        )}
        </div>

          <div className="relative h-[68px] shrink-0 bg-rose-600 rounded-full p-2 flex items-center shadow-[0_12px_24px_rgba(225,29,72,0.28)] overflow-hidden">
          <motion.div
            drag={loading ? false : "x"}
            dragConstraints={{ left: 0, right: 240 }}
            dragElastic={0.02}
            onDragEnd={(_, info) => {
              if (info.offset.x > 185 && !loading) {
                onCancelRide();
              }
            }}
            className="w-[52px] h-[52px] bg-white rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing z-20"
          >
            <ChevronRight size={28} className="text-rose-600" strokeWidth={4} />
          </motion.div>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-white text-sm font-black uppercase tracking-[0.16em] flex items-center gap-2">
              <X size={16} /> {loading ? "Cancelling..." : "Swipe to Cancel"}
            </p>
          </div>
        </div>
      </motion.div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-150%) skewX(-20deg); }
          100% { transform: translateX(250%) skewX(-20deg); }
        }
      `}</style>
      </div>
    </div>
  );
};

export default SearchingPage;
