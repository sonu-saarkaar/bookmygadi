import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { backendApi } from "@/services/backendApi";
import { Car, Lock, Mail, ArrowRight, ShieldCheck, CheckCircle, Shield, Info, X } from "lucide-react";
import { motion } from "framer-motion";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminLogin = location.pathname === "/admin/login";
  const [email, setEmail] = useState("sonusaarkaar@gmail.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const token = await backendApi.login(email, password);
      const profile = await backendApi.me(token.access_token);
      if (profile.role === "admin") {
        navigate("/app/admin");
      } else {
        navigate("/app/home");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 w-full bg-gray-50 flex sm:items-center sm:justify-center sm:p-4 font-sans overflow-hidden">
      
      {/* MOBILE APP CONTAINER */}
      <div className="w-full h-full sm:h-[800px] max-w-[420px] bg-[#F8FAFC] relative flex flex-col overflow-hidden sm:rounded-[2.5rem] sm:shadow-2xl mx-auto shadow-[0_0_50px_rgba(0,0,0,0.05)]">
        
        {/* TOP SIDE: Branding (45%) */}
        <div className="h-[45%] flex flex-col justify-center items-center relative overflow-hidden p-6 shrink-0">
          {/* Dynamic Background Design */}
          <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-emerald-100/40 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[120%] h-[120%] bg-blue-100/40 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="relative z-10 text-center flex flex-col items-center">
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`w-24 h-24 sm:w-28 sm:h-28 rounded-[2rem] sm:rounded-[2.5rem] flex items-center justify-center mb-4 shadow-[0_15px_35px_rgba(0,0,0,0.05)] bg-white p-3 border border-gray-100`}
            >
               <img 
                 src="/logo.png" 
                 alt="BookMyGadi Logo" 
                 className="w-full h-full object-contain"
                 onError={(e) => {
                    // Fallback just in case the specific logo is missing
                    (e.target as HTMLImageElement).src = "/logo.png";
                 }}
               />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-tight">
                {isAdminLogin ? "Admin Control" : "BookMyGadi"}
              </h1>
              {isAdminLogin ? (
                <p className="text-gray-500 font-bold mt-2 text-[10px] sm:text-[11px] uppercase tracking-[0.15em] max-w-[260px] mx-auto leading-relaxed">
                  Global Command Center
                </p>
              ) : (
                <p className="text-emerald-600 font-black mt-2 text-[10px] sm:text-[11px] uppercase tracking-[0.2em] max-w-[260px] mx-auto leading-relaxed">
                  Premium Ride & Logistics Provider
                </p>
              )}
            </motion.div>
          </div>
        </div>

        {/* BOTTOM SIDE: App Sheet Details / Form (55%) */}
        <motion.div 
          initial={{ y: '100%' }} 
          animate={{ y: 0 }} 
          transition={{ type: 'spring', damping: 28, stiffness: 220, mass: 0.8 }}
          className="h-[55%] w-full flex flex-col px-6 pt-6 pb-6 bg-white outline-none rounded-t-[2.5rem] shadow-[0_-20px_60px_rgba(0,0,0,0.05)] z-20 relative overflow-y-auto overflow-x-hidden"
        >
        {/* Drag Handle (Visual only) */}
        <div className="sticky top-0 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-200 rounded-full mb-4 shrink-0" />
        
        <div className="w-full max-w-sm mx-auto flex flex-col flex-1">
          <div className="mb-4 shrink-0">
             <h2 className="text-xl font-black text-gray-900 tracking-tight">Sign In</h2>
             <p className="text-xs font-bold text-gray-400 mt-0.5">Access your account details instantly.</p>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-3 shrink-0">
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl bg-rose-50 border border-rose-100 p-3 flex items-start gap-2 text-rose-600"
              >
                <Info size={16} className="shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold leading-relaxed">{error}</p>
              </motion.div>
            )}
            
            <div className="space-y-3">
              <div className="relative group">
                 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors"><Mail size={18}/></span>
                 <input 
                   className="h-14 w-full rounded-2xl bg-gray-50/80 border border-gray-200 focus:bg-white pl-12 pr-4 text-sm font-bold text-gray-900 outline-none transition-all focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 placeholder-gray-400 focus:bg-white/90" 
                   placeholder="Email Address" 
                   type="email" 
                   value={email} 
                   onChange={(e) => setEmail(e.target.value)} 
                   required 
                 />
              </div>
              
              <div className="relative group">
                 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors"><Lock size={18}/></span>
                 <input 
                   className="h-14 w-full rounded-2xl bg-gray-50/80 border border-gray-200 focus:bg-white pl-12 pr-4 text-sm font-bold text-gray-900 outline-none transition-all focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 placeholder-gray-400 focus:bg-white/90" 
                   placeholder="Password" 
                   type="password" 
                   value={password} 
                   onChange={(e) => setPassword(e.target.value)} 
                   required 
                 />
              </div>
            </div>
            
            {/* Kept mt-1, adjusted height and margins to push it up */}
            <button 
              disabled={loading} 
              className="mt-2 mb-2 h-14 w-full rounded-2xl text-sm font-black text-white shadow-[0_10px_25px_rgba(16,185,129,0.25)] bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 flex items-center justify-center gap-2 transition-all active:scale-95 shrink-0"
            >
              {loading ? "Verifying..." : "Secure Sign In"}
            </button>
          </form>

          {/* Account Details Link */}
          <div className="mt-4 pt-2 pb-2">
             {!isAdminLogin && (
               <div className="flex items-center justify-between px-1">
                  <Link to="/register" className="text-[11px] font-black text-emerald-600 uppercase tracking-wider hover:text-emerald-700 transition-colors">
                     Create Account
                  </Link>
                  <Link to="/forgot-password" className="text-[11px] font-bold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors">
                     Forgot Password?
                  </Link>
               </div>
             )}
             
             {/* Trust Badge */}
             <div className="mt-8 flex flex-col items-center justify-center gap-1 opacity-90 pb-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={15} className="text-emerald-500" />
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-500">100% Secure & Trusted</span>
                </div>
                <p className="text-[9px] font-bold text-gray-400 tracking-widest text-center mt-0.5">AUTHORIZED BOOKMYGADI PLATFORM</p>
             </div>
          </div>
        </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
