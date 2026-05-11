import { useEffect, useState } from "react";
import { riderApi, type RiderActiveRide } from "@/services/riderApi";
import { useNavigate } from "react-router-dom";
import { Navigation, MapPin, Search, Calendar, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const getRideModeLabel = (ride: RiderActiveRide) => {
  const urgency = String(ride.preference?.urgency_type || "").toLowerCase();
  if (urgency === "reserve") return "Reserve Booking";
  return "Instant Booking";
};

type TabType = "all" | "completed" | "active" | "reserve";

const RiderTrackPage = () => {
  const [rides, setRides] = useState<RiderActiveRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const rows = await riderApi.listAllRides();
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

  const allRides = rides;
  const completedRides = rides.filter((r) => r.status.toLowerCase() === "completed");
  const activeRides = rides.filter((r) => ["accepted", "arriving", "in_progress"].includes(r.status.toLowerCase()));
  const reserveRides = rides.filter((r) => String(r.preference?.urgency_type || "").toLowerCase() === "reserve");

  const getFilteredRides = () => {
    switch (activeTab) {
      case "all": return allRides;
      case "completed": return completedRides;
      case "active": return activeRides;
      case "reserve": return reserveRides;
      default: return [];
    }
  };

  const displayedRides = getFilteredRides();

  const tabs = [
    { id: "all", label: "All Rides", count: allRides.length },
    { id: "completed", label: "Completed", count: completedRides.length },
    { id: "active", label: "Active", count: activeRides.length },
    { id: "reserve", label: "Reserved", count: reserveRides.length },
  ];

  return (
    <div className="relative w-full min-h-[100vh] bg-[#F6F8FA] overflow-y-auto pb-[150px] px-4 pt-8">
      <div className="mb-4 flex justify-between items-end">
        <div>
           <h1 className="text-3xl font-black text-gray-900 tracking-tight">Rides</h1>
           <p className="text-sm font-medium text-gray-500 mt-1">Manage your rides history.</p>
        </div>
        <div className="h-10 w-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-soft shrink-0">
           <Navigation size={20} />
        </div>
      </div>

      <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-4 pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`relative px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all ${
              activeTab === tab.id
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-white text-gray-600 border border-gray-200"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full ${
                activeTab === tab.id ? "bg-white text-indigo-600" : "bg-indigo-100 text-indigo-700"
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {loading && rides.length === 0 ? (
          <motion.div key="loading" className="flex justify-center py-10 opacity-0 animate-[fadeIn_0.5s_ease-in_forwards]">
            <div className="w-6 h-6 rounded-full border-[2px] border-gray-200 border-t-indigo-600 animate-spin"></div>
          </motion.div>
        ) : displayedRides.length > 0 ? (
          <motion.div key="list" className="space-y-4">
            {displayedRides.map((ride, idx) => (
              <motion.div
                key={ride.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => navigate(`/rider/booking-accepted/${ride.booking_display_id || ride.id}`, { state: { ride } })}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:scale-[0.98] transition-transform cursor-pointer tap-highlight-transparent relative overflow-hidden"
              >
                <div className={`absolute top-0 right-0 w-1 h-full ${
                  ride.status === 'completed' ? 'bg-emerald-500' : 
                  ride.status === 'cancelled' ? 'bg-rose-500' : 'bg-indigo-500'
                }`}></div>
                <div className="flex justify-between items-start mb-3">
                   <div className="flex flex-col">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] font-bold px-2 py-1 uppercase tracking-widest rounded-md ${
                          String(ride.preference?.urgency_type).toLowerCase() === "reserve" 
                            ? "bg-amber-50 text-amber-700" 
                            : "bg-emerald-50 text-emerald-700"
                        }`}>
                          {getRideModeLabel(ride)}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-1 uppercase tracking-widest rounded-md ${
                          ride.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                          ride.status === 'cancelled' ? 'bg-rose-100 text-rose-700' :
                          'bg-indigo-100 text-indigo-700'
                        }`}>
                          {ride.status}
                        </span>
                      </div>
                      <h3 className="font-bold text-gray-900 text-base flex items-center gap-1">
                        <Calendar size={14} className="text-gray-400" />
                        ID: {ride.booking_display_id || ride.id}
                      </h3>
                   </div>
                   <div className="p-1.5 rounded-full bg-gray-50 transition-colors">
                     <ChevronRight size={16} className="text-gray-400" />
                   </div>
                </div>

                <div className="space-y-2 pl-1">
                  <div className="flex items-start gap-2">
                     <div className="mt-0.5"><MapPin size={14} className="text-emerald-500" /></div>
                     <p className="text-xs font-semibold text-gray-700 line-clamp-1">{ride.pickup_location}</p>
                  </div>
                  <div className="flex items-start gap-2">
                     <div className="mt-0.5"><MapPin size={14} className="text-rose-500" /></div>
                     <p className="text-xs font-semibold text-gray-700 line-clamp-1">{ride.destination}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div 
            key="empty"
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="bg-white rounded-[32px] border border-gray-100 shadow-soft p-8 flex flex-col items-center justify-center text-center mt-4"
          >
            <div className="w-20 h-20 bg-gray-50 rounded-full flex justify-center items-center mb-4 shadow-sm">
                <Search size={32} className="text-gray-300" strokeWidth={1.5} />
            </div>
            <h2 className="text-lg font-black text-gray-900 tracking-tight">No Rides Found</h2>
            <p className="mt-2 text-xs text-gray-500 leading-relaxed">
              There are no rides to show in the <strong>{tabs.find(t => t.id === activeTab)?.label}</strong> tab.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RiderTrackPage;
