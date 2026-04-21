import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { riderApi } from "@/services/riderApi";
import { notifyEvent } from "@/services/notificationCenter";
import { IndianRupee, ChevronsRight, CheckCircle2, MapPin, Navigation, Phone, QrCode, Copy, WalletCards, BadgeCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type RiderPaymentSummary = {
  rideId: string;
  pickup: string;
  destination: string;
  vehicleType: string;
  fare: number;
  status?: string;
  driverName?: string;
};

const PAYEE_UPI_ID = "bookmygadi@upi";
const PAYEE_NAME = "BookMyGaadi";

const buildUpiUri = (amount: number, rideId: string) => {
  const note = encodeURIComponent(`BookMyGaadi ride ${rideId.slice(-6).toUpperCase()}`);
  return `upi://pay?pa=${encodeURIComponent(PAYEE_UPI_ID)}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${amount.toFixed(2)}&cu=INR&tn=${note}`;
};

const buildQrImageUrl = (value: string) =>
   `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(value)}`;

const buildCustomerPaymentMessage = (summary: RiderPaymentSummary, upiUri: string) => {
   const rideCode = `BMG${summary.rideId.slice(-6).toUpperCase()}`;
   const amount = new Intl.NumberFormat("en-IN").format(summary.fare || 31);
   return [
      `BookMyGaadi Payment Request`,
      `Ride: ${rideCode}`,
      `Amount: INR ${amount}`,
      `Pay link: ${upiUri}`,
   ].join("\n");
};

const RiderPaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { rideId = "" } = useParams();
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [copied, setCopied] = useState(false);
  const [paidMode, setPaidMode] = useState<"cash" | "upi" | "qr" | "company">("upi");

  const summary = useMemo<RiderPaymentSummary>(() => {
    const stateSummary = (location.state as RiderPaymentSummary | null) || null;
    if (stateSummary?.rideId) return stateSummary;
    const stored = sessionStorage.getItem("bmg_rider_payment_summary");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as RiderPaymentSummary;
        if (parsed?.rideId) return parsed;
      } catch {
        // ignore malformed cache
      }
    }
    return {
      rideId,
      pickup: "Pickup location",
      destination: "Destination",
      vehicleType: "Ride",
         fare: 31,
      status: "completed",
      driverName: "Customer",
    };
  }, [location.state, rideId]);

   const upiUri = useMemo(() => buildUpiUri(summary.fare || 31, summary.rideId || rideId), [rideId, summary.fare, summary.rideId]);
   const qrImageUrl = useMemo(() => buildQrImageUrl(upiUri), [upiUri]);

   const sendPaymentLinkToCustomer = async () => {
      const message = buildCustomerPaymentMessage(summary, upiUri);
      try {
         if (navigator.share) {
            await navigator.share({
               title: "BookMyGaadi Payment Link",
               text: message,
            });
            return;
         }
         await navigator.clipboard.writeText(message);
         setNotice("Payment link copied. Share with customer.");
      } catch {
         setNotice("Unable to share payment link");
      }
   };

  const copyUpiLink = async () => {
    try {
      await navigator.clipboard.writeText(upiUri);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setNotice("Unable to copy UPI link");
    }
  };

  const openUpiApp = () => {
    window.location.href = upiUri;
  };

  useEffect(() => {
    if (!rideId || countdown > 0) return;

    const checkPayment = async () => {
      try {
        const activeRows = await riderApi.listActiveRides();
        const found = activeRows.find((r) => r.id === rideId);
        if (found && (found.payment_status || "").toLowerCase() === "paid") {
           setCountdown(3);
        }
      } catch (e) {
        // ignore errors during silent poll
      }
    };
    
    checkPayment();
    const interval = setInterval(checkPayment, 4000);
    return () => clearInterval(interval);
  }, [rideId, countdown]);

  useEffect(() => {
    if (countdown <= 0) return;
    const id = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          navigate(`/rider/feedback/${rideId}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [countdown, navigate, rideId]);

  const receivePayment = async () => {
    if (!rideId) return;
    setLoading(true);
    try {
      sessionStorage.removeItem("bmg_rider_payment_summary");
      await riderApi.receivePayment(rideId);
      notifyEvent({
        event: "payment",
        title: "Payment Received",
        body: "Ride payment collected successfully.",
        tag: `rider-payment-${rideId}`,
      }).catch(() => undefined);
      setCountdown(3);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to confirm payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative isolate w-full min-h-[100vh] px-4 py-6 bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.04),transparent_26%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)]">
      <AnimatePresence>
         {notice && (
           <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 bg-gray-900 text-white rounded-full text-sm font-bold shadow-glass-hard whitespace-nowrap">
             {notice}
           </motion.div>
         )}
      </AnimatePresence>

      <div className="mx-auto max-w-xl grid gap-4 grid-cols-1 items-start pt-2">
         <div className="rounded-[28px] bg-slate-950 text-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.25)] overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.35),transparent_26%),radial-gradient(circle_at_left,rgba(16,185,129,0.16),transparent_22%)]" />
            <div className="relative flex items-start justify-between gap-4">
               <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-300">Payment Request</p>
                  <h1 className="mt-2 text-3xl font-black tracking-tight">Ride Summary</h1>
                  <p className="mt-2 text-sm text-slate-300">Request payment through UPI, QR, or cash confirmation.</p>
               </div>
               <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
                  <IndianRupee size={28} className="text-emerald-300" />
               </div>
            </div>

            <div className="relative mt-5 grid grid-cols-2 gap-3">
               <div className="rounded-2xl bg-white/8 border border-white/10 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Ride ID</p>
                  <p className="mt-1 text-sm font-black">BMG{summary.rideId.slice(-6).toUpperCase()}</p>
               </div>
               <div className="rounded-2xl bg-white/8 border border-white/10 px-4 py-3 text-right">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Amount</p>
                  <p className="mt-1 text-2xl font-black text-emerald-300">₹{new Intl.NumberFormat("en-IN").format(summary.fare || 31)}</p>
               </div>
            </div>

            <div className="relative mt-4 grid gap-3 text-sm">
               <div className="flex items-start gap-3 rounded-2xl bg-white/6 border border-white/10 px-4 py-3">
                  <MapPin size={16} className="mt-0.5 text-emerald-300" />
                  <div>
                     <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Pickup</p>
                     <p className="font-bold">{summary.pickup}</p>
                  </div>
               </div>
               <div className="flex items-start gap-3 rounded-2xl bg-white/6 border border-white/10 px-4 py-3">
                  <Navigation size={16} className="mt-0.5 text-cyan-300" />
                  <div>
                     <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Drop</p>
                     <p className="font-bold">{summary.destination}</p>
                  </div>
               </div>
            </div>

            <div className="relative mt-4 flex gap-2 overflow-x-auto pb-1">
               {[
                  { key: "cash", label: "Cash" },
                  { key: "upi", label: "UPI" },
                  { key: "qr", label: "QR" },
                  { key: "company", label: "Company" },
               ].map((item) => (
                  <button
                     key={item.key}
                     type="button"
                     onClick={() => setPaidMode(item.key as typeof paidMode)}
                     className={`shrink-0 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider border transition-all ${paidMode === item.key ? "bg-white text-slate-950 border-white" : "bg-white/10 text-slate-300 border-white/10"}`}
                  >
                     {item.label}
                  </button>
               ))}
            </div>
         </div>

         {countdown > 0 ? (
            <div className="grid gap-4 grid-cols-1">
               <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-[28px] bg-slate-950 text-white p-8 text-center shadow-[0_20px_60px_rgba(15,23,42,0.25)] flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.3),transparent_60%)]" />
                  <CheckCircle2 size={80} className="text-emerald-400 mb-6 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" strokeWidth={1.5} />
                  <h2 className="text-3xl font-black tracking-tight mb-2">Thank You!</h2>
                  <p className="text-slate-300 font-medium">Payment confirmed successfully.</p>
               </motion.div>
               
               <button
                  onClick={() => navigate(`/rider/feedback/${rideId}`)}
                  className="h-16 rounded-[20px] bg-white border border-slate-200 text-slate-800 font-black text-lg flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.06)]"
               >
                  Leave Feedback
               </button>
            </div>
         ) : (
            <div className="grid gap-4 grid-cols-1">
               <div className="rounded-[28px] bg-white p-5 border border-slate-200 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
                  <div className="space-y-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                     <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Payment Request</p>
                  </div>
               </div>

               {paidMode === "qr" && (
                  <>
                     <div className="mt-4 flex items-center justify-center rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                        <img src={qrImageUrl} alt="Payment QR" width={220} height={220} className="rounded-lg" />
                     </div>

                     <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">UPI Link</p>
                        <p className="mt-1 break-all text-xs font-semibold text-slate-700">{upiUri}</p>
                     </div>
                  </>
               )}

               {paidMode === "upi" && (
                  <>
                     <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">UPI ID</p>
                        <p className="mt-1 text-sm font-black text-slate-900">{PAYEE_UPI_ID}</p>
                     </div>
                     <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">UPI Pay Link</p>
                        <p className="mt-1 break-all text-xs font-semibold text-slate-700">{upiUri}</p>
                     </div>
                     <div className="mt-4 grid grid-cols-2 gap-3">
                        <button
                           type="button"
                           onClick={sendPaymentLinkToCustomer}
                           className="h-12 rounded-[16px] bg-white border border-slate-200 text-slate-700 font-black text-sm flex items-center justify-center gap-2"
                        >
                           <Copy size={15} /> Send Pay Link
                        </button>
                        <button
                           type="button"
                           onClick={openUpiApp}
                           className="h-12 rounded-[16px] bg-slate-950 text-white font-black text-sm flex items-center justify-center gap-2"
                        >
                           <Phone size={15} /> Pay Now by UPI
                        </button>
                     </div>
                  </>
               )}

               {paidMode === "cash" && (
                  <div className={`mt-4 relative h-[64px] rounded-[24px] bg-gradient-to-r from-emerald-500 to-teal-500 border border-white/20 text-white font-black text-xs tracking-widest shadow-[0_10px_20px_rgba(0,0,0,0.18)] overflow-hidden`}>
                     <motion.div
                        drag={loading ? false : "x"}
                        dragConstraints={{ left: 0, right: 246 }}
                        dragElastic={0.01}
                        dragMomentum={false}
                        dragTransition={{ bounceStiffness: 320, bounceDamping: 28, power: 0.08, timeConstant: 120 }}
                        onDragEnd={(_, info) => {
                           if (info.offset.x > 190 || info.velocity.x > 700) {
                              receivePayment();
                           }
                        }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-[48px] h-[48px] rounded-[16px] bg-white text-gray-900 flex items-center justify-center shadow-lg z-20 cursor-grab active:cursor-grabbing touch-none"
                        style={{ touchAction: "none" }}
                     >
                        <ChevronsRight size={19} strokeWidth={4} className="transition-transform duration-200" />
                     </motion.div>
                     <div className="absolute inset-0 flex items-center justify-center px-14 pointer-events-none">
                        <span className="font-black uppercase tracking-widest text-center">{loading ? "Updating..." : "SWIPE IF CASH RECEIVED"}</span>
                     </div>
                  </div>
               )}

               {paidMode === "company" && (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 cursor-pointer">
                     <p className="text-sm font-bold text-slate-700">
                        Collect through company billing flow and confirm once settled.
                     </p>
                  </div>
               )}

               {paidMode === "qr" && (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                     <button
                        type="button"
                        onClick={openUpiApp}
                        className="h-12 rounded-[16px] bg-slate-950 text-white font-black text-sm flex items-center justify-center gap-2"
                     >
                        <Phone size={15} /> Open UPI App
                     </button>
                     <button
                        type="button"
                        onClick={copyUpiLink}
                        className="h-12 rounded-[16px] bg-white border border-slate-200 text-slate-700 font-black text-sm flex items-center justify-center gap-2"
                     >
                        <Copy size={15} /> {copied ? "Copied" : "Copy Link"}
                     </button>
                  </div>
               )}
            </div>

            <div className="rounded-[28px] bg-white p-5 border border-slate-200 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
               <div className="grid grid-cols-2 gap-3">
                  <button
                     disabled={loading}
                     onClick={receivePayment}
                     className="h-12 rounded-[16px] bg-emerald-600 text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                     <BadgeCheck size={16} /> {loading ? "Saving..." : `Mark ${paidMode.toUpperCase()}`}
                  </button>
                  <button
                     onClick={() => navigate(`/rider/feedback/${rideId}`)}
                     className="h-12 rounded-[16px] bg-white border border-slate-200 text-slate-700 font-black text-sm flex items-center justify-center gap-2"
                  >
                     <ChevronsRight size={16} /> Feedback
                  </button>
               </div>
            </div>
         </div>
         )}
      </div>
    </div>
  );
};

export default RiderPaymentPage;
