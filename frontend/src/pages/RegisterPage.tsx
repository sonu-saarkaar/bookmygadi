import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { backendApi } from "@/services/backendApi";
import { Car, Lock, Mail, Phone, User, ArrowRight, ShieldCheck, CheckCircle, Shield, Info, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const RegisterPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showFullForm, setShowFullForm] = useState(true);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await backendApi.register({ name, email, phone, password, role: "customer" });
      navigate("/app/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 w-full bg-gray-50 flex sm:items-center sm:justify-center sm:p-4 font-sans overflow-hidden">
      
      {/* MOBILE APP CONTAINER */}
      <div className="w-full h-full sm:h-[800px] max-w-[420px] bg-[#F8FAFC] relative flex flex-col overflow-hidden sm:rounded-[2.5rem] sm:shadow-2xl sm:border-[8px] sm:border-gray-900 mx-auto shadow-[0_0_50px_rgba(0,0,0,0.05)]">
        
        {/* TOP SIDE: Branding (Dynamic Height based on form state) */}
        <motion.div 
          animate={{ height: showFullForm ? '25%' : '60%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="flex flex-col justify-center items-center relative overflow-hidden p-6 shrink-0"
        >
          {/* Dynamic Background Design */}
          <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-emerald-100/40 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[120%] h-[120%] bg-blue-100/40 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="relative z-10 text-center flex flex-col items-center">
            <motion.div 
              animate={{ 
                 scale: showFullForm ? 0.7 : 1,
                 marginBottom: showFullForm ? 8 : 24
              }}
              className={`w-24 h-24 sm:w-28 sm:h-28 rounded-[2rem] sm:rounded-[2.5rem] flex items-center justify-center shadow-[0_15px_35px_rgba(0,0,0,0.05)] bg-white p-3 border border-gray-100`}
            >
               <img 
                 src="/logo.png" 
                 alt="BookMyGadi Logo" 
                 className="w-full h-full object-contain"
                 onError={(e) => {
                    (e.target as HTMLImageElement).src = "/logo.png";
                 }}
               />
            </motion.div>

            <motion.div
              animate={{ opacity: showFullForm ? 0 : 1, y: showFullForm ? -20 : 0 }}
            >
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-tight">
                BookMyGadi
              </h1>
              <p className="text-emerald-600 font-black mt-2 text-[10px] sm:text-[11px] uppercase tracking-[0.2em] max-w-[260px] mx-auto leading-relaxed">
                Premium Ride & Logistics Provider
              </p>
            </motion.div>
          </div>
        </motion.div>

        {/* BOTTOM SIDE: App Sheet Details / Form */}
        <motion.div 
          initial={{ y: '100%' }} 
          animate={{ y: 0, height: showFullForm ? '75%' : '40%' }} 
          transition={{ type: 'spring', damping: 28, stiffness: 220, mass: 0.8 }}
          className="w-full flex flex-col px-6 pt-6 pb-6 bg-white outline-none rounded-t-[2.5rem] shadow-[0_-20px_60px_rgba(0,0,0,0.05)] z-20 relative overflow-y-auto overflow-x-hidden"
        >
          {/* Drag Handle (Visual only) */}
          <div className="sticky top-0 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-200 rounded-full mb-4 shrink-0" />
          
          <div className="w-full max-w-sm mx-auto flex flex-col flex-1">
            <div className="mb-2 shrink-0 flex justify-between items-start">
               <div>
                 <h2 className="text-xl font-black text-gray-900 tracking-tight">Create Account</h2>
                 <p className="text-xs font-bold text-gray-400 mt-0.5">Join us for a premium experience.</p>
               </div>
            </div>

            <div className="flex flex-col mb-4">
                 <motion.form 
                   onSubmit={onSubmit}
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: 20 }}
                   className="flex flex-col gap-3 shrink-0 relative mt-2"
                 >
                    {error && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="rounded-2xl bg-rose-50 border border-rose-100 p-3 flex items-start gap-2 text-rose-600 mb-2"
                      >
                        <Info size={16} className="shrink-0 mt-0.5" />
                        <p className="text-[11px] font-bold leading-relaxed">{error}</p>
                      </motion.div>
                    )}

                    <div className="space-y-3">
                      <div className="relative group">
                         <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors"><User size={18}/></span>
                         <input 
                           className="h-14 w-full rounded-2xl bg-gray-50/80 border border-gray-200 focus:bg-white pl-12 pr-4 text-sm font-bold text-gray-900 outline-none transition-all focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 placeholder-gray-400 focus:bg-white/90" 
                           placeholder="Full Name" 
                           value={name} 
                           onChange={(e) => setName(e.target.value)} 
                           required 
                         />
                      </div>
                      
                      <div className="relative group">
                         <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors"><Mail size={18}/></span>
                         <input 
                           className="h-14 w-full rounded-2xl bg-gray-50/80 border border-gray-200 focus:bg-white pl-12 pr-4 text-sm font-bold text-gray-900 outline-none transition-all focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 placeholder-gray-400 focus:bg-white/90" 
                           placeholder="sonu@gmail.com" 
                           type="email" 
                           value={email} 
                           onChange={(e) => setEmail(e.target.value)} 
                           required 
                         />
                      </div>
                      
                      <div className="relative group">
                         <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors"><Phone size={18}/></span>
                         <input 
                           className="h-14 w-full rounded-2xl bg-gray-50/80 border border-gray-200 focus:bg-white pl-12 pr-4 text-sm font-bold text-gray-900 outline-none transition-all focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 placeholder-gray-400 focus:bg-white/90" 
                           placeholder="Mobile Number" 
                           type="tel" 
                           value={phone} 
                           onChange={(e) => setPhone(e.target.value)} 
                           required
                         />
                      </div>
                      
                      <div className="relative group">
                         <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors"><Lock size={18}/></span>
                         <input 
                           className="h-14 w-full rounded-2xl bg-gray-50/80 border border-gray-200 focus:bg-white pl-12 pr-4 text-sm font-bold text-gray-900 outline-none transition-all focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 placeholder-gray-400 focus:bg-white/90" 
                           placeholder="••••••" 
                           type="password" 
                           value={password} 
                           onChange={(e) => setPassword(e.target.value)} 
                           required 
                         />
                      </div>

                      <button 
                        disabled={loading} 
                        className="mt-1 h-14 w-full rounded-2xl text-sm font-black text-white shadow-[0_10px_25px_rgba(16,185,129,0.25)] bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 flex items-center justify-center gap-2 transition-all active:scale-95 shrink-0"
                      >
                        {loading ? "Creating Account..." : "Sign Up"}
                      </button>
                    </div>
                 </motion.form>
            </div>

            {/* Account Details Link */}
            <div className="mt-2 pb-2 shrink-0">
               <div className="flex items-center justify-center">
                  <p className="text-[12px] font-bold text-gray-500 mr-2">Already have an account?</p>
                  <Link to="/login" className="text-[12px] font-black text-emerald-600 uppercase tracking-wider hover:text-emerald-700 transition-colors">
                     Sign in details
                  </Link>
               </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default RegisterPage;
