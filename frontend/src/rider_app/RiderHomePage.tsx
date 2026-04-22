import { useEffect, useRef, useState } from "react";
import { riderApi, type RiderActiveRide, type RiderRequest } from "@/services/riderApi";
import { backendApi, authStore } from "@/services/backendApi";
import { formatPreciseReverseAddress, reverseGeocodeWithGoogle } from "@/services/googleMaps";
import { useNavigate } from "react-router-dom";
import { notifyEvent, playSound, stopAlarm } from "@/services/notificationCenter";
import { motion, AnimatePresence } from "framer-motion";
import { User, Wallet, Navigation, Clock, Power, CheckCircle2, ChevronRight, X, PlusCircle, LocateFixed } from "lucide-react";

// The Rider Home Layout Request:
// Left: Profile section
// Center: Status toggle / location equivalent 
// Right: Earnings or vehicle toggle
// Below: Single & Multiple rides toggle (for rider, we'll map this to Instant Ride requests vs reserve requests or simply a toggle to filter the request view).

const RiderHomePage = () => {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(true);
  const [hasApprovedVehicle, setHasApprovedVehicle] = useState<boolean | null>(null);
  const [hasSubmittedVehicle, setHasSubmittedVehicle] = useState(false);
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<RiderRequest[]>([]);
  const [activeRides, setActiveRides] = useState<RiderActiveRide[]>([]);
  const [notice, setNotice] = useState("");
  const [viewType, setViewType] = useState<"Instant Ride" | "reserve">("Instant Ride");
  const [counterOffers, setCounterOffers] = useState<Record<string, string>>({});
  const [riderLocation, setRiderLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [riderLocationLabel, setRiderLocationLabel] = useState("");
  const [locationError, setLocationError] = useState("");
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const lastRequestCountRef = useRef(0);

  const [riderProfileData, setRiderProfileData] = useState<{ name: string; avatar: string | null; scale: number; x: number; y: number }>({ name: "Driver", avatar: null, scale: 1, x: 0, y: 0 });

  useEffect(() => {
    const loadProfile = async () => {
      const raw = localStorage.getItem("bmg_rider_profile_edit");
      const local = raw ? JSON.parse(raw) : null;
      let fetchedName = "Driver";
      try {
        const token = authStore.getToken();
        if (token) {
          const profile = await backendApi.me(token);
          fetchedName = profile.name || "Driver";
        }
      } catch (error) {
        // ignore
      }

      setRiderProfileData({
         name: local?.display_name || fetchedName,
         avatar: local?.avatar_data || null,
         scale: local?.avatar_scale || 1,
         x: local?.avatar_x || 0,
         y: local?.avatar_y || 0,
      });
    };
    
    loadProfile();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "bmg_rider_profile_edit") loadProfile();
    };
    window.addEventListener("storage", handleStorage);
    const handleCustomUpdate = () => loadProfile();
    window.addEventListener("bmg_rider_profile_updated", handleCustomUpdate);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("bmg_rider_profile_updated", handleCustomUpdate);
    };
  }, []);

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  const loadRequests = async () => {
    try {
      const rows = await riderApi.listRequests();
      const active = await riderApi.listActiveRides();
      
      if (rows.length > lastRequestCountRef.current && rows.length > 0) {
        notifyEvent({ event: "alarm", title: "New Ride Request", body: "Customer request available.", tag: `new-ride` }).catch(() => undefined);
      } else if (rows.length === 0) {
        stopAlarm();
      }
      setRequests(rows);
      lastRequestCountRef.current = rows.length;
      setActiveRides(active);
    } catch {
       // Silent fail
    }
  };

  useEffect(() => {
    const checkVehicle = async () => {
      const token = authStore.getToken();
      if (!token) {
        setHasApprovedVehicle(false);
        setHasSubmittedVehicle(false);
        setIsOnline(false);
        return;
      }
      try {
        const rows = await backendApi.listMyRiderVehicleRegistrations(token);
        if (rows.length === 0) {
          setHasApprovedVehicle(false);
          setHasSubmittedVehicle(false);
          setIsOnline(false);
        } else {
          setHasSubmittedVehicle(true);
          const approved = rows.some((r) => (r.status || "").toLowerCase() === "approved");
          setHasApprovedVehicle(approved);
          if (!approved) setIsOnline(false);
        }
      } catch {
        setHasApprovedVehicle(false);
        setHasSubmittedVehicle(false);
        setIsOnline(false);
      }
    };
    checkVehicle();
  }, []);

  useEffect(() => {
    if (isOnline) {
      loadRequests();
    }
    const id = window.setInterval(() => { if (isOnline) loadRequests(); }, 4000);
    return () => window.clearInterval(id);
  }, [isOnline]);

  useEffect(() => {
    // 1. Android Native Bridge polling (Overrides HTTP secure context bounds)
    if ((window as any).AndroidInterface && typeof (window as any).AndroidInterface.getNativeLocation === 'function') {
      const pollId = setInterval(() => {
        try {
          const locStr = (window as any).AndroidInterface.getNativeLocation();
          if (locStr && locStr !== "null") {
            const { lat, lng } = JSON.parse(locStr);
            setRiderLocation({ lat, lng });
            setLocationError("");
          } else {
             if (!riderLocation) setLocationError("Detecting location...");
          }
        } catch {
          setLocationError("Location hook error");
        }
      }, 2000);
      return () => clearInterval(pollId);
    }

    // 2. HTML5 Wrapper fallback
    if (!navigator.geolocation) {
      setLocationError("Location service unavailable");
      return;
    }

    const watcherId = navigator.geolocation.watchPosition(
      (position) => {
        setRiderLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationError("");
      },
      () => {
        setLocationError("Location permission needed");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      },
    );

    return () => navigator.geolocation.clearWatch(watcherId);
  }, []);

  useEffect(() => {
    if (!riderLocation) return;

    const controller = new AbortController();
    const loadReadableLocation = async () => {
      try {
        const googleLabel = await reverseGeocodeWithGoogle(riderLocation.lat, riderLocation.lng, controller.signal);
        if (googleLabel) {
          setRiderLocationLabel(googleLabel);
          return;
        }

        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${riderLocation.lat}&lon=${riderLocation.lng}`,
          {
            signal: controller.signal,
            headers: { "Accept-Language": "en-IN,en;q=0.9" },
          },
        );
        if (!response.ok) return;
        const data = await response.json();
        const label = formatPreciseReverseAddress(data, riderLocation.lat, riderLocation.lng);
        if (label) setRiderLocationLabel(String(label));
      } catch {
        // Keep coordinate fallback on network/geocode failure.
      } finally {
        setIsRefreshingLocation(false);
      }
    };

    void loadReadableLocation();
    return () => controller.abort();
  }, [riderLocation?.lat, riderLocation?.lng]);

  const refreshRiderLocation = () => {
    setIsRefreshingLocation(true);
    setLocationError("");
    setRiderLocationLabel("");

    const applyCoords = (lat: number, lng: number) => {
      setRiderLocation({ lat, lng });
      setIsRefreshingLocation(false);
    };

    if ((window as any).AndroidInterface && typeof (window as any).AndroidInterface.getNativeLocation === "function") {
      try {
        const locStr = (window as any).AndroidInterface.getNativeLocation();
        if (locStr && locStr !== "null") {
          const { lat, lng } = JSON.parse(locStr);
          applyCoords(lat, lng);
          return;
        }
      } catch {
        // Fall back to browser geolocation.
      }
    }

    if (!navigator.geolocation) {
      setLocationError("Location service unavailable");
      setIsRefreshingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        applyCoords(position.coords.latitude, position.coords.longitude);
      },
      () => {
        setLocationError("Unable to refresh live location");
        setIsRefreshingLocation(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 12000,
      },
    );
  };

  const onAccept = async (rideId: string, agreedFare?: number | null) => {
    setLoading(true);
    try {
      stopAlarm();
      const acceptedRide = await riderApi.acceptRequest(rideId, agreedFare ?? undefined);
      playSound("confirmation");
      setNotice("Ride accepted successfully.");
      await loadRequests();
      navigate(`/rider/booking-accepted/${acceptedRide.booking_display_id || rideId}`, { state: { ride: acceptedRide } });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Ride accept failed");
      setTimeout(() => setNotice(""), 3000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // We no longer force navigate to the map view if there is an active ride.
  }, [activeRides, navigate]);

  const onReject = async (rideId: string) => {
    setLoading(true);
    try {
      await riderApi.rejectRequest(rideId);
      playSound("cancel");
      loadRequests();
    } finally { setLoading(false); }
  };

  const onNegotiate = async (rideId: string) => {
    const raw = (counterOffers[rideId] || "").trim().replace(/,/g, "");
    const amount = Number(raw);
    if (!amount || amount < 1) return;
    setLoading(true);
    try {
      await riderApi.negotiateRequest(rideId, amount);
      setNotice("Counter offer sent.");
      loadRequests();
      setTimeout(() => setNotice(''), 3000);
    } finally { setLoading(false); }
  };

  return (
    <div className="relative isolate w-full px-4 pt-2">
      <AnimatePresence mode="wait">
        {notice && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 bg-gray-900 text-white rounded-full text-sm font-medium shadow-glass-hard whitespace-nowrap"
          >
            {notice}
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP HEADER: Following Customer Request Original Layout pattern */}
      <div className="flex items-center justify-between py-1 mb-5">
        <motion.div 
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate("/rider/profile")} 
          className="w-12 h-12 rounded-full shadow-soft flex items-center justify-center border border-gray-100 cursor-pointer transition-transform shrink-0 relative overflow-hidden bg-gradient-to-b from-gray-900 to-gray-800"
        >
             {riderProfileData.avatar ? (
                <img 
                  src={riderProfileData.avatar} 
                  alt="rider" 
                  className="absolute w-full h-full object-cover" 
                  style={{ transform: `translate(calc(-50% + ${riderProfileData.x}px), calc(-50% + ${riderProfileData.y}px)) scale(${riderProfileData.scale})`, left: '50%', top: '50%' }} 
                />
             ) : (
                <span className="text-xl font-black text-white object-cover relative">
                  {(riderProfileData.name !== "Driver" ? riderProfileData.name : "D").trim().charAt(0).toUpperCase()}
                </span>
             )}
        </motion.div>

        <div className="flex-1 mx-3 min-w-0">
          <div
            className="h-12 rounded-full bg-white border border-gray-100 shadow-soft flex items-center px-3 gap-2 cursor-pointer active:opacity-80"
            onClick={refreshRiderLocation}
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${locationError ? "bg-rose-50 text-rose-500" : "bg-emerald-50 text-emerald-600"}`}>
              <LocateFixed size={14} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Rider Location</p>
              <p className={`text-[11px] font-black text-gray-800 truncate ${isRefreshingLocation ? "animate-pulse" : ""}`}>
                {locationError
                  ? locationError
                  : riderLocation
                    ? riderLocationLabel
                      ? riderLocationLabel
                      : "Fetching exact location..."
                    : isRefreshingLocation ? "Fetching live location..." : "Detecting location..."}
              </p>
            </div>
          </div>
        </div>
        
        <motion.div 
            whileTap={{ opacity: 0.6 }}
            className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 shadow-soft flex flex-col items-center justify-center shrink-0 relative cursor-pointer"
            onClick={() => navigate('/rider/earning')}
        >
           <Wallet size={18} className="text-blue-600 mb-0.5" />
           <span className="text-[8px] font-bold text-blue-800">Earn</span>
        </motion.div>
      </div>

      <motion.button
        whileTap={{ scale: hasApprovedVehicle ? 0.98 : 1 }}
        onClick={() => {
          if (hasApprovedVehicle) setIsOnline(!isOnline);
        }}
        className={`w-full h-12 mb-5 rounded-2xl border shadow-soft flex items-center justify-center gap-2 font-black text-xs tracking-wide transition-all ${
          hasApprovedVehicle
            ? isOnline
              ? "bg-emerald-600 text-white border-emerald-600"
              : "bg-white text-emerald-700 border-emerald-300"
            : "bg-gray-100 text-gray-400 border-gray-200"
        }`}
      >
        <Power size={16} />
        {isOnline ? "TURNED LIVE" : "TURN LIVE"}
      </motion.button>

      {/* FILTER BUTTONS: Single vs Reserve (Equivalent to Single/Multiple in User App) */}
      <div className="bg-gray-100 p-1 rounded-2xl flex items-center gap-1 mb-6">
         <motion.button 
           whileTap={{ scale: 0.98 }}
           onClick={() => setViewType('Instant Ride')}
           className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${viewType === 'Instant Ride' ? 'bg-white shadow-soft text-gray-900' : 'text-gray-500 hover:bg-gray-200'}`}
         >
           <Navigation size={14} className={viewType === 'Instant Ride' ? 'text-blue-500' : ''}/> Instant Rides
           {pendingCount > 0 && <span className="ml-1 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[9px]">{pendingCount}</span>}
         </motion.button>
         <motion.button 
           whileTap={{ scale: 0.98 }}
           onClick={() => setViewType('reserve')}
           className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${viewType === 'reserve' ? 'bg-white shadow-soft text-gray-900' : 'text-gray-500 hover:bg-gray-200'}`}
         >
           <Clock size={14} className={viewType === 'reserve' ? 'text-blue-500' : ''}/> Reserve Trips
         </motion.button>
      </div>

      {/* Requests List */}
      <h2 className="text-xl font-black text-gray-900 tracking-tight mb-4 px-1">Nearby Requests</h2>
      
        {requests.length === 0 && hasApprovedVehicle === false && !hasSubmittedVehicle && (
          <div className="w-full bg-white rounded-3xl border border-gray-100 shadow-[0_8px_40px_rgba(0,0,0,0.04)] flex flex-col items-center justify-center p-8 text-center mt-4">
            <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-5">
               <PlusCircle size={32} />
            </div>
            <h3 className="font-black text-rose-600 text-lg mb-2">No Gadi Linked</h3>
            <p className="text-gray-500 font-medium text-sm mb-8">
              You cannot go online without an active vehicle. Please register your Gadi to start receiving bookings.
            </p>
            <motion.button 
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate("/rider/vehicle/new")}
              className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-bold tracking-wide shadow-[0_4px_20px_rgba(79,70,229,0.3)] transition-all hover:bg-indigo-700 flex items-center justify-center gap-2"
            >
              Link your Gadi <ChevronRight size={18}/>
            </motion.button>
          </div>
        )}

        {requests.length === 0 && hasApprovedVehicle === false && hasSubmittedVehicle && (
          <div className="w-full bg-white rounded-3xl border border-amber-100 shadow-[0_8px_40px_rgba(0,0,0,0.04)] flex flex-col items-center justify-center p-8 text-center mt-4">
            <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-5">
               <Clock size={32} />
            </div>
            <h3 className="font-black text-amber-700 text-lg mb-2">Vehicle Under Review</h3>
            <p className="text-gray-500 font-medium text-sm mb-6">
              Your Gadi registration is submitted and waiting for admin approval. Turn Live will unlock automatically after approval.
            </p>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate('/rider/profile')}
              className="w-full py-3 rounded-2xl bg-gray-900 text-white font-bold tracking-wide"
            >
              Check Registration Status
            </motion.button>
          </div>
        )}

        {requests.length === 0 && hasApprovedVehicle !== false && (
           <div className="w-full h-[200px] bg-white rounded-3xl border border-gray-100 shadow-[0_8px_40px_rgba(0,0,0,0.04)] flex flex-col items-center justify-center text-gray-400 mt-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${isOnline ? 'bg-indigo-50 text-indigo-500' : 'bg-gray-50 text-gray-300'}`}>
                 <Power size={24} />
              </div>
              <p className="font-bold text-gray-500">{isOnline ? 'Searching for customers...' : 'You are currently offline'}</p>
           </div>
        )}

      <div className="space-y-4 pb-20">
        <AnimatePresence>
          {requests.map(ride => (
            <motion.div 
              key={ride.id}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[24px] shadow-soft border border-gray-100 overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
              onClick={() => navigate(`/rider/booking-accepted/${ride.booking_display_id || ride.id}`, { state: { ride } })}
            >
              <div className="px-5 py-4 border-b border-gray-50 flex justify-between items-start">
                 <div>
                    <div className="flex gap-1.5 mb-1.5 flex-wrap">
                      <span className="px-2 py-0.5 bg-gray-900 rounded text-[9px] font-black uppercase text-white tracking-widest leading-normal">
                         {ride.vehicle_type}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest leading-normal ${ride.preference?.urgency_type === 'reserve' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                         {ride.preference?.urgency_type === 'reserve' ? 'Reservation' : 'Instant Ride'}
                      </span>
                      {ride.preference?.booking_mode && (
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest leading-normal ${
                          ride.preference.booking_mode === 'emergency' ? 'bg-rose-100 text-rose-600' : 
                          ride.preference.booking_mode === 'quick' ? 'bg-amber-100 text-amber-600' : 
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {ride.preference.booking_mode === 'emergency' ? 'SOS' : ride.preference.booking_mode}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-gray-400">{new Date(ride.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
                 </div>
                 <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-0.5">Offered Fare</p>
                    <p className="text-2xl font-black text-blue-600 tracking-tighter">₹{new Intl.NumberFormat("en-IN").format(ride.latest_offer_amount || ride.requested_fare || ride.estimated_fare_max || 0)}</p>
                 </div>
              </div>

              <div className="p-5 space-y-4 relative">
                 <div className="absolute left-[26px] top-[26px] bottom-[26px] w-[2px] bg-gray-100"></div>
                 
                 <div className="flex gap-4 relative">
                    <div className="w-3 h-3 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 relative z-10"></div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-gray-400">Pickup</p>
                      <p className="font-bold text-gray-900 text-sm leading-tight mt-0.5">{ride.pickup_location}</p>
                    </div>
                 </div>

                 <div className="flex gap-4 relative">
                    <div className="w-3 h-3 bg-red-100 flex items-center justify-center shrink-0 mt-1 relative z-10">
                       <div className="w-1.5 h-1.5 bg-red-400"></div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-gray-400">Drop</p>
                      <p className="font-bold text-gray-900 text-sm leading-tight mt-0.5">{ride.destination}</p>
                    </div>
                 </div>
              </div>

              <div className="px-5 pb-5 bg-gray-50/50 pt-4">
                 <div className="flex gap-2 mb-3">
                    <input 
                      onClick={(e) => e.stopPropagation()}
                      value={counterOffers[ride.id] || ""} onChange={(e) => setCounterOffers((prev) => ({ ...prev, [ride.id]: e.target.value }))}
                      placeholder="Enter counter fare..." className="flex-1 h-12 bg-white border border-gray-200 rounded-xl px-4 text-sm font-bold text-gray-900 outline-none focus:border-blue-400" 
                    />
                    <motion.button 
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => { e.stopPropagation(); onNegotiate(ride.id); }} 
                      disabled={loading} 
                      className="px-5 bg-gray-900 text-white rounded-xl text-xs font-bold whitespace-nowrap"
                    >
                       Send Offer
                    </motion.button>
                 </div>
                 
                 <div className="flex gap-2">
                    <motion.button 
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => { e.stopPropagation(); onReject(ride.id); }} 
                      disabled={loading} 
                      className="w-[80px] h-[52px] rounded-xl border border-rose-200 bg-rose-50 text-rose-500 font-bold text-sm tracking-wide"
                    >
                       <X size={20} className="mx-auto" />
                    </motion.button>
                    <motion.button 
                      whileTap={{ scale: 0.98 }}
                      onClick={(e) => { e.stopPropagation(); onAccept(ride.id, ride.latest_offer_amount || ride.estimated_fare_max); }} 
                      disabled={loading} 
                      className="flex-1 h-[52px] rounded-xl bg-blue-600 text-white shadow-float font-bold text-[15px] tracking-wide flex items-center justify-center gap-2"
                    >
                       Accept Ride <ChevronRight size={18} />
                    </motion.button>
                 </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default RiderHomePage;


