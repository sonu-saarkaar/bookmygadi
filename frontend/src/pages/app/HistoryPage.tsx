import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authStore, backendApi, type Ride } from "@/services/backendApi";
import { History, ChevronRight, CheckCircle2, XCircle, MapPin, SearchX, IndianRupee } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ACTIVE_RIDE_STATUSES = new Set([
  "pending",
  "searching",
  "assigned",
  "accepted",
  "driver_arrived",
  "arriving",
  "started",
  "in_progress",
]);

const formatRideDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const dateLabel = date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const timeLabel = date
    .toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
    .toLowerCase();
  return `${dateLabel} · ${timeLabel}`;
};

const HistoryPage = () => {
  const navigate = useNavigate();
  const [rides, setRides] = useState<Ride[]>([]);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [payingRideId, setPayingRideId] = useState("");

  useEffect(() => {
    const load = async () => {
      const token = authStore.getToken();
      if (!token) return;
      try {
        const rows = await backendApi.listRides(token);
        setRides(
          rows.sort((a, b) => {
            const bTime = new Date(b.created_at || b.updated_at).getTime();
            const aTime = new Date(a.created_at || a.updated_at).getTime();
            return bTime - aTime;
          }),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load history");
      }
    };
    load();
    const intervalId = setInterval(load, 5000); // Refresh every 5 seconds
    return () => clearInterval(intervalId);
  }, []);

  const shown = useMemo(() => {
    if (filter === "all") return rides;
    return rides.filter((r) => r.status === filter);
  }, [rides, filter]);

  const openUpi = (fare: number) => {
    window.open(`upi://pay?pa=bookmygadi@upi&pn=BookMyGadi&am=${fare}&cu=INR`, "_self");
  };

  const markPaid = async (rideId: string) => {
    const token = authStore.getToken();
    if (!token) return;
    try {
      setPayingRideId(rideId);
      await backendApi.markRidePayment(rideId, { payment_method: "upi" }, token);
      setRides((prev) => prev.map((r) => (r.id === rideId ? { ...r, payment_status: "paid" } : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update payment");
    } finally {
      setPayingRideId("");
    }
  };

  return (
    <div className="relative isolate w-full px-2 min-h-[90vh]">
      <div className="py-2 px-1 mb-6 flex justify-between items-end">
        <div>
           <h1 className="text-3xl font-black text-gray-900 tracking-tight">Your Rides</h1>
           <p className="text-sm font-medium text-gray-500 mt-1">Past trips and upcoming schedules.</p>
        </div>
        <div className="h-12 w-12 rounded-full bg-emerald-50 text-primary-accent flex items-center justify-center shadow-soft">
           <History size={22} />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-4 -mx-2 px-2">
        {["all", "completed", "cancelled", "rejected"].map((f) => (
          <button 
             key={f} onClick={() => setFilter(f)} 
             className={`shrink-0 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 ${filter === f ? "bg-gray-900 text-white shadow-float" : "bg-white text-gray-400 shadow-soft"}`}
          >
            {f}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-500">{error}</p>}

      <div className="space-y-4">
        {shown.length === 0 && (
           <div className="bg-white rounded-3xl border border-gray-100 shadow-soft p-10 flex flex-col items-center text-center mt-4">
              <SearchX size={40} className="text-gray-200 mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-1">No Rides Found</h3>
              <p className="text-sm text-gray-500">You haven't taken any trips that match this filter.</p>
           </div>
        )}
        <AnimatePresence>
          {shown.map((ride, i) => (
            <motion.div 
               initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
               key={ride.id} 
               className="bg-white rounded-3xl border border-gray-100 shadow-soft overflow-hidden relative"
            >
              <div 
                className="p-5 cursor-pointer active:scale-[0.98] transition-transform"
                onClick={() => {
                  const bookedAt = ride.created_at || ride.accepted_at || ride.updated_at;
                  const payload = {
                    rideId: ride.id, pickup: ride.pickup_location, destination: ride.destination,
                    vehicleType: ride.vehicle_type, offerPrice: ride.agreed_fare || ride.requested_fare || ride.estimated_fare_max || 0,
                    bookedAt,
                  };
                  sessionStorage.setItem("bmg_active_booking", JSON.stringify(payload));
                  localStorage.setItem("bmg_active_booking", JSON.stringify(payload));

                  if (ride.status === 'completed' && ride.payment_status !== 'paid') {
                    navigate(`/app/payment/${ride.id}`);
                  } else if (ride.status === 'completed' && ride.payment_status === 'paid') {
                    navigate(`/app/completed-ride/${ride.id}`);
                  } else if (ride.status === 'cancelled') {
                      navigate("/app/booking-cancelled");
                  } else if (ride.status === 'rejected') {
                      navigate("/app/booking-rejected");
                  } else if (ACTIVE_RIDE_STATUSES.has((ride.status || "").toLowerCase())) {
                      navigate("/app/booking-confirmed", { state: payload });
                  } else {
                      navigate("/app/booking-confirmed", { state: payload });
                  }
                }}
              >
                <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          {formatRideDate(ride.created_at || ride.accepted_at || ride.updated_at)}
                      </p>
                      <p className="text-sm font-bold text-gray-500 mt-1">ID: BMG-{ride.id.slice(-6).toUpperCase()}</p>
                    </div>
                    <div className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter border ${
                        ride.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        ride.status === 'cancelled' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                        ride.status === 'rejected' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        'bg-blue-50 text-blue-600 border-blue-100'
                    }`}>
                        {ride.status}
                    </div>
                </div>

                <div className="space-y-4 relative">
                    <div className="absolute left-[7px] top-[7px] bottom-[7px] w-[2px] bg-gray-100"></div>
                    <div className="flex gap-3 relative">
                      <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                          <div className="w-2 h-2 rounded-full bg-blue-500 relative z-10"></div>
                      </div>
                      <div>
                          <p className="font-bold text-gray-900 text-sm leading-tight">{ride.pickup_location}</p>
                      </div>
                    </div>
                    <div className="flex gap-3 relative">
                      <div className="w-4 h-4 bg-red-100 flex items-center justify-center shrink-0 mt-0.5 relative z-10">
                          <div className="w-2 h-2 bg-red-400"></div>
                      </div>
                      <div>
                          <p className="font-bold text-gray-900 text-sm leading-tight">{ride.destination}</p>
                      </div>
                    </div>
                </div>
              </div>

              {(ride.status === 'completed' && ride.payment_status !== 'paid') && (
                <div className="bg-gray-50/70 px-5 py-4 border-t border-gray-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-gray-500">Payment Pending</p>
                      <p className="text-lg font-black text-gray-900">₹{ride.agreed_fare || 0}</p>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card click event from firing
                        const payload = {
                          rideId: ride.id, pickup: ride.pickup_location, destination: ride.destination,
                          vehicleType: ride.vehicle_type, offerPrice: ride.agreed_fare || ride.requested_fare || ride.estimated_fare_max || 0
                        };
                        sessionStorage.setItem("bmg_active_booking", JSON.stringify(payload));
                        navigate(`/app/payment/${ride.id}`);
                      }}
                      disabled={payingRideId === ride.id}
                      className="px-5 py-3 rounded-xl bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                    >
                      {payingRideId === ride.id ? "Processing..." : "Pay Now"} <IndianRupee size={16} />
                    </button>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default HistoryPage;
