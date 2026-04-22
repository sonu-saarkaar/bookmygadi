import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authStore, backendApi, type ReserveRoutePrice, type Ride, type RiderVehicleRegistration, type UserProfile } from "@/services/backendApi";
import { riderSession } from "./riderSession";
import { Camera, Edit3, Shield, Info, Navigation, Star, Phone, CheckCircle2, Car, CalendarClock, Settings, X, PlusCircle, LogOut, FileText, ChevronDown, FileCheck, Briefcase } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type EditableRiderProfile = { display_name: string; mobile_number: string; calling_number: string; emergency_number: string; city: string; bio: string; avatar_data: string; language: string; avatar_scale: number; avatar_x: number; avatar_y: number; };

const RIDER_PROFILE_STORAGE_KEY = "bmg_rider_profile_edit";
const autoReservePrice6h = (price12h: number) => Math.max(1, price12h - Math.max(200, Math.min(500, Math.round(price12h * 0.14))));
const autoReservePrice24h = (price12h: number) => price12h + Math.max(300, Math.min(700, Math.round(price12h * 0.22)));

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

const RiderProfilePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [rides, setRides] = useState<Ride[]>([]);
  const [rows, setRows] = useState<RiderVehicleRegistration[]>([]);
  const [reservePrices, setReservePrices] = useState<ReserveRoutePrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [showReserveForm, setShowReserveForm] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

  const [editable, setEditable] = useState<EditableRiderProfile>({
    display_name: "", mobile_number: "", calling_number: "", emergency_number: "", city: "Varanasi", bio: "Professional rider", avatar_data: "", language: "Hindi/English", avatar_scale: 1, avatar_x: 0, avatar_y: 0,
  });

  const [form, setForm] = useState({ vehicle_type: "car", brand_model: "", registration_number: "", color: "White", seater_count: 5, vehicle_condition: "good", area: "", rc_number: "", insurance_number: "", notes: "" });
  const [reserveForm, setReserveForm] = useState({ route_from: "", route_to: "", vehicle_type: "car", price_6h: 0, price_12h: 2500, price_24h: 0 });

  const token = authStore.getToken();

  const loadLocalProfile = (): Partial<EditableRiderProfile> => {
    const raw = localStorage.getItem(RIDER_PROFILE_STORAGE_KEY);
    if (!raw) return {};
    try { return JSON.parse(raw) as Partial<EditableRiderProfile>; } catch { return {}; }
  };

  const load = async () => {
    if (!token) return;
    try {
      const [me, rideRows, regRows] = await Promise.all([backendApi.me(token), backendApi.listRides(token), backendApi.listMyRiderVehicleRegistrations(token)]);
      const reserveRows = await backendApi.listMyReserveRoutePrices(token).catch(() => []);
      const local = loadLocalProfile();

      setUser(me); setRides(rideRows); setRows(regRows); setReservePrices(reserveRows);
      setEditable({
        display_name: local.display_name || me.name, mobile_number: local.mobile_number || me.phone || "",
        calling_number: local.calling_number || me.phone || "", emergency_number: local.emergency_number || "",
        city: local.city || "Varanasi", bio: local.bio || "Professional BookMyGadi Partner", avatar_data: local.avatar_data || "",
        language: local.language || "Hindi/English", avatar_scale: local.avatar_scale || 1, avatar_x: local.avatar_x || 0, avatar_y: local.avatar_y || 0,
      });
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to load rider profile"); }
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setEditId(null); setShowVehicleForm(false);
    setForm({ vehicle_type: "car", brand_model: "", registration_number: "", color: "White", seater_count: 5, vehicle_condition: "good", area: "", rc_number: "", insurance_number: "", notes: "" });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault(); if (!token) return; setLoading(true);
    try {
      const payload = {
        vehicle_type: form.vehicle_type, brand_model: form.brand_model, registration_number: form.registration_number, color: form.color,
        seater_count: Number(form.seater_count || 4), vehicle_condition: form.vehicle_condition, area: form.area || null,
        rc_number: form.rc_number || null, insurance_number: form.insurance_number || null, notes: form.notes || null,
      };
      if (editId) {
        await backendApi.updateMyRiderVehicleRegistration(editId, payload, token); setNotice("Vehicle updated and resubmitted.");
      } else {
        await backendApi.createRiderVehicleRegistration(payload, token); setNotice("Vehicle registration sent for approval.");
      }
      resetForm(); await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to submit"); } finally { setLoading(false); setTimeout(() => setNotice(''), 3000); }
  };

  const onEditVehicle = (row: RiderVehicleRegistration) => {
    setEditId(row.id); setShowVehicleForm(true);
    setForm({
      vehicle_type: row.vehicle_type, brand_model: row.brand_model, registration_number: row.registration_number,
      color: row.color || "White", seater_count: row.seater_count, vehicle_condition: row.vehicle_condition || "good",
      area: row.area || "", rc_number: row.rc_number || "", insurance_number: row.insurance_number || "", notes: row.notes || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveProfile = () => {
    localStorage.setItem(RIDER_PROFILE_STORAGE_KEY, JSON.stringify(editable));
    window.dispatchEvent(new Event("bmg_rider_profile_updated"));
    setNotice("Rider profile updated."); setTimeout(() => setNotice(''), 3000); setEditMode(false);
  };

  const assignedRides = rides.filter((r) => r.driver_id === user?.id);
  const totalRide = assignedRides.length;
  const completedRide = assignedRides.filter((r) => r.status === "completed").length;
  const profileRating = useMemo(() => { if (completedRide === 0) return "0.0"; const raw = 4.3 + Math.min(0.6, completedRide * 0.02); return raw.toFixed(1); }, [completedRide]);
  const latestApproved = useMemo(() => rows.find((r) => r.status === "approved") || null, [rows]);
  const avatarLabel = (editable.display_name || user?.name || "D").trim().charAt(0).toUpperCase() || "D";

  const onAvatarFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!file.type.startsWith("image/")) { setNotice("Please select an image."); return; }
    const reader = new FileReader();
    reader.onload = () => { setEditable((p) => ({ ...p, avatar_data: String(reader.result || ""), avatar_scale: 1, avatar_x: 0, avatar_y: 0 })); };
    reader.readAsDataURL(file); e.currentTarget.value = "";
  };

  const onSaveReservePrice = async (e: FormEvent) => {
    e.preventDefault(); if (!token) return;
    if (!reserveForm.route_from.trim() || !reserveForm.route_to.trim() || reserveForm.price_12h <= 0) {
      setNotice("Please fill valid route and prices."); return;
    }
    setLoading(true);
    try {
      const price12 = Number(reserveForm.price_12h);
      const final6h = reserveForm.price_6h > 0 ? Number(reserveForm.price_6h) : autoReservePrice6h(price12);
      const final24h = reserveForm.price_24h > 0 ? Number(reserveForm.price_24h) : autoReservePrice24h(price12);
      await backendApi.createMyReserveRoutePrice({ ...reserveForm, price_6h: final6h, price_12h: price12, price_24h: final24h }, token);
      setReserveForm({ route_from: "", route_to: "", vehicle_type: "car", price_6h: 0, price_12h: 2500, price_24h: 0 });
      setNotice("Reserve pricing saved."); setShowReserveForm(false); await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to save"); } finally { setLoading(false); setTimeout(() => setNotice(''), 3000); }
  };

  return (
    <div className="relative isolate w-full px-2 min-h-[90vh]">
      <AnimatePresence>
         {notice && (
           <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 bg-gray-900 text-white rounded-full text-sm font-bold shadow-glass-hard whitespace-nowrap">
             {notice}
           </motion.div>
         )}
      </AnimatePresence>

      <div className="bg-white rounded-[32px] overflow-hidden shadow-soft border border-gray-100 flex flex-col items-center pt-8 pb-6 px-6 relative mb-6 mt-4">
         <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-gray-900 to-gray-800"></div>
         <button onClick={() => setEditMode(!editMode)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white z-10 transition-colors">
            {editMode ? <X size={18}/> : <Edit3 size={18}/>}
         </button>

         <div className="relative mb-4 z-10 group">
            <div className="w-[100px] h-[100px] rounded-full border-4 border-white shadow-float bg-gray-100 overflow-hidden flex items-center justify-center text-4xl font-black text-gray-400 relative">
               {editable.avatar_data ? (
                 <img src={editable.avatar_data} alt="rider" className="absolute w-full h-full object-cover" style={{ transform: `translate(calc(-50% + ${editable.avatar_x}px), calc(-50% + ${editable.avatar_y}px)) scale(${editable.avatar_scale})`, left: '50%', top: '50%' }} />
               ) : avatarLabel}
            </div>
            {editMode && (
               <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white cursor-pointer shadow-soft">
                 <Camera size={12} />
                 <input type="file" accept="image/*" className="hidden" onChange={onAvatarFileChange} />
               </label>
            )}
         </div>

         <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
           {editable.display_name || user?.name || "Rider"} <Shield size={16} className="text-emerald-500 fill-emerald-100" />
         </h2>
         <p className="text-sm font-medium text-gray-500 mt-1">{editable.mobile_number || user?.phone || "-"}</p>

         <div className="w-full grid grid-cols-3 gap-2 mt-6 p-4 rounded-3xl bg-gray-50 border border-gray-100">
            <div className="text-center">
               <span className="block text-[10px] font-bold uppercase text-gray-400 tracking-wide mb-1">Rides</span>
               <span className="block text-xl font-black text-gray-900">{totalRide}</span>
            </div>
            <div className="text-center border-l border-r border-gray-200">
               <span className="block text-[10px] font-bold uppercase text-gray-400 tracking-wide mb-1">Rating</span>
               <span className="flex items-center justify-center gap-1 text-xl font-black text-emerald-500">
                 {profileRating} <Star size={14} className="fill-emerald-500 -mt-0.5" />
               </span>
            </div>
            <div className="text-center">
               <span className="block text-[10px] font-bold uppercase text-gray-400 tracking-wide mb-1">Online</span>
               <span className="block text-xl font-black text-blue-500">2.4h</span> {/* Mock value for visual completion */}
            </div>
         </div>
      </div>

      <AnimatePresence mode="wait">
        {editMode ? (
          <motion.div key="edit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4 mb-6">
             <div className="bg-white rounded-[32px] p-6 shadow-soft border border-gray-100">
               <h3 className="text-sm font-bold uppercase text-gray-400 tracking-wider mb-4">Edit Profile</h3>
               <div className="space-y-3 relative">
                 <input className="w-full h-14 bg-gray-50 border border-transparent focus:border-emerald-400 outline-none rounded-2xl px-4 text-sm font-bold text-gray-900" value={editable.display_name} onChange={(e) => setEditable((p) => ({ ...p, display_name: e.target.value }))} placeholder="Full Name" />
                 <input className="w-full h-14 bg-gray-50 border border-transparent focus:border-emerald-400 outline-none rounded-2xl px-4 text-sm font-bold text-gray-900" value={editable.mobile_number} onChange={(e) => setEditable((p) => ({ ...p, mobile_number: e.target.value }))} placeholder="Mobile Number" />
                 <input className="w-full h-14 bg-gray-50 border border-transparent focus:border-emerald-400 outline-none rounded-2xl px-4 text-sm font-bold text-gray-900" value={editable.calling_number} onChange={(e) => setEditable((p) => ({ ...p, calling_number: e.target.value }))} placeholder="Alternate / Calling Number" />
                 <input className="w-full h-14 bg-gray-50 border border-transparent focus:border-rose-300 outline-none rounded-2xl px-4 text-sm font-bold text-gray-900" value={editable.emergency_number} onChange={(e) => setEditable((p) => ({ ...p, emergency_number: e.target.value }))} placeholder="Emergency Contact" />
                 <input className="w-full h-14 bg-gray-50 border border-transparent focus:border-emerald-400 outline-none rounded-2xl px-4 text-sm font-bold text-gray-900" value={editable.language} onChange={(e) => setEditable((p) => ({ ...p, language: e.target.value }))} placeholder="Languages Spoken" />
                 <textarea className="w-full h-24 bg-gray-50 border border-transparent focus:border-emerald-400 outline-none rounded-2xl p-4 text-sm font-bold text-gray-900 resize-none" value={editable.bio} onChange={(e) => setEditable((p) => ({ ...p, bio: e.target.value }))} placeholder="Brief bio or experience..." />
               </div>
               <button onClick={saveProfile} className="w-full h-14 bg-gray-900 text-white font-bold rounded-2xl mt-4 shadow-float flex items-center justify-center gap-2">
                 Save Changes
               </button>
             </div>
          </motion.div>
        ) : (
          <motion.div key="view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4 mb-6">
             <div className="bg-white rounded-[32px] p-5 border border-gray-100 shadow-soft">
                <div className="flex items-center justify-between border-b border-gray-50 pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Car size={18} className="text-gray-400" />
                    <h3 className="font-bold text-gray-900">Approved Vehicle</h3>
                  </div>
                  {latestApproved ? (
                     <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase">Active</span>
                  ) : (
                     <span className="px-2 py-1 rounded-md bg-amber-50 text-amber-600 text-[10px] font-bold uppercase">Pending</span>
                  )}
                </div>
                {latestApproved ? (
                  <div>
                    <p className="text-lg font-black text-gray-900 mb-1">{latestApproved.brand_model}</p>
                    <p className="text-xs font-bold text-gray-500 px-3 py-1.5 bg-gray-50 rounded-lg inline-block tracking-widest uppercase">{latestApproved.registration_number}</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 font-medium">No active vehicle approved yet. Please submit your RC details.</p>
                )}
             </div>

             <div className="bg-white rounded-[32px] p-5 border border-gray-100 shadow-soft overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Car size={18} className="text-gray-400" />
                    <h3 className="font-bold text-gray-900">Garage & Fleet</h3>
                  </div>
                  <button onClick={() => setShowVehicleForm(!showVehicleForm)} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-900 hover:bg-gray-100 transition-colors">
                     {showVehicleForm ? <X size={16}/> : <PlusCircle size={16}/>}
                  </button>
                </div>

                <AnimatePresence>
                   {showVehicleForm && (
                     <motion.form initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} onSubmit={onSubmit} className="mb-6 border-b border-gray-50 pb-6 overflow-hidden">
                        <div className="space-y-3">
                          <input className="w-full h-12 bg-gray-50 rounded-xl px-4 text-sm font-bold outline-none" value={form.brand_model} onChange={(e) => setForm((p) => ({ ...p, brand_model: e.target.value }))} placeholder="Vehicle Name / Model" required />
                          <input className="w-full h-12 bg-gray-50 rounded-xl px-4 text-sm font-bold outline-none" value={form.registration_number} onChange={(e) => setForm((p) => ({ ...p, registration_number: e.target.value.toUpperCase() }))} placeholder="Reg. Number (UP65...)" required />
                          <div className="grid grid-cols-2 gap-3">
                             <input className="w-full h-12 bg-gray-50 rounded-xl px-4 text-sm font-bold outline-none" value={form.vehicle_type} onChange={(e) => setForm((p) => ({ ...p, vehicle_type: e.target.value }))} placeholder="Type (Car/Bike)" />
                             <input className="w-full h-12 bg-gray-50 rounded-xl px-4 text-sm font-bold outline-none" value={form.color} onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))} placeholder="Color" />
                             <input type="number" className="w-full h-12 bg-gray-50 rounded-xl px-4 text-sm font-bold outline-none" value={form.seater_count} onChange={(e) => setForm((p) => ({ ...p, seater_count: Number(e.target.value || 4) }))} placeholder="Seater" />
                             <input className="w-full h-12 bg-gray-50 rounded-xl px-4 text-sm font-bold outline-none" value={form.vehicle_condition} onChange={(e) => setForm((p) => ({ ...p, vehicle_condition: e.target.value }))} placeholder="Condition (AC/Non-AC)" />
                          </div>
                          <input className="w-full h-12 bg-gray-50 rounded-xl px-4 text-sm font-bold outline-none" value={form.insurance_number} onChange={(e) => setForm((p) => ({ ...p, insurance_number: e.target.value }))} placeholder="Insurance Number" />
                        </div>
                        <button disabled={loading} className="mt-4 w-full h-12 rounded-xl bg-gray-900 text-sm font-bold text-white shadow-float disabled:opacity-50">
                          {loading ? "Submitting..." : editId ? "Update Request" : "Submit for Approval"}
                        </button>
                     </motion.form>
                   )}
                </AnimatePresence>

                <div className="space-y-3">
                  {rows.length === 0 && !showVehicleForm && <p className="text-sm text-gray-500 font-medium pb-2">No registered vehicles yet.</p>}
                  {rows.map((row) => (
                    <div key={row.id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50 flex items-start justify-between gap-2">
                       <div>
                         <p className="font-bold text-gray-900 text-sm mb-1">{row.brand_model}</p>
                         <p className="text-xs font-semibold text-gray-500">{row.registration_number}</p>
                       </div>
                       <div className="flex flex-col items-end gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${row.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : row.status === 'rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                            {row.status}
                          </span>
                          {row.status !== "approved" && (
                             <button onClick={() => onEditVehicle(row)} className="text-[10px] font-bold text-blue-600 underline underline-offset-2">Edit</button>
                          )}
                       </div>
                    </div>
                  ))}
                </div>
             </div>

             <div className="bg-white rounded-[32px] p-5 border border-gray-100 shadow-soft overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CalendarClock size={18} className="text-gray-400" />
                    <h3 className="font-bold text-gray-900">Custom Fare Settings</h3>
                  </div>
                  <button onClick={() => setShowReserveForm(!showReserveForm)} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-900 hover:bg-gray-100 transition-colors">
                     {showReserveForm ? <X size={16}/> : <PlusCircle size={16}/>}
                  </button>
                </div>

                <AnimatePresence>
                   {showReserveForm && (
                     <motion.form initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} onSubmit={onSaveReservePrice} className="mb-6 border-b border-gray-50 pb-6 overflow-hidden">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                             <input className="w-full h-12 bg-gray-50 rounded-xl px-4 text-sm font-bold outline-none" placeholder="From (City)" value={reserveForm.route_from} onChange={(e) => setReserveForm((p) => ({ ...p, route_from: e.target.value }))} />
                             <Navigation size={16} className="text-gray-300 shrink-0" />
                             <input className="w-full h-12 bg-gray-50 rounded-xl px-4 text-sm font-bold outline-none" placeholder="To (City)" value={reserveForm.route_to} onChange={(e) => setReserveForm((p) => ({ ...p, route_to: e.target.value }))} />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                             <div className="relative">
                               <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">6h</span>
                               <input type="number" className="w-full h-12 bg-gray-50 rounded-xl pl-12 pr-4 text-sm font-bold outline-none" placeholder="₹ Auto" value={reserveForm.price_6h || ""} onChange={(e) => setReserveForm((p) => ({ ...p, price_6h: Number(e.target.value || 0) }))} />
                             </div>
                             <div className="relative">
                               <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">12h</span>
                               <input type="number" className="w-full h-12 bg-gray-50 rounded-xl pl-12 pr-4 text-sm font-bold outline-none" placeholder="₹ Base (e.g. 2500)" value={reserveForm.price_12h || ""} onChange={(e) => setReserveForm((p) => ({ ...p, price_12h: Number(e.target.value || 0) }))} />
                             </div>
                             <div className="relative">
                               <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">24h</span>
                               <input type="number" className="w-full h-12 bg-gray-50 rounded-xl pl-12 pr-4 text-sm font-bold outline-none" placeholder="₹ Auto" value={reserveForm.price_24h || ""} onChange={(e) => setReserveForm((p) => ({ ...p, price_24h: Number(e.target.value || 0) }))} />
                             </div>
                          </div>
                          <p className="text-[11px] text-gray-500 font-medium">Tip: 12h fare mandatory hai. 6h/24h blank rakhoge to system smart market band se auto-calculate karega.</p>
                        </div>
                        <button disabled={loading} className="mt-4 w-full h-12 rounded-xl bg-gray-900 text-sm font-bold text-white shadow-float disabled:opacity-50">
                          {loading ? "Saving..." : "Add Route Price"}
                        </button>
                     </motion.form>
                   )}
                </AnimatePresence>

                <div className="space-y-3">
                  {reservePrices.length === 0 && !showReserveForm && <p className="text-sm text-gray-500 font-medium pb-2">No custom routes defined.</p>}
                  {reservePrices.map((rp) => (
                    <div key={rp.id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50 flex items-start justify-between gap-2">
                       <div className="flex-1">
                         <div className="flex items-center gap-1.5 text-sm font-bold text-gray-900 mb-2">
                            <span>{rp.route_from}</span>
                            <Navigation size={12} className="text-gray-400 shrink-0"/>
                            <span>{rp.route_to}</span>
                         </div>
                         <div className="flex gap-4">
                            <div>
                               <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wide">6 Hours</p>
                               <p className="text-sm font-bold">₹{new Intl.NumberFormat("en-IN").format(rp.price_6h)}</p>
                            </div>
                            <div>
                               <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wide">12 Hours</p>
                               <p className="text-sm font-bold">₹{new Intl.NumberFormat("en-IN").format(rp.price_12h)}</p>
                            </div>
                            <div>
                               <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wide">24 Hours</p>
                               <p className="text-sm font-bold">₹{new Intl.NumberFormat("en-IN").format(rp.price_24h)}</p>
                            </div>
                         </div>
                       </div>
                    </div>
                  ))}
                </div>
             </div>

             <div className="bg-white rounded-[32px] overflow-hidden shadow-soft border border-gray-100 mt-6 mb-6">
                <div className="p-4 bg-gray-50 border-b border-gray-100">
                   <h3 className="font-bold text-gray-900 text-sm">Policies & Support</h3>
                </div>

                <AccordionItem
                  title="Driver KYC & Verification"
                  icon={FileCheck}
                  isOpen={openAccordion === 'kyc'}
                  onClick={() => setOpenAccordion(openAccordion === 'kyc' ? null : 'kyc')}
                >
                  <p className="mb-2">To maintain trust and safety on the platform, all driver partners must complete basic identity verification.</p>
                  <ul className="list-disc pl-4 space-y-1 mb-2 text-gray-500">
                    <li>A valid Driving License and Aadhar Card are mandatory for onboarding.</li>
                    <li>Background verification is performed to ensure passenger safety.</li>
                  </ul>
                  <p>Incomplete or expired KYC documents will temporarily pause your account from receiving new ride requests.</p>
                </AccordionItem>

                <AccordionItem
                  title="Vehicle Standards & Permits"
                  icon={Car}
                  isOpen={openAccordion === 'vehicle'}
                  onClick={() => setOpenAccordion(openAccordion === 'vehicle' ? null : 'vehicle')}
                >
                  <p className="mb-2">Vehicles must meet BookMyGadi's quality standards to ensure a comfortable ride for users.</p>
                  <ul className="list-disc pl-4 space-y-1 mb-2 text-gray-500">
                    <li>Must hold valid commercial permits matching standard transport guidelines.</li>
                    <li>Vehicle must have active insurance including passenger liability.</li>
                    <li>Cars must be kept clean, well-maintained, and match the RC details provided.</li>
                  </ul>
                </AccordionItem>

                <AccordionItem
                  title="Earnings & Payouts"
                  icon={Briefcase}
                  isOpen={openAccordion === 'payout'}
                  onClick={() => setOpenAccordion(openAccordion === 'payout' ? null : 'payout')}
                >
                  <p className="mb-2">BookMyGadi ensures transparent and timely settlements for our driver partners.</p>
                  <p className="mb-2"><strong>Platform Fee:</strong> The company deducts a standard platform fee automatically from the total ride fare.</p>
                  <p><strong>Payout Cycle:</strong> Earnings are settled to your registered bank account or UPI automatically within 24 working hours, barring weekends and bank holidays.</p>
                </AccordionItem>

                <AccordionItem
                  title="Code of Conduct"
                  icon={Shield}
                  isOpen={openAccordion === 'conduct'}
                  onClick={() => setOpenAccordion(openAccordion === 'conduct' ? null : 'conduct')}
                >
                  <p className="mb-2">Professionalism between the driver and the passenger is our top priority.</p>
                  <ul className="list-disc pl-4 space-y-1 mb-2 text-gray-500">
                    <li>Maintain polite and respectful behavior with all passengers.</li>
                    <li>Demanding extra cash over the estimated fare or bypassing the app for offline rides is strictly prohibited and can lead to account deactivation.</li>
                    <li>Zero tolerance policy towards harassment, driving under the influence, or reckless driving.</li>
                  </ul>
                </AccordionItem>

                <AccordionItem
                  title="Help & Partner Support"
                  icon={Info}
                  isOpen={openAccordion === 'support'}
                  onClick={() => setOpenAccordion(openAccordion === 'support' ? null : 'support')}
                >
                  <p className="mb-2">Need assistance with your account, payouts, or a specific ride?</p>
                  <p className="mb-2"><strong>Partner Helpline:</strong> 1800-4455-6677</p>
                  <p><strong>Support Email:</strong> partners@bookmygadi.com</p>
                </AccordionItem>
             </div>

             <button onClick={() => { riderSession.clear(); authStore.clear(); navigate("/rider/login", { replace: true }); }} className="w-full flex items-center justify-between p-5 rounded-[24px] bg-white border border-rose-100 hover:bg-rose-50 transition-colors group mb-6 mt-4">
                 <div className="flex items-center gap-3 font-bold text-rose-500"><LogOut size={18} className="text-rose-300 group-hover:text-rose-500"/> Switch Account / Logout</div>
             </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default RiderProfilePage;
