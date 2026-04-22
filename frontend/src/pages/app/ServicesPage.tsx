import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import * as Lucide from "lucide-react";
import { Navigation, Clock, Zap, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { backendApi } from "@/services/backendApi";

const DEFAULT_SERVICES = [
  {
    id: "default-instant-car",
    title: "Instant Ride Car",
    description: "Comfortable city and outstation trips",
    vehicle_type: "car",
    service_mode: "Instant Ride",
    vehicle_model: "Swift",
    icon_name: "Car",
    tag_highlight: "Best Value",
    color_scheme: "from-emerald-400 to-emerald-600",
  },
  {
    id: "default-bike",
    title: "Bike Ride",
    description: "Fast and affordable commute for solo travellers",
    vehicle_type: "bike",
    service_mode: "Instant Ride",
    vehicle_model: "Bike",
    icon_name: "Bike",
    tag_highlight: "Popular",
    color_scheme: "from-amber-400 to-orange-500",
  },
  {
    id: "default-auto",
    title: "Auto Ride",
    description: "Economical 3-Wheeler and E-Rikhsaw for local markets",
    vehicle_type: "auto",
    service_mode: "Instant Ride",
    vehicle_model: "Auto",
    icon_name: "Navigation",
    tag_highlight: "Eco-friendly",
    color_scheme: "from-teal-400 to-teal-600",
  },
  {
    id: "default-pickup",
    title: "Mini Pickup",
    description: "Light goods delivery within the city limits",
    vehicle_type: "bolero",
    service_mode: "Instant Ride",
    vehicle_model: "Pickup",
    icon_name: "Truck",
    tag_highlight: "Fast Delivery",
    color_scheme: "from-cyan-500 to-blue-600",
  },
  {
    id: "default-reserve-general",
    title: "General Outstation",
    description: "Pre-booked cars for intercity travel and tours",
    vehicle_type: "car",
    service_mode: "reserve",
    vehicle_model: "Swift",
    icon_name: "MapPin",
    tag_highlight: "Reliable",
    color_scheme: "from-indigo-400 to-blue-600",
  },
  {
    id: "default-reserve-events",
    title: "Wedding & Events",
    description: "Luxury car decoration for Dulha/Dulhan & Guests",
    vehicle_type: "car",
    service_mode: "reserve",
    vehicle_model: "Wedding Special",
    icon_name: "PartyPopper",
    tag_highlight: "Premium",
    color_scheme: "from-rose-500 to-pink-600",
  },
  {
    id: "default-reserve-logistics",
    title: "Logistics & Farming",
    description: "Heavy duty vehicles for bulk shifting and farming tools",
    vehicle_type: "bolero",
    service_mode: "reserve",
    vehicle_model: "Logistics",
    icon_name: "Truck",
    tag_highlight: "Heavy Duty",
    color_scheme: "from-slate-700 to-slate-900",
  },
] as const;

const normalizeServiceMode = (value?: string | null) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "instant ride" || normalized === "instant" || normalized === "instant ride (on-demand)") {
    return "Instant Ride";
  }
  if (normalized === "reserve" || normalized === "reserved" || normalized === "reserved trip" || normalized === "reserve (scheduled)") {
    return "reserve";
  }
  return value || "Instant Ride";
};

const ServicesPage = () => {
  const [viewType, setViewType] = useState<"Instant Ride" | "reserve">("Instant Ride");
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tailwind safelist for dynamic DB color schemes so JIT doesn't purge them
  const safelist = "from-emerald-400 to-emerald-600 from-amber-400 to-orange-500 from-teal-400 to-teal-600 from-cyan-500 to-blue-600 from-indigo-400 to-blue-600 from-rose-500 to-pink-600 from-slate-700 to-slate-900";

  const loadServices = () => {
    backendApi.listServices()
      .then((rows) => {
        const normalizedRows = (rows || []).map((item) => ({
          ...item,
          service_mode: normalizeServiceMode(item.service_mode),
        }));
        setServices(normalizedRows.length > 0 ? normalizedRows : [...DEFAULT_SERVICES]);
      })
      .catch(() => {
        setServices([...DEFAULT_SERVICES]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadServices();
    
    // Polling for real-time updates
    const interval = setInterval(loadServices, 10000);
    
    // Also update when user switches back to the tab
    const handleFocus = () => loadServices();
    window.addEventListener("focus", handleFocus);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const activeServices = services.filter((s) => normalizeServiceMode(s.service_mode) === viewType);

  return (
    <div className="relative isolate w-full px-2 min-h-[90vh] pb-24">
      <div className="py-2 px-1 mb-6 flex justify-between items-end">
        <div>
           <h1 className="text-3xl font-black text-gray-900 tracking-tight">Our Services</h1>
           <p className="text-sm font-medium text-gray-500 mt-1">Select the best mode for your trip</p>
        </div>
      </div>

      {/* SERVICE TOGGLE SWITCH */}
      <div className="bg-gray-100 p-1.5 rounded-[24px] flex items-center gap-1.5 mb-8 shadow-inner ring-1 ring-gray-200">
         <motion.button 
           whileTap={{ scale: 0.98 }}
           onClick={() => setViewType('Instant Ride')}
           className={`flex-1 py-4 px-2 rounded-[18px] text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${viewType === 'Instant Ride' ? 'bg-white shadow-soft text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
         >
           <Navigation size={16} strokeWidth={3} className={viewType === 'Instant Ride' ? 'text-emerald-500' : ''}/> Instant Ride
         </motion.button>
         <motion.button 
           whileTap={{ scale: 0.98 }}
           onClick={() => setViewType('reserve')}
           className={`flex-1 py-4 px-2 rounded-[18px] text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${viewType === 'reserve' ? 'bg-white shadow-soft text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
         >
           <Clock size={16} strokeWidth={3} className={viewType === 'reserve' ? 'text-indigo-500' : ''}/> Reserved
         </motion.button>
      </div>

      <div className="grid grid-cols-1 gap-5">
        <AnimatePresence mode="wait">
          <motion.div 
            key={viewType}
            initial={{ opacity: 0, x: viewType === 'Instant Ride' ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: viewType === 'Instant Ride' ? 20 : -20 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="space-y-4"
          >
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-40">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-xs font-bold uppercase tracking-widest">Loading Services...</p>
              </div>
            ) : activeServices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-[32px] border-2 border-dashed border-gray-200">
                 <p className="text-gray-400 font-bold">No services available for this mode</p>
                 <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">Using live-safe fallback catalog</p>
              </div>
            ) : (
              activeServices.map((item, i) => {
                const Icon = (Lucide as any)[item.icon_name] || Lucide.Car;
                return (
                  <motion.div 
                     initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                     key={item.id} 
                     className="bg-white rounded-[32px] p-6 shadow-soft border border-gray-100 flex flex-col relative overflow-hidden group hover:shadow-lg transition-all active:scale-[0.98]"
                  >
                    <div className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-br ${item.color_scheme} rounded-full blur-[70px] opacity-10 -mr-16 -mt-16 pointer-events-none group-hover:opacity-20 transition-opacity`}></div>
                    
                    <div className="flex justify-between items-start mb-5">
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.color_scheme} shadow-float flex items-center justify-center text-white`}>
                         <Icon size={30} strokeWidth={2.5} />
                      </div>
                      {item.tag_highlight && (
                         <div className="px-3 py-1.5 bg-gray-50 rounded-full flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-gray-600 border border-gray-100 shadow-sm">
                            <Zap size={10} className="text-amber-500 fill-amber-500" /> {item.tag_highlight}
                         </div>
                      )}
                    </div>
                    
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">{item.title}</h2>
                    <p className="mt-1.5 text-[13px] text-gray-500 font-bold leading-relaxed mb-6 opacity-80">{item.description}</p>
                    
                    <Link 
                      to={`/app/home?vehicle=${item.vehicle_type}&service=${item.service_mode}&model=${item.vehicle_model}`} 
                      className={`w-full h-16 rounded-2xl bg-gray-900 text-white shadow-lg text-center font-black text-sm uppercase tracking-[0.18em] hover:bg-black transition-colors flex items-center justify-center gap-2`}
                     >
                      Book Now <ChevronRight size={16} strokeWidth={4} />
                    </Link>
                  </motion.div>
                )
              })
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ServicesPage;


