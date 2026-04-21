import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { notifyEvent } from "@/services/notificationCenter";
import { XCircle, ArrowLeft, History } from "lucide-react";
import { motion } from "framer-motion";

interface BookingState { rideId: string; pickup: string; destination: string; vehicleType: string; offerPrice: number; status?: string; reason?: string; }
const ACTIVE_BOOKING_STORAGE_KEY = "bmg_active_booking";

const readStoredBooking = (): BookingState | null => {
  const raw = sessionStorage.getItem(ACTIVE_BOOKING_STORAGE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as BookingState; } catch { return null; }
};

const BookingCancelledPage = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const payload = (state as BookingState | null) || readStoredBooking();

  useEffect(() => {
    notifyEvent({ event: "cancel", title: "Booking Cancelled", body: payload?.reason || "Your ride has been cancelled.", tag: `cancelled-${payload?.rideId || "ride"}` }).catch(() => undefined);
  }, [payload?.reason, payload?.rideId]);

   useEffect(() => {
      const timeoutId = window.setTimeout(() => {
         navigate("/app/home", { replace: true });
      }, 3000);

      return () => window.clearTimeout(timeoutId);
   }, [navigate]);

  return (
    <div className="relative isolate w-full px-4 min-h-[90vh] flex flex-col justify-center items-center py-10">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm flex flex-col items-center flex-1 justify-center">
         
         <div className="relative mb-8">
            <div className="absolute inset-0 bg-rose-500 rounded-full blur-[40px] opacity-20"></div>
            <div className="w-32 h-32 bg-white rounded-[2rem] shadow-glass-hard border border-white border-rose-100 flex items-center justify-center relative z-10">
               <XCircle size={64} className="text-rose-500" strokeWidth={1.5} />
            </div>
         </div>

         <h1 className="text-3xl font-black text-gray-900 tracking-tight text-center mb-2">Booking Cancelled</h1>
         <p className="text-sm font-medium text-gray-500 text-center px-4 mb-10">
            {payload?.reason || "This ride has been cancelled and no charges were made."}
         </p>

         <div className="w-full bg-white rounded-3xl p-5 shadow-soft border border-gray-100 mb-8">
            <div className="flex justify-between items-center mb-3">
               <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Route Info</span>
               <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-md text-[10px] font-bold uppercase">{payload?.vehicleType || "General"}</span>
            </div>
            <div className="flex items-start gap-3 mb-3">
               <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0"></div>
               <p className="text-sm font-bold text-gray-900 truncate">{payload?.pickup || "Unknown Pickup"}</p>
            </div>
            <div className="flex items-start gap-3 border-t border-gray-50 pt-3">
               <div className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 shrink-0"></div>
               <p className="text-sm font-bold text-gray-900 truncate">{payload?.destination || "Unknown Drop"}</p>
            </div>
         </div>

      </motion.div>

      <div className="w-full flex gap-3 mt-auto pt-4">
         <button onClick={() => navigate("/app/home")} className="flex-1 h-14 rounded-2xl bg-gray-900 text-white text-sm font-bold shadow-float flex items-center justify-center gap-2">
            <ArrowLeft size={18} /> Book Again
         </button>
         <button onClick={() => navigate("/app/history")} className="w-14 h-14 shrink-0 rounded-2xl bg-white border border-gray-200 text-gray-900 flex items-center justify-center shadow-soft">
            <History size={20} />
         </button>
      </div>
    </div>
  );
};

export default BookingCancelledPage;
