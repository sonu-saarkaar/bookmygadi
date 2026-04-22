import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { notifyEvent } from "@/services/notificationCenter";
import { AlertTriangle, ArrowLeft, Info } from "lucide-react";
import { motion } from "framer-motion";

interface BookingState { rideId: string; pickup: string; destination: string; vehicleType: string; offerPrice: number; status?: string; }
const ACTIVE_BOOKING_STORAGE_KEY = "bmg_active_booking";

const readStoredBooking = (): BookingState | null => {
  const raw = sessionStorage.getItem(ACTIVE_BOOKING_STORAGE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as BookingState; } catch { return null; }
};

const BookingRejectedPage = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const payload = (state as BookingState | null) || readStoredBooking();

  useEffect(() => {
    notifyEvent({ event: "cancel", title: "Booking Rejected", body: "We could not confirm a rider for this request.", tag: `rejected-${payload?.rideId || "ride"}` }).catch(() => undefined);
    const timer = setTimeout(() => {
      navigate("/app/home", { replace: true });
    }, 3000);
    return () => clearTimeout(timer);
  }, [payload?.rideId, navigate]);

  return (
    <div className="relative isolate w-full px-4 min-h-[90vh] flex flex-col justify-center items-center py-10">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm flex flex-col items-center flex-1 justify-center">
         
         <div className="relative mb-8">
            <div className="absolute inset-0 bg-amber-500 rounded-full blur-[40px] opacity-20"></div>
            <div className="w-32 h-32 bg-white rounded-[2rem] shadow-glass-hard border border-white border-amber-100 flex items-center justify-center relative z-10">
               <AlertTriangle size={56} className="text-amber-500" strokeWidth={1.5} />
            </div>
         </div>

         <h1 className="text-3xl font-black text-gray-900 tracking-tight text-center mb-2">Finding Failed</h1>
         <p className="text-sm font-medium text-gray-500 text-center px-4 mb-4">
            We couldn't confirm this ride at the moment. All riders might be busy or offline.
         </p>

         <div className="w-full bg-white rounded-3xl p-5 shadow-soft border border-gray-100 mb-8">
            <div className="flex justify-between items-center mb-3">
               <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Request Snapshot</span>
            </div>
            <div className="flex justify-between items-end mb-3">
               <div className="flex-1 truncate pr-4">
                 <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Fare Offer</p>
                 <p className="text-xl font-black text-gray-900">₹{new Intl.NumberFormat("en-IN").format(payload?.offerPrice || 0)}</p>
               </div>
               <div className="text-right">
                 <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Vehicle</p>
                 <p className="text-sm font-bold text-gray-900 capitalize">{payload?.vehicleType || "General"}</p>
               </div>
            </div>
            <div className="px-3 py-2 bg-gray-50 rounded-xl flex items-center gap-2 mt-2">
               <Info size={14} className="text-gray-400" />
               <p className="text-xs font-medium text-gray-500">Tip: Try increasing your fare offer slightly.</p>
            </div>
         </div>

      </motion.div>

      <div className="w-full flex gap-3 mt-auto pt-4">
         <button onClick={() => navigate("/app/home")} className="flex-1 h-14 rounded-2xl bg-gray-900 text-white text-sm font-bold shadow-float flex items-center justify-center gap-2">
            <ArrowLeft size={18} /> Modify & Retry
         </button>
      </div>
    </div>
  );
};

export default BookingRejectedPage;
