import React, { useEffect, useState } from "react";
import { MapPin, Navigation } from "lucide-react";

interface LocationGuardProps {
  children: React.ReactNode;
}

export const LocationGuard: React.FC<LocationGuardProps> = ({ children }) => {
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean | null>(null);
  const [locationStatusMsg, setLocationStatusMsg] = useState<string>("Initializing secure live-location connection...");
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    // 1. Bypass completely if we are running inside the Native Android App
    // We already handled location permissions natively!
    if (typeof window !== "undefined" && (window as any).AndroidInterface) {
      setHasLocationPermission(true);
      return;
    }

    let watchId: number | null = null;
    let fallbackTimeout: NodeJS.Timeout | null = null;
    let initialLocationObtained = false;

    const requestLocation = () => {
      if (!navigator.geolocation) {
        setLocationStatusMsg("Your device does not support geolocation.");
        setHasLocationPermission(false);
        return;
      }

      // Strong settings for extremely accurate & fast live location
      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      };

      // Watch continuously to keep the GPS radio hot/active so components load instantly
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (!initialLocationObtained) {
            initialLocationObtained = true;
            setHasLocationPermission(true);
          }
          // Optional: we can emit an event so downstream hooks pick up this fresh position in 0ms!
          window.dispatchEvent(
            new CustomEvent("strong_live_location", {
              detail: { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy },
            })
          );
        },
        (err) => {
          console.error("[LocationGuard] Location error:", err);
          if (err.code === err.PERMISSION_DENIED) {
            setLocationStatusMsg("Location permission was denied.");
            setHasLocationPermission(false);
          } else if (err.code === err.TIMEOUT || err.code === err.POSITION_UNAVAILABLE) {
            // If it's a GPS timeout but permission isn't explicitly denied, allow them through so the app isn't forever blocked!
            if (!initialLocationObtained) {
               console.warn("GPS is slow, but permission seems fine. Unblocking app...");
               setHasLocationPermission(true); 
               initialLocationObtained = true;
            }
          }
        },
        options
      );
    };

    // If the browser supports the Permissions API, use it!
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((result) => {
          if (result.state === "granted") {
            setHasLocationPermission(true); // Unblock immediately if already granted!
            initialLocationObtained = true;
            requestLocation();
          } else if (result.state === "prompt") {
            requestLocation();
          } else {
            setLocationStatusMsg("Location permission is permanently denied in your browser settings.");
            setHasLocationPermission(false);
          }

          result.onchange = () => {
            if (result.state === "granted") {
              setHasLocationPermission(true);
              initialLocationObtained = true;
              requestLocation();
            } else if (result.state === "denied") {
              setLocationStatusMsg("Location permission was revoked.");
              setHasLocationPermission(false);
            }
          };
        })
        .catch(() => {
          requestLocation();
        });
    } else {
      // Fallback request
      requestLocation();
    }

    return () => {
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
    };
  }, []);

  // Show nothing initially (or a very tiny loader) while we figure out permissions
  if (hasLocationPermission === null) {
    return (
      <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-gray-50/70 p-4 backdrop-blur-md">
        <Navigation className="w-10 h-10 text-blue-500 animate-pulse mb-4" />
        <p className="text-gray-600 font-medium text-center animate-pulse">{locationStatusMsg}</p>
      </div>
    );
  }

  // Ifpermitted OR user dismissed the warning! We render the actual app
  if (hasLocationPermission === true || isDismissed) {
    return <>{children}</>;
  }

  // If permission is flatly denied/missing, lock them out with a full screen modal.
  if (hasLocationPermission === false) {
    const handleOpenSettings = () => {
      if ((window as any).AndroidInterface && (window as any).AndroidInterface.openLocationSettings) {
         (window as any).AndroidInterface.openLocationSettings();
      } else {
         window.location.reload();
      }
    };

    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative animate-in fade-in zoom-in duration-300">
          <button 
            onClick={() => setIsDismissed(true)}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            title="Dismiss"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>

          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-red-100">
            <MapPin className="text-red-600 w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Live Location Required</h2>
          
          <p className="text-gray-600 mb-6 font-medium text-sm leading-relaxed">
            {locationStatusMsg.includes("denied") 
              ? "You cannot proceed without providing location access. Real-time locations are required to connect with cabs smoothly." 
              : locationStatusMsg}
          </p>

          <div className="flex flex-col gap-4">
            <button
              onClick={handleOpenSettings}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl transition duration-200 shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 text-[15px]"
            >
              <Navigation className="w-5 h-5" /> {(window as any).AndroidInterface ? "Open Settings" : "Grant Access & Reload"}
            </button>
            <div className="bg-orange-50 text-orange-800 p-3 rounded-xl border border-orange-100 text-xs text-left">
              <strong>How to fix:</strong>
              <ul className="list-disc pl-4 mt-1 space-y-1">
                <li><strong>Web:</strong> Click the "lock 🔒" icon in your URL bar, select "Site settings" and Allow Location.</li>
                <li><strong>App:</strong> Go to Settings &gt; Apps &gt; BookMyGadi &gt; Permissions and enable Location.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Final fallback (though handled above)
  return <>{children}</>;
};
