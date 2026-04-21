import { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Shield, Zap, Navigation } from 'lucide-react';
import { LiveMap } from '@/components/LiveMap';
import { authStore, backendApi } from '@/services/backendApi';

const NEGOTIATION_CONTEXT_STORAGE_KEY = "bmg_price_negotiation_context";
const ACTIVE_BOOKING_STORAGE_KEY = "bmg_active_booking";
const ACTIVE_BOOKING_TOKEN_STORAGE_KEY = "bmg_active_booking_customer_token";

const readNegotiationContext = () => {
    const raw = localStorage.getItem(NEGOTIATION_CONTEXT_STORAGE_KEY) || sessionStorage.getItem(NEGOTIATION_CONTEXT_STORAGE_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
};

export default function PriceNegotiationPage() {
    const location = useLocation();
    const navigate = useNavigate();
    
    const [context, setContext] = useState<any>(null);
    const [bookingState, setBookingState] = useState("pricing");
    const [bookingPriority, setBookingPriority] = useState<"quick" | "normal" | "emergency">("quick");
    const [offerPrice, setOfferPrice] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const stored = readNegotiationContext();
        if (!stored) {
            navigate("/app/home", { replace: true });
            return;
        }
        setContext(stored);
        setOfferPrice(stored.offerPrice || stored.minFare || 0);
    }, [navigate]);

    const mockRiders = useMemo(() => {
        if (!context?.pickupCoords) return [];
        const riders = [];
        for (let i = 0; i < 8; i++) {
            const r = 10 * Math.sqrt(Math.random());
            const theta = Math.random() * 2 * Math.PI;
            const dy = (r * Math.sin(theta)) / 111.0;
            const dx = (r * Math.cos(theta)) / (111.0 * Math.cos((context.pickupCoords.lat * Math.PI) / 180));
            riders.push({ id: "rider-mock-" + i, lat: context.pickupCoords.lat + dy, lng: context.pickupCoords.lng + dx, label: "Driver" });
        }
        return riders;
    }, [context?.pickupCoords]);

    if (!context) return null;

    const {
        pickup, destination, pickupCoords, destinationCoords,
        minFare, maxFare, quoteDistance, mappedVehicleType
    } = context || {
        minFare: 0, maxFare: 0, quoteDistance: 1
    };

    let rawPercent = maxFare > minFare ? ((offerPrice - minFare) / (maxFare - minFare)) * 100 : 50;
    if (Number.isNaN(rawPercent) || !Number.isFinite(rawPercent)) rawPercent = 50;
    const sliderFillPercent = Math.max(0, Math.min(100, rawPercent));

    const formatMoney = (amount: number) => "₹" + Math.round(amount || 0);

    const onBookRide = async () => {
        const token = authStore.getToken();
        if (!token) return;
        setLoading(true);
        try {
            const payload: any = {
                pickup_location: pickup,
                destination: destination,
                vehicle_type: mappedVehicleType || "AUTO",
                estimated_fare_min: minFare,
                estimated_fare_max: maxFare,
                requested_fare: offerPrice,
            };

            if (pickupCoords) {
                payload.pickup_lat = pickupCoords.lat;
                payload.pickup_lng = pickupCoords.lng;
            }
            if (destinationCoords) {
                payload.destination_lat = destinationCoords.lat;
                payload.destination_lng = destinationCoords.lng;
            }

            const ride = await backendApi.createRide(
                {
                    ...payload,
                    metadata: {
                        booking_mode: bookingPriority,
                        vehicle_count: 1,
                        market_rate: Math.round(offerPrice * 1.05)
                    },
                },
                token
            );
            
            const ridePayload = { rideId: ride.id, pickup, destination, vehicleType: payload.vehicle_type, offerPrice, distance: quoteDistance };
            localStorage.setItem(ACTIVE_BOOKING_STORAGE_KEY, JSON.stringify(ridePayload));
            sessionStorage.setItem(ACTIVE_BOOKING_STORAGE_KEY, JSON.stringify(ridePayload));
            localStorage.setItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY, token);
            sessionStorage.setItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY, token);
            
            navigate("/app/searching", { state: ridePayload });
        } catch (error) {
            console.error("Booking failed", error);
            alert("Booking failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-[#f1f3f5] overflow-hidden">
            <div className="relative h-full w-full max-w-md mx-auto bg-white overflow-hidden shadow-2xl flex flex-col">
                
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <LiveMap 
                        pickup={pickupCoords} 
                        drop={destinationCoords}
                        distance={(quoteDistance || "1.0") + " KM"}
                        duration={"~" + (Number(quoteDistance || "1.0") * 2.5).toFixed(0) + " MINS"}
                        autoCenter={true}
                        radiusCenter={pickupCoords}
                        radiusKm={10}
                        showNearbyOverlay={true}
                        nearbyRiders={mockRiders}
                        className="h-[calc(100%-380px)]"
                    />
                </div>

                <button
                    onClick={() => {
                        navigate("/app/home", { replace: true });
                    }}
                    className="absolute top-10 left-4 z-40 w-11 h-11 rounded-full bg-white shadow-md flex items-center justify-center text-[#0f172a] hover:bg-gray-100 transition-colors pointer-events-auto"
                >
                    <ChevronRight size={22} className="rotate-180" strokeWidth={3} />
                </button>

                {bookingState === "pricing" && (
                    <motion.div 
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={0.05}
                        className="absolute left-0 right-0 bottom-0 z-40 bg-white rounded-t-[32px] px-5 pt-4 pb-8 shadow-[0_-10px_40px_rgba(0,0,0,0.15)] flex flex-col pointer-events-auto"
                    >
                        <div className="mx-auto w-12 h-1.5 rounded-full bg-gray-200 mb-6" />

                        <div className="flex gap-2 mb-6">
                            {[
                                { id: "quick", label: "Quick", icon: Zap, activeClass: "bg-amber-50 text-amber-600 border border-amber-200", iconClass: "text-amber-500 fill-amber-500" },
                                { id: "normal", label: "Normal", icon: Navigation, activeClass: "bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20", iconClass: "text-[#10b981] fill-[#10b981]" },
                                { id: "emergency", label: "Emergency", icon: Shield, activeClass: "bg-rose-50 text-rose-600 border border-rose-200", iconClass: "text-rose-500 fill-rose-500" }
                            ].map((mode) => {
                                const isActive = bookingPriority === mode.id;
                                const Icon = mode.icon;
                                return (
                                <button 
                                    key={mode.id}
                                    onClick={() => setBookingPriority(mode.id as any)}
                                    className={"flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl transition-all duration-200 " + (isActive ? mode.activeClass : "bg-gray-50 text-gray-400 hover:bg-gray-100 border border-transparent")}
                                >
                                    <Icon size={16} className={isActive ? mode.iconClass : "text-gray-400"} strokeWidth={isActive ? 2.5 : 2} />
                                    <span className="text-[11px] font-black uppercase tracking-widest">{mode.label}</span>
                                </button>
                                )
                            })}
                        </div>

                        <div className="text-center mb-6">
                            <motion.div 
                                key={offerPrice}
                                initial={{ scale: 0.95, opacity: 1 }} animate={{ scale: 1, opacity: 1 }}
                                className="flex justify-center items-start"
                            >
                                <span className="text-4xl font-black text-slate-800 mt-2 mr-1 tracking-tighter">₹</span>
                                <span className="text-[64px] font-black tracking-tighter text-[#0f172a] leading-none">
                                    {offerPrice}
                                </span>
                            </motion.div>
                            
                            <div className="mt-8 px-2 relative">
                                <div className="flex justify-between items-end mb-4">
                                    <div className="flex flex-col items-start">
                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Minimum</span>
                                        <span className="text-[#0f172a] text-sm font-black tracking-tight">{formatMoney(minFare)}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Maximum</span>
                                        <span className="text-[#0f172a] text-sm font-black tracking-tight">{formatMoney(maxFare)}</span>
                                    </div>
                                </div>
                                
                                <div className="relative h-2.5 bg-gray-100 rounded-full group cursor-pointer flex items-center">
                                    <motion.div 
                                        initial={false}
                                        animate={{ width: sliderFillPercent + "%" }}
                                        className="absolute left-0 top-0 bottom-0 bg-[#0f172a] rounded-full transition-all duration-150"
                                    />
                                    <input
                                        type="range" min={minFare} max={maxFare} step={10} value={offerPrice}
                                        onChange={(e) => setOfferPrice(Number(e.target.value))}
                                        className="absolute inset-[-10px] w-[calc(100%+20px)] bg-transparent appearance-none cursor-pointer z-10 opacity-0"
                                    />
                                    <motion.div
                                        animate={{ left: "calc(" + sliderFillPercent + "% - 12px)" }}
                                        className="absolute w-6 h-6 bg-white border-[6px] border-[#0f172a] rounded-full shadow-md z-0 pointer-events-none transition-all duration-150"
                                    />
                                </div>
                            </div>
                        </div>

             <motion.div 
               initial={{ opacity: 1, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.1 }}
               className="mt-4"
             >
                <div className="relative h-[72px] bg-[#0f172a] rounded-full p-2 flex items-center shadow-[0_12px_24px_rgba(15,23,42,0.25)] group overflow-hidden">
                   <motion.div 
                     drag="x"
                     dragConstraints={{ left: 0, right: 240 }}
                     dragElastic={0.02}
                     onDragEnd={(_, info) => {
                        if (info.offset.x > 200) {
                           onBookRide();
                        }
                     }}
                     className="w-[56px] h-[56px] bg-white rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing z-20 relative shadow-sm hover:scale-105 transition-transform duration-200"
                   >
                      <ChevronRight size={28} className="text-[#0f172a]" strokeWidth={4} />
                   </motion.div>
                   
                   <div className="absolute inset-0 flex items-center justify-center pointer-events-none pr-8">
                      <p className="text-gray-400 text-sm font-black uppercase tracking-[0.2em] transition-colors group-hover:text-white">
                        {loading ? 'Processing...' : 'Swipe to Book'}
                      </p>
                   </div>
                   
                   <div className="ml-auto pr-6 text-gray-500">
                      <Shield size={22} strokeWidth={2.5} />
                   </div>
                </div>
             </motion.div>
           </motion.div>
        )}
            </div>
        </div>
    );
}
