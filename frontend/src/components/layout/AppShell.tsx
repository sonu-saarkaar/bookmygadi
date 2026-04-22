import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Car, Grid, Clock, MapPin, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

const navItems = [
  { to: "/app/services", label: "Services", icon: Grid },
  { to: "/app/history", label: "Rides", icon: Clock },
  { to: "/app/home", label: "Home", icon: Car, isCenter: true },
  { to: "/app/track", label: "Track", icon: MapPin },
  { to: "/app/profile", label: "Profile", icon: User },
];

// Detect Android WebView — framer-motion opacity transitions freeze on WebView,
// causing pages to stay invisible (white screen).
const isAndroidWebView =
  typeof navigator !== "undefined" &&
  /Android/i.test(navigator.userAgent) &&
  (/\bwv\b/i.test(navigator.userAgent) || /BookMyGadi/i.test(navigator.userAgent));

// Pages that render fixed full-screen overlays or are themselves full-screen — skip overflow-hidden and padding wrapper
const FULLSCREEN_PATHS = [
  "/app/searching",
  "/app/booking-confirmed",
  "/app/booking-cancelled",
  "/app/booking-rejected",
  "/app/track",
  "/app/price_negotiation",
];

// Pages that contain fixed overlays — only skip overflow-hidden, keep padding wrapper
const NO_OVERFLOW_PATHS = [
  "/app/home",      // has fixed pricing overlay (NegotiationGoogleMap)
  ...FULLSCREEN_PATHS,
];

const AppShell = () => {
  const location = useLocation();
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const isHomeRoute = location.pathname.startsWith("/app/home");
  const hideBottomNav =
    location.pathname.startsWith("/app/price_negotiation") ||
    location.pathname.startsWith("/app/reservation/price_negotion") ||
    location.pathname.startsWith("/app/searching") ||
    location.pathname.includes("/app/home/destination-location-picker");

  const isFullscreen = FULLSCREEN_PATHS.some((p) => location.pathname.startsWith(p));
  const noOverflow = NO_OVERFLOW_PATHS.some((p) => location.pathname.startsWith(p));

  useEffect(() => {
    const minKeyboardHeight = 150;
    const initialHeight = window.innerHeight;

    const handleResize = () => {
      if (window.innerHeight < initialHeight - minKeyboardHeight) {
        setIsKeyboardOpen(true);
      } else {
        setIsKeyboardOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className={`min-h-[100vh] font-sans selection:bg-primary-accent/20 ${isHomeRoute ? "bg-[#f2f5f7]" : "bg-[#FAFAFA]"}`}>
      <main
        className={`w-full min-h-[100vh] relative ${
          isHomeRoute
            ? "mx-auto max-w-[430px] bg-white md:shadow-xl"
            : "mx-auto max-w-md bg-white shadow-xl"
        } ${noOverflow ? "" : "overflow-hidden"}`}
      >
        {!isFullscreen && !isHomeRoute && (
          <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-primary-accent/5 to-transparent pointer-events-none" />
        )}

        {/* Full-screen pages (map/negotiation/confirmation) — no padding, no animation */}
        {isFullscreen ? (
          <div className="relative w-full h-full">
            <Outlet />
          </div>
        ) : isAndroidWebView ? (
          /* Android WebView — skip framer-motion opacity transition to prevent white screen */
          <div className={`relative z-10 pb-[120px] ${isHomeRoute ? "px-0 pt-0" : "px-4 pt-8"}`}>
            <Outlet />
          </div>
        ) : (
          /* Desktop / iOS — smooth page transitions */
          <div className={`relative z-10 pb-[120px] ${isHomeRoute ? "px-0 pt-0" : "px-4 pt-8"}`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Aadhaar App Style Bottom Navigation Menu */}
            {!isKeyboardOpen && !hideBottomNav && (
      <nav
        className="fixed bottom-0 left-0 right-0 z-[9999]"
        style={{ position: "fixed", bottom: 0 }}
      >
         <div className={`w-full relative flex flex-col justify-end ${isHomeRoute ? "mx-auto max-w-[430px]" : "mx-auto max-w-md"}`}>
            <div className="relative w-full h-[70px] drop-shadow-[0_-2px_6px_rgba(0,0,0,0.06)] flex pointer-events-none">
                
                {/* Left flat bar */}
                <div className="flex-1 bg-white h-full relative pointer-events-auto z-[2]">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gray-200" />
                    <div className="flex h-full w-full justify-around items-end pb-2">
                        {navItems.slice(0, 2).map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname.startsWith(item.to);
                            return (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    className="flex w-16 flex-col items-center justify-center gap-1 tap-highlight-transparent"
                                >
                                    <Icon
                                        strokeWidth={1.5}
                                        size={26}
                                        className={`transition-colors duration-200 ${
                                            isActive ? "text-emerald-600" : "text-gray-500"
                                        }`}
                                    />
                                    <span
                                        className={`text-[11px] font-normal tracking-wide transition-colors duration-200 ${
                                            isActive ? "text-emerald-600" : "text-gray-500"
                                        }`}
                                    >
                                        {item.label}
                                    </span>
                                </NavLink>
                            );
                        })}
                    </div>
                </div>

                {/* Center deep cutout (SVG) */}
                <div className="w-[100px] h-full relative z-[1] flex-shrink-0">
                    <svg
                       width="100%"
                       height="100%"
                       viewBox="0 0 100 70"
                       preserveAspectRatio="none"
                       className="absolute top-0 left-0 w-full h-full"
                    >
                       {/* Drop shadow / top border equivalent path */}
                       <path 
                           d="M0,0 C12,0 16,3 20,12 A32,32 0 0,0 80,12 C84,3 88,0 100,0" 
                           fill="none" 
                           stroke="#e5e7eb" 
                           strokeWidth="1" 
                       />
                       {/* Main shape fill */}
                       <path 
                           d="M0,0 C12,0 16,3 20,12 A32,32 0 0,0 80,12 C84,3 88,0 100,0 V70 H0 Z" 
                           fill="white" 
                       />
                    </svg>

                    {/* Central Blue Floating Button matched exactly to Aadhaar UI */}
                    <div className="absolute left-1/2 -translate-x-1/2 -top-[16px] pointer-events-auto z-[10] tap-highlight-transparent">
                        <NavLink to="/app/home">
                            <div className="w-[64px] h-[64px] bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-[0_4px_12px_rgba(16,185,129,0.4)] transition-all duration-300 hover:bg-emerald-700 active:scale-95 border-2 border-transparent">
                                {/* Using Car icon as shown in original app */}
                                <Car size={30} strokeWidth={1.5} className="text-white" />
                            </div>
                        </NavLink>
                    </div>
                </div>

                {/* Right flat bar */}
                <div className="flex-1 bg-white h-full relative pointer-events-auto z-[2]">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gray-200" />
                    <div className="flex h-full w-full justify-around items-end pb-2">
                        {navItems.slice(3, 5).map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname.startsWith(item.to);
                            return (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    className="flex w-16 flex-col items-center justify-center gap-1 tap-highlight-transparent"
                                >
                                    <Icon
                                        strokeWidth={1.5}
                                        size={26}
                                        className={`transition-colors duration-200 ${
                                            isActive ? "text-emerald-600" : "text-gray-500"
                                        }`}
                                    />
                                    <span
                                        className={`text-[11px] font-normal tracking-wide transition-colors duration-200 ${
                                            isActive ? "text-emerald-600" : "text-gray-500"
                                        }`}
                                    >
                                        {item.label}
                                    </span>
                                </NavLink>
                            );
                        })}
                    </div>
                </div>

            </div>

            {/* Safe area fill for notch phones strictly inside white zone */}
            <div className="bg-white w-full h-[env(safe-area-inset-bottom,0px)]" />
         </div>
      </nav>
      )}
    </div>
  );
};

export default AppShell;
