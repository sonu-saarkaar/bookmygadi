import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  Car,
  CheckCircle2,
  Download,
  FileText,
  Headphones,
  LogIn,
  Mail,
  MapPin,
  Navigation,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Star,
  UserPlus,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { getLatestAppReleases, type LatestAppReleases } from "@/services/appReleases";

const fallbackUserAppDownloadUrl = import.meta.env.VITE_USER_APP_DOWNLOAD_URL || "/download#apps";
const fallbackRiderAppDownloadUrl = import.meta.env.VITE_RIDER_APP_DOWNLOAD_URL || "/download#apps";

const scrollTargets: Record<string, string> = {
  "/download": "apps",
  "/offers": "offers",
  "/about": "vision",
  "/partner": "partner",
};

const actions = [
  { label: "Instant Ride Booking", to: "/app/home?mode=instant", icon: Zap, tone: "bg-emerald-600 text-white hover:bg-emerald-700" },
  { label: "Reserve Ride Booking", to: "/app/home?mode=reserve", icon: CalendarClock, tone: "bg-indigo-700 text-white hover:bg-indigo-800" },
  { label: "Rider Partner Login", to: "/rider/login", icon: Car, tone: "bg-white text-slate-900 hover:bg-amber-50 border border-amber-200" },
  { label: "Download App", to: "/download", icon: Download, tone: "bg-slate-900 text-white hover:bg-slate-800" },
];

const services = [
  { title: "Instant Ride", text: "Aaj ke liye turant gadi chahiye to car, auto, bike aur local deshi gadi apne market rate par book karein.", icon: Zap },
  { title: "Reserve Ride", text: "Planning, outstation, full-day travel, shaadi, function, multiple stop aur multiple gadi booking ke liye advance reserve karein.", icon: CalendarClock },
  { title: "100% Rider Earning", text: "Bihar ke rider partners apni kamai khud rakhen. BookMyGadi ka promise: no platform charge, no hidden fee.", icon: Wallet },
  { title: "Gadi Choice", text: "User ko jaisi gadi chahiye waisi option mile, premium se local tak, bina phone-call panic ke.", icon: Car },
];

const offers = [
  "Bihar-first ride platform, Bihar ke users aur Bihar ke riders ke liye built.",
  "Instant Ride me local market rate ke aas-paas daily ride booking.",
  "Reserve Ride me event, wedding, outstation, bulk vehicle aur multiple stop booking.",
];

const stats = [
  { label: "Bihar Mission", value: "1st" },
  { label: "Rider Fee", value: "0%" },
  { label: "Service Types", value: "2" },
];

const bookingModes = [
  {
    title: "Instant Ride",
    subtitle: "Aaj ke liye, abhi ke liye",
    text: "Car, auto, bike aur local gadi book karein. Kisi gadi wale ko alag se call karne ki zarurat nahi. App par pickup, drop aur gadi type choose karein, market rate ke hisaab se booking start karein.",
    to: "/app/home?mode=instant",
    icon: Zap,
    tone: "bg-emerald-600 hover:bg-emerald-700",
  },
  {
    title: "Reserve Ride",
    subtitle: "Planning, event aur full-day travel",
    text: "Date, time, route, multiple stop aur multiple gadi ke saath booking reserve karein. Shaadi, function, family trip, outstation aur bulk gadi booking ke liye flexible rate par premium se local tak options.",
    to: "/app/home?mode=reserve",
    icon: CalendarClock,
    tone: "bg-indigo-700 hover:bg-indigo-800",
  },
];

const footerLinks = [
  {
    title: "Policies",
    links: [
      { label: "Privacy Policy", href: "/privacy-policy.html" },
      { label: "Terms & Conditions", href: "/legal-hub.html#terms" },
      { label: "Refund & Cancellation", href: "/legal-hub.html#refund" },
      { label: "Safety & SOS Policy", href: "/legal-hub.html#safety" },
      { label: "Data Deletion", href: "/legal-hub.html#deletion" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Contact Us", href: "mailto:support@bookmygadi.com" },
      { label: "Complaints", href: "mailto:complaints@bookmygadi.com" },
      { label: "Legal Desk", href: "mailto:legal@bookmygadi.com" },
      { label: "Rider Partner Help", href: "mailto:rider@bookmygadi.com" },
      { label: "Emergency Guidance", href: "/legal-hub.html#safety" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About BookMyGadi", href: "/about" },
      { label: "Partner With Us", href: "/partner" },
      { label: "Download Apps", href: "/download" },
      { label: "Legal Hub", href: "/legal-hub.html" },
      { label: "Book Instant Ride", href: "/app/home?mode=instant" },
    ],
  },
];

const trustItems = [
  "Rider KYC and vehicle document verification",
  "RC, licence, insurance and owner details collection",
  "Transparent local market-rate booking flow",
  "Complaint tracking through support and admin desk",
  "Company registration, GST and trade licence details to be displayed after official verification",
];

const LandingPage = () => {
  const location = useLocation();
  const [latestApps, setLatestApps] = useState<LatestAppReleases>({ user: null, rider: null });

  useEffect(() => {
    const targetId = location.hash.replace("#", "") || scrollTargets[location.pathname];
    if (!targetId) return;

    window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }, [location.hash, location.pathname]);

  useEffect(() => {
    getLatestAppReleases()
      .then(setLatestApps)
      .catch(() => undefined);
  }, []);

  const userAppDownloadUrl = latestApps.user?.download_url || fallbackUserAppDownloadUrl;
  const riderAppDownloadUrl = latestApps.rider?.download_url || fallbackRiderAppDownloadUrl;
  const isUserDownloadConfigured = Boolean(latestApps.user) || fallbackUserAppDownloadUrl !== "/download#apps";
  const isRiderDownloadConfigured = Boolean(latestApps.rider) || fallbackRiderAppDownloadUrl !== "/download#apps";
  const userVersionLabel = latestApps.user ? `v${latestApps.user.version_name}` : "v1.0";
  const riderVersionLabel = latestApps.rider ? `v${latestApps.rider.version_name}` : "v1.0";

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="BookMyGadi" className="h-10 w-10 rounded-lg border border-slate-200 object-contain" />
            <div>
              <p className="text-base font-black leading-5 text-slate-950">BookMyGadi</p>
              <p className="text-xs font-bold text-emerald-700">Bihari First, Bihar First</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            <Link to="/download" className="px-3 py-2 text-sm font-bold text-slate-700 hover:text-emerald-700">Download</Link>
            <Link to="/offers" className="px-3 py-2 text-sm font-bold text-slate-700 hover:text-emerald-700">Offers</Link>
            <Link to="/partner" className="px-3 py-2 text-sm font-bold text-slate-700 hover:text-emerald-700">Partner</Link>
            <Link to="/about" className="px-3 py-2 text-sm font-bold text-slate-700 hover:text-emerald-700">Vision</Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="hidden h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-black text-slate-800 hover:border-emerald-300 hover:bg-emerald-50 sm:flex"
            >
              <LogIn size={17} />
              Login
            </Link>
            <Link
              to="/register"
              className="flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-black text-white shadow-sm hover:bg-emerald-700"
            >
              <UserPlus size={17} />
              Register
            </Link>
          </div>
        </div>
      </header>

      <section className="border-b border-slate-200 bg-[linear-gradient(135deg,#f0fdf4_0%,#ffffff_45%,#fff7ed_100%)]">
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-black text-emerald-700 shadow-sm">
              <Sparkles size={16} />
              Bihar ki apni ride booking app
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.05] text-slate-950 sm:text-6xl">
              Bihar ke liye Bihariyon ki pehli ride app.
            </h1>
            <p className="mt-5 max-w-2xl text-lg font-semibold leading-8 text-slate-700">
              BookMyGadi ka mission simple hai: user ko bina tension ke sahi gadi mile, aur Bihar ke rider apni 100% kamai rakhen, bina platform charge aur hidden fee ke. Call karke gadi dhoondhne ka panic khatam, booking ab seedha app se.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
              {actions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.label}
                    to={action.to}
                    className={`flex h-14 items-center justify-center gap-3 rounded-lg px-5 text-sm font-black shadow-sm ${action.tone}`}
                  >
                    <Icon size={19} />
                    {action.label}
                    <ArrowRight size={17} />
                  </Link>
                );
              })}
            </div>

            <div className="mt-8 grid max-w-2xl grid-cols-3 gap-3">
              {stats.map((item) => (
                <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xl font-black text-slate-950">{item.value}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-lg">
            <div className="absolute inset-x-8 bottom-0 h-16 rounded-lg bg-emerald-900/10 blur-2xl" />
            <div className="relative rounded-lg border border-slate-200 bg-white p-4 shadow-2xl">
              <div className="rounded-lg bg-slate-950 p-3">
                <div className="rounded-lg bg-white">
                  <div className="border-b border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src="/logo_user.png" alt="BookMyGadi user app" className="h-11 w-11 rounded-lg object-contain" />
                        <div>
                          <p className="text-sm font-black text-slate-950">Gadi book karein</p>
                          <p className="text-xs font-bold text-slate-500">Instant ya Reserve</p>
                        </div>
                      </div>
                      <ShieldCheck className="text-emerald-600" size={22} />
                    </div>
                  </div>

                  <div className="space-y-3 p-4">
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                      <div className="flex items-start gap-3">
                        <MapPin className="mt-1 text-emerald-700" size={20} />
                        <div>
                          <p className="text-xs font-bold text-slate-500">Pickup</p>
                          <p className="text-sm font-black text-slate-950">Apna location</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <div className="flex items-start gap-3">
                        <Navigation className="mt-1 text-amber-700" size={20} />
                        <div>
                          <p className="text-xs font-bold text-slate-500">Destination</p>
                          <p className="text-sm font-black text-slate-950">Jahan jana hai</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {["Car", "Auto", "Bike"].map((vehicle) => (
                        <Link
                          key={vehicle}
                          to={`/app/home?vehicle=${vehicle.toLowerCase()}`}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-center text-sm font-black text-slate-800 hover:border-emerald-300 hover:bg-emerald-50"
                        >
                          {vehicle}
                        </Link>
                      ))}
                    </div>

                    <Link
                      to="/app/home"
                      className="flex h-12 items-center justify-center gap-2 rounded-lg bg-emerald-600 text-sm font-black text-white hover:bg-emerald-700"
                    >
                      Instant Ride Booking
                      <ArrowRight size={17} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-black text-emerald-700">Bihari First, Bihar First</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
              Bihar me ride booking ka local, fair aur reliable tareeka.
            </h2>
            <p className="mt-4 text-base font-semibold leading-8 text-slate-700">
              BookMyGadi users ko apni zarurat ke hisaab se gadi choose karne ki freedom deta hai. Daily ka kaam ho, pura din gadi chahiye ho, ya shaadi-function ke liye bulk booking, sab ek jagah manage hota hai.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {bookingModes.map((mode) => {
              const Icon = mode.icon;
              return (
                <div key={mode.title} className="rounded-lg border border-slate-200 bg-slate-50 p-5 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-white text-slate-900 shadow-sm">
                      <Icon size={23} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-emerald-700">{mode.subtitle}</p>
                      <h3 className="mt-1 text-2xl font-black text-slate-950">{mode.title}</h3>
                      <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">{mode.text}</p>
                    </div>
                  </div>
                  <Link
                    to={mode.to}
                    className={`mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg px-5 text-sm font-black text-white ${mode.tone}`}
                  >
                    <Icon size={18} />
                    {mode.title} Booking
                    <ArrowRight size={17} />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="apps" className="scroll-mt-24 border-b border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-black text-emerald-700">User aur rider app</p>
              <h2 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">Bihar ki ride service, mobile par ready.</h2>
              <p className="mt-3 max-w-2xl text-base font-semibold leading-7 text-slate-600">
                User ride book karein, rider apni gadi register karein. BookMyGadi dono ko ek transparent platform par connect karta hai.
              </p>
            </div>
            <Link
              to="/app/home?mode=instant"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-black text-white hover:bg-slate-800"
            >
              Instant Ride Booking
              <ArrowRight size={17} />
            </Link>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-emerald-50 p-5">
              <div className="flex items-start gap-4">
                <img src="/logo_user.png" alt="BookMyGadi customer app" className="h-16 w-16 rounded-lg bg-white object-contain p-1" />
                <div className="min-w-0 flex-1">
                  <p className="text-xl font-black text-slate-950">Customer App · {userVersionLabel}</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">Instant ride, reserve ride, live location, fare flow, payment, history aur profile.</p>
                  {latestApps.user?.release_notes && <p className="mt-2 text-xs font-bold leading-5 text-emerald-700">{latestApps.user.release_notes}</p>}
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <a
                      href={userAppDownloadUrl}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-black text-white hover:bg-emerald-700"
                    >
                      <Download size={17} />
                      {isUserDownloadConfigured ? "Download Latest User App" : "Download Page"}
                    </a>
                    <Link to="/register" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-black text-slate-900 hover:bg-emerald-100">
                      <UserPlus size={17} />
                      User Registration
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-amber-50 p-5">
              <div className="flex items-start gap-4">
                <img src="/logo_rider.png" alt="BookMyGadi rider app" className="h-16 w-16 rounded-lg bg-white object-contain p-1" />
                <div className="min-w-0 flex-1">
                  <p className="text-xl font-black text-slate-950">Rider Partner App · {riderVersionLabel}</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">Gadi registration, ride request, earning, live rides aur partner profile. Rider ki 100% kamai rider ke paas.</p>
                  {latestApps.rider?.release_notes && <p className="mt-2 text-xs font-bold leading-5 text-amber-700">{latestApps.rider.release_notes}</p>}
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <a
                      href={riderAppDownloadUrl}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 text-sm font-black text-white hover:bg-amber-700"
                    >
                      <Download size={17} />
                      {isRiderDownloadConfigured ? "Download Latest Rider App" : "Download Page"}
                    </a>
                    <Link to="/rider/login" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-black text-slate-900 hover:bg-amber-100">
                      <Car size={17} />
                      Rider Registration
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="offers" className="scroll-mt-24 border-b border-slate-200 bg-slate-50">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <p className="text-sm font-black text-emerald-700">BookMyGadi services</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">Call karke gadi dhoondhna band. Booking app se seedha start.</h2>
            <p className="mt-4 text-base font-semibold leading-7 text-slate-600">
              Bihar me jab bhi gadi chahiye, user ko clear option mile: abhi ke liye Instant Ride, planning ke liye Reserve Ride. Local market rate, flexible booking, aur rider partner ke liye fair earning model.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link to="/app/home?mode=instant" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-black text-white hover:bg-emerald-700">
                <Zap size={18} />
                Instant Ride Booking
              </Link>
              <Link to="/app/home?mode=reserve" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-white px-5 text-sm font-black text-slate-900 hover:bg-indigo-50">
                <CalendarClock size={18} />
                Reserve Ride Booking
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <Link
                  key={service.title}
                  to={service.title === "Partner Network" ? "/rider/login" : "/app/home"}
                  className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:border-emerald-300 hover:shadow-md"
                >
                  <Icon className="text-emerald-700" size={24} />
                  <p className="mt-4 text-lg font-black text-slate-950">{service.title}</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{service.text}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section id="partner" className="scroll-mt-24 border-b border-slate-200 bg-white">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <img src="/logo_rider.png" alt="Rider partner" className="h-16 w-16 rounded-lg object-contain" />
              <div>
                <p className="text-sm font-black text-amber-700">Driver partner</p>
              <h2 className="text-3xl font-black text-slate-950">Bihar ke rider, apni gadi se apni kamai karo.</h2>
              </div>
            </div>
            <p className="mt-5 text-base font-semibold leading-7 text-slate-600">
              BookMyGadi rider partners ke liye fair model banata hai: no platform charge, no hidden fee. Rider apni gadi register kare, ride alerts manage kare, aur apni 100% kamai apne paas rakhe.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link to="/rider/login" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-amber-600 px-5 text-sm font-black text-white hover:bg-amber-700">
                <Car size={18} />
                Register as Rider
              </Link>
              <Link to="/rider/vehicle/new" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-amber-200 bg-white px-5 text-sm font-black text-slate-900 hover:bg-amber-50">
                <CheckCircle2 size={18} />
                Vehicle Details
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-6">
            <p className="text-sm font-black text-emerald-700">Current highlights</p>
            <div className="mt-5 space-y-3">
              {offers.map((offer) => (
                <div key={offer} className="flex items-start gap-3 rounded-lg bg-white p-4">
                  <Star className="mt-0.5 text-amber-500" size={18} />
                  <p className="text-sm font-bold leading-6 text-slate-700">{offer}</p>
                </div>
              ))}
            </div>
            <Link to="/legal-hub.html" className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-black text-white hover:bg-slate-800">
              <ShieldCheck size={18} />
              Legal and Compliance
            </Link>
          </div>
        </div>
      </section>

      <section id="vision" className="scroll-mt-24 bg-[linear-gradient(135deg,#ecfeff_0%,#ffffff_55%,#fef3c7_100%)]">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-black text-emerald-700">Vision</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
              Bihar first. Bihari first. Local rides ko transparent, fast, aur trustworthy banana.
            </h2>
            <p className="mt-4 text-base font-semibold leading-8 text-slate-700">
              BookMyGadi Bihar ke users ko reliable gadi options deta hai aur rider partners ko professional digital platform deta hai. Gadi ki need ho to panic nahi, app kholo, Instant ya Reserve choose karo, aur booking start karo.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Link to="/app/home" className="rounded-lg border border-emerald-200 bg-white p-5 shadow-sm hover:bg-emerald-50">
              <PhoneCall className="text-emerald-700" size={24} />
              <p className="mt-4 text-lg font-black text-slate-950">For Customers</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">Instant ride, reserve gadi, multiple stop aur event booking web ya app se.</p>
            </Link>
            <Link to="/rider/login" className="rounded-lg border border-amber-200 bg-white p-5 shadow-sm hover:bg-amber-50">
              <Car className="text-amber-700" size={24} />
              <p className="mt-4 text-lg font-black text-slate-950">For Riders</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">Register, go online, rides manage karein, aur 100% earning apne paas rakhein.</p>
            </Link>
            <a href="mailto:support@bookmygadi.com" className="rounded-lg border border-cyan-200 bg-white p-5 shadow-sm hover:bg-cyan-50">
              <Headphones className="text-cyan-700" size={24} />
              <p className="mt-4 text-lg font-black text-slate-950">For Support</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">Reach the team for help, compliance, and business queries.</p>
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_1.8fr]">
            <div>
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="BookMyGadi" className="h-12 w-12 rounded-lg bg-white object-contain" />
                <div>
                  <p className="text-xl font-black">BookMyGadi</p>
                  <p className="text-sm font-bold text-emerald-300">Bihari First, Bihar First</p>
                </div>
              </div>

              <p className="mt-5 max-w-md text-sm font-semibold leading-7 text-slate-300">
                Bihar-first mobility platform for instant ride, reserve ride, rider partners, event booking and local vehicle access. User ko asani, rider ko fair earning.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <a href="mailto:support@bookmygadi.com" className="rounded-lg border border-white/10 bg-white/5 p-4 hover:bg-white/10">
                  <Mail className="text-emerald-300" size={20} />
                  <p className="mt-3 text-sm font-black">Contact Us</p>
                  <p className="mt-1 break-words text-xs font-semibold text-slate-300">support@bookmygadi.com</p>
                </a>
                <a href="mailto:complaints@bookmygadi.com" className="rounded-lg border border-white/10 bg-white/5 p-4 hover:bg-white/10">
                  <Headphones className="text-amber-300" size={20} />
                  <p className="mt-3 text-sm font-black">Complaints</p>
                  <p className="mt-1 break-words text-xs font-semibold text-slate-300">complaints@bookmygadi.com</p>
                </a>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              {footerLinks.map((section) => (
                <div key={section.title}>
                  <p className="text-sm font-black uppercase tracking-wider text-slate-400">{section.title}</p>
                  <div className="mt-4 space-y-2">
                    {section.links.map((item) => (
                      <a key={item.label} href={item.href} className="block text-sm font-bold text-slate-200 hover:text-emerald-300">
                        {item.label}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-lg border border-white/10 bg-white/5 p-5">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-emerald-300" size={23} />
                <div>
                  <p className="font-black">Trusted & Verified Operations</p>
                  <p className="text-xs font-semibold text-slate-400">Safety, documents, support and compliance-first process.</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {trustItems.map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm font-semibold leading-6 text-slate-200">
                    <CheckCircle2 className="mt-1 shrink-0 text-emerald-300" size={16} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-5">
              <div className="flex items-center gap-3">
                <Building2 className="text-cyan-300" size={23} />
                <div>
                  <p className="font-black">Company Details</p>
                  <p className="text-xs font-semibold text-slate-400">BookMyGadi - Bihar, India</p>
                </div>
              </div>
              <div className="mt-5 space-y-3 text-sm font-semibold leading-6 text-slate-200">
                <p>Service: Instant Ride, Reserve Ride, rider partner network, events and bulk vehicle booking.</p>
                <p>Business queries: <a href="mailto:business@bookmygadi.com" className="text-emerald-300 hover:text-emerald-200">business@bookmygadi.com</a></p>
                <p>Legal and licence documents: company registration, GST, trade licence and operating documents will be shown here after official verification.</p>
              </div>
              <a href="/legal-hub.html" className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-black text-slate-950 hover:bg-emerald-50">
                <FileText size={17} />
                Open Legal Hub
              </a>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4 border-t border-white/10 pt-6 md:flex-row md:items-center md:justify-between">
            <p className="text-sm font-semibold text-slate-400">© 2026 BookMyGadi. All rights reserved.</p>
            <div className="flex flex-wrap gap-2">
              <Link to="/app/home?mode=instant" className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-black text-white hover:bg-emerald-600">Instant Ride</Link>
              <Link to="/app/home?mode=reserve" className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-black text-white hover:bg-indigo-600">Reserve Ride</Link>
              <Link to="/rider/login" className="rounded-lg bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/20">Rider Login</Link>
              <Link to="/register" className="rounded-lg bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/20">User Register</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default LandingPage;
