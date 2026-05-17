import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight,
  CalendarClock,
  Car,
  CheckCircle2,
  Download,
  Headphones,
  LogIn,
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

const userAppDownloadUrl = import.meta.env.VITE_USER_APP_DOWNLOAD_URL || "/download#apps";
const riderAppDownloadUrl = import.meta.env.VITE_RIDER_APP_DOWNLOAD_URL || "/download#apps";

const scrollTargets: Record<string, string> = {
  "/download": "apps",
  "/offers": "offers",
  "/about": "vision",
  "/partner": "partner",
};

const actions = [
  { label: "Book Ride", to: "/app/home", icon: Navigation, tone: "bg-emerald-600 text-white hover:bg-emerald-700" },
  { label: "Register User", to: "/register", icon: UserPlus, tone: "bg-white text-slate-900 hover:bg-emerald-50 border border-emerald-200" },
  { label: "Driver Login", to: "/rider/login", icon: Car, tone: "bg-white text-slate-900 hover:bg-amber-50 border border-amber-200" },
  { label: "Download App", to: "/download", icon: Download, tone: "bg-slate-900 text-white hover:bg-slate-800" },
];

const services = [
  { title: "Instant Ride", text: "Nearby gadi, live pickup, and direct booking from the web app.", icon: Zap },
  { title: "Advance Booking", text: "Reserve car, auto, bike, wedding gadi, or family travel in advance.", icon: CalendarClock },
  { title: "Partner Network", text: "Riders can register, add vehicles, and start receiving bookings.", icon: Users },
  { title: "Clear Payments", text: "UPI support, ride history, and transparent fare flow for every trip.", icon: Wallet },
];

const offers = [
  "New users get priority onboarding on web booking.",
  "Driver partners can register vehicle details from the rider panel.",
  "Wedding, event, and outstation booking options are highlighted.",
];

const stats = [
  { label: "App Version", value: "v1.0" },
  { label: "User App", value: "Ready" },
  { label: "Rider App", value: "Ready" },
];

const LandingPage = () => {
  const location = useLocation();

  useEffect(() => {
    const targetId = location.hash.replace("#", "") || scrollTargets[location.pathname];
    if (!targetId) return;

    window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }, [location.hash, location.pathname]);

  const isUserDownloadConfigured = userAppDownloadUrl !== "/download#apps";
  const isRiderDownloadConfigured = riderAppDownloadUrl !== "/download#apps";

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="BookMyGadi" className="h-10 w-10 rounded-lg border border-slate-200 object-contain" />
            <div>
              <p className="text-base font-black leading-5 text-slate-950">BookMyGadi</p>
              <p className="text-xs font-bold text-emerald-700">Ride, Reserve, Partner</p>
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
              New web entry for BookMyGadi users
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.05] text-slate-950 sm:text-6xl">
              BookMyGadi
            </h1>
            <p className="mt-5 max-w-2xl text-lg font-semibold leading-8 text-slate-700">
              Ek clean public website jahan user app download kare, ride book kare, registration kare, offers dekhe, aur BookMyGadi ka vision samjhe.
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
                          <p className="text-sm font-black text-slate-950">Book a ride</p>
                          <p className="text-xs font-bold text-slate-500">Live web app preview</p>
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
                          <p className="text-sm font-black text-slate-950">Current location</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <div className="flex items-start gap-3">
                        <Navigation className="mt-1 text-amber-700" size={20} />
                        <div>
                          <p className="text-xs font-bold text-slate-500">Destination</p>
                          <p className="text-sm font-black text-slate-950">Choose drop location</p>
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
                      Start Booking
                      <ArrowRight size={17} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="apps" className="scroll-mt-24 border-b border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-black text-emerald-700">Latest app download</p>
              <h2 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">Download BookMyGadi v1.0</h2>
              <p className="mt-3 max-w-2xl text-base font-semibold leading-7 text-slate-600">
                Customer aur rider dono app ke entry points yahin se milenge. Web booking ke liye browser se bhi ride start ho sakti hai.
              </p>
            </div>
            <Link
              to="/app/home"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-black text-white hover:bg-slate-800"
            >
              Open Web Booking
              <ArrowRight size={17} />
            </Link>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-emerald-50 p-5">
              <div className="flex items-start gap-4">
                <img src="/logo_user.png" alt="BookMyGadi customer app" className="h-16 w-16 rounded-lg bg-white object-contain p-1" />
                <div className="min-w-0 flex-1">
                  <p className="text-xl font-black text-slate-950">Customer App</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">Ride booking, live location, fare flow, payment, history, and profile.</p>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <a
                      href={userAppDownloadUrl}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-black text-white hover:bg-emerald-700"
                    >
                      <Download size={17} />
                      {isUserDownloadConfigured ? "Download User App" : "Download Page"}
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
                  <p className="text-xl font-black text-slate-950">Rider Partner App</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">Driver login, gadi registration, earning, live rides, and partner profile.</p>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <a
                      href={riderAppDownloadUrl}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 text-sm font-black text-white hover:bg-amber-700"
                    >
                      <Download size={17} />
                      {isRiderDownloadConfigured ? "Download Rider App" : "Download Page"}
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
            <p className="text-sm font-black text-emerald-700">Marketing and offers</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">New offers, quick actions, and clear trust signals.</h2>
            <p className="mt-4 text-base font-semibold leading-7 text-slate-600">
              Landing page par user ko pehle hi pata chal jata hai ki BookMyGadi se ride, reserve booking, logistics, aur partner registration possible hai.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link to="/app/home" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-black text-white hover:bg-emerald-700">
                <Navigation size={18} />
                Book Now
              </Link>
              <Link to="/download" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-sm font-black text-slate-900 hover:bg-slate-100">
                <Download size={18} />
                App Download
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
                <h2 className="text-3xl font-black text-slate-950">Apni gadi register karo.</h2>
              </div>
            </div>
            <p className="mt-5 text-base font-semibold leading-7 text-slate-600">
              Driver partners login karke profile, gadi details, earning, and ride alerts manage kar sakte hain.
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
              Local rides ko transparent, fast, aur trustworthy banana.
            </h2>
            <p className="mt-4 text-base font-semibold leading-8 text-slate-700">
              BookMyGadi ka goal hai users ko reliable ride options dena aur driver partners ko ek professional digital platform dena, jahan booking, tracking, support, and settlement clear ho.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Link to="/app/home" className="rounded-lg border border-emerald-200 bg-white p-5 shadow-sm hover:bg-emerald-50">
              <PhoneCall className="text-emerald-700" size={24} />
              <p className="mt-4 text-lg font-black text-slate-950">For Customers</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">Book ride, reserve gadi, and track trips from web or app.</p>
            </Link>
            <Link to="/rider/login" className="rounded-lg border border-amber-200 bg-white p-5 shadow-sm hover:bg-amber-50">
              <Car className="text-amber-700" size={24} />
              <p className="mt-4 text-lg font-black text-slate-950">For Riders</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">Register, go online, manage rides, and view earnings.</p>
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
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="BookMyGadi" className="h-10 w-10 rounded-lg bg-white object-contain" />
            <div>
              <p className="font-black">BookMyGadi</p>
              <p className="text-sm font-semibold text-slate-300">web.bookmygadi.app ready entry page</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/login" className="rounded-lg bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/20">Login</Link>
            <Link to="/register" className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-black text-white hover:bg-emerald-600">Register</Link>
            <a href="/privacy-policy.html" className="rounded-lg bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/20">Privacy</a>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default LandingPage;
