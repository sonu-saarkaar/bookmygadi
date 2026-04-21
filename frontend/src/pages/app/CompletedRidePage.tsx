import { ChevronLeft, MapPin, CheckCircle2, MessageSquare, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { backendApi, type Ride, authStore } from "@/services/backendApi";

const CompletedRidePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ride, setRide] = useState<Ride | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const token = authStore.getToken();
      if (!token || !id) return;
      try {
         // Fetch specific ride or just filter from list
         const rows = await backendApi.listRides(token);
         const r = rows.find(x => x.id === id);
         if (r) setRide(r);
         else setError("Ride not found");
      } catch (err) {
         setError("Could not load ride specifics.");
      }
    };
    load();
  }, [id]);

  if (error) return <div className="p-8 text-center text-red-500 mt-20">{error}</div>;
  if (!ride) return <div className="p-8 text-center text-gray-500 mt-20">Loading...</div>;

  return (
    <div className="bg-gray-50 min-h-screen pb-20 font-sans">
      <div className="sticky top-0 bg-white/80 backdrop-blur-xl z-50 border-b border-gray-100 flex items-center h-16 px-4">
        <button onClick={() => navigate("/app/history")} className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all outline-none">
          <ChevronLeft size={24} className="text-gray-700" />
        </button>
        <h1 className="text-[17px] font-bold text-gray-900 ml-2">Ride Summary</h1>
      </div>

      <div className="p-5">
        <div className="bg-white rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-soft border border-gray-100 mb-6">
           <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
             <CheckCircle2 size={40} className="text-emerald-500" />
           </div>
           <h2 className="text-2xl font-black text-gray-900 mb-2">Thank you for riding with us!</h2>
           <p className="text-gray-500 font-medium">Your payment has been successfully processed. We hope you enjoyed your journey.</p>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-soft overflow-hidden mb-6">
          <div className="p-5">
             <div className="flex justify-between items-start mb-6">
                 <div>
                   <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                       {new Date(ride.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                       &nbsp;&middot;&nbsp;
                       {new Date(ride.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                   </p>
                   <p className="text-sm font-bold text-gray-500 mt-1">ID: BMG-{ride.id.slice(-6).toUpperCase()}</p>
                 </div>
                 <div className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter border bg-emerald-50 text-emerald-600 border-emerald-100">
                     Paid
                 </div>
             </div>

             <div className="space-y-5 relative">
                 <div className="absolute left-[9px] top-[9px] bottom-[9px] w-[2px] bg-gray-100"></div>
                 <div className="flex gap-4 relative">
                   <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                       <div className="w-2.5 h-2.5 rounded-full bg-blue-500 relative z-10"></div>
                   </div>
                   <div>
                       <p className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Pickup</p>
                       <p className="font-bold text-gray-900 text-sm leading-tight">{ride.pickup_location}</p>
                   </div>
                 </div>
                 <div className="flex gap-4 relative">
                   <div className="w-5 h-5 bg-red-100 flex items-center justify-center shrink-0 mt-0.5 relative z-10" style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}>
                       <div className="w-2.5 h-2.5 bg-red-500" style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}></div>
                   </div>
                   <div>
                       <p className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Destination</p>
                       <p className="font-bold text-gray-900 text-sm leading-tight">{ride.destination}</p>
                   </div>
                 </div>
             </div>
          </div>
          
          <div className="bg-gray-50 px-5 py-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-500">Total Paid</span>
              <span className="text-xl font-black text-gray-900">₹{ride.agreed_fare || 0}</span>
          </div>
        </div>

        <button 
          onClick={() => navigate(`/app/feedback?rideId=${ride.id}`)}
          className="w-full h-[60px] rounded-2xl bg-gray-900 text-white font-bold shadow-float flex items-center justify-center gap-3 active:scale-95 transition-all"
        >
          <Star size={20} className="text-amber-400 fill-amber-400" />
          Leave Feedback
        </button>
      </div>
    </div>
  );
};

export default CompletedRidePage;