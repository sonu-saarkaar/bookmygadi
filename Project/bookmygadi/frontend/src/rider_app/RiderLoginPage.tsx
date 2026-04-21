import { type FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authStore, backendApi } from "@/services/backendApi";
import { riderSession } from "./riderSession";
import { Map, Lock, Mail, ArrowRight, User, Phone, MapPin, Camera, UserCircle, CarFront, Eye, EyeOff, Info, CheckCircle, Shield, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type AuthMode = "login" | "register" | "forgot";

const RiderLoginPage = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [showInfoSheet, setShowInfoSheet] = useState(false);

  // Common/Login fields
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Register fields
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [callingNumber, setCallingNumber] = useState("");
  const [email, setEmail] = useState("");
  const [workLocation, setWorkLocation] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);

  const onLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true); setNotice("");
    try {
      // API expects email/password for now. If user inputs mobile or ID, we map it internally if supported.
      await backendApi.login(loginId, password);
      const token = authStore.getToken();
      if (!token) throw new Error("Login token missing");
      const me = await backendApi.me(token);
      if (me.role !== "driver" && me.role !== "admin") {
         throw new Error("Driver account required");
      }
      riderSession.setLoggedIn();
      navigate("/rider/home", { replace: true });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const onRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 4) {
        setNotice("Password must be at least 4 characters long.");
        return;
    }
    if (password !== confirmPassword) {
        setNotice("Passwords do not match.");
        return;
    }
    setLoading(true); setNotice("");
    try {
      // Pass the extra info that we have. Currently backend allows name, email, phone, role, password.
      await backendApi.register({
        name: name,
        email: email,
        phone: mobile,
        password: password,
        role: "driver"
      });
      setNotice("Account created! Registration Successful. Please log in.");
      setTimeout(() => {
          setMode("login");
          setLoginId(email);
          setNotice("");
      }, 1500);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const onForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!loginId) {
        setNotice("Please enter your registered email or mobile number.");
        return;
    }
    setLoading(true); setNotice("");
    try {
      const res = await backendApi.forgotPassword(loginId);
      setNotice(res?.message || "A password reset link has been sent to your Email/Mobile.");
      setTimeout(() => setMode("login"), 2000);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh w-full bg-[#F6F8FA] flex flex-col justify-center px-4 md:px-8 relative overflow-x-hidden font-sans">
      <div className="absolute top-[-10%] left-[-10%] w-[300px] h-[300px] bg-indigo-400 rounded-full blur-[100px] opacity-20 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[300px] h-[300px] bg-blue-400 rounded-full blur-[100px] opacity-20 pointer-events-none" />

      <div className="w-full max-w-md mx-auto relative z-10 py-10">
        <div className="mb-6 flex flex-col items-center">
           <div className="w-16 h-16 rounded-[24px] flex items-center justify-center text-white mb-3 shadow-[0_8px_30px_rgba(79,70,229,0.3)] bg-gradient-to-br from-indigo-500 to-blue-600">
              <CarFront size={32} strokeWidth={2}/>
           </div>
           <h1 className="text-2xl font-black text-gray-900 tracking-tight text-center">BMG Rider</h1>
           <p className="text-sm font-medium text-gray-500 mt-1 text-center">Drive with us, earn on your terms.</p>
        </div>

        <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_40px_rgba(0,0,0,0.04)] border border-white">
            {notice && (
               <div className={`mb-4 rounded-xl px-4 py-3 text-sm font-bold border ${notice.includes('created') || notice.includes('sent') ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-500'}`}>
                   {notice}
               </div>
            )}

            <AnimatePresence mode="wait">
                {mode === "login" && (
                    <motion.form key="login" initial={{opacity:0, x:-10}} animate={{opacity:1,x:0}} exit={{opacity:0,x:10}} onSubmit={onLogin} className="flex flex-col gap-4">
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><UserCircle size={18}/></span>
                            <input className="h-14 w-full rounded-2xl bg-gray-50/50 border border-transparent focus:bg-white pl-12 pr-4 text-sm font-bold text-gray-900 outline-none transition-colors focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50" 
                                placeholder="Email, Mobile, or Rider ID" value={loginId} onChange={(e) => setLoginId(e.target.value)} required />
                        </div>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><Lock size={18}/></span>
                            <input className="h-14 w-full rounded-2xl bg-gray-50/50 border border-transparent focus:bg-white pl-12 pr-4 text-sm font-bold text-gray-900 outline-none transition-colors focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50" 
                                placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        </div>
                        <div className="flex justify-end">
                            <button type="button" onClick={() => {setMode("forgot");setNotice("");}} className="text-xs font-bold text-indigo-600 hover:text-indigo-800">Forgot Password?</button>
                        </div>
                        <button disabled={loading} className="h-14 w-full rounded-2xl text-sm font-bold text-white shadow-[0_4px_20px_rgba(79,70,229,0.3)] disabled:opacity-60 flex items-center justify-center gap-2 transition-transform active:scale-95 bg-indigo-600 hover:bg-indigo-700">
                           {loading ? "Verifying..." : <>Login securely <ArrowRight size={18}/></>}
                        </button>

                        <div className="flex justify-center mt-2">
                            <span className="text-sm font-medium text-gray-500">Don't have an account? </span>
                            <button type="button" onClick={() => {setMode("register");setNotice("");}} className="text-sm font-bold text-indigo-600 hover:text-indigo-800 ml-1">
                                Create Account
                            </button>
                        </div>
                    </motion.form>
                )}

                {mode === "register" && (
                    <motion.form key="register" initial={{opacity:0, x:10}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-10}} onSubmit={onRegister} className="flex flex-col gap-4">
                        {/* Profile Photo Uploader Mock */}
                        <div className="flex justify-center mb-2">
                           <label className="w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 transition-colors relative overflow-hidden group">
                              {profilePhoto ? (
                                  <img src={URL.createObjectURL(profilePhoto)} className="w-full h-full object-cover" alt="Profile" />
                              ) : (
                                  <>
                                    <Camera size={20} className="text-gray-400 mb-1 group-hover:text-indigo-500" />
                                    <span className="text-[9px] font-bold text-gray-400 group-hover:text-indigo-500">Upload</span>
                                  </>
                              )}
                              <input type="file" className="hidden" accept="image/*" onChange={(e) => setProfilePhoto(e.target.files?.[0] || null)} />
                           </label>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="relative col-span-2">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><User size={18}/></span>
                                <input className="h-12 w-full rounded-xl bg-gray-50/50 border border-transparent focus:bg-white pl-11 pr-3 text-sm font-bold text-gray-900 outline-none transition-colors focus:border-indigo-400" 
                                    placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} required />
                            </div>

                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Phone size={16}/></span>
                                <input className="h-12 w-full rounded-xl bg-gray-50/50 border border-transparent focus:bg-white pl-9 pr-3 text-xs font-bold text-gray-900 outline-none transition-colors focus:border-indigo-400" 
                                    placeholder="Mobile Number" type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} required />
                            </div>

                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Phone size={16}/></span>
                                <input className="h-12 w-full rounded-xl bg-gray-50/50 border border-transparent focus:bg-white pl-9 pr-3 text-xs font-bold text-gray-900 outline-none transition-colors focus:border-indigo-400" 
                                    placeholder="Calling Number" type="tel" value={callingNumber} onChange={(e) => setCallingNumber(e.target.value)} />
                            </div>

                            <div className="relative col-span-2">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><Mail size={18}/></span>
                                <input className="h-12 w-full rounded-xl bg-gray-50/50 border border-transparent focus:bg-white pl-11 pr-3 text-sm font-bold text-gray-900 outline-none transition-colors focus:border-indigo-400" 
                                    placeholder="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                            </div>

                            <div className="relative col-span-2">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><MapPin size={18}/></span>
                                <input className="h-12 w-full rounded-xl bg-gray-50/50 border border-transparent focus:bg-white pl-11 pr-3 text-sm font-bold text-gray-900 outline-none transition-colors focus:border-indigo-400" 
                                    placeholder="Preferred Work Location" value={workLocation} onChange={(e) => setWorkLocation(e.target.value)} required />
                            </div>

                            <div className="relative col-span-2">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><Lock size={18}/></span>
                                <input className="h-12 w-full rounded-xl bg-gray-50/50 border border-transparent focus:bg-white pl-11 pr-12 text-sm font-bold text-gray-900 outline-none transition-colors focus:border-indigo-400" 
                                    placeholder="Set Password (min 4 chars)" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600">
                                    {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                                </button>
                            </div>

                            <div className="relative col-span-2">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><Lock size={18}/></span>
                                <input className="h-12 w-full rounded-xl bg-gray-50/50 border border-transparent focus:bg-white pl-11 pr-12 text-sm font-bold text-gray-900 outline-none transition-colors focus:border-indigo-400" 
                                    placeholder="Confirm Password" type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                            </div>
                        </div>

                        <button disabled={loading} className="mt-2 h-14 w-full rounded-2xl text-sm font-bold text-white shadow-[0_4px_20px_rgba(79,70,229,0.3)] disabled:opacity-60 flex items-center justify-center gap-2 transition-transform active:scale-95 bg-indigo-600 hover:bg-indigo-700">
                           {loading ? "Creating Profile..." : <>Create Rider Profile Registration Successful <ArrowRight size={18}/></>}
                        </button>

                        <button type="button" onClick={() => setMode("login")} className="text-sm font-bold text-indigo-600 mt-2 hover:underline self-center">
                            Back to Sign In
                        </button>
                    </motion.form>
                )}

                {mode === "forgot" && (
                    <motion.form key="forgot" initial={{opacity:0, scale:0.95}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.95}} onSubmit={onForgotPassword} className="flex flex-col gap-4">
                        <p className="text-sm font-medium text-gray-600 text-center mb-2">
                           Enter your registered Email or Mobile number to receive a secure reset link.
                        </p>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><UserCircle size={18}/></span>
                            <input className="h-14 w-full rounded-2xl bg-gray-50/50 border border-transparent focus:bg-white pl-12 pr-4 text-sm font-bold text-gray-900 outline-none transition-colors focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50" 
                                  placeholder="Registered Email or Mobile" 
                                  value={loginId} onChange={(e) => setLoginId(e.target.value)} required />                          </div>                        
                        <button disabled={loading} className="h-14 w-full rounded-2xl text-sm font-bold text-white shadow-[0_4px_20px_rgba(79,70,229,0.3)] disabled:opacity-60 flex items-center justify-center gap-2 transition-transform active:scale-95 bg-indigo-600 hover:bg-indigo-700">
                           {loading ? "Sending..." : "Send Reset Link"}
                        </button>
                        
                        <button type="button" onClick={() => setMode("login")} className="text-sm font-bold text-indigo-600 mt-2 hover:underline">
                            Back to Sign In
                        </button>
                    </motion.form>
                )}
            </AnimatePresence>
        </div>

        <button 
          onClick={() => setShowInfoSheet(true)} 
          className="mt-4 mx-auto flex items-center justify-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors py-2 px-4 rounded-full bg-white/50 backdrop-blur-sm border border-white shadow-sm"
        >
          <Info size={14} /> Security & Account Options
        </button>

        <AnimatePresence>
          {showInfoSheet && (
            <div className="fixed inset-0 z-50 flex flex-col justify-end">
               <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }} 
                  onClick={() => setShowInfoSheet(false)} 
                  className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm" 
               />
               <motion.div 
                  initial={{ y: '100%' }} 
                  animate={{ y: 0 }} 
                  exit={{ y: '100%' }} 
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }} 
                  className="relative bg-white rounded-t-[32px] px-6 pt-6 pb-10 shadow-2xl z-10 flex flex-col gap-6"
               >
                  <div className="flex justify-between items-center mb-2">
                     <h3 className="font-black text-gray-900 text-lg">Partner Options</h3>
                     <button onClick={() => setShowInfoSheet(false)} className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200"><X size={16}/></button>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 text-center">
                     <p className="text-sm font-bold text-gray-600">Want to join BookMyGadi?</p>
                     <button onClick={() => { setMode("register"); setShowInfoSheet(false); }} className="mt-2 inline-block px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-[0_4px_20px_rgba(79,70,229,0.3)] hover:bg-indigo-700 transition-colors cursor-pointer">
                        Apply to Drive
                     </button>
                  </div>

                  {/* Dynamic Trust Badges for Production Look */}
                  <div className="flex flex-col items-center justify-center gap-4 pt-4">
                     <div className="flex gap-4 items-center flex-wrap justify-center">
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 shadow-sm">
                           <CheckCircle size={14} strokeWidth={3} /> Verified Partner
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                           <Shield size={14} strokeWidth={3} /> Secure Auth
                        </div>
                     </div>
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center mt-2">
                       © 2026 BookMyGadi | 100% Trusted
                     </p>
                  </div>
               </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default RiderLoginPage;
