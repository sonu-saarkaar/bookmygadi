import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { riderApi } from "@/services/riderApi";
import { CheckCircle2, Star, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const RiderFeedbackPage = () => {
  const navigate = useNavigate();
  const { rideId = "" } = useParams();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [autoHomeCountdown, setAutoHomeCountdown] = useState(5);

  useEffect(() => {
    if (autoHomeCountdown <= 0) return;
    const id = window.setInterval(() => {
      setAutoHomeCountdown((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          navigate("/rider/home", { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [autoHomeCountdown, navigate]);

  const submit = async () => {
    if (!rideId || rating === 0) {
       setNotice("Please select a rating.");
       return;
    }
    setLoading(true);
    setNotice("");
    try {
      await riderApi.submitFeedback(rideId, rating, comment);
      setNotice("Feedback saved. Closing trip...");
      window.setTimeout(() => navigate("/rider/home", { replace: true }), 1200);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Feedback submit failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative isolate w-full px-4 min-h-[90vh] flex flex-col pt-10">
      <AnimatePresence>
         {notice && (
           <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 bg-gray-900 text-white rounded-full text-sm font-bold shadow-glass-hard whitespace-nowrap">
             {notice}
           </motion.div>
         )}
      </AnimatePresence>

      <div className="flex flex-col items-center justify-center mb-8">
         <div className="relative mb-6">
            <div className="absolute inset-0 bg-emerald-500 rounded-full blur-[30px] opacity-20"></div>
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-soft border border-emerald-50 relative z-10">
               <CheckCircle2 size={36} className="text-emerald-500" strokeWidth={2} />
            </div>
         </div>
         <h1 className="text-3xl font-black text-gray-900 tracking-tight text-center">Trip Finished</h1>
         <p className="mt-2 text-sm font-medium text-gray-500 text-center px-4">
            Rate the customer for this trip.
         </p>
         {autoHomeCountdown > 0 && (
            <span className="inline-block mt-3 px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-bold tracking-wider">
               Auto closing in {autoHomeCountdown}s
            </span>
         )}
      </div>

      <div className="w-full bg-white rounded-[32px] p-6 shadow-soft border border-gray-100 flex flex-col items-center text-center">
         <div className="flex gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
               <button key={star} onClick={() => setRating(star)} className="focus:outline-none transition-transform active:scale-90">
                  <Star size={44} className={rating >= star ? 'fill-amber-400 text-amber-400' : 'fill-gray-100 text-gray-200'} strokeWidth={1.5} />
               </button>
            ))}
         </div>

         {rating > 0 && (
           <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="w-full">
              <div className="relative w-full mb-4">
                 <div className="absolute top-4 left-4 text-gray-400"><MessageSquare size={18} /></div>
                 <textarea
                   value={comment}
                   onChange={(e) => setComment(e.target.value)}
                   className="w-full h-28 bg-gray-50 rounded-2xl border border-gray-200 pl-11 pr-4 py-4 text-sm resize-none focus:border-emerald-400 focus:bg-white outline-none transition-colors"
                   placeholder="Add a remark... (optional)"
                 />
              </div>
           </motion.div>
         )}
      </div>

      <div className="mt-auto pb-4 pt-8">
         <button disabled={loading || rating === 0} onClick={submit} className="w-full h-[60px] rounded-2xl bg-gray-900 text-white font-bold shadow-float disabled:opacity-50 transition-active">
            {loading ? "Saving..." : "Save Rating"}
         </button>
         <button onClick={() => navigate("/rider/home", { replace: true })} className="w-full mt-3 h-[60px] rounded-2xl bg-white text-gray-900 font-bold border border-gray-200 shadow-sm disabled:opacity-50 transition-active">
            Skip & Close Trip
         </button>
      </div>
    </div>
  );
};

export default RiderFeedbackPage;
