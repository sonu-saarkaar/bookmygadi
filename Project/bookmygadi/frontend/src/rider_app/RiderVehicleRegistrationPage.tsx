import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Save, UploadCloud } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { authStore, backendApi } from "@/services/backendApi";

export default function RiderVehicleRegistrationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    // Step 1: Service
    vehicle_category: "Car (4 Wheeler)",
    service_type: "Instant Ride",
    vehicle_type: "SUV",
    
    // Step 2: Vehicle
    brand_model: "",
    registration_number: "",
    color: "",
    vehicle_condition: "Good",
    model_year: "",
    has_ac: false,
    has_music: false,
    
    // Step 3: Owner
    owner_name: "",
    owner_phone: "",
    owner_email: "",
    owner_address: "",
    is_owner_driver: true,
    
    // Step 4: Driver
    driver_name: "",
    driver_calling_number: "",
    driver_number: "",
    driver_dl_number: "",
    
    // Step 5: Preferences
    work_area: "",
    work_timings: "Full Time"
  });

  const handleNext = () => setStep(s => Math.min(s + 1, 5));
  const handleBack = () => setStep(s => Math.max(s - 1, 1));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 5) {
        handleNext();
        return;
    }

        if (!form.brand_model.trim()) {
            setNotice("Please enter vehicle brand/model.");
            return;
        }

        if (!form.registration_number.trim()) {
            setNotice("Please enter vehicle registration number.");
            return;
        }

    setLoading(true);
    setNotice("");
    const token = authStore.getToken();
    if (!token) {
       setNotice("You must be logged in.");
       setLoading(false);
       return;
    }
    
    try {
      await backendApi.createRiderVehicleRegistration({
         vehicle_category: form.vehicle_category,
         vehicle_type: form.vehicle_type,
         service_type: form.service_type,
         brand_model: form.brand_model,
         registration_number: form.registration_number,
         color: form.color,
         seater_count: 4, // Defaulting due to schema constraints
         vehicle_condition: form.vehicle_condition,
         model_year: form.model_year ? form.model_year : null,
         has_ac: form.has_ac,
         has_music: form.has_music,
         owner_name: form.owner_name,
         owner_phone: form.owner_phone,
         owner_email: form.owner_email,
         owner_address: form.owner_address,
         is_owner_driver: form.is_owner_driver,
         driver_name: form.driver_name,
         driver_number: form.driver_number,
         driver_dl_number: form.driver_dl_number,
         driver_calling_number: form.driver_calling_number,
         area: form.work_area,
         rc_number: null,
         insurance_number: null,
      }, token);
      
      setNotice("Your Gadi details have been submitted. Once approved by Admin, you will get your 'BMG' Rider ID.");
      setTimeout(() => {
         navigate("/rider/home");
      }, 3000);

        } catch (error) {
            if (error instanceof Error && error.message.toLowerCase().includes("unable to reach server")) {
                setNotice("Server connection failed. Please start backend server and try again.");
            } else {
                setNotice(error instanceof Error ? error.message : "Failed to register Gadi.");
            }
    } finally {
      setLoading(false);
    }
  };

  const TopBar = () => (
    <div className="bg-white px-5 pt-8 pb-4 flex items-center justify-between sticky top-0 z-20 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
      <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center cursor-pointer" onClick={() => step > 1 ? handleBack() : navigate(-1)}>
        <ChevronLeft size={20} className="text-gray-600" />
      </div>
      <div className="flex-1 px-4">
        <h1 className="text-base font-black tracking-tight text-gray-900 text-center">Step {step} of 5</h1>
        <div className="w-full bg-gray-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${(step / 5) * 100}%` }} />
        </div>
      </div>
      <div className="w-10" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans mb-16 relative">
      <TopBar />

      <div className="p-5">
         {notice && (
            <div className={`mb-6 p-4 rounded-xl text-sm font-bold border ${notice.includes('submitted') ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-500 border-rose-100'}`}>
               {notice}
            </div>
         )}

         <form onSubmit={onSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
             {step === 1 && (
                 <motion.div key="step1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-5">
                    <h2 className="text-xl font-black text-gray-900">Service Details</h2>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Vehicle Category</label>
                        <select value={form.vehicle_category} onChange={e => {
                                setForm({...form, vehicle_category: e.target.value, service_type: 'Instant Ride'}); 
                            }} className="w-full h-14 bg-white rounded-2xl border border-gray-100 px-4 text-sm font-bold text-gray-900 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all appearance-none" >
                           <option value="Bike (2 Wheeler)">Bike (2 Wheeler)</option>
                           <option value="E-Rikhsaw 5 Seater">E-Rikhsaw 5 Seater</option>
                           <option value="Normal Auto 5 Seater">Normal Auto 5 Seater</option>
                           <option value="Large Auto 9 Seater">Large Auto 9 Seater</option>
                           <option value="Car (4 Wheeler)">Car (4 Wheeler)</option>
                           <option value="Pickup & Logistics">Pickup & Logistics</option>
                        </select>
                    </div>
                    {form.vehicle_category === "Car (4 Wheeler)" && (
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Car Type</label>
                            <select value={form.vehicle_type} onChange={e => setForm({...form, vehicle_type: e.target.value})} className="w-full h-14 bg-white rounded-2xl border border-gray-100 px-4 text-sm font-bold text-gray-900 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all appearance-none" >
                               <option value="Hatchback">Hatchback / Mini</option>
                               <option value="Sedan">Sedan</option>
                               <option value="SUV">SUV / MUV</option>
                               <option value="Premium">Premium</option>
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Service Preference</label>
                        <p className="text-xs text-gray-500 mb-2 ml-1">Which service would you like to drive for?</p>
                        <div className="flex flex-col gap-2">
                           <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer ${form.service_type === 'Instant Ride' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white'}`}>
                              <input type="radio" checked={form.service_type === 'Instant Ride'} onChange={() => setForm({...form, service_type: 'Instant Ride'})} className="hidden" />
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${form.service_type === 'Instant Ride' ? 'border-indigo-600' : 'border-gray-300'}`}>
                                  {form.service_type === 'Instant Ride' && <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full" />}
                              </div>
                              <span className="font-bold text-gray-800 text-sm">Instant Rides Only</span>
                           </label>
                           
                           {form.vehicle_category === "Car (4 Wheeler)" && (
                               <>
                               <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer ${form.service_type === 'reserve' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white'}`}>
                                  <input type="radio" checked={form.service_type === 'reserve'} onChange={() => setForm({...form, service_type: 'reserve'})} className="hidden" />
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${form.service_type === 'reserve' ? 'border-indigo-600' : 'border-gray-300'}`}>
                                      {form.service_type === 'reserve' && <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full" />}
                                  </div>
                                  <span className="font-bold text-gray-800 text-sm">Reservation / Outstation Only</span>
                               </label>
                               
                               <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer ${form.service_type === 'both' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white'}`}>
                                  <input type="radio" checked={form.service_type === 'both'} onChange={() => setForm({...form, service_type: 'both'})} className="hidden" />
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${form.service_type === 'both' ? 'border-indigo-600' : 'border-gray-300'}`}>
                                      {form.service_type === 'both' && <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full" />}
                                  </div>
                                  <span className="font-bold text-gray-800 text-sm">Both (Instant Ride + Reserve)</span>
                               </label>

                               <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer ${form.service_type === 'occasion' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white'}`}>
                                  <input type="radio" checked={form.service_type === 'occasion'} onChange={() => setForm({...form, service_type: 'occasion'})} className="hidden" />
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${form.service_type === 'occasion' ? 'border-indigo-600' : 'border-gray-300'}`}>
                                      {form.service_type === 'occasion' && <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full" />}
                                  </div>
                                  <span className="font-bold text-gray-800 text-sm">Special Occasion (Wedding etc)</span>
                               </label>
                               </>
                           )}
                        </div>
                    </div>
                 </motion.div>
             )}

             {step === 2 && (
                 <motion.div key="step2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-4">
                    <h2 className="text-xl font-black text-gray-900">Vehicle Details</h2>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Brand & Model Name</label>
                        <input placeholder="e.g. XUV 300, Swift Dzire" value={form.brand_model} onChange={e => setForm({...form, brand_model: e.target.value})} className="w-full h-14 bg-white rounded-2xl border border-gray-100 px-4 text-sm font-bold text-gray-900 outline-none focus:border-indigo-400" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Registration # (Required for BMG ID)</label>
                        <input placeholder="e.g. UP 65 AB 1234" value={form.registration_number} onChange={e => setForm({...form, registration_number: e.target.value.toUpperCase()})} className="w-full h-14 bg-white rounded-2xl border border-gray-100 px-4 text-sm font-bold text-gray-900 outline-none focus:border-indigo-400 uppercase" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Color</label>
                            <input placeholder="e.g. White" value={form.color} onChange={e => setForm({...form, color: e.target.value})} className="w-full h-14 bg-white rounded-2xl border border-gray-100 px-4 text-sm font-bold text-gray-900 focus:border-indigo-400" />
                         </div>
                         <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Model Year</label>
                            <input type="number" placeholder="2022" value={form.model_year} onChange={e => setForm({...form, model_year: e.target.value})} className="w-full h-14 bg-white rounded-2xl border border-gray-100 px-4 text-sm font-bold text-gray-900 focus:border-indigo-400" />
                         </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-1">
                        <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100">
                           <span className="text-sm font-bold text-gray-700">AC Available?</span>
                           <input type="checkbox" checked={form.has_ac} onChange={e => setForm({...form, has_ac: e.target.checked})} className="w-5 h-5 rounded text-indigo-500 focus:ring-indigo-500" />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100">
                           <span className="text-sm font-bold text-gray-700">Music System?</span>
                           <input type="checkbox" checked={form.has_music} onChange={e => setForm({...form, has_music: e.target.checked})} className="w-5 h-5 rounded text-indigo-500 focus:ring-indigo-500" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Vehicle Condition</label>
                        <select value={form.vehicle_condition} onChange={e => setForm({...form, vehicle_condition: e.target.value})} className="w-full h-14 bg-white rounded-2xl border border-gray-100 px-4 text-sm font-bold text-gray-900 outline-none focus:border-indigo-400 appearance-none" >
                           <option value="Excellent">Excellent (Like New)</option>
                           <option value="Good">Good</option>
                           <option value="Fair">Fair / Old</option>
                        </select>
                    </div>

                    <div className="space-y-3 pt-2">
                        <div className="h-16 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50 cursor-pointer hover:border-indigo-400 text-gray-400 group">
                            <UploadCloud size={20} className="mr-2 group-hover:text-indigo-500" />
                            <span className="text-sm font-bold group-hover:text-indigo-500">Upload Interior Pic</span>
                        </div>
                        <div className="h-16 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50 cursor-pointer hover:border-indigo-400 text-gray-400 group">
                            <UploadCloud size={20} className="mr-2 group-hover:text-indigo-500" />
                            <span className="text-sm font-bold group-hover:text-indigo-500">Upload Exterior Pic</span>
                        </div>
                        <div className="h-16 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50 cursor-pointer hover:border-indigo-400 text-gray-400 group">
                            <UploadCloud size={20} className="mr-2 group-hover:text-indigo-500" />
                            <span className="text-sm font-bold group-hover:text-indigo-500">Upload Overall Gadi Pic</span>
                        </div>
                    </div>
                 </motion.div>
             )}

             {step === 3 && (
                 <motion.div key="step3" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-4">
                    <h2 className="text-xl font-black text-gray-900">Owner Details</h2>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Owner Name</label>
                        <input placeholder="Gadi Owner's Name" value={form.owner_name} onChange={e => setForm({...form, owner_name: e.target.value})} className="w-full h-14 bg-white rounded-2xl border border-gray-100 px-4 text-sm font-bold text-gray-900 focus:border-indigo-400" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Owner Phone Number</label>
                        <input type="tel" placeholder="Owner Phone" value={form.owner_phone} onChange={e => setForm({...form, owner_phone: e.target.value})} className="w-full h-14 bg-white rounded-2xl border border-gray-100 px-4 text-sm font-bold text-gray-900 focus:border-indigo-400" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Owner Email</label>
                        <input type="email" placeholder="owner@example.com" value={form.owner_email} onChange={e => setForm({...form, owner_email: e.target.value})} className="w-full h-14 bg-white rounded-2xl border border-gray-100 px-4 text-sm font-bold text-gray-900 focus:border-indigo-400" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Owner Address</label>
                        <textarea placeholder="Current Address" value={form.owner_address} onChange={e => setForm({...form, owner_address: e.target.value})} className="w-full p-4 bg-white rounded-2xl border border-gray-100 text-sm font-bold text-gray-900 focus:border-indigo-400 outline-none resize-none min-h-[80px]" />
                    </div>
                    <div className="flex items-center gap-3 mt-2 bg-indigo-50 p-4 rounded-2xl border border-indigo-100 shadow-sm cursor-pointer" onClick={() => setForm({...form, is_owner_driver: !form.is_owner_driver})}>
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${form.is_owner_driver ? 'bg-indigo-600' : 'bg-white border-2 border-gray-300'}`}>
                            {form.is_owner_driver && <Save size={14} className="text-white" />}
                        </div>
                        <div>
                           <p className="text-sm font-bold text-gray-900">I am also the Driver</p>
                           <p className="text-xs text-slate-500 font-medium">Owner will be driving the vehicle</p>
                        </div>
                    </div>
                 </motion.div>
             )}

             {step === 4 && (
                 <motion.div key="step4" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-4">
                    <h2 className="text-xl font-black text-gray-900">Driver Details</h2>
                    {!form.is_owner_driver && (
                        <>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Driver Name</label>
                            <input placeholder="Driver's Full Name" value={form.driver_name} onChange={e => setForm({...form, driver_name: e.target.value})} className="w-full h-14 bg-white rounded-2xl border border-gray-100 px-4 text-sm font-bold text-gray-900 focus:border-indigo-400" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Driver Number</label>
                            <input type="tel" placeholder="Primary Driver Phone" value={form.driver_number} onChange={e => setForm({...form, driver_number: e.target.value})} className="w-full h-14 bg-white rounded-2xl border border-gray-100 px-4 text-sm font-bold text-gray-900 focus:border-indigo-400" />
                        </div>
                        </>
                    )}
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Calling Number (During Ride)</label>
                        <input type="tel" placeholder="Number to call while online" value={form.driver_calling_number} onChange={e => setForm({...form, driver_calling_number: e.target.value})} className="w-full h-14 bg-white rounded-2xl border border-gray-100 px-4 text-sm font-bold text-gray-900 focus:border-indigo-400" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Driving License (DL) No.</label>
                        <input placeholder="UP65 20211234567" value={form.driver_dl_number} onChange={e => setForm({...form, driver_dl_number: e.target.value.toUpperCase()})} className="w-full h-14 bg-white rounded-2xl border border-gray-100 px-4 text-sm font-bold text-gray-900 uppercase focus:border-indigo-400" />
                    </div>
                    <div className="h-16 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl mt-2 bg-gray-50 cursor-pointer hover:border-indigo-400 text-gray-400 group">
                        <UploadCloud size={20} className="mr-2 group-hover:text-indigo-500" />
                        <span className="text-sm font-bold group-hover:text-indigo-500">Upload License Photo</span>
                    </div>
                 </motion.div>
             )}

             {step === 5 && (
                 <motion.div key="step5" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-4">
                    <h2 className="text-xl font-black text-gray-900">Preferences</h2>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Preferred Work Area / City</label>
                        <input placeholder="e.g. Varanasi, Lucknow" value={form.work_area} onChange={e => setForm({...form, work_area: e.target.value})} className="w-full h-14 bg-white rounded-2xl border border-gray-100 px-4 text-sm font-bold text-gray-900" required />
                    </div>
                    <div>
                         <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Shift / Timings</label>
                         <select value={form.work_timings} onChange={e => setForm({...form, work_timings: e.target.value})} className="w-full h-14 bg-white rounded-2xl border border-gray-100 px-4 text-sm font-bold text-gray-900 outline-none appearance-none">
                             <option value="Full Time">Full Time (Any time)</option>
                             <option value="Part Time Day">Part Time (Day)</option>
                             <option value="Part Time Night">Part Time (Night)</option>
                             <option value="Weekends">Weekends Only</option>
                         </select>
                    </div>
                 </motion.div>
             )}
            </AnimatePresence>

             <div className="pt-8 pb-12">
                 <motion.button 
                   disabled={loading}
                   whileTap={{ scale: 0.96 }}
                   className="w-full h-14 rounded-2xl flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-black tracking-wide shadow-[0_4px_20px_rgba(79,70,229,0.3)] disabled:opacity-60 transition-all gap-2"
                   type="submit"
                 >
                   {step < 5 ? (
                       <>Next Step <ChevronRight size={18} /></>
                   ) : (
                       <><Save size={18} /> {loading ? "Generating Request..." : "Submit for Approval"}</>
                   )}
                 </motion.button>
             </div>
         </form>
      </div>
    </div>
  );
}


