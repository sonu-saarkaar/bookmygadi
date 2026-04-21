import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authStore, backendApi, type Ride, type UserProfile } from "@/services/backendApi";
import { User, LogOut, Settings, Camera, MapPin, Phone, Shield, Edit3, X, Check, ChevronRight, ChevronDown, HelpCircle, FileText, AlertTriangle, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type EditableProfile = {
  display_name: string;
  mobile_number: string;
  calling_number: string;
  emergency_number: string;
  city: string;
  bio: string;
  avatar_data: string;
  avatar_scale: number;
  avatar_x: number;
  avatar_y: number;
};

const PROFILE_STORAGE_KEY = "bmg_user_profile_edit";

const AccordionItem = ({ icon: Icon, title, children, isOpen, onClick }: { icon: any, title: string, children: React.ReactNode, isOpen: boolean, onClick: () => void }) => {
  return (
    <div className="border-b border-gray-100 last:border-none">
      <button 
        onClick={onClick}
        className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon size={18} className="text-gray-400" />
          <span className="font-bold text-sm text-gray-900">{title}</span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={16} className="text-gray-400" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-gray-50 text-xs text-gray-600 leading-relaxed border-t border-gray-100 font-medium">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [rides, setRides] = useState<Ride[]>([]);
  const [health, setHealth] = useState("");
  const [notice, setNotice] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const [editable, setEditable] = useState<EditableProfile>({
    display_name: "", mobile_number: "", calling_number: "",
    emergency_number: "", city: "Varanasi", bio: "",
    avatar_data: "", avatar_scale: 1, avatar_x: 0, avatar_y: 0,
  });

  const loadLocalProfile = (): Partial<EditableProfile> => {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return {};
    try { return JSON.parse(raw) as Partial<EditableProfile>; } catch { return {}; }
  };

  useEffect(() => {
    const load = async () => {
      const token = authStore.getToken();
      if (!token) return;
      const [profile, rideRows, healthData] = await Promise.all([backendApi.me(token), backendApi.listRides(token), backendApi.health()]);
      const local = loadLocalProfile();

      setUser(profile);
      setRides(rideRows);
      setHealth(healthData.status);
      setEditable({
        display_name: profile.name || "",
        mobile_number: profile.phone || "",
        calling_number: local.calling_number || profile.phone || "",
        emergency_number: profile.emergency_number || "",
        city: profile.city || "Varanasi",
        bio: profile.bio || "Avid traveler & ride sharer.",
        avatar_data: profile.avatar_data || "",
        avatar_scale: local.avatar_scale || 1, avatar_x: local.avatar_x || 0, avatar_y: local.avatar_y || 0,
      });
    };

    load().catch(() => {
      authStore.clear(); navigate("/login");
    });
  }, [navigate]);

  const totalTrips = rides.length;
  const completedTrips = rides.filter((r) => r.status === "completed").length;
  const cancelledTrips = rides.filter((r) => ["cancelled", "rejected"].includes((r.status || "").toLowerCase())).length;
  const profileRating = useMemo(() => {
    if (completedTrips === 0) return "0.0";
    const raw = 4.2 + Math.min(0.7, completedTrips * 0.03);
    return raw.toFixed(1);
  }, [completedTrips]);

  const saveProfile = async () => {
    try {
      const token = authStore.getToken();
      if (!token) return;
      
      // Save visually related layout choices (like avatar scale) locally
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(editable));
      
      // Actually update the backend
      const updatedUser = await backendApi.updateMe({
        name: editable.display_name,
        phone: editable.mobile_number,
        city: editable.city || "Varanasi",
        bio: editable.bio || "Avid traveler & ride sharer.",
        emergency_number: editable.emergency_number || "",
        avatar_data: editable.avatar_data || ""
      }, token);
      
      setUser(updatedUser);
      window.dispatchEvent(new Event("bmg_profile_updated"));
      setNotice("Profile updated successfully.");
      setTimeout(() => setNotice(''), 3000);
      setEditMode(false);
    } catch (err) {
      setNotice("Failed to update profile.");
      setTimeout(() => setNotice(''), 3000);
    }
  };

  const logout = () => {
    authStore.clear();
    navigate("/login");
  };

  const avatarLabel = (editable.display_name || user?.name || "U").trim().charAt(0).toUpperCase() || "U";

  const onAvatarFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setNotice("Please select an image file."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setEditable((p) => ({ ...p, avatar_data: String(reader.result || ""), avatar_scale: 1, avatar_x: 0, avatar_y: 0 }));
    };
    reader.readAsDataURL(file);
    e.currentTarget.value = "";
  };

  return (
    <div className="relative isolate w-full px-2 min-h-[90vh]">
      <AnimatePresence>
         {notice && (
           <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 bg-emerald-500 text-white rounded-full text-sm font-medium shadow-glass-hard">
             {notice}
           </motion.div>
         )}
      </AnimatePresence>

      <div className="bg-white rounded-[32px] overflow-hidden shadow-soft border border-gray-100 flex flex-col items-center pt-8 pb-6 px-6 relative mb-6">
         <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-primary-accent/10 to-transparent"></div>
         <button onClick={() => setEditMode(!editMode)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white shadow-soft flex items-center justify-center text-gray-500 border border-gray-100 z-10 transition-colors">
            {editMode ? <X size={18}/> : <Edit3 size={18}/>}
         </button>

         <div className="relative mb-4 z-10 group">
            <div className="w-[100px] h-[100px] rounded-full border-4 border-white shadow-float bg-gradient-to-br from-emerald-400 to-primary-accent overflow-hidden flex items-center justify-center text-4xl font-black text-white object-cover relative">
               {editable.avatar_data ? (
                 <img src={editable.avatar_data} alt="profile" className="absolute w-full h-full object-cover" style={{ transform: `translate(calc(-50% + ${editable.avatar_x}px), calc(-50% + ${editable.avatar_y}px)) scale(${editable.avatar_scale})`, left: '50%', top: '50%' }} />
               ) : avatarLabel}
            </div>
            {editMode && (
               <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-gray-900 border-2 border-white flex items-center justify-center text-white cursor-pointer shadow-soft">
                 <Camera size={12} />
                 <input type="file" accept="image/*" className="hidden" onChange={onAvatarFileChange} />
               </label>
            )}
         </div>

         <h2 className="text-2xl font-black text-gray-900 tracking-tight">{editable.display_name || user?.name || "User"}</h2>
         <p className="text-sm font-medium text-gray-500 mt-1">{editable.mobile_number || user?.phone || user?.email || "-"}</p>

         <div className="w-full grid grid-cols-3 gap-2 mt-6 p-4 rounded-3xl bg-gray-50 border border-gray-100">
            <div className="text-center">
               <span className="block text-[10px] font-bold uppercase text-gray-400 tracking-wide mb-1">Rides</span>
               <span className="block text-xl font-black text-gray-900">{totalTrips}</span>
            </div>
            <div className="text-center border-l border-r border-gray-200">
               <span className="block text-[10px] font-bold uppercase text-gray-400 tracking-wide mb-1">Rating</span>
               <span className="block text-xl font-black text-emerald-500">{profileRating}</span>
            </div>
            <div className="text-center">
               <span className="block text-[10px] font-bold uppercase text-gray-400 tracking-wide mb-1">Cancelled</span>
               <span className="block text-xl font-black text-rose-500">{cancelledTrips}</span>
            </div>
         </div>
      </div>

      <AnimatePresence mode="wait">
        {editMode ? (
          <motion.div key="edit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
             <div className="bg-white rounded-[32px] p-6 shadow-soft border border-gray-100">
               <h3 className="text-sm font-bold uppercase text-gray-400 tracking-wider mb-4">Edit Profile</h3>
               <div className="space-y-3 relative">
                 <input className="w-full h-14 bg-gray-50 border border-transparent focus:border-emerald-400 outline-none rounded-2xl px-4 text-sm font-bold text-gray-900" value={editable.display_name} onChange={(e) => setEditable((p) => ({ ...p, display_name: e.target.value }))} placeholder="Full Name" />
                 <input className="w-full h-14 bg-gray-50 border border-transparent focus:border-emerald-400 outline-none rounded-2xl px-4 text-sm font-bold text-gray-900" value={editable.mobile_number} onChange={(e) => setEditable((p) => ({ ...p, mobile_number: e.target.value }))} placeholder="Mobile Number" />
                 <input className="w-full h-14 bg-gray-50 border border-transparent focus:border-emerald-400 outline-none rounded-2xl px-4 text-sm font-bold text-gray-900" value={editable.calling_number} onChange={(e) => setEditable((p) => ({ ...p, calling_number: e.target.value }))} placeholder="Alternate / Calling Number" />
                 <input className="w-full h-14 bg-gray-50 border border-transparent focus:border-rose-300 outline-none rounded-2xl px-4 text-sm font-bold text-gray-900" value={editable.emergency_number} onChange={(e) => setEditable((p) => ({ ...p, emergency_number: e.target.value }))} placeholder="Emergency Contact" />
                 <textarea className="w-full h-24 bg-gray-50 border border-transparent focus:border-emerald-400 outline-none rounded-2xl p-4 text-sm font-bold text-gray-900 resize-none" value={editable.bio} onChange={(e) => setEditable((p) => ({ ...p, bio: e.target.value }))} placeholder="Short bio" />
               </div>
               
               <button onClick={saveProfile} className="w-full h-14 bg-gray-900 text-white font-bold rounded-2xl mt-4 shadow-float flex items-center justify-center gap-2">
                 <Check size={18} /> Save Changes
               </button>
             </div>
          </motion.div>
        ) : (
          <motion.div key="view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
             <div className="grid grid-cols-2 gap-3 mb-6">
                <a href={editable.calling_number ? `tel:${editable.calling_number}` : "#"} className="h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center gap-2 font-bold text-sm">
                   <Phone size={16} /> Contact Us
                </a>
                <a href={editable.emergency_number ? `tel:${editable.emergency_number}` : "tel:112"} className="h-14 rounded-2xl bg-rose-50 text-rose-500 border border-rose-100 flex items-center justify-center gap-2 font-bold text-sm shadow-sm">
                   <Shield size={16} /> Emergency
                </a>
             </div>

             <div className="bg-white rounded-[32px] overflow-hidden shadow-soft border border-gray-100">
                <div className="p-5 border-b border-gray-50 flex items-center gap-4">
                   <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 shrink-0"><MapPin size={18}/></div>
                   <div>
                     <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">Primary Area</p>
                     <p className="text-sm font-bold text-gray-900">{editable.city}</p>
                   </div>
                </div>
                <div className="p-5 flex items-center gap-4">
                   <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 shrink-0"><User size={18}/></div>
                   <div>
                     <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">Bio</p>
                     <p className="text-sm font-bold text-gray-900 leading-tight">{editable.bio}</p>
                   </div>
                </div>
             </div>

             <div className="bg-white rounded-[32px] overflow-hidden shadow-soft border border-gray-100 mt-4">
                <AccordionItem
                  title="Return & Refund Policy"
                  icon={FileText}
                  isOpen={openAccordion === 'refund'}
                  onClick={() => setOpenAccordion(openAccordion === 'refund' ? null : 'refund')}
                >
                  <p className="mb-2">We offer a 100% refund for rides cancelled up to 15 minutes prior to the scheduled pickup time. If cancelled later or during the transition, a cancellation fee of 10% or minimum ₹50 will be charged.</p>
                  <p>In the event our partner driver is unable to fulfill a confirmed ride, a full refund will be initiated immediately to your original payment method, processing within 3-5 business days.</p>
                </AccordionItem>

                <AccordionItem
                  title="Privacy Policy"
                  icon={Shield}
                  isOpen={openAccordion === 'privacy'}
                  onClick={() => setOpenAccordion(openAccordion === 'privacy' ? null : 'privacy')}
                >
                  <p className="mb-2">Your privacy is important to us. BookMyGadi collects personal info such as name, contact details, and precise location data strictly for providing and improving our ride-hailing services.</p>
                  <p className="mb-2">We do not share your private data with third parties for marketing. All transactions are securely processed via certified providers.</p>
                  <p>For data deletion requests, please contact our support team directly. By using this service, you consent to our comprehensive policy guidelines.</p>
                </AccordionItem>
                
                <AccordionItem
                  title="Terms & Conditions"
                  icon={Info}
                  isOpen={openAccordion === 'terms'}
                  onClick={() => setOpenAccordion(openAccordion === 'terms' ? null : 'terms')}
                >
                  <p className="mb-2">1. The user agrees to provide accurate pick-up and drop-off locations.</p>
                  <p className="mb-2">2. Any damages caused to the vehicle by the rider will be charged to the rider's profile.</p>
                  <p className="mb-2">3. All fares are standard estimates and might surge during peak traffic operations.</p>
                  <p>4. Misbehavior, harassment, or illegal substances inside the cab are strictly prohibited and will result in permanent suspension.</p>
                </AccordionItem>

                <AccordionItem
                  title="Help & Support"
                  icon={HelpCircle}
                  isOpen={openAccordion === 'help'}
                  onClick={() => setOpenAccordion(openAccordion === 'help' ? null : 'help')}
                >
                  <p className="mb-2">Facing an issue with a ride or driver?</p>
                  <p className="mb-2"><strong>Email Support:</strong> support@bookmygadi.com</p>
                  <p><strong>Support Toll-Free:</strong> 1800-1122-3344 (Available 24x7)</p>
                </AccordionItem>
                
                <AccordionItem
                  title="Report a Complaint"
                  icon={AlertTriangle}
                  isOpen={openAccordion === 'complaint'}
                  onClick={() => setOpenAccordion(openAccordion === 'complaint' ? null : 'complaint')}
                >
                  <p className="mb-2">We deeply regret any inconvenience you might have faced.</p>
                  <p className="mb-3">To raise a strong ticket, please mention your `Ride ID` and an elaborated issue over mail or use our helpline.</p>
                  <button className="px-4 py-2 bg-rose-500 text-white rounded-xl font-bold text-xs" onClick={() => window.open("mailto:grievance@bookmygadi.com")}>
                    Report Issue
                  </button>
                </AccordionItem>
             </div>

             <div className="bg-white rounded-[32px] overflow-hidden shadow-soft border border-gray-100 p-2 mt-4">
               {user?.role === "admin" && (
                 <Link to="/app/admin" className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 transition-colors">
                   <div className="flex items-center gap-3 font-bold text-sm text-gray-900"><Settings size={18} className="text-gray-400"/> Admin Console</div>
                   <ChevronRight size={16} className="text-gray-300" />
                 </Link>
               )}
               <button onClick={logout} className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-rose-50 transition-colors group">
                 <div className="flex items-center gap-3 font-bold text-sm text-rose-500"><LogOut size={18} className="text-rose-300 group-hover:text-rose-500"/> Sign Out</div>
               </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfilePage;
