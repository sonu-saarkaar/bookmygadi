import { useState, useEffect } from "react";
import * as Lucide from "lucide-react";
import { Navigation, Clock, Zap, Edit3, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { backendApi } from "@/services/backendApi";
import { adminV2Api } from "@/admin_v2/services/adminApi";
import { useAdminV2Store } from "@/admin_v2/store/useAdminStore";
import { Button, Modal } from "@/admin_v2/components/ui";

const safelist = "from-emerald-400 to-emerald-600 from-amber-400 to-orange-500 from-teal-400 to-teal-600 from-cyan-500 to-blue-600 from-indigo-400 to-blue-600 from-rose-500 to-pink-600 from-slate-700 to-slate-900";

const ICON_OPTIONS = [
  "Car", "Bike", "Truck", "Bus", "Package", "Zap", "Star", "Shield", "MapPin"
];

const COLOR_OPTIONS = [
  { label: "Emerald", value: "from-emerald-400 to-emerald-600" },
  { label: "Amber", value: "from-amber-400 to-orange-500" },
  { label: "Teal", value: "from-teal-400 to-teal-600" },
  { label: "Blue", value: "from-cyan-500 to-blue-600" },
  { label: "Indigo", value: "from-indigo-400 to-blue-600" },
  { label: "Rose", value: "from-rose-500 to-pink-600" },
  { label: "Dark", value: "from-slate-700 to-slate-900" },
];

export const ServiceManagementBoard = () => {
  const { pushToast } = useAdminV2Store();
  const [viewType, setViewType] = useState<"Instant Ride" | "reserve">("Instant Ride");
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    tag_highlight: "",
    icon_name: "Car",
    color_scheme: "from-emerald-400 to-emerald-600",
    service_mode: "Instant Ride",
    vehicle_type: "car",
    vehicle_model: ""
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await backendApi.listServices();
      setServices(data || []);
    } catch (e: any) {
      pushToast("Failed to load services", "danger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenEdit = (s: any) => {
    setEditingId(s.id);
    setFormData({
      title: s.title,
      description: s.description,
      tag_highlight: s.tag_highlight || "",
      icon_name: s.icon_name || "Car",
      color_scheme: s.color_scheme || "from-emerald-400 to-emerald-600",
      service_mode: s.service_mode || "Instant Ride",
      vehicle_type: s.vehicle_type || "car",
      vehicle_model: s.vehicle_model || ""
    });
    setIsModalOpen(true);
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      title: "",
      description: "",
      tag_highlight: "",
      icon_name: "Car",
      color_scheme: "from-emerald-400 to-emerald-600",
      service_mode: viewType,
      vehicle_type: "car",
      vehicle_model: ""
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title || formData.title.length < 2) {
      pushToast("Title is required (min 2 chars)", "danger");
      return;
    }
    if (!formData.description) {
      pushToast("Description is required", "danger");
      return;
    }
    try {
      if (editingId) {
        await adminV2Api.requestV1(`/services/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(formData)
        });
        pushToast("Service updated successfully", "success");
      } else {
        await adminV2Api.requestV1(`/services/`, {
          method: "POST",
          body: JSON.stringify(formData)
        });
        pushToast("Service added successfully", "success");
      }
      setIsModalOpen(false);
      loadData();
    } catch (e: any) {
      pushToast(e.message || "Failed to save service", "danger");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this service?")) return;
    try {
      await adminV2Api.deleteService(id);
      pushToast("Service deleted", "success");
      loadData();
    } catch (e: any) {
      pushToast("Failed to delete service", "danger");
    }
  };

  const activeServices = services.filter(s => s.service_mode === viewType);

  return (
    <div className="relative isolate w-full px-2 min-h-[90vh] pb-24 max-w-4xl mx-auto">
      <div className="py-2 px-1 mb-6 flex justify-between items-end">
        <div>
           <h1 className="text-3xl font-black text-gray-900 tracking-tight">Service Management</h1>
           <p className="text-sm font-medium text-gray-500 mt-1">Configure user app services exactly as they appear</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <AnimatePresence mode="wait">
          {loading ? (
            <div className="col-span-1 md:col-span-2 flex flex-col items-center justify-center py-20 opacity-40">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-xs font-bold uppercase tracking-widest">Loading Services...</p>
            </div>
          ) : activeServices.length === 0 ? (
            <div className="col-span-1 md:col-span-2 flex flex-col items-center justify-center py-20 bg-gray-50 rounded-[32px] border-2 border-dashed border-gray-200">
               <p className="text-gray-400 font-bold">No services available for this mode</p>
            </div>
          ) : (
            activeServices.map((item, i) => {
              const Icon = (Lucide as any)[item.icon_name] || Lucide.Car;
              return (
                <motion.div 
                   initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                   key={item.id} 
                   className="bg-white rounded-[32px] p-6 shadow-soft border border-gray-100 flex flex-col relative overflow-hidden group hover:shadow-lg transition-all"
                >
                  <div className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-br ${item.color_scheme} rounded-full blur-[70px] opacity-10 -mr-16 -mt-16 pointer-events-none group-hover:opacity-20 transition-opacity`}></div>
                  
                  <div className="flex justify-between items-start mb-5 relative z-10">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.color_scheme} shadow-float flex items-center justify-center text-white`}>
                       <Icon size={30} strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {item.tag_highlight && (
                         <div className="px-3 py-1.5 bg-gray-50 rounded-full flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-gray-600 border border-gray-100 shadow-sm">
                            <Zap size={10} className="text-amber-500 fill-amber-500" /> {item.tag_highlight}
                         </div>
                      )}
                      <button onClick={() => handleDelete(item.id)} className="p-2 text-rose-400 hover:bg-rose-50 hover:text-rose-600 rounded-full transition-colors" title="Delete Service">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex-1 relative z-10">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">{item.title}</h2>
                    <p className="mt-1.5 text-[13px] text-gray-500 font-bold leading-relaxed mb-6 opacity-80">{item.description}</p>
                  </div>
                  
                  <button 
                    onClick={() => handleOpenEdit(item)}
                    className={`w-full h-16 rounded-2xl bg-gray-900 text-white shadow-lg text-center font-black text-sm uppercase tracking-[0.18em] hover:bg-black transition-colors flex items-center justify-center gap-2 relative z-10 active:scale-[0.98]`}
                   >
                    <Edit3 size={16} strokeWidth={3} /> Edit Service
                  </button>
                </motion.div>
              )
            })
          )}
        </AnimatePresence>

        <motion.button 
          onClick={handleOpenAdd}
          whileTap={{ scale: 0.98 }}
          className="col-span-1 md:col-span-2 mt-4 w-full h-[80px] rounded-[32px] border-2 border-dashed border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-600 flex items-center justify-center gap-2 font-black uppercase tracking-widest text-sm transition-colors"
        >
          <Plus strokeWidth={3} /> Add More Service
        </motion.button>
      </div>

      {isModalOpen && (
        <Modal onClose={() => setIsModalOpen(false)}>
          <div className="p-6">
            <h2 className="text-xl font-bold mb-6 text-slate-800">{editingId ? 'Edit Service' : 'Add New Service'}</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Title</label>
                <input 
                  type="text" 
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full border border-slate-300 rounded-xl p-3 outline-none focus:border-indigo-500 font-bold"
                  placeholder="e.g. Instant Ride Car"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Description</label>
                <textarea 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full border border-slate-300 rounded-xl p-3 outline-none focus:border-indigo-500"
                  placeholder="e.g. Comfortable city and outstation trips"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Tag (Optional)</label>
                  <input 
                    type="text" 
                    value={formData.tag_highlight} 
                    onChange={e => setFormData({...formData, tag_highlight: e.target.value})}
                    className="w-full border border-slate-300 rounded-xl p-3 outline-none focus:border-indigo-500"
                    placeholder="e.g. Popular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Vehicle Type</label>
                  <input 
                    type="text" 
                    value={formData.vehicle_type} 
                    onChange={e => setFormData({...formData, vehicle_type: e.target.value.toLowerCase()})}
                    className="w-full border border-slate-300 rounded-xl p-3 outline-none focus:border-indigo-500 lowercase"
                    placeholder="e.g. car, auto, bike"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Color Scheme</label>
                  <select 
                    value={formData.color_scheme}
                    onChange={e => setFormData({...formData, color_scheme: e.target.value})}
                    className="w-full border border-slate-300 rounded-xl p-3 outline-none focus:border-indigo-500 bg-white"
                  >
                    {COLOR_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Icon</label>
                  <select 
                    value={formData.icon_name}
                    onChange={e => setFormData({...formData, icon_name: e.target.value})}
                    className="w-full border border-slate-300 rounded-xl p-3 outline-none focus:border-indigo-500 bg-white"
                  >
                    {ICON_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Service Mode</label>
                <select 
                  value={formData.service_mode}
                  onChange={e => setFormData({...formData, service_mode: e.target.value})}
                  className="w-full border border-slate-300 rounded-xl p-3 outline-none focus:border-indigo-500 bg-white"
                >
                  <option value="Instant Ride">Instant Ride</option>
                  <option value="reserve">Reserved</option>
                </select>
              </div>

            </div>

            <div className="flex justify-end gap-3 mt-8">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} className="bg-gray-900 text-white hover:bg-black px-8">Save Service</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
