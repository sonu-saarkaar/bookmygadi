import { useEffect, useMemo, useState } from "react";
import { riderApi, type RiderActiveRide } from "@/services/riderApi";
import { 
  Wallet, 
  TrendingUp, 
  IndianRupee, 
  Activity, 
  SearchX, 
  ArrowUpRight, 
  ArrowDownRight, 
  ChevronRight, 
  Calendar,
  Gift,
  Zap,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const RiderEarningPage = () => {
  const [active, setActive] = useState<RiderActiveRide[]>([]);
  const [requests, setRequests] = useState(0);
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly'>('weekly');

  useEffect(() => {
    const load = async () => {
      try {
        const [a, r] = await Promise.all([riderApi.listActiveRides(), riderApi.listRequests()]);
        setActive(a);
        setRequests(r.length);
      } catch (err) {
        console.error("Failed to load earnings data", err);
      }
    };
    load().catch(() => undefined);
    const id = window.setInterval(() => load().catch(() => undefined), 10000); // 10s refresh is plenty for earnings
    return () => window.clearInterval(id);
  }, []);

  const liveValue = useMemo(() => active.reduce((sum, r) => sum + (r.agreed_fare || r.estimated_fare_max || 0), 0), [active]);

  // Mock historical data for the graph
  const weeklyData = [
    { day: "Mon", amount: 1200 },
    { day: "Tue", amount: 1800 },
    { day: "Wed", amount: 1400 },
    { day: "Thu", amount: 2200 },
    { day: "Fri", amount: 1900 },
    { day: "Sat", amount: 2800 },
    { day: "Sun", amount: 2400 },
  ];

  const maxAmount = Math.max(...weeklyData.map(d => d.amount));
  
  // Chart points calculation
  const chartPoints = useMemo(() => {
    const width = 300;
    const height = 100;
    return weeklyData.map((d, i) => {
      const x = (i / (weeklyData.length - 1)) * width;
      const y = height - (d.amount / maxAmount) * height;
      return `${x},${y}`;
    }).join(" ");
  }, [maxAmount]);

  return (
    <div className="relative isolate w-full px-4 pb-24 min-h-screen bg-[#F8FAFC]">
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="py-6 flex justify-between items-start"
      >
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Earning Dashboard</h1>
          <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-1">
            <Zap size={14} className="text-amber-500 fill-amber-500" />
            Track your progress and payouts.
          </p>
        </div>
        <motion.div 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="h-12 w-12 rounded-2xl bg-white text-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-100 border border-slate-100"
        >
          <Wallet size={22} strokeWidth={2.5} />
        </motion.div>
      </motion.div>

      {/* Main Balance Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-slate-900 text-white rounded-[32px] p-7 shadow-2xl shadow-slate-200 relative overflow-hidden mb-6"
      >
        <div className="absolute right-0 top-0 w-48 h-48 bg-indigo-500 rounded-full blur-[80px] opacity-20 -mr-20 -mt-20 pointer-events-none"></div>
        <div className="absolute left-0 bottom-0 w-32 h-32 bg-emerald-500 rounded-full blur-[60px] opacity-10 -ml-10 -mb-10 pointer-events-none"></div>
        
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Total Balance</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-slate-400">₹</span>
              <h2 className="text-5xl font-black tracking-tighter">
                {new Intl.NumberFormat("en-IN").format(14250)}
              </h2>
            </div>
          </div>
          <button className="bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-bold border border-white/10 transition-colors">
            Payout
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
            <p className="text-[9px] uppercase font-bold text-slate-400 mb-1">Weekly Growth</p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black">+12.5%</span>
              <div className="bg-emerald-500/20 p-1 rounded-full">
                <ArrowUpRight size={12} className="text-emerald-400" />
              </div>
            </div>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
            <p className="text-[9px] uppercase font-bold text-slate-400 mb-1">Target Achievement</p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black">₹4.2k</span>
              <div className="bg-indigo-500/20 p-1 rounded-full">
                <TrendingUp size={12} className="text-indigo-400" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Analytics Graph Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-100 border border-slate-100 mb-6"
      >
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-lg font-black text-slate-900 tracking-tight">Earnings Trend</h3>
          <div className="flex bg-slate-50 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('weekly')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'weekly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              7D
            </button>
            <button 
              onClick={() => setActiveTab('monthly')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'monthly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              30D
            </button>
          </div>
        </div>

        {/* Custom SVG Graph */}
        <div className="relative w-full h-[150px] mb-6 pt-4">
          <svg viewBox="0 0 300 100" className="w-full h-full preserve-3d overflow-visible">
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Area */}
            <polyline 
              fill="url(#chartGradient)"
              points={`0,100 ${chartPoints} 300,100`}
            />
            {/* Line */}
            <motion.polyline
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              fill="none"
              stroke="#4F46E5"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={chartPoints}
            />
            {/* Dots */}
            {weeklyData.map((d, i) => {
              const x = (i / (weeklyData.length - 1)) * 300;
              const y = 100 - (d.amount / maxAmount) * 100;
              return (
                <circle key={i} cx={x} cy={y} r="3" fill="white" stroke="#4F46E5" strokeWidth="1.5" />
              );
            })}
          </svg>
          
          <div className="flex justify-between mt-4 px-1">
            {weeklyData.map((d, i) => (
              <span key={i} className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                {d.day}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 py-4 border-t border-slate-50">
          <div className="text-center border-r border-slate-50">
            <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">Today</p>
            <p className="text-sm font-black text-slate-900">₹{new Intl.NumberFormat("en-IN").format(liveValue)}</p>
          </div>
          <div className="text-center border-r border-slate-50">
            <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">Tips</p>
            <p className="text-sm font-black text-emerald-500">₹{new Intl.NumberFormat("en-IN").format(350)}</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">Bonus</p>
            <p className="text-sm font-black text-indigo-500">₹{new Intl.NumberFormat("en-IN").format(100)}</p>
          </div>
        </div>
      </motion.div>

      {/* Secondary Metrics Section */}
      <h3 className="text-xl font-black text-slate-900 tracking-tight gap-2 flex items-center mb-4 mt-8 px-1">
         Active Ride Details
         <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
      </h3>

      <div className="space-y-4">
         {active.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-100 p-12 flex flex-col items-center text-center"
            >
               <div className="h-20 w-20 rounded-full bg-slate-50 flex items-center justify-center mb-6">
                 <SearchX size={36} className="text-slate-200" />
               </div>
               <h3 className="text-xl font-black text-slate-900 mb-2 tracking-tight">No Active Trips</h3>
               <p className="text-sm text-slate-500 font-medium px-4">
                 When you accept ride requests, your estimated revenue will appear here instantly.
               </p>
               <button className="mt-8 px-8 py-3.5 bg-slate-900 text-white rounded-2xl text-sm font-black shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all">
                  Go to Dashboard
               </button>
            </motion.div>
         )}
         
         <AnimatePresence>
            {active.map((r, i) => (
              <motion.div 
                 initial={{ opacity: 0, scale: 0.95 }} 
                 animate={{ opacity: 1, scale: 1 }} 
                 transition={{ delay: i * 0.1 }}
                 key={r.id} className="bg-white rounded-[28px] shadow-xl shadow-slate-50 border border-slate-100 overflow-hidden relative group"
              >
                 <div className="absolute top-0 right-0 w-32 h-20 bg-emerald-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-bl-full pointer-events-none"></div>
                 
                 <div className="p-5 border-b border-slate-50 flex items-center justify-between bg-slate-50/10">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <Zap size={16} fill="currentColor" />
                      </div>
                      <span className="text-xs font-black uppercase tracking-widest text-slate-900">Ride Active</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                      <Calendar size={12} />
                      {new Date(r.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                 </div>
                 <div className="p-6 flex items-end justify-between">
                    <div className="flex-1 pr-4">
                       <div className="flex items-center gap-2 mb-4">
                         <div className="h-2 w-2 rounded-full bg-slate-300" />
                         <p className="text-xs font-bold text-slate-500 truncate w-[160px]">{r.pickup_location}</p>
                       </div>
                       <div className="flex items-center gap-2">
                         <div className="h-2 w-2 bg-indigo-500 rounded-sm" />
                         <p className="text-xs font-bold text-slate-800 truncate w-[160px]">{r.destination}</p>
                       </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                       <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1">Agreed Fare</p>
                       <p className="text-3xl font-black text-slate-900 tracking-tighter">
                         <span className="text-lg font-bold mr-0.5 text-slate-400 leading-none">₹</span>
                         {new Intl.NumberFormat("en-IN").format(r.agreed_fare || r.estimated_fare_max || 0)}
                       </p>
                       <div className="flex items-center gap-1 text-emerald-600 mt-1">
                          <p className="text-[10px] font-black uppercase">Net Earning</p>
                          <ChevronRight size={10} />
                       </div>
                    </div>
                 </div>
              </motion.div>
            ))}
         </AnimatePresence>
      </div>

      {/* Helpful Tip Section */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 bg-indigo-50 border border-indigo-100 rounded-[28px] p-6 mb-8"
      >
        <div className="flex gap-4">
          <div className="h-10 w-10 rounded-2xl bg-white text-indigo-500 flex items-center justify-center shrink-0 shadow-sm">
            <Gift size={20} />
          </div>
          <div>
            <h4 className="text-sm font-black text-indigo-900 mb-1 tracking-tight">Earning Tip</h4>
            <p className="text-xs text-indigo-700/80 font-medium leading-relaxed">
              Accept rides in the Varanasi Cantt area between 6 PM and 10 PM. Peak hour incentives are currently 1.5x.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default RiderEarningPage;
