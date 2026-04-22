import { useEffect, useState } from "react";
import { riderApi, type RiderActiveRide } from "@/services/riderApi";
import { useNavigate } from "react-router-dom";
import { Navigation, MapPin, Search, Calendar, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const getRideModeLabel = (ride: RiderActiveRide) => {
  const urgency = String(ride.preference?.urgency_type || "").toLowerCase();
  if (urgency === "reserve") return "Reserve Booking";
  return "Instant Booking Active";
};

const RiderTrackPage = () => {
  const [rides, setRides] = useState<RiderActiveRide[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const rows = await riderApi.listActiveRides();
        setRides(rows);
      } catch {
      } finally {
        setLoading(false);
      }
    };
    load();
    const id = window.setInterval(load, 5000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="relative w-full min-h-[100vh] bg-[#F6F8FA] overflow-y-auto pb-[150px] px-6 pt-10">
      <div className="mb-6 flex justify-between items-end">
        <div>
           <h1 className="text-3xl font-black text-gray-900 tracking-tight">Track Rides</h1>
           <p className="text-sm font-medium text-gray-500 mt-1">Active and upcoming rides.</p>
        </div>
        <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shadow-soft shrink-0">
           <Navigation size={22} />
        </div>
      </div>

      <AnimatePresence>
        {loading && rides.length === 0 ? (
          <div className="flex justify-center py-10 opacity-0 animate-[fadeIn_0.5s_ease-in_forwards]">
            <div className="w-6 h-6 rounded-full border-[2px] border-gray-200 border-t-blue-600 animate-spin"></div>
          </div>
        ) : rides.length > 0 ? (
          <div className="space-y-4">
            {rides.map((ride, idx) => (
              <motion.div
                key={ride.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => navigate(`/rider/booking-accepted/${ride.booking_display_id || ride.id}`, { state: { ride } })}
                className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 active:scale-[0.98] transition-transform cursor-pointer tap-highlight-transparent relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-1 h-full bg-indigo-500"></div>
                <div className="flex justify-between items-start mb-4">
                   <div className="flex flex-col">
                      <span className="text-[10px] font-bold px-2 py-1 bg-emerald-50 text-emerald-600 uppercase tracking-widest rounded-md w-fit mb-2">
                        {getRideModeLabel(ride)}
                      </span>
                      <h3 className="font-bold text-gray-900 text-lg flex items-center gap-1">
                        <Calendar size={16} className="text-gray-400" />
                        ID: {ride.booking_display_id || ride.id}
                      </h3>
                   </div>
                   <div className="p-2 rounded-full bg-gray-50 transition-colors">
                     <ChevronRight size={18} className="text-gray-400" />
                   </div>
                </div>

                <div className="space-y-3 pl-1">
                  <div className="flex items-start gap-3">
                     <div className="mt-1"><MapPin size={14} className="text-emerald-500" /></div>
                     <p className="text-sm font-semibold text-gray-700 line-clamp-2">{ride.pickup_location}</p>
                  </div>
                  <div className="flex items-start gap-3">
                     <div className="mt-1"><MapPin size={14} className="text-rose-500" /></div>
                     <p className="text-sm font-semibold text-gray-700 line-clamp-2">{ride.destination}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="bg-white rounded-[32px] border border-gray-100 shadow-soft p-8 flex flex-col items-center justify-center text-center mt-4"
          >
            <div className="w-24 h-24 bg-gray-50 rounded-full flex justify-center items-center mb-6 shadow-sm">
                <Search size={40} className="text-gray-300" strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">No Active Rides</h2>
            <p className="mt-2 text-sm text-gray-500 leading-relaxed">
              When you accept instant or upcoming rides, they will appear here for tracking.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RiderTrackPage;
