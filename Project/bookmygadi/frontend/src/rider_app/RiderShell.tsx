import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Home, Navigation, Wallet, Calendar, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { riderApi } from "@/services/riderApi";

const navItems = [
  { to: "/rider/advance", label: "Schedule", icon: Calendar },
  { to: "/rider/track", label: "Track", icon: Navigation },
  { to: "/rider/home", label: "Home", icon: Home, isCenter: true },
  { to: "/rider/earning", label: "Earnings", icon: Wallet },
  { to: "/rider/profile", label: "Profile", icon: User },
];

const RiderShell = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [activeRideInfo, setActiveRideInfo] = useState<any>(null);

  useEffect(() => {
    // Load active ride to show persistent banner without blocking navigation
    const checkActiveRide = async () => {
      try {
        const active = await riderApi.listActiveRides();
        if (active.length > 0) {
          setActiveRideInfo(active[0]);
        } else {
          setActiveRideInfo(null);
        }
      } catch (e) {
        // silent fail
      }
    };
    
    checkActiveRide();
    const interval = setInterval(checkActiveRide, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const minKeyboardHeight = 150; // Typically mobile keyboards are at least 150px tall
    const initialHeight = window.innerHeight;

    const handleResize = () => {
      if (window.innerHeight < initialHeight - minKeyboardHeight) {
        setIsKeyboardOpen(true); // Keyboard is likely open
      } else {
        setIsKeyboardOpen(false); // Keyboard is closed
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="min-h-[100vh] bg-[#F6F8FA] font-sans selection:bg-primary-accent/20">
      <main className="mx-auto w-full max-w-md bg-white min-h-[100vh] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-primary-accent/10 to-transparent pointer-events-none" />
        <div className="relative z-10 px-4 pt-8 pb-[120px]">
          <Outlet />
        </div>
      </main>

      {/* Aadhaar App Style Bottom Navigation Menu */}
      {!isKeyboardOpen && (
      <nav
        className="fixed bottom-0 left-0 right-0 z-[9999]"
        style={{ position: "fixed", bottom: 0 }}
      >
         <div className="mx-auto w-full max-w-md relative flex flex-col justify-end">
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
                                            isActive ? "text-indigo-600" : "text-gray-500"
                                        }`}
                                    />
                                    <span
                                        className={`text-[11px] font-normal tracking-wide transition-colors duration-200 ${
                                            isActive ? "text-indigo-600" : "text-gray-500"
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
                        <NavLink to="/rider/home">
                            <div className="w-[64px] h-[64px] bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-[0_4px_12px_rgba(79,70,229,0.4)] transition-all duration-300 hover:bg-indigo-700 active:scale-95 border-2 border-transparent">
                                {/* Center Icon */}
                                <Home size={30} strokeWidth={1.5} className="text-white" />
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
                                            isActive ? "text-indigo-600" : "text-gray-500"
                                        }`}
                                    />
                                    <span
                                        className={`text-[11px] font-normal tracking-wide transition-colors duration-200 ${
                                            isActive ? "text-indigo-600" : "text-gray-500"
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

export default RiderShell;
