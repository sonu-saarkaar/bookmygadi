import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { authStore, backendApi, type Ride, type RideTracking } from "@/services/backendApi";
import { Download, CheckCircle2, IndianRupee, Clock3, MapPin, Navigation, QrCode, Copy, WalletCards, Banknote, Smartphone, Building2, Phone, ChevronsRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatBookingDateTime } from "@/utils/datetime";

const PAYEE_UPI_ID = "bookmygadi@upi";
const PAYEE_NAME = "BookMyGaadi";

const toRad = (v: number) => (v * Math.PI) / 180;
const distanceKm = (lat1?: number | null, lon1?: number | null, lat2?: number | null, lon2?: number | null) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const buildUpiUri = (amount: number, rideCode: string) => {
  const note = encodeURIComponent(`BookMyGaadi ride ${rideCode}`);
  return `upi://pay?pa=${encodeURIComponent(PAYEE_UPI_ID)}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${Number(amount).toFixed(2)}&cu=INR&tn=${note}`;
};

const buildQrImageUrl = (value: string) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(value)}`;

const UserPaymentPage = () => {
  const navigate = useNavigate();
  const { rideId = "" } = useParams();
  const [ride, setRide] = useState<Ride | null>(null);
  const [tracking, setTracking] = useState<RideTracking | null>(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [paid, setPaid] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"cash" | "upi" | "qr" | "company">("upi");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const token = authStore.getToken();
    if (!token || !rideId) {
      navigate("/app/home", { replace: true });
      return;
    }

    const load = async () => {
      try {
        const [r, t] = await Promise.all([
          backendApi.getRide(rideId, token),
          backendApi.getRideTracking(rideId, token).catch(() => null),
        ]);
        setRide(r);
        if (t) setTracking(t);
        setPaid((r.payment_status || "").toLowerCase() === "paid");
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Unable to load payment details");
      }
    };

    load();
    const interval = setInterval(load, 5000); // Auto fetch every 5 seconds to sync status
    return () => clearInterval(interval);
  }, [navigate, rideId]);

  const totalFare = ride?.agreed_fare || ride?.estimated_fare_max || ride?.requested_fare || 0;
  const travelledKm = useMemo(() => {
    return distanceKm(tracking?.pickup_lat, tracking?.pickup_lng, tracking?.destination_lat, tracking?.destination_lng);
  }, [tracking]);

  const timeline = useMemo(() => {
    if (!ride) return [] as Array<{ label: string; time: string; note: string }>;
    return [
      { label: "Ride Booked", time: formatBookingDateTime(ride.created_at), note: "Booking request placed." },
      {
        label: "Pickup Scheduled",
        time: ride.preference?.pickup_datetime || formatBookingDateTime(ride.created_at),
        note: `Pickup point: ${ride.pickup_location}`,
      },
      {
        label: "Ride Completed",
        time: formatBookingDateTime(ride.updated_at),
        note: `Drop point: ${ride.destination}`,
      },
      {
        label: "Payment Status",
        time: paid ? "Paid" : "Pending",
        note: paid ? "Payment captured successfully." : "Please complete payment to continue.",
      },
    ];
  }, [ride, paid]);

  const rideCode = ride?.booking_display_id || rideId;
  const upiUri = useMemo(() => buildUpiUri(totalFare, rideCode), [rideCode, totalFare]);
  const qrImageUrl = useMemo(() => buildQrImageUrl(upiUri), [upiUri]);

  const copyUpiLink = async () => {
    try {
      await navigator.clipboard.writeText(upiUri);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setNotice("Unable to copy payment link");
    }
  };

  const openUpiApp = () => {
    window.location.href = upiUri;
  };

  const markPaid = async (method: "cash" | "upi" | "qr" | "company") => {
    const token = authStore.getToken();
    if (!token || !rideId) return;
    setLoading(true);
    try {
      const transactionRef = method === "company" ? `company-${rideId.slice(-6)}` : undefined;
      await backendApi.markRidePayment(rideId, { payment_method: method, transaction_ref: transactionRef }, token);
      setPaid(true);
      setNotice("Payment saved successfully. Redirecting to feedback...");
      window.setTimeout(() => navigate(`/app/feedback?rideId=${rideId}`), 1400);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to mark payment");
    } finally {
      setLoading(false);
    }
  };

  const downloadReceipt = () => {
    if (!ride) return;
    const lines = [
      "BOOKMYGADI PAYMENT RECEIPT",
      `Receipt ID: ${rideCode}`,
      `Ride ID: ${ride.id}`,
      `Payment Status: ${paid ? "PAID" : "PENDING"}`,
      `Pickup: ${ride.pickup_location}`,
      `Drop: ${ride.destination}`,
      `Total Fare: INR ${new Intl.NumberFormat("en-IN").format(totalFare)}`,
      `Travelled: ${travelledKm != null ? `${travelledKm.toFixed(1)} km` : "-"}`,
      `Booked At: ${formatBookingDateTime(ride.created_at)}`,
      `Last Update: ${formatBookingDateTime(ride.updated_at)}`,
      "",
      "Timeline:",
      ...timeline.map((item) => `- ${item.label}: ${item.time} (${item.note})`),
    ].join("\n");

    const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `bookmygadi-receipt-${rideCode}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (!ride) return null;

  return (
    <div className="relative isolate w-full min-h-[100vh] px-4 py-6 bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.04),transparent_24%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)]">
      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 bg-gray-900 text-white rounded-full text-sm font-bold shadow-2xl whitespace-nowrap"
          >
            {notice}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-xl grid gap-4 grid-cols-1 items-start">
        <div className="rounded-[28px] bg-slate-950 text-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.25)] overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.35),transparent_26%),radial-gradient(circle_at_left,rgba(16,185,129,0.16),transparent_22%)]" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-300">User Payment</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight">Choose a mode</h1>
              <p className="mt-2 text-sm text-slate-300">Cash, UPI, QR, or Company billing with a fixed amount.</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
              <WalletCards size={28} className="text-emerald-300" />
            </div>
          </div>

          <div className="relative mt-5 grid grid-cols-2 gap-3 text-xs font-bold">
            <div className="rounded-2xl bg-white/8 border border-white/10 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Receipt</p>
              <p className="mt-1 text-sm font-black">{ride.booking_display_id || ride.id}</p>
            </div>
            <div className="rounded-2xl bg-white/8 border border-white/10 px-4 py-3 text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Locked Amount</p>
              <p className="mt-1 text-2xl font-black text-emerald-300">₹{new Intl.NumberFormat("en-IN").format(totalFare)}</p>
            </div>
          </div>

          <div className="relative mt-4 grid gap-3 text-sm">
             <div className="flex items-start gap-3 rounded-2xl bg-white/6 border border-white/10 px-4 py-3">
                <MapPin size={16} className="mt-0.5 text-emerald-300" />
                <div>
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Pickup</p>
                   <p className="font-bold text-white">{ride.pickup_location}</p>
                </div>
             </div>
             <div className="flex items-start gap-3 rounded-2xl bg-white/6 border border-white/10 px-4 py-3">
                <Navigation size={16} className="mt-0.5 text-cyan-300" />
                <div>
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Drop</p>
                   <p className="font-bold text-white">{ride.destination}</p>
                </div>
             </div>
             <div className="flex items-start gap-3 rounded-2xl bg-white/6 border border-white/10 px-4 py-3">
                <Clock3 size={16} className="mt-0.5 text-amber-300" />
                <div>
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Distance Travelled</p>
                   <p className="font-bold text-white">{travelledKm != null ? `${travelledKm.toFixed(1)} km travelled` : "Travel distance unavailable"}</p>
                </div>
             </div>
          </div>

          <div className="relative mt-4 flex flex-wrap gap-2">
            {[
              { key: "cash", label: "Cash", icon: Banknote },
              { key: "upi", label: "UPI App", icon: Smartphone },
              { key: "qr", label: "QR Scan", icon: QrCode },
              { key: "company", label: "Company", icon: Building2 },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setPaymentMode(item.key as typeof paymentMode)}
                  className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider border transition-all flex items-center gap-2 ${paymentMode === item.key ? "bg-white text-slate-950 border-white" : "bg-white/10 text-slate-300 border-white/10"}`}
                >
                  <Icon size={13} /> {item.label}
                </button>
              );
            })}
          </div>
        </div>

         {paid ? (
            <div className="grid gap-4 grid-cols-1">
               <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-[28px] bg-slate-950 text-white p-8 text-center shadow-[0_20px_60px_rgba(15,23,42,0.25)] flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.3),transparent_60%)]" />
                  <CheckCircle2 size={80} className="text-emerald-400 mb-6 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" strokeWidth={1.5} />
                  <h2 className="text-3xl font-black tracking-tight mb-2">Thank You!</h2>
                  <p className="text-slate-300 font-medium">Payment confirmed securely.</p>
               </motion.div>
               
               <button
                  onClick={() => navigate(`/app/feedback?rideId=${rideId}`)}
                  className="h-16 rounded-[20px] bg-white border border-slate-200 text-slate-800 font-black text-lg flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.06)]"
               >
                  Leave Feedback
               </button>
            </div>
         ) : (
          <div className="grid gap-4 grid-cols-1">
            <div className="rounded-[28px] bg-white p-5 border border-slate-200 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.18em] mb-3">Payment Request</p>
            <div className="rounded-[24px] bg-slate-50 border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-xs font-black text-slate-900">{ride.pickup_location}</p>
                  <p className="text-[11px] font-semibold text-slate-500 mt-1">To {ride.destination}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Ride</p>
                  <p className="text-xs font-black text-slate-900">{ride.booking_display_id || ride.id}</p>
                </div>
              </div>

              <div className="flex items-center justify-center rounded-[22px] border border-slate-200 bg-white p-4">
                <img src={qrImageUrl} alt="Payment QR" width={220} height={220} className="rounded-lg" />
              </div>

              <div className="mt-4 rounded-2xl bg-white border border-slate-200 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">UPI Link</p>
                <p className="mt-1 break-all text-xs font-semibold text-slate-700">{upiUri}</p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button type="button" onClick={openUpiApp} className="h-12 rounded-[16px] bg-slate-950 text-white font-black text-sm flex items-center justify-center gap-2">
                  <Phone size={15} /> Pay by UPI App
                </button>
                <button type="button" onClick={copyUpiLink} className="h-12 rounded-[16px] bg-white border border-slate-200 text-slate-700 font-black text-sm flex items-center justify-center gap-2">
                  <Copy size={15} /> {copied ? "Copied" : "Copy Link"}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] bg-white p-5 border border-slate-200 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
               <div className={`relative h-[64px] rounded-[24px] bg-gradient-to-r from-emerald-500 to-teal-500 border border-white/20 text-white font-black text-xs tracking-widest shadow-[0_10px_20px_rgba(0,0,0,0.18)] overflow-hidden`}>
                  <motion.div
                     drag={loading ? false : "x"}
                     dragConstraints={{ left: 0, right: 246 }}
                     dragElastic={0.01}
                     dragMomentum={false}
                     dragTransition={{ bounceStiffness: 320, bounceDamping: 28, power: 0.08, timeConstant: 120 }}
                     onDragEnd={(_, info) => {
                        if (info.offset.x > 190 || info.velocity.x > 700) {
                           void markPaid(paymentMode);
                        }
                     }}
                     className="absolute left-2 top-1/2 -translate-y-1/2 w-[48px] h-[48px] rounded-[16px] bg-white text-gray-900 flex items-center justify-center shadow-lg z-20 cursor-grab active:cursor-grabbing touch-none"
                     style={{ touchAction: "none" }}
                  >
                     <ChevronsRight size={19} strokeWidth={4} className="transition-transform duration-200" />
                  </motion.div>
                  <div className="absolute inset-0 flex items-center justify-center px-14 pointer-events-none">
                     <span className="font-black uppercase tracking-widest text-center">{loading ? "Updating..." : "SWIPE IF PAYMENT DONE"}</span>
                  </div>
               </div>
          </div>
          </div>
         )}
      </div>
    </div>
  );
};

export default UserPaymentPage;
