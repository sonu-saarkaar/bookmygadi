import { useState } from "react";
import { CalendarClock, PlusCircle, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const RiderAdvanceBookPage = () => {
  const [notice, setNotice] = useState("");

  const handleAdvanceBook = () => {
    setNotice("Advance Booking functionality is rolling out soon in your area!");
    setTimeout(() => setNotice(''), 3000);
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

      <div className="py-2 px-1 mb-6 flex justify-between items-end">
        <div>
           <h1 className="text-3xl font-black text-gray-900 tracking-tight">Schedule</h1>
           <p className="text-sm font-medium text-gray-500 mt-1">Manage future & advance rides.</p>
        </div>
        <div className="h-12 w-12 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center shadow-soft">
           <CalendarClock size={22} />
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-soft p-8 flex flex-col items-center justify-center text-center mt-8">
        <div className="w-24 h-24 bg-violet-50 rounded-full flex justify-center items-center text-violet-500 mb-6 shadow-sm">
            <CalendarClock size={40} strokeWidth={1.5} />
        </div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">No Scheduled Rides</h2>
        <p className="mt-2 text-sm text-gray-500 leading-relaxed max-w-[250px]">
          You don't have any advance bookings right now. Accept future reservations to build your schedule.
        </p>
        
        <button 
          onClick={handleAdvanceBook}
          className="mt-8 w-full h-14 rounded-2xl bg-gray-900 text-sm font-bold text-white shadow-float transition-transform active:scale-95 flex items-center justify-center gap-2"
        >
          <PlusCircle size={18} /> Schedule Availability
        </button>
      </div>

      <div className="mt-6 bg-white rounded-[24px] p-5 shadow-soft border border-gray-100">
         <div className="flex justify-between items-center mb-1">
            <h3 className="font-bold text-gray-900">How scheduling works</h3>
            <ArrowRight size={16} className="text-gray-400" />
         </div>
         <p className="text-xs font-medium text-gray-500">Customers can book your car for outstation or specific hours in advance. Keep your availability updated.</p>
      </div>
    </div>
  );
};

export default RiderAdvanceBookPage;
