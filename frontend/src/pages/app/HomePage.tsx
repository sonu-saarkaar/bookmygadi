import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { authStore, backendApi, type NearbyRider, type VehicleInventory } from "@/services/backendApi";
import { playSound } from "@/services/notificationCenter";
import { formatPreciseReverseAddress, geocodeAddressWithGoogle, hasGoogleMapsApiKey, reverseGeocodeWithGoogle } from "@/services/googleMaps";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Navigation, Map, ShieldCheck, CreditCard, ChevronRight, User, Search, Clock, Zap, CalendarDays, X, Check, Plus, Minus, Trash2, Car, Tag, ChevronDown, ChevronUp, Wallet, Shield, Crosshair, ArrowUpDown } from "lucide-react";
import { MapLocationPickerModal } from "../../components/map/MapLocationPickerModal";

interface VehicleEntry {
  id: number;
  acMode: "ac" | "non_ac";
  seater: number;
  condition: string;
  role: string;
  customRole: string;
  estimatedPrice: number;
}

const formatDateTime = (date = new Date()) => {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  let hh = date.getHours();
  const period = hh >= 12 ? "PM" : "AM";
  hh = hh % 12 || 12;
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy}, ${String(hh).padStart(2, "0")}:${min} ${period}`;
};

type BookingState = "form" | "pricing" | "searching" | "reserve_summary";
type UrgencyType = "quick_book" | "ride" | "emergency" | "reserve";
type ReserveSource = "driver_defined" | "recent_trip_data" | "admin_default";
const ACTIVE_BOOKING_STORAGE_KEY = "bmg_active_booking";
const ACTIVE_BOOKING_TOKEN_STORAGE_KEY = "bmg_active_booking_customer_token";
const LAST_KNOWN_COORDS_KEY = "bmg_last_known_coords";
const NEGOTIATION_RADIUS_KM = 10;
const NEGOTIATION_CONTEXT_STORAGE_KEY = "bmg_price_negotiation_context";
const RESERVATION_PRICE_NEGOTION_PATH = "/app/reservation/price_negotion";

type NegotiationContext = {
  pickup: string;
  destination: string;
  pickupCoords: { lat: number; lng: number } | null;
  destinationCoords: { lat: number; lng: number } | null;
  minFare: number;
  maxFare: number;
  offerPrice: number;
  quoteDistance: number | null;
};

const ROLE_OPTIONS = ["Dulha", "Dulhan", "Passenger", "VIP Guest", "Baraati", "Family", "DJ/Band", "Custom"];

const createVehicleEntry = (id: number): VehicleEntry => ({
  id, acMode: "non_ac", seater: 5, condition: "Better (Up to 5yr)", role: "Passenger", customRole: "", estimatedPrice: 0,
});

const quickVehicleIcons = [
  { label: "Car", emoji: "🚗", type: "CAR", model: "Swift", seater: 5 },
  { label: "Bike", emoji: "🏍️", type: "BIKE", model: "Bike", seater: 1 },
  { label: "Auto", emoji: "🛺", type: "AUTO", model: "Auto", seater: 5 },
  { label: "Pickup", emoji: "🛻", type: "BOLERO", model: "Pickup", seater: 2 },
];

const AUTO_SUB_TYPES = [
  { id: "e-rikhsaw", label: "E-Rikhsaw", seater: 5 },
  { id: "normal-auto", label: "Normal Auto", seater: 5 },
  { id: "large-auto", label: "Large Auto", seater: 9 }
];

const readNegotiationContext = (): NegotiationContext | null => {
  const raw = sessionStorage.getItem(NEGOTIATION_CONTEXT_STORAGE_KEY) || localStorage.getItem(NEGOTIATION_CONTEXT_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as NegotiationContext;
  } catch {
    return null;
  }
};

const writeNegotiationContext = (context: NegotiationContext) => {
  const payload = JSON.stringify(context);
  sessionStorage.setItem(NEGOTIATION_CONTEXT_STORAGE_KEY, payload);
  localStorage.setItem(NEGOTIATION_CONTEXT_STORAGE_KEY, payload);
};

const clearNegotiationContext = () => {
  sessionStorage.removeItem(NEGOTIATION_CONTEXT_STORAGE_KEY);
  localStorage.removeItem(NEGOTIATION_CONTEXT_STORAGE_KEY);
};

const HomePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const initialNegotiationContext = location.pathname === "/app/price_negotiation" ? readNegotiationContext() : null;
  const initialVehicle = searchParams.get("vehicle") || "car";
  const initialService = (searchParams.get("service") || "").toLowerCase();
  const initialModel = searchParams.get("model") || "";

  const [userProfileData, setUserProfileData] = useState<{ name: string; avatar: string | null; scale: number; x: number; y: number }>({ name: "User", avatar: null, scale: 1, x: 0, y: 0 });

  useEffect(() => {
    const loadUser = async () => {
      const raw = localStorage.getItem("bmg_user_profile_edit");
      const local = raw ? JSON.parse(raw) : null;
      let fetchedName = "User";
      try {
        const token = authStore.getToken();
        if (token) {
          const profile = await backendApi.me(token);
          fetchedName = profile.name || "User";
        }
      } catch (error) {
        // ignore
      }

      setUserProfileData({
        name: local?.display_name || fetchedName,
        avatar: local?.avatar_data || null,
        scale: local?.avatar_scale || 1,
        x: local?.avatar_x || 0,
        y: local?.avatar_y || 0,
      });
    };
    
    loadUser();

    // Listen for storage changes specifically for real-time syncing across tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "bmg_user_profile_edit") {
         loadUser();
      }
    };
    window.addEventListener("storage", handleStorage);
    // Custom event for same-tab updates
    const handleCustomUpdate = () => loadUser();
    window.addEventListener("bmg_profile_updated", handleCustomUpdate);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("bmg_profile_updated", handleCustomUpdate);
    };
  }, []);

  const [pickup, setPickup] = useState(() => initialNegotiationContext?.pickup || localStorage.getItem("bmg_pickup") || "Varanasi");
  const [destination, setDestination] = useState(() => initialNegotiationContext?.destination || localStorage.getItem("bmg_destination") || "");
  const [destinationCoords, setDestinationCoords] = useState<{lat: number, lng: number} | null>(() => initialNegotiationContext?.destinationCoords || null);
  const [destinationSuggestions, setDestinationSuggestions] = useState<any[]>([]);
  const [isSearchingDest, setIsSearchingDest] = useState(false);
  const [searchTimeoutItem, setSearchTimeoutItem] = useState<any>(null);
  const [selectedDistance, setSelectedDistance] = useState<number | null>(null);

  const isDestinationMapOpen = location.pathname.endsWith("/destination-location-picker");
  const setIsDestinationMapOpen = (open: boolean) => {
    if (open) {
      navigate('/app/home/destination-location-picker');
    } else {
      navigate('/app/home', { replace: true });
    }
  };
  
  const [journeyType, setJourneyType] = useState<"oneway" | "roundtrip">("oneway");
  const [pickupOffset, setPickupOffset] = useState(0);
  const [returnTime, setReturnTime] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 6);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);
    let hh = d.getHours();
    const ampm = hh >= 12 ? 'PM' : 'AM';
    hh = hh % 12 || 12;
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${dd}:${mm}:${yy}::${hh}:${min} ${ampm}`;
  });
  const [reservedPickupAt, setReservedPickupAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setMinutes(0, 0, 0);
    return d.toISOString().slice(0, 16);
  });

  const addSixHoursToReturnTime = () => {
    shiftReturnTimeByHours(6);
  };

  const shiftReturnTimeByHours = (deltaHours: number) => {
    try {
      const parts = returnTime.split('::');
      if (parts.length !== 2) throw new Error();
      const [dd, mm, yy] = parts[0].split(':');
      const [time, ampm] = parts[1].split(' ');
      let [h, min] = time.split(':');
      let hours = parseInt(h, 10);
      if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
      if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
      const fullYear = parseInt("20" + yy, 10);
      const d = new Date(fullYear, parseInt(mm, 10) - 1, parseInt(dd, 10), hours, parseInt(min, 10));
      d.setHours(d.getHours() + deltaHours);
      const outDd = String(d.getDate()).padStart(2, "0");
      const outMm = String(d.getMonth() + 1).padStart(2, "0");
      const outYy = String(d.getFullYear()).slice(-2);
      let outHh = d.getHours();
      const outAmpm = outHh >= 12 ? 'PM' : 'AM';
      outHh = outHh % 12 || 12;
      const outMin = String(d.getMinutes()).padStart(2, "0");
      setReturnTime(`${outDd}:${outMm}:${outYy}::${outHh}:${outMin} ${outAmpm}`);
    } catch {
      const d = new Date(); d.setHours(d.getHours() + deltaHours);
      const outDd = String(d.getDate()).padStart(2, "0");
      const outMm = String(d.getMonth() + 1).padStart(2, "0");
      const outYy = String(d.getFullYear()).slice(-2);
      let outHh = d.getHours();
      const outAmpm = outHh >= 12 ? 'PM' : 'AM';
      outHh = outHh % 12 || 12;
      const outMin = String(d.getMinutes()).padStart(2, "0");
      setReturnTime(`${outDd}:${outMm}:${outYy}::${outHh}:${outMin} ${outAmpm}`);
    }
  };

  const handleNativeDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     if (!e.target.value) return;
     const d = new Date(e.target.value);
     if (isNaN(d.getTime())) return;
     const outDd = String(d.getDate()).padStart(2, "0");
     const outMm = String(d.getMonth() + 1).padStart(2, "0");
     const outYy = String(d.getFullYear()).slice(-2);
     let outHh = d.getHours();
     const outAmpm = outHh >= 12 ? 'PM' : 'AM';
     outHh = outHh % 12 || 12;
     const outMin = String(d.getMinutes()).padStart(2, "0");
     setReturnTime(`${outDd}:${outMm}:${outYy}::${outHh}:${outMin} ${outAmpm}`);
  };

  const handleReservedPickupChange = (value: string) => {
    if (!value) return;
    setReservedPickupAt(value);
    const selected = new Date(value);
    if (Number.isNaN(selected.getTime())) return;
    const diffMins = Math.max(0, Math.round((selected.getTime() - Date.now()) / 60000));
    setPickupOffset(Math.round(diffMins / 30));
  };

  const [vehicleColor, setVehicleColor] = useState("White");
  const [vehicleType, setVehicleType] = useState(() => {
    const v = searchParams.get("vehicle") || localStorage.getItem("bmg_vehicle_type") || initialVehicle;
    return v.toUpperCase();
  });
  const [vehicleCondition, setVehicleCondition] = useState("Better Condition (Up to 5 years)");
  const [acMode, setAcMode] = useState<"ac" | "non_ac">(() => (localStorage.getItem("bmg_ac_mode") as any) || "non_ac");
  const [autoSubType, setAutoSubType] = useState(() => localStorage.getItem("bmg_auto_subtype") || "Normal Auto 5 Seater");
  const [seater, setSeater] = useState(() => Number(localStorage.getItem("bmg_seater")) || 5);
  const [vehicleCount, setVehicleCount] = useState(1);
  const [vehicleMode, setVehicleMode] = useState<"single" | "multiple">("single");
  const [vehicleList, setVehicleList] = useState<VehicleEntry[]>([createVehicleEntry(1)]);
  const [expandedVehicle, setExpandedVehicle] = useState<number>(1);

  const [packageType, setPackageType] = useState("Advance Booking");
  const [eventType, setEventType] = useState("Wedding (Sadi)");
  const [goodsType, setGoodsType] = useState("Furniture");

  const [pickupCategory, setPickupCategory] = useState("Mini Pickup");
  const [goodsPickupLocation, setGoodsPickupLocation] = useState("");
  const [goodsDropLocation, setGoodsDropLocation] = useState("");

  const dropTimeOptions = useMemo(() => {
    const opts = [];
    const now = new Date();
    let startD = new Date(now.getTime() + 2 * 3600000);
    startD.setMinutes(0, 0, 0); 
    
    for(let i=0; i<48; i++) {
        const date = new Date(startD.getTime() + i * 3600000);
        let label = "";
        const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
        
        const isToday = date.getDate() === now.getDate();
        const isTomorrow = date.getDate() === tomorrow.getDate();
        
        let hh = date.getHours();
        const ampm = hh >= 12 ? 'PM' : 'AM';
        hh = hh % 12 || 12;
        
        if (isToday) label = `Today, ${hh} ${ampm}`;
        else if (isTomorrow) label = `Tomorrow, ${hh} ${ampm}`;
        else {
            const dd = String(date.getDate()).padStart(2, '0');
            const mm = date.toLocaleString('default', { month: 'short' });
            label = `${dd} ${mm}, ${hh} ${ampm}`;
        }
        
        const d_day = String(date.getDate()).padStart(2, "0");
        const d_m = String(date.getMonth() + 1).padStart(2, "0");
        const d_y = date.getFullYear();
        const value = `${d_day}/${d_m}/${d_y}, ${String(hh).padStart(2, "0")}:00 ${ampm}`;
        opts.push({ label, value });
    }
    return opts;
  }, []);

  const getPickupLabel = () => {
    if (pickupOffset === 0) return "Instantly";
    const totalMins = pickupOffset * 30;
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    
    let relativeStr = "In ";
    if (hrs > 0) relativeStr += `${hrs} hr${hrs > 1 ? 's' : ''} `;
    if (mins > 0) relativeStr += `${mins} min`;
    
    const d = new Date(Date.now() + totalMins * 60000);
    let hh = d.getHours();
    const ampm = hh >= 12 ? 'PM' : 'AM';
    hh = hh % 12 || 12;
    const m = String(d.getMinutes()).padStart(2, "0");
    
    return `${relativeStr.trim()} (${hh}:${m} ${ampm})`;
  };

  const currentPickupTimeRaw = useMemo(() => {
    if (pickupOffset === 0) return "Instantly";
    return formatDateTime(new Date(Date.now() + pickupOffset * 30 * 60000));
  }, [pickupOffset]);

  const isNextDayOffset = (offsetSteps: number) => {
    if (offsetSteps <= 0) return false;
    const now = new Date();
    const target = new Date(Date.now() + offsetSteps * 30 * 60000);
    return now.toDateString() !== target.toDateString();
  };

  const [selectedModel, setSelectedModel] = useState(() => searchParams.get("model") || localStorage.getItem("bmg_selected_model") || "Swift");
  const [bookingState, setBookingState] = useState<BookingState>(() => {
    if (location.pathname === "/app/price_negotiation" && initialNegotiationContext) return "pricing";
    if (location.pathname === RESERVATION_PRICE_NEGOTION_PATH) return "reserve_summary";
    return "form";
  });
  const [serviceMode, setServiceMode] = useState<"Instant Ride" | "reserved">(() => {
    if (initialService === "reserve") return "reserved";
    if (initialService === "Instant Ride") return "Instant Ride";
    return (localStorage.getItem("bmg_service_mode") as any) || "Instant Ride";
  });
  const [urgencyType, setUrgencyType] = useState<UrgencyType>(() => {
    if (initialService === "reserve") return "reserve";
    const saved = localStorage.getItem("bmg_service_mode");
    if (saved === "reserved") return "reserve";
    return "ride";
  });
  const [offerPrice, setOfferPrice] = useState(() => initialNegotiationContext?.offerPrice ?? 2500);
  const [minFare, setMinFare] = useState(() => initialNegotiationContext?.minFare ?? 2000);
  const [maxFare, setMaxFare] = useState(() => initialNegotiationContext?.maxFare ?? 3000);
  const [quoteDistance, setQuoteDistance] = useState<number | null>(() => initialNegotiationContext?.quoteDistance ?? null);
  const reserveDurationHours = 12;
  const [reservePriceSource, setReservePriceSource] = useState<ReserveSource>("admin_default");
  const [reserveNearbyDrivers, setReserveNearbyDrivers] = useState(0);
  const [loading, setLoading] = useState(false);
  const [negotiationPreparing, setNegotiationPreparing] = useState(false);
  const [message, setMessage] = useState("");
  const [activeRideId, setActiveRideId] = useState<string | null>(null);
  const [availableVehicles, setAvailableVehicles] = useState<VehicleInventory[]>([]);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(() => initialNegotiationContext?.pickupCoords || null);
  const [nearbyRiders, setNearbyRiders] = useState<NearbyRider[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [bookingPriority, setBookingPriority] = useState<'quick' | 'normal' | 'emergency'>('normal');
  const [isRefreshingPickupLocation, setIsRefreshingPickupLocation] = useState(false);
  const locationRetryRef = useRef(0);
  const lastResolvedCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastResolvedPickupLabelRef = useRef("");
  const activePickupResolveIdRef = useRef(0);

  const handlePickupOffsetIncrease = () => {
    const nextOffset = pickupOffset + 1;
    if (serviceMode === "Instant Ride" && isNextDayOffset(nextOffset)) {
      setServiceMode("reserved");
      setUrgencyType("reserve");
      setSelectedModel("Swift");
      setJourneyType("oneway");
      setMessage("Instant Ride is only for same-day. Switched to Reserved for advance booking.");
      setTimeout(() => setMessage(""), 3000);
      setPickupOffset(nextOffset);
      return;
    }
    setPickupOffset(nextOffset);
  };

  const handlePickupOffsetDecrease = () => {
    setPickupOffset((prev) => Math.max(0, prev - 1));
  };

  useEffect(() => {
    if (serviceMode === "Instant Ride" && isNextDayOffset(pickupOffset)) {
      setServiceMode("reserved");
      setUrgencyType("reserve");
      setSelectedModel("Swift");
      setJourneyType("oneway");
      setMessage("Instant Ride supports same-day only. Switched to Reserved.");
      setTimeout(() => setMessage(""), 3000);
    }
  }, [pickupOffset, serviceMode]);

  useEffect(() => {
    if (serviceMode === "Instant Ride") {
      setPickupOffset(0);
      setUrgencyType("ride");
    }
  }, [serviceMode]);

  useEffect(() => {
    // Keep in-page UI state aligned with explicit route changes.
    if (location.pathname === "/app/price_negotiation" && bookingState === "form") {
      setBookingState("pricing");
      return;
    }

    if (location.pathname === RESERVATION_PRICE_NEGOTION_PATH && bookingState === "form") {
      setBookingState("reserve_summary");
      return;
    }

    if (location.pathname === "/app/home" && (bookingState === "pricing" || bookingState === "searching")) {
      setBookingState("form");
    }
  }, [location.pathname, bookingState]);

  useEffect(() => {
    if (location.pathname !== "/app/price_negotiation") return;

    const hasLiveNegotiationState =
      !!pickupCoords &&
      !!destinationCoords &&
      Number.isFinite(minFare) &&
      Number.isFinite(maxFare) &&
      Number.isFinite(offerPrice);

    if (hasLiveNegotiationState) {
      writeNegotiationContext({
        pickup,
        destination,
        pickupCoords,
        destinationCoords,
        minFare,
        maxFare,
        offerPrice,
        quoteDistance,
      });
      return;
    }

    const stored = readNegotiationContext();
    if (stored) {
      setPickup(stored.pickup || pickup);
      setDestination(stored.destination || destination);
      setPickupCoords(stored.pickupCoords);
      setDestinationCoords(stored.destinationCoords);
      setMinFare(stored.minFare);
      setMaxFare(stored.maxFare);
      setOfferPrice(stored.offerPrice);
      setQuoteDistance(stored.quoteDistance);
      setBookingState("pricing");
      return;
    }

    setMessage("Price negotiation data not available. Please enter pickup and drop again.");
    setBookingState("form");
    navigate("/app/home", { replace: true });
    window.setTimeout(() => setMessage(""), 3000);
  }, [
    location.pathname,
    pickup,
    destination,
    pickupCoords,
    destinationCoords,
    minFare,
    maxFare,
    offerPrice,
    quoteDistance,
    navigate,
  ]);

  const mappedVehicleType = useMemo(() => {
    const low = vehicleType.toLowerCase();
    if (low.includes("bike")) return "bike";
    if (low.includes("auto") || low.includes("rikhsaw")) return "auto";
    if (low.includes("bolero") || low.includes("pickup")) return "bolero";
    return "car";
  }, [vehicleType]);

  const negotiationReady =
    !!pickupCoords &&
    !!destinationCoords &&
    Number.isFinite(minFare) &&
    Number.isFinite(maxFare) &&
    Number.isFinite(offerPrice);

  useEffect(() => {
    if (location.pathname !== "/app/price_negotiation") return;
    if (negotiationReady || negotiationPreparing) return;

    const token = authStore.getToken();
    if (!token || !pickup.trim() || !destination.trim()) return;

    let cancelled = false;

    const bootstrapNegotiation = async () => {
      setNegotiationPreparing(true);
      try {
        const resolvedPickupCoords = pickupCoords || (await resolveAddressToCoords(pickup));
        const resolvedDestinationCoords = destinationCoords || (await resolveAddressToCoords(destination));

        if (cancelled) return;

        if (resolvedPickupCoords) setPickupCoords(resolvedPickupCoords);
        if (resolvedDestinationCoords) setDestinationCoords(resolvedDestinationCoords);

        const payload: {
          pickup_area: string;
          destination_area: string;
          vehicle_type: string;
          pickup_lat?: number;
          pickup_lng?: number;
          destination_lat?: number;
          destination_lng?: number;
        } = {
          pickup_area: pickup,
          destination_area: destination,
          vehicle_type: mappedVehicleType,
        };

        if (resolvedPickupCoords) {
          payload.pickup_lat = resolvedPickupCoords.lat;
          payload.pickup_lng = resolvedPickupCoords.lng;
        }
        if (resolvedDestinationCoords) {
          payload.destination_lat = resolvedDestinationCoords.lat;
          payload.destination_lng = resolvedDestinationCoords.lng;
        }

        const quote = await backendApi.getPriceQuote(payload, token);
        if (cancelled) return;

        setMinFare(quote.min_fare);
        setMaxFare(quote.max_fare);
        setOfferPrice(quote.suggested_fare || quote.min_fare);
        setQuoteDistance(quote.estimated_distance_km);
        setBookingState("pricing");
        writeNegotiationContext({
          pickup,
          destination,
          pickupCoords: resolvedPickupCoords,
          destinationCoords: resolvedDestinationCoords,
          minFare: quote.min_fare,
          maxFare: quote.max_fare,
          offerPrice: quote.suggested_fare,
          quoteDistance: quote.estimated_distance_km,
        });
      } catch {
        if (cancelled) return;
        clearNegotiationContext();
        setMessage("Unable to prepare price negotiation. Please try again from home.");
      } finally {
        if (!cancelled) {
          setNegotiationPreparing(false);
        }
      }
    };

    bootstrapNegotiation().catch(() => {
      if (!cancelled) {
        setNegotiationPreparing(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    location.pathname,
    negotiationReady,
    negotiationPreparing,
    pickup,
    destination,
    pickupCoords,
    destinationCoords,
    mappedVehicleType,
  ]);
  
  const isReserveService = urgencyType === "reserve";

  const formatMoney = (value: number) => `₹${new Intl.NumberFormat("en-IN").format(value)}`;
  const sliderFillPercent = useMemo(() => {
    const range = maxFare - minFare;
    if (!Number.isFinite(range) || range <= 0) return 0;
    const value = ((offerPrice - minFare) / range) * 100;
    return Math.min(100, Math.max(0, value));
  }, [offerPrice, minFare, maxFare]);

// Add Haversine distance calculator
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return Number(d.toFixed(1));
};

const handleDestinationSearch = async (query: string) => {
  setDestination(query);
  setIsSearchingDest(true);
  setSelectedDistance(null);
  
  if (searchTimeoutItem) {
    clearTimeout(searchTimeoutItem);
  }

  if (!query || query.length < 3) {
    setDestinationSuggestions([]);
    setIsSearchingDest(false);
    return;
  }

  const timeoutId = window.setTimeout(async () => {
    try {
      let suggestions: any[] = [];

      if (hasGoogleMapsApiKey()) {
        const googleRows = await geocodeAddressWithGoogle(query);
        suggestions = googleRows.map((item) => {
          let distance = null;
          if (pickupCoords) {
            distance = calculateDistance(pickupCoords.lat, pickupCoords.lng, item.lat, item.lon);
            if (distance) distance = parseFloat(distance.toFixed(1));
          }
          return {
            ...item,
            distance,
          };
        });
      }

      if (suggestions.length === 0) {
        // Photon API fallback when Google is unavailable or fails.
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lat=${pickupCoords?.lat || 20.5937}&lon=${pickupCoords?.lng || 78.9629}`);
        const rawData = await res.json();

        suggestions = (rawData.features || []).map((feature: any) => {
          const item = feature.properties;
          const coords = feature.geometry.coordinates;

          let distance = null;
          if (pickupCoords) {
            distance = calculateDistance(
              pickupCoords.lat,
              pickupCoords.lng,
              coords[1],
              coords[0]
            );
            if (distance) distance = parseFloat(distance.toFixed(1));
          }

          const primaryName = item.name || item.street || item.city || "Unknown Location";

          const secondaries = [];
          if (item.street && item.name !== item.street) secondaries.push(item.street);
          if (item.district) secondaries.push(item.district);
          if (item.city) secondaries.push(item.city);
          if (item.state) secondaries.push(item.state);
          const secondaryName = secondaries.join(", ") || primaryName;

          return {
            display_name: `${primaryName}, ${secondaryName}`,
            primary_name: primaryName,
            secondary_name: secondaryName,
            lat: coords[1],
            lon: coords[0],
            distance,
          };
        });
      }

      setDestinationSuggestions(suggestions);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearchingDest(false);
    }
  }, 400); // reduced debounce for snappier premium feel

  setSearchTimeoutItem(timeoutId as any);
};

  const resolveAddressToCoords = async (query: string) => {
    const normalized = query.trim();
    if (!normalized) return null;

    const googleRows = await geocodeAddressWithGoogle(normalized);
    if (googleRows[0]) {
      return { lat: googleRows[0].lat, lng: googleRows[0].lon };
    }

    try {
      const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(normalized)}&limit=1`);
      if (!res.ok) return null;
      const data = await res.json();
      const feature = data?.features?.[0];
      const coords = feature?.geometry?.coordinates;
      if (Array.isArray(coords) && Number.isFinite(coords[0]) && Number.isFinite(coords[1])) {
        return { lat: Number(coords[1]), lng: Number(coords[0]) };
      }
    } catch {
      return null;
    }

    return null;
  };

  const loadAreaVehicles = async () => {
    const token = authStore.getToken();
    if (!token) return;
    try {
      const rows = await backendApi.listVehicles(token, pickup);
      setAvailableVehicles(rows);
    } catch { }
  };

  useEffect(() => {
    const checkActiveRides = async () => {
      const token = authStore.getToken();
      if (!token) return;
      try {
        const rides = await backendApi.listRides(token);
        const activeRide = rides.find(
          (r: any) =>
            ["pending", "searching", "assigned", "driver_arrived", "started"].includes(r.status)
        );
        if (activeRide) {
          const payload = {
            rideId: activeRide.id,
            pickup: activeRide.pickup_location,
            destination: activeRide.destination_location,
            vehicleType: activeRide.vehicle_type,
            offerPrice: activeRide.agreed_fare || activeRide.suggested_fare || 0,
          };
          if (activeRide.status === "pending" || activeRide.status === "searching") {
            localStorage.setItem(ACTIVE_BOOKING_STORAGE_KEY, JSON.stringify(payload));
            sessionStorage.setItem(ACTIVE_BOOKING_STORAGE_KEY, JSON.stringify(payload));
            localStorage.setItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY, token);
            sessionStorage.setItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY, token);
            navigate("/app/searching", { state: payload, replace: true });
          } else {
            localStorage.setItem(ACTIVE_BOOKING_STORAGE_KEY, JSON.stringify(payload));
            sessionStorage.setItem(ACTIVE_BOOKING_STORAGE_KEY, JSON.stringify(payload));
            localStorage.setItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY, token);
            sessionStorage.setItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY, token);
            navigate(`/app/booking-confirmed/${activeRide.booking_display_id || activeRide.id}`, { state: payload, replace: true });
          }
        }
      } catch {}
    };
    checkActiveRides();

    // Only set from URL if parameters are explicitly provided
    if (initialService === "reserve") {
      setServiceMode("reserved");
      setUrgencyType("reserve");
    } else if (initialService === "Instant Ride") {
      setServiceMode("Instant Ride");
      setUrgencyType("ride");
    }

    const urlVehicle = searchParams.get("vehicle");
    if (urlVehicle) {
      setVehicleType(urlVehicle.toUpperCase());
    }

    if (initialModel) {
      setSelectedModel(initialModel);
    }

    const hasVisited = localStorage.getItem("bmg_visited");
    if (!hasVisited) {
      setShowOnboarding(true);
    }
    loadAreaVehicles();
  }, [initialService, initialModel, searchParams]);

  useEffect(() => {
    localStorage.setItem("bmg_pickup", pickup);
    localStorage.setItem("bmg_destination", destination);
    localStorage.setItem("bmg_service_mode", serviceMode);
    localStorage.setItem("bmg_vehicle_type", vehicleType);
    localStorage.setItem("bmg_ac_mode", acMode);
    localStorage.setItem("bmg_seater", String(seater));
    localStorage.setItem("bmg_selected_model", selectedModel);
  }, [pickup, destination, serviceMode, vehicleType, acMode, seater, selectedModel]);

  const formatCoordsLabel = (lat: number, lon: number) => `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  const exactLocationPendingLabel = "Fetching exact location...";

  const saveLastKnownCoords = (lat: number, lon: number) => {
    localStorage.setItem(LAST_KNOWN_COORDS_KEY, JSON.stringify({ lat, lon, ts: Date.now() }));
  };

  const calculateDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const earthRadius = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const looksLikeStreetLevelLabel = (value: string) =>
    /\b(road|rd|street|st|marg|lane|ln|nagar|chowk)\b/i.test(value);

  const mergeStableLocationLabel = (nextLabel: string, movedMeters?: number | null) => {
    const previousLabel = lastResolvedPickupLabelRef.current.trim();
    const incomingLabel = String(nextLabel || "").trim();
    if (!incomingLabel) return previousLabel || incomingLabel;
    if (!previousLabel) return incomingLabel;
    if (previousLabel.toLowerCase() === incomingLabel.toLowerCase()) return previousLabel;

    const sameAreaMove = movedMeters == null || movedMeters < 120;
    if (sameAreaMove) {
      const previousLooksBetter = !looksLikeStreetLevelLabel(previousLabel) && looksLikeStreetLevelLabel(incomingLabel);
      if (previousLooksBetter) return previousLabel;

      const prevParts = previousLabel.split(",").map((part) => part.trim().toLowerCase()).filter(Boolean);
      const nextParts = incomingLabel.split(",").map((part) => part.trim().toLowerCase()).filter(Boolean);
      const overlaps = prevParts.some((part) => nextParts.includes(part));
      if (overlaps && previousLabel.length >= incomingLabel.length) {
        return previousLabel;
      }
    }

    return incomingLabel;
  };

  const getLastKnownCoords = () => {
    const raw = localStorage.getItem(LAST_KNOWN_COORDS_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { lat: number; lon: number; ts: number };
      if (!parsed?.lat || !parsed?.lon) return null;
      return parsed;
    } catch {
      return null;
    }
  };

  const resolveLocationName = async (lat: number, lon: number) => {
    const googleLabel = await reverseGeocodeWithGoogle(lat, lon);
    if (googleLabel) return googleLabel;

    const endpoints = [
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&lat=${lat}&lon=${lon}&accept-language=en`,
      `https://geocode.maps.co/reverse?lat=${lat}&lon=${lon}`,
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json();
        
        // Standard OS/BigDataCloud parsing
        const label = formatPreciseReverseAddress(data, lat, lon);
        if (label) return label;
      } catch {
        // Try next provider.
      }
    }

    return formatCoordsLabel(lat, lon);
  };

  const resolveApproxLocationName = async () => {
    const endpoints = [
      "https://ipapi.co/json/",
      "https://ipwho.is/",
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json();

        const city = data?.city;
        const region = data?.region || data?.region_name || data?.state;
        const country = data?.country_name || data?.country;
        const label = [city, region, country].filter(Boolean).join(", ");
        if (label) return label;
      } catch {
        // Try next provider.
      }
    }

    return "";
  };

  const applyBestEffortLocationFallback = async (silent: boolean) => {
    const lastKnown = getLastKnownCoords();
    if (lastKnown) {
      setPickupCoords({ lat: lastKnown.lat, lng: lastKnown.lon });
      setPickup(exactLocationPendingLabel);
      const label = await resolveLocationName(lastKnown.lat, lastKnown.lon);
      setPickup(label);
      return;
    }

    const approx = await resolveApproxLocationName();
    if (approx) {
      setPickup(approx);
      return;
    }

    const lastKnownLabel = localStorage.getItem("bmg_pickup") || "";
    if (lastKnownLabel && !lastKnownLabel.includes("Fetching") && !lastKnownLabel.includes("Location unavailable")) {
      setPickup(lastKnownLabel);
      return;
    }

    setPickup("Approx Area");
  };

  const getNativeLocationAgeMs = () => {
    try {
      const bridge = (window as any).AndroidInterface;
      if (!bridge || typeof bridge.getNativeLocationAgeMs !== "function") return null;
      const raw = bridge.getNativeLocationAgeMs();
      if (raw == null || raw === "null" || raw === "") return null;
      const value = Number(raw);
      return Number.isFinite(value) ? value : null;
    } catch {
      return null;
    }
  };

  const requestFreshNativeLocation = () => {
    try {
      const bridge = (window as any).AndroidInterface;
      if (bridge && typeof bridge.requestFreshLocation === "function") {
        bridge.requestFreshLocation();
      }
    } catch {
      // Ignore bridge refresh failures.
    }
  };

  const readNativeLocation = () => {
    try {
      const bridge = (window as any).AndroidInterface;
      if (!bridge || typeof bridge.getNativeLocation !== "function") return null;
      const raw = bridge.getNativeLocation();
      if (!raw || raw === "null") return null;
      const parsed = JSON.parse(raw);
      const lat = Number(parsed?.lat);
      const lng = Number(parsed?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return { lat, lng };
    } catch {
      return null;
    }
  };

  const applyResolvedPickupLocation = async (lat: number, lng: number, accuracyMeters?: number | null) => {
    if (accuracyMeters != null && Number.isFinite(accuracyMeters) && accuracyMeters > 80) {
      return;
    }

    const previousCoords = lastResolvedCoordsRef.current;
    const movedMeters = previousCoords
      ? calculateDistanceMeters(previousCoords.lat, previousCoords.lng, lat, lng)
      : null;
    if (
      previousCoords &&
      movedMeters != null &&
      movedMeters < 35 &&
      lastResolvedPickupLabelRef.current &&
      !isRefreshingPickupLocation
    ) {
      setPickupCoords({ lat, lng });
      saveLastKnownCoords(lat, lng);
      lastResolvedCoordsRef.current = { lat, lng };
      return;
    }

    setPickupCoords({ lat, lng });
    saveLastKnownCoords(lat, lng);
    lastResolvedCoordsRef.current = { lat, lng };
    setPickup(exactLocationPendingLabel);
    const resolveId = Date.now();
    activePickupResolveIdRef.current = resolveId;
    const label = await resolveLocationName(lat, lng);
    if (activePickupResolveIdRef.current !== resolveId) return;
    const stableLabel = mergeStableLocationLabel(label, movedMeters);
    lastResolvedPickupLabelRef.current = stableLabel;
    setPickup(stableLabel);
  };

  const detectLiveLocation = async (silent = false, nativeRetryCount = 0) => {
    // Forcefully show user that location is being fetched automatically
    if (nativeRetryCount === 0) {
      setIsRefreshingPickupLocation(true);
      setPickup("Fetching Live Location...");
    }

    // 1. Prioritize Android Native Location Bridge if available
    // Bypass strict webview geo constraints by pulling natively from the wrapper!
    if ((window as any).AndroidInterface && typeof (window as any).AndroidInterface.getNativeLocation === 'function') {
      try {
        if (nativeRetryCount === 0) {
          requestFreshNativeLocation();
        }

        const nativeLocation = readNativeLocation();
        const nativeAgeMs = getNativeLocationAgeMs();
        const hasFreshNativeFix =
          !!nativeLocation &&
          (silent
            ? nativeAgeMs == null || nativeAgeMs <= 300000
            : nativeAgeMs == null || nativeAgeMs <= 15000);

        if (hasFreshNativeFix && nativeLocation) {
          await applyResolvedPickupLocation(nativeLocation.lat, nativeLocation.lng);
          setIsRefreshingPickupLocation(false);
          return;
        } else if (nativeRetryCount < 6) {
          // Sensor lock not yet ready, retry up to 3 seconds Native specifically.
          setTimeout(() => detectLiveLocation(silent, nativeRetryCount + 1).catch(() => {}), 500);
          return;
        }
      } catch (err) {
        console.error("Native Android location fetch failed", err);
      }
    }

    if (silent) {
      applyBestEffortLocationFallback(true).catch(() => undefined);
      setIsRefreshingPickupLocation(false);
      return;
    }

    if (!navigator.geolocation) {
      setMessage("Geolocation not available");
      applyBestEffortLocationFallback(false).catch(() => undefined);
      setIsRefreshingPickupLocation(false);
      return;
    }
    
    // 2. HTML5 Wrapper fallback
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        await applyResolvedPickupLocation(lat, lon, pos.coords.accuracy);
        locationRetryRef.current = 0;
        setIsRefreshingPickupLocation(false);
      },
      (error) => {
        if (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE) {
          if (locationRetryRef.current < 2) {
            const delay = 1500 + locationRetryRef.current * 1500;
            locationRetryRef.current += 1;
            window.setTimeout(() => detectLiveLocation(true).catch(() => undefined), delay);
          }
          // Retry without high accuracy
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              const lat = pos.coords.latitude;
              const lon = pos.coords.longitude;
              await applyResolvedPickupLocation(lat, lon, pos.coords.accuracy);
              locationRetryRef.current = 0;
              setIsRefreshingPickupLocation(false);
            },
            (fallbackError) => {
              // Only show hard warning when permission is actually denied.
              if (!silent && fallbackError.code === fallbackError.PERMISSION_DENIED) {
                setMessage("Location permission denied. Please allow location access.");
                setTimeout(() => setMessage(''), 3000);
              }
              applyBestEffortLocationFallback(silent).catch(() => undefined);
              setIsRefreshingPickupLocation(false);
            },
            { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
          );
          return;
        }

        if (error.code === error.PERMISSION_DENIED) {
          // Some Android WebView builds can return false-denied even when OS permission is allowed.
          if (navigator.permissions?.query) {
            navigator.permissions
              .query({ name: "geolocation" as PermissionName })
              .then((status) => {
                if (status.state === "granted" || status.state === "prompt") {
                  navigator.geolocation.getCurrentPosition(
                    async (pos) => {
                      const lat = pos.coords.latitude;
                      const lon = pos.coords.longitude;
                      await applyResolvedPickupLocation(lat, lon, pos.coords.accuracy);
                      locationRetryRef.current = 0;
                      setIsRefreshingPickupLocation(false);
                    },
                    () => {
                      applyBestEffortLocationFallback(silent).catch(() => undefined);
                      setIsRefreshingPickupLocation(false);
                    },
                    { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
                  );
                  return;
                }
                if (!silent) {
                  setMessage("Location access blocked. Please allow it in app settings.");
                  setTimeout(() => setMessage(''), 3000);
                }
                setIsRefreshingPickupLocation(false);
              })
              .catch(() => {
                applyBestEffortLocationFallback(silent).catch(() => undefined);
                setIsRefreshingPickupLocation(false);
              });
          } else if (!silent) {
            setMessage("Location access blocked. Please allow it in app settings.");
            setTimeout(() => setMessage(''), 3000);
            setIsRefreshingPickupLocation(false);
          }
          applyBestEffortLocationFallback(silent).catch(() => undefined);
          return;
        }

        applyBestEffortLocationFallback(silent).catch(() => undefined);
        setIsRefreshingPickupLocation(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 120000 }
    );
  };

  useEffect(() => {
    // Attempt silent recovery from cache/native bridge on mount, but DO NOT trigger browser prompt.
    detectLiveLocation(true).catch(() => undefined);
  }, []);

  useEffect(() => {
    const refreshOnResume = () => {
      if (document.visibilityState === "visible") {
        detectLiveLocation(false).catch(() => undefined);
      }
    };

    const onFocus = () => {
      detectLiveLocation(false).catch(() => undefined);
    };

    document.addEventListener("visibilitychange", refreshOnResume);
    window.addEventListener("focus", onFocus);

    return () => {
      document.removeEventListener("visibilitychange", refreshOnResume);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        if (position.coords.accuracy && position.coords.accuracy > 80) {
          return;
        }
        const prev = lastResolvedCoordsRef.current;
        if (!prev) {
          void applyResolvedPickupLocation(lat, lng, position.coords.accuracy);
          return;
        }

        const movedMeters = calculateDistanceMeters(prev.lat, prev.lng, lat, lng);
        if (movedMeters >= 40) {
          void applyResolvedPickupLocation(lat, lng, position.coords.accuracy);
        }
      },
      () => {
        // Keep manual refresh path as fallback; no noisy error for passive watcher.
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const onShowPrice = () => {
    if (!destination.trim()) {
      setMessage("Enter drop location first");
      setTimeout(() => setMessage(''), 2000);
      return;
    }
    const token = authStore.getToken();
    if (!token) {
      navigate('/login');
      return;
    }

    const isReserveFlow = serviceMode === 'reserved' || urgencyType === 'reserve' || serviceMode !== 'Instant Ride';
    
    setLoading(true);
    const payload: any = { 
      pickup_area: pickup, 
      destination_area: destination, 
      vehicle_type: mappedVehicleType 
    };
    if (pickupCoords) {
      payload.pickup_lat = pickupCoords.lat;
      payload.pickup_lng = pickupCoords.lng;
    }
    if (destinationCoords) {
      payload.destination_lat = destinationCoords.lat;
      payload.destination_lng = destinationCoords.lng;
    }
    
    if (isReserveFlow) {
      Promise.race([
        backendApi.getReserveQuote(
          {
            pickup_area: pickup,
            destination_area: destination,
            duration_hours: 12,
            radius_km: 10,
            pickup_lat: pickupCoords?.lat,
            pickup_lng: pickupCoords?.lng,
            vehicle_type: mappedVehicleType,
          },
          token,
        ),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("reserve_quote_timeout")), 9000)),
      ])
        .then((quote) => {
          setReservePriceSource(quote.source);
          setReserveNearbyDrivers(quote.nearby_driver_count || 0);
          setMinFare(quote.min_price);
          setMaxFare(quote.max_price);
          setOfferPrice(quote.min_price);

          const baseFare = quote.min_price || 2500;
          const updatedVehicles = vehicleList.map((v) => ({
            ...v,
            estimatedPrice: Math.round(baseFare * (v.acMode === "ac" ? 1.2 : 1) * (v.seater >= 7 ? 1.25 : 1)),
          }));
          setVehicleList(updatedVehicles);
          setQuoteDistance(selectedDistance || null);
          setBookingState("reserve_summary");
        })
        .catch(() => {
          // Reserve fallback stays aligned to the fixed 12h base pricing.
          const fallbackBase = 2500;
          const updatedVehicles = vehicleList.map((v) => ({
            ...v,
            estimatedPrice: Math.round(fallbackBase * (v.acMode === "ac" ? 1.2 : 1) * (v.seater >= 7 ? 1.25 : 1)),
          }));
          setVehicleList(updatedVehicles);
          setReservePriceSource("admin_default");
          setReserveNearbyDrivers(0);
          setMinFare(fallbackBase - 200);
          setMaxFare(fallbackBase + 500);
          setOfferPrice(fallbackBase);
          setQuoteDistance(selectedDistance || 6);
          setBookingState("reserve_summary");
        })
        .finally(() => setLoading(false));
      return;
    }

    Promise.race([
      backendApi.getPriceQuote(payload, token),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('quote_timeout')), 8000)),
    ])
      .then((quote) => {
        setMinFare(quote.min_fare); setMaxFare(quote.max_fare);
        setQuoteDistance(quote.estimated_distance_km); setOfferPrice(quote.suggested_fare || quote.min_fare);
        writeNegotiationContext({
          pickup,
          destination,
          pickupCoords,
          destinationCoords,
          minFare: quote.min_fare,
          maxFare: quote.max_fare,
          offerPrice: quote.suggested_fare,
          quoteDistance: quote.estimated_distance_km,
        });
        setBookingState("pricing");
        navigate("/app/price_negotiation", { replace: true });
      })
      .catch(() => {
        // Fallback fares if calculation fails
        setMinFare(150); setMaxFare(350); setOfferPrice(250);
        writeNegotiationContext({
          pickup,
          destination,
          pickupCoords,
          destinationCoords,
          minFare: 150,
          maxFare: 350,
          offerPrice: 250,
          quoteDistance: null,
        });
        setBookingState("pricing");
        navigate("/app/price_negotiation", { replace: true });
      })
      .finally(() => setLoading(false));
  };

  const totalReservePrice = useMemo(() => vehicleList.reduce((s, v) => s + v.estimatedPrice, 0), [vehicleList]);
  const advancePayment = useMemo(() => Math.round(totalReservePrice * 0.3), [totalReservePrice]);

  const addVehicle = () => {
    if (vehicleList.length >= 10) return;
    const newId = Math.max(...vehicleList.map(v => v.id)) + 1;
    setVehicleList([...vehicleList, createVehicleEntry(newId)]);
    setExpandedVehicle(newId);
  };

  const removeVehicle = (id: number) => {
    if (vehicleList.length <= 1) return;
    setVehicleList(vehicleList.filter(v => v.id !== id));
    if (expandedVehicle === id) setExpandedVehicle(vehicleList[0].id);
  };

  const updateVehicle = (id: number, field: keyof VehicleEntry, value: any) => {
    setVehicleList(vehicleList.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  const onBookRide = async () => {
    const token = authStore.getToken();
    if (!token) {
      navigate('/login');
      return;
    }
    setLoading(true);
    setBookingState("searching");
    try {
      const payload: any = {
          pickup_location: pickup, destination, vehicle_type: mappedVehicleType,
          estimated_fare_min: minFare, estimated_fare_max: maxFare, requested_fare: offerPrice,
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
          preference: {
            trip_type: journeyType, pickup_datetime: currentPickupTimeRaw,
            return_datetime: journeyType === "roundtrip" ? returnTime || null : null,
            preferred_color: vehicleColor, vehicle_condition: vehicleCondition,
            ac_required: acMode === "ac", seater_required: seater, 
            vehicle_model: serviceMode === 'reserved' 
               ? `${selectedModel} (${selectedModel === 'Swift' ? packageType : selectedModel === 'Wedding Special' ? eventType : goodsType})` 
               : selectedModel,
            urgency_type: urgencyType, pickup_area: pickup,
            reserve_duration_hours: serviceMode === 'reserved' ? reserveDurationHours : undefined,
            reserve_radius_km: serviceMode === 'reserved' ? 10 : undefined,
            reserve_quote_low: serviceMode === 'reserved' ? minFare : undefined,
            reserve_quote_high: serviceMode === 'reserved' ? maxFare : undefined,
            reserve_price_source: serviceMode === 'reserved' ? reservePriceSource : undefined,
            booking_mode: bookingPriority,
            vehicle_count: vehicleMode === 'multiple' ? vehicleList.length : 1,
            market_rate: Math.round((serviceMode === 'reserved' ? totalReservePrice : offerPrice) * 1.05)
          },
        },
        token,
      );
      setActiveRideId(ride.id);
      const ridePayload = { rideId: ride.id, pickup, destination, vehicleType: mappedVehicleType, offerPrice };
      localStorage.setItem(ACTIVE_BOOKING_STORAGE_KEY, JSON.stringify(ridePayload));
      sessionStorage.setItem(ACTIVE_BOOKING_STORAGE_KEY, JSON.stringify(ridePayload));
      localStorage.setItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY, token);
      sessionStorage.setItem(ACTIVE_BOOKING_TOKEN_STORAGE_KEY, token);
      navigate("/app/searching", { state: ridePayload, replace: true });
    } catch {
      setMessage("Booking failed.");
      const isReserve = serviceMode === "reserved" || urgencyType === 'reserve';
      setBookingState(isReserve ? "reserve_summary" : "pricing");
      if (!isReserve) navigate("/app/price_negotiation", { replace: true });
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const onCancelRide = async () => {
    const token = authStore.getToken();
    if (!token || !activeRideId) return;
    setLoading(true);
    try {
      await backendApi.updateRideStatus(activeRideId, { status: "cancelled" }, token);
      playSound("cancel");
      setActiveRideId(null);
      setBookingState("form");
    } finally {
      setLoading(false);
    }
  };

  const selectedVehicleDetails = useMemo(() => {
    if (serviceMode === 'reserved') {
      if (selectedModel === 'Swift') return { emoji: "🗓️", label: "General Use", type: "CAR", seater: 5 };
      if (selectedModel === 'Wedding Special') return { emoji: "🎉", label: "Occasions", type: "CAR", seater: 5 };
      if (selectedModel === 'Logistics') return { emoji: "🚜", label: "Logistics", type: "BOLERO", seater: 2 };
    }
    return quickVehicleIcons.find(v => v.type === vehicleType) || quickVehicleIcons[0];
  }, [serviceMode, selectedModel, vehicleType]);

  const themeTheme = serviceMode === 'Instant Ride' ? {
    color: 'emerald', text: 'text-emerald-600', textLight: 'text-emerald-500', 
    bgLight: 'bg-emerald-50', bgSolid: 'bg-emerald-500', borderLight: 'border-emerald-100', 
    focusRing: 'focus:ring-emerald-500/20', grad: 'from-emerald-500 to-emerald-600', 
    borderSolid: 'border-emerald-400', shadowFocus: 'focus-within:shadow-[0_8px_32px_rgba(16,185,129,0.1)]',
    shadowBtn: 'shadow-[0_12px_24px_rgba(16,185,129,0.3)]',
    btnActiveText: 'text-emerald-600',
  } : {
    color: 'indigo', text: 'text-indigo-600', textLight: 'text-indigo-500', 
    bgLight: 'bg-indigo-50', bgSolid: 'bg-indigo-500', borderLight: 'border-indigo-100', 
    focusRing: 'focus:ring-indigo-500/20', grad: 'from-indigo-500 to-indigo-600', 
    borderSolid: 'border-indigo-400', shadowFocus: 'focus-within:shadow-[0_8px_32px_rgba(99,102,241,0.1)]',
    shadowBtn: 'shadow-[0_12px_24px_rgba(99,102,241,0.3)]',
    btnActiveText: 'text-indigo-600',
  };

  const isInstantHomeLayout = serviceMode === 'Instant Ride' && vehicleType !== "BOLERO";
  const rectangularCardClass = "rounded-[24px] border border-slate-100 bg-white px-[16px] py-[16px] shadow-[0_10px_24px_rgba(15,23,42,0.045)]";
  const rectangularActionButtonClass = "flex h-[46px] w-[46px] items-center justify-center rounded-[14px] border border-slate-200 bg-white text-slate-700 shadow-[0_3px_10px_rgba(15,23,42,0.065)] transition-transform active:scale-95";
  const pickupAccuracyLabel = isRefreshingPickupLocation || pickup === "Fetching Live Location..."
    ? "Refreshing your live location"
    : "Tap to refresh accurate live location";
  const getReturnHoursLabel = () => {
    try {
      const parts = returnTime.split("::");
      if (parts.length !== 2) throw new Error();
      const [dd, mm, yy] = parts[0].split(":");
      const [time, ampm] = parts[1].split(" ");
      let [h, min] = time.split(":");
      let hours = parseInt(h, 10);
      if (ampm.toUpperCase() === "PM" && hours < 12) hours += 12;
      if (ampm.toUpperCase() === "AM" && hours === 12) hours = 0;
      const target = new Date(parseInt(`20${yy}`, 10), parseInt(mm, 10) - 1, parseInt(dd, 10), hours, parseInt(min, 10));
      const diffMs = target.getTime() - Date.now();
      const diffHours = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));
      return `${diffHours} Hours`;
    } catch {
      return "6 Hours";
    }
  };

  useEffect(() => {
    const token = authStore.getToken();
    if (!token || !pickupCoords || bookingState !== "pricing") {
      setNearbyRiders([]);
      return;
    }

    const loadNearby = async () => {
      try {
        const rows = await backendApi.listNearbyRiders(
          {
            pickup_lat: pickupCoords.lat,
            pickup_lng: pickupCoords.lng,
            radius_km: NEGOTIATION_RADIUS_KM,
            limit: 200,
          },
          token,
        );
        setNearbyRiders(rows);
      } catch {
        setNearbyRiders([]);
      }
    };

    loadNearby().catch(() => undefined);
    const id = window.setInterval(() => loadNearby().catch(() => undefined), 7000);
    return () => window.clearInterval(id);
  }, [bookingState, pickupCoords?.lat, pickupCoords?.lng]);

  const nearbyRiderMarkers = useMemo(() => {
    if (!pickupCoords) return [];

    return nearbyRiders
      .map((row: any) => {
        const lat = typeof row.lat === "number" ? row.lat : Number(row.lat);
        const lng = typeof row.lng === "number" ? row.lng : Number(row.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

        const distanceKm =
          typeof row.distance_km === "number"
            ? row.distance_km
            : calculateDistance(pickupCoords.lat, pickupCoords.lng, lat, lng);
        if (!Number.isFinite(distanceKm) || distanceKm > NEGOTIATION_RADIUS_KM) return null;

        return {
          id: row.id || row.driver_id || String(Math.random()),
          lat,
          lng,
          label: `${row.type || row.driver_name || "Rider"}${distanceKm ? ` • ${distanceKm.toFixed(1)} km` : ""}`,
        };
      })
      .filter((row): row is { id: string; lat: number; lng: number; label: string } => row != null);
  }, [nearbyRiders, pickupCoords]);



  return (
    <div className="relative isolate w-full min-h-screen overflow-x-hidden bg-[#fdfefe] transition-colors duration-700">
      {isInstantHomeLayout && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[170px] bg-[linear-gradient(180deg,rgba(22,163,74,0.07),rgba(255,255,255,0))]" />
          <div className="pointer-events-none absolute left-[-56px] top-[-42px] h-[180px] w-[180px] rounded-full bg-emerald-100/35 blur-3xl" />
          <div className="pointer-events-none absolute right-[-48px] top-[-36px] h-[160px] w-[160px] rounded-full bg-emerald-50/75 blur-3xl" />
        </>
      )}
      <div className={`relative z-10 w-full ${isInstantHomeLayout ? "px-2 pt-3" : "px-3 pt-3"}`}>
      <AnimatePresence mode="wait">
        {message && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`fixed top-8 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 ${serviceMode === 'Instant Ride' ? 'bg-emerald-900' : 'bg-indigo-900'} text-white rounded-full text-sm font-medium shadow-glass-hard whitespace-nowrap`}
          >
            {message}
          </motion.div>
        )}

        {/* ONBOARDING GUIDANCE POPUP */}
        {showOnboarding && (
          <motion.div 
            key="onboarding"
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 "
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[40px] max-w-sm w-full p-8 shadow-2xl relative overflow-hidden"
            >
               <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -mr-10 -mt-10 opacity-60"></div>
               <div className="relative text-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-[28px] flex items-center justify-center mx-auto mb-6 shadow-inner ring-1 ring-slate-100">
                    <MapPin size={40} className="text-emerald-500" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tighter mb-3 leading-tight">Welcome to <br/>BookMyGadi</h2>
                  <p className="text-gray-500 text-sm font-medium leading-relaxed mb-10 px-4">
                    Choose <span className="text-emerald-600 font-black">Instant Ride</span> for daily rides or <span className="text-indigo-600 font-black">Reserved</span> for events, weddings, and long trips.
                  </p>

                  <div className="grid grid-cols-1 gap-4">
                     <button 
                       onClick={() => {
                         setServiceMode('Instant Ride');
                         setUrgencyType('ride');
                         setShowOnboarding(false);
                         localStorage.setItem('bmg_visited', 'true');
                       }}
                       className="w-full h-16 bg-emerald-500 text-white rounded-3xl font-black uppercase tracking-widest text-sm shadow-[0_12px_24px_rgba(16,185,129,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                     >
                        Get Instant Ride
                     </button>
                     <button 
                       onClick={() => {
                         setServiceMode('reserved');
                         setUrgencyType('reserve');
                         setJourneyType('roundtrip');
                         setShowOnboarding(false);
                         localStorage.setItem('bmg_visited', 'true');
                       }}
                       className="w-full h-14 bg-indigo-50 text-indigo-600 rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-indigo-100/50 transition-all"
                     >
                        Reserve for Event
                     </button>
                  </div>
                  
                  <button 
                    onClick={() => {
                      setShowOnboarding(false);
                      localStorage.setItem('bmg_visited', 'true');
                    }}
                    className="mt-6 text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-400 transition-colors"
                  >
                    I'll explore first
                  </button>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP BAR: Profile (Left) - Location (Center) - Vehicle (Right) */}
      {bookingState !== "pricing" && bookingState !== "searching" && (
        <div className={`mb-5 flex items-center justify-between ${isInstantHomeLayout ? "gap-3.5 px-0.5 py-2" : "py-1"}`}>
          <motion.div 
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate("/app/profile")} 
            className={`${isInstantHomeLayout ? "h-[58px] w-[58px] ring-[3px] ring-emerald-50" : "w-12 h-12"} rounded-full shadow-soft flex items-center justify-center border border-gray-100 cursor-pointer transition-transform shrink-0 relative overflow-hidden bg-gradient-to-br from-emerald-400 to-primary-accent`}
          >
             {userProfileData.avatar ? (
                <img 
                  src={userProfileData.avatar} 
                  alt="profile" 
                  className="absolute w-full h-full object-cover" 
                  style={{ transform: `translate(calc(-50% + ${userProfileData.x}px), calc(-50% + ${userProfileData.y}px)) scale(${userProfileData.scale})`, left: '50%', top: '50%' }} 
                />
             ) : (
                <span className={`${isInstantHomeLayout ? "text-[28px]" : "text-xl"} font-black text-white object-cover relative`}>
                  {(userProfileData.name !== "User" ? userProfileData.name : "U").trim().charAt(0).toUpperCase()}
                </span>
             )}
          </motion.div>
          
          <motion.div 
            whileTap={{ scale: 0.95 }}
            className={`flex-1 flex flex-col items-center justify-center cursor-pointer active:opacity-70 group ${isInstantHomeLayout ? "px-1 text-center" : "px-2"}`} 
            onClick={() => detectLiveLocation(false)}
          >
             <p className={`font-bold uppercase tracking-[0.18em] text-emerald-500 flex items-center gap-1 group-hover:scale-105 transition-transform ${isInstantHomeLayout ? "mb-1 text-[10px]" : "mb-0.5 text-[10px]"}`}><MapPin size={isInstantHomeLayout ? 13 : 12} className="fill-emerald-500/20"/> My Location</p>
             <h2 className={`${isInstantHomeLayout ? "max-w-[255px] text-[15px] leading-[1.16]" : "max-w-[220px] text-sm"} whitespace-nowrap font-extrabold text-gray-900 truncate text-center ${isRefreshingPickupLocation || pickup === 'Fetching Live Location...' ? 'animate-pulse' : ''}`}>{pickup}</h2>
             {isInstantHomeLayout && (
               <p className="mt-1 text-center text-[11px] font-medium text-slate-500">{pickupAccuracyLabel}</p>
             )}
          </motion.div>
  
          <motion.div
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowVehiclePicker(true)} 
            className={`${isInstantHomeLayout ? "h-[58px] w-[58px] rounded-[20px]" : "w-12 h-12 rounded-full"} ${themeTheme.bgLight} border ${themeTheme.borderLight} shadow-soft flex items-center justify-center cursor-pointer transition-transform shrink-0 relative`}
          >
             <span className={`${isInstantHomeLayout ? "text-[28px]" : "text-xl"}`}>{selectedVehicleDetails.emoji}</span>
             <div className={`absolute ${isInstantHomeLayout ? "bottom-0.5 right-0.5 h-6 w-6" : "-bottom-1 -right-1 w-5 h-5"} ${themeTheme.bgSolid} rounded-full flex items-center justify-center border-2 border-white shadow-sm`}>
               <ChevronRight size={isInstantHomeLayout ? 12 : 12} className="text-white" />
             </div>
          </motion.div>
        </div>
      )}



      <AnimatePresence mode="wait">
        {bookingState === "form" && (
          <motion.div key="form" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="space-y-3 pb-24">
            
            {/* RIDE TYPE OR PICKUP TYPE BUTTONS */}
            {vehicleType === "BOLERO" && serviceMode === "Instant Ride" ? (
               <div className="bg-white/60  p-1.5 rounded-[20px] shadow-[0_8px_32px_rgba(0,0,0,0.05)] border border-white/80 grid grid-cols-3 gap-1.5">
                 {['Mini Pickup', 'Bolero Pickup', 'Large Truck'].map(cat => (
                   <motion.button 
                     key={cat}
                     whileTap={{ scale: 0.96 }}
                     onClick={() => setPickupCategory(cat)}
                     className={`py-3 px-1 rounded-2xl text-[10px] uppercase tracking-wide font-black transition-all flex items-center justify-center text-center leading-[1.1] ${pickupCategory === cat ? `bg-white shadow-[0_4px_12px_rgba(0,0,0,0.06)] ${themeTheme.btnActiveText}` : 'text-gray-500 hover:text-gray-700'}`}
                   >
                     {cat}
                   </motion.button>
                 ))}
               </div>
            ) : (
               <div className={`${isInstantHomeLayout ? "min-h-[84px] rounded-[24px] border border-slate-100 bg-white p-1.5 shadow-[0_10px_24px_rgba(15,23,42,0.045)]" : "bg-white/60 p-1.5 rounded-[20px] shadow-[0_8px_32px_rgba(0,0,0,0.05)] border border-white/80"} flex items-center gap-1.5`}>
                  <motion.button 
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setJourneyType('oneway')}
                    className={`flex-1 transition-all flex items-center ${isInstantHomeLayout ? "min-h-[68px] rounded-[20px] px-3.5 py-2.5 justify-start text-left" : "justify-center gap-2 py-3.5 px-2 rounded-2xl text-xs"} font-bold ${journeyType === 'oneway' ? `${isInstantHomeLayout ? "border border-emerald-300 bg-emerald-50/60 shadow-[0_5px_12px_rgba(16,185,129,0.075)]" : "bg-white shadow-[0_4px_12px_rgba(0,0,0,0.06)]"} ${themeTheme.btnActiveText}` : `${isInstantHomeLayout ? "border border-transparent text-slate-700" : "text-gray-500 hover:text-gray-700"}`}`}
                  >
                    {isInstantHomeLayout ? (
                      <>
                        <div className="mr-3 flex h-9 w-9 items-center justify-center rounded-[14px] bg-white text-emerald-500 shadow-[0_3px_10px_rgba(15,23,42,0.06)]">
                          <Navigation size={17} strokeWidth={2.5} className={journeyType === 'oneway' ? themeTheme.textLight : ''}/>
                        </div>
                        <div className="flex flex-col">
                          <span className="whitespace-nowrap text-[12px] font-extrabold text-slate-900">One Way</span>
                          <span className="mt-0.5 whitespace-nowrap text-[10px] font-medium text-slate-500">Drop Only</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <Navigation size={16} strokeWidth={2.5} className={journeyType === 'oneway' ? themeTheme.textLight : ''}/> One Way
                      </>
                    )}
                  </motion.button>
                  <motion.button 
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setJourneyType('roundtrip')}
                    className={`flex-1 transition-all flex items-center ${isInstantHomeLayout ? "min-h-[68px] rounded-[20px] px-3.5 py-2.5 justify-start text-left" : "justify-center gap-2 py-3.5 px-2 rounded-2xl text-xs"} font-bold ${journeyType === 'roundtrip' ? `${isInstantHomeLayout ? "border border-emerald-300 bg-emerald-50/60 shadow-[0_5px_12px_rgba(16,185,129,0.075)]" : "bg-white shadow-[0_4px_12px_rgba(0,0,0,0.06)]"} ${themeTheme.btnActiveText}` : `${isInstantHomeLayout ? "border border-transparent text-slate-700" : "text-gray-500 hover:text-gray-700"}`}`}
                  >
                    {isInstantHomeLayout ? (
                      <>
                        <div className="mr-3 flex h-9 w-9 items-center justify-center rounded-[14px] bg-white text-slate-700 shadow-[0_3px_10px_rgba(15,23,42,0.06)]">
                          <CalendarDays size={17} strokeWidth={2.4} className={journeyType === 'roundtrip' ? themeTheme.textLight : ''}/>
                        </div>
                        <div className="flex flex-col">
                          <span className="whitespace-nowrap text-[12px] font-extrabold text-slate-900">Round Trip</span>
                          <span className="mt-0.5 whitespace-nowrap text-[10px] font-medium text-slate-500">Return</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <CalendarDays size={16} strokeWidth={2.5} className={journeyType === 'roundtrip' ? themeTheme.textLight : ''}/> Round Trip
                      </>
                    )}
                  </motion.button>
               </div>
            )}

            {/* LOCATION BOX: Glassmorphism */}
            <div className={`${isInstantHomeLayout ? `${rectangularCardClass} min-h-[220px]` : `bg-white/60 rounded-[28px] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.04)] border border-white ${themeTheme.shadowFocus}`} transition-all duration-300 relative`}>
               {vehicleType === "BOLERO" && serviceMode === "Instant Ride" ? (
                 <div className="flex flex-col gap-5 relative">
                   <div className={`absolute left-[16px] top-[24px] bottom-[32px] w-[2px] bg-gradient-to-b ${serviceMode === 'Instant Ride' ? 'from-emerald-200' : 'from-indigo-200'} to-gray-200 z-0`}></div>
                   
                   {selectedDistance !== null && destination && (
                     <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 z-20 shadow-sm flex items-center gap-1">
                       <span className="text-xs font-black text-emerald-700">{selectedDistance} km</span>
                     </div>
                   )}

                   {/* Vehicle Arrival (Vehicle Location) */}
                   <div className="flex items-center gap-4 relative z-10 w-full">
                     <div className={`w-8 h-8 rounded-full ${serviceMode === 'Instant Ride' ? 'bg-emerald-100/50' : 'bg-indigo-100/50'} flex flex-shrink-0 items-center justify-center shadow-inner`}>
                       <div className={`w-2 h-2 rounded-full ${themeTheme.bgSolid} shadow-sm`}></div>
                     </div>
                     <div className="flex-1 w-full min-w-0">
                       <p className={`text-[9px] uppercase font-bold ${themeTheme.text} tracking-widest mb-0.5 ml-1`}>Vehicle Arrival Location</p>
                       <input value={pickup} onChange={(e) => setPickup(e.target.value)}
                         className={`w-full text-[15px] font-black text-gray-900 placeholder:text-gray-400 bg-white/50 px-3 py-2 rounded-xl outline-none focus:ring-2 ${themeTheme.focusRing} transition-all border border-transparent focus:bg-white`}
                         placeholder="Where should vehicle arrive?" />
                     </div>
                   </div>

                   {/* Goods Pickup */}
                   <div className="flex items-center gap-4 relative z-10 w-full">
                     <div className="w-8 h-8 rounded-full bg-gray-100 flex flex-shrink-0 items-center justify-center shadow-inner">
                        <div className="w-2 h-2 rounded-full bg-amber-500 shadow-sm border border-white"></div>
                     </div>
                     <div className="flex-1 w-full min-w-0">
                       <p className="text-[9px] uppercase font-bold text-gray-500 tracking-widest mb-0.5 ml-1">Goods Pickup Point</p>
                       <input value={goodsPickupLocation} onChange={(e) => setGoodsPickupLocation(e.target.value)}
                         className={`w-full text-[15px] font-black text-gray-900 placeholder:text-gray-400 bg-white/50 px-3 py-2 rounded-xl outline-none focus:ring-2 ${themeTheme.focusRing} transition-all border border-transparent focus:bg-white`}
                         placeholder="Where to load items?" />
                     </div>
                   </div>

                     {/* Goods Drop */}
                   <div className="flex items-center gap-4 relative z-10 w-full">
                     <div className="w-8 h-8 rounded-full bg-gray-100 flex flex-shrink-0 items-center justify-center shadow-inner cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => setIsDestinationMapOpen(true)}>
                        <MapPin size={16} className="text-gray-700" />
                     </div>
                     <div className="flex-1 w-full min-w-0 relative">
                       <p className="text-[9px] uppercase font-bold text-gray-500 tracking-widest mb-0.5 ml-1">Goods Drop Destination</p>
                       <input value={destination} onChange={(e) => handleDestinationSearch(e.target.value)}
                         className={`w-full text-[15px] font-black text-gray-900 placeholder:text-gray-400 bg-white/50 px-3 py-2 rounded-xl outline-none focus:ring-2 ${themeTheme.focusRing} transition-all border border-transparent focus:bg-white`}
                         placeholder="Where to deliver items?" />
                       {destinationSuggestions.length > 0 && destination && (
                        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-[0_-8px_32px_rgba(0,0,0,0.1)] z-[100] border border-gray-100 max-h-60 overflow-y-auto">
                          {destinationSuggestions.map((item: any, i) => (
                            <div 
                              key={i}
                              className="px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer flex items-center justify-between gap-3 transition-colors"
                              onClick={() => {
                                setDestination(item.primary_name);
                                setSelectedDistance(item.distance);
                                setDestinationCoords({ lat: item.lat, lng: item.lon });
                                setDestinationSuggestions([]);
                              }}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                                  <MapPin size={14} className="text-emerald-600" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <p className="text-[15px] font-bold text-gray-900 line-clamp-1 mb-0.5">{item.primary_name}</p>
                                  <p className="text-[11px] font-medium text-gray-500 line-clamp-1 truncate">{item.secondary_name}</p>
                                </div>
                              </div>
                              {item.distance !== null && (
                                <div className="shrink-0 flex flex-col items-end pl-2 border-l border-gray-100">
                                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-0.5">Dist</p>
                                  <p className="text-[11px] font-bold text-gray-700">{item.distance} km</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                       )}
                     </div>
                   </div>
                 </div>
               ) : isInstantHomeLayout ? (
                 <div className="relative">
                   <div className="absolute left-5 top-7 bottom-8 w-px bg-gradient-to-b from-emerald-200 via-emerald-100 to-slate-200"></div>

                   <div className="relative z-10 space-y-5">
                     <div className="flex items-start gap-3.5">
                       <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50/90 text-emerald-600 shadow-inner">
                         <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(22,163,74,0.12)]"></div>
                       </div>
                       <div className="min-w-0 flex-1">
                         <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-emerald-600">Pickup Point</p>
                         <input
                           value={pickup}
                           onChange={(e) => setPickup(e.target.value)}
                           className={`w-full truncate whitespace-nowrap bg-transparent text-[15px] font-extrabold leading-[1.18] text-slate-900 outline-none placeholder:text-slate-400 ${themeTheme.focusRing}`}
                           placeholder="Fetching Live Location..."
                         />
                         <p className="mt-1.5 text-[11px] font-medium text-slate-500">{pickupAccuracyLabel}</p>
                       </div>
                       <button
                         type="button"
                         onClick={() => detectLiveLocation(false)}
                         className={`${rectangularActionButtonClass} h-[42px] w-[42px] self-center`}
                       >
                         <Crosshair size={18} className="text-emerald-600" />
                       </button>
                     </div>

                     <div className="ml-12 border-t border-slate-100"></div>

                     <div className="flex items-start gap-3.5">
                       <div
                         className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 shadow-inner cursor-pointer"
                         onClick={() => setIsDestinationMapOpen(true)}
                       >
                         <MapPin size={16} />
                       </div>
                       <div className="relative min-w-0 flex-1">
                         <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-emerald-600">Destination</p>
                         <input
                           value={destination}
                           onChange={(e) => handleDestinationSearch(e.target.value)}
                           className={`w-full truncate whitespace-nowrap bg-transparent text-[16px] font-extrabold leading-[1.18] text-slate-900 outline-none placeholder:text-slate-400 ${themeTheme.focusRing}`}
                           placeholder="Where to?"
                         />
                         <p className="mt-1.5 text-[11px] font-medium text-slate-500">
                           {destinationSuggestions.length > 0 ? "Choose from search suggestions" : "Enter your destination"}
                         </p>
                         {destinationSuggestions.length > 0 && destination && (
                           <div className="absolute bottom-full left-0 right-0 z-[100] mb-2 max-h-60 overflow-y-auto rounded-[22px] border border-slate-100 bg-white shadow-[0_-8px_32px_rgba(15,23,42,0.1)]">
                             {destinationSuggestions.map((item: any, i) => (
                               <div
                                 key={i}
                                 className="flex cursor-pointer items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 transition-colors last:border-0 hover:bg-slate-50"
                                 onClick={() => {
                                   setDestination(item.primary_name);
                                   setSelectedDistance(item.distance);
                                   setDestinationCoords({ lat: item.lat, lng: item.lon });
                                   setDestinationSuggestions([]);
                                 }}
                               >
                                 <div className="flex min-w-0 items-center gap-3">
                                   <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50">
                                     <MapPin size={14} className="text-emerald-600" />
                                   </div>
                                   <div className="flex min-w-0 flex-1 flex-col">
                                     <p className="mb-0.5 line-clamp-1 text-[15px] font-bold text-slate-900">{item.primary_name}</p>
                                     <p className="truncate text-[11px] font-medium text-slate-500">{item.secondary_name}</p>
                                   </div>
                                 </div>
                                 {item.distance !== null && (
                                   <div className="shrink-0 border-l border-slate-100 pl-2 text-right">
                                     <p className="mb-0.5 text-[9px] font-black uppercase tracking-wider text-slate-400">Dist</p>
                                     <p className="text-[11px] font-bold text-slate-700">{item.distance} km</p>
                                   </div>
                                 )}
                               </div>
                             ))}
                           </div>
                         )}
                       </div>
                       <button
                         type="button"
                         onClick={() => setIsDestinationMapOpen(true)}
                         className={`${rectangularActionButtonClass} h-[42px] w-[42px] self-center`}
                       >
                         <ArrowUpDown size={17} className="text-slate-700" />
                       </button>
                     </div>
                   </div>
                 </div>
               ) : (
                 <div className="flex flex-col gap-5 relative">
                   <div className={`absolute left-[16px] top-[24px] bottom-[32px] w-[2px] bg-gradient-to-b ${serviceMode === 'Instant Ride' ? 'from-emerald-200' : 'from-indigo-200'} to-gray-200 z-0`}></div>
                   
                   {selectedDistance !== null && destination && (
                     <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 z-20 shadow-sm flex items-center gap-1">
                       <span className="text-xs font-black text-emerald-700">{selectedDistance} km</span>
                     </div>
                   )}

                   <div className="flex items-center gap-4 relative z-10 w-full">
                     <div className={`w-8 h-8 rounded-full ${serviceMode === 'Instant Ride' ? 'bg-emerald-100/50' : 'bg-indigo-100/50'} flex flex-shrink-0 items-center justify-center shadow-inner`}>
                       <div className={`w-2.5 h-2.5 rounded-full ${themeTheme.bgSolid} shadow-sm`}></div>
                     </div>
                     <div className="flex-1 w-full min-w-0">
                       <p className={`text-[9px] uppercase font-bold ${themeTheme.text} tracking-widest mb-0.5 ml-1`}>Pickup Point</p>
                       <input 
                         value={pickup} onChange={(e) => setPickup(e.target.value)}
                         className={`w-full text-base font-black text-gray-900 placeholder:text-gray-400 bg-white/50 px-3 py-2 rounded-xl outline-none focus:ring-2 ${themeTheme.focusRing} transition-all border border-transparent focus:bg-white`}
                         placeholder="Enter pickup address"
                       />
                     </div>
                   </div>

                   <div className="flex items-center gap-4 relative z-10 w-full">
                     <div className="w-8 h-8 rounded-full bg-gray-100 flex flex-shrink-0 items-center justify-center shadow-inner cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => setIsDestinationMapOpen(true)}>
                        <MapPin size={16} className="text-gray-700" />
                     </div>
                     <div className="flex-1 w-full min-w-0 relative">
                       <p className="text-[9px] uppercase font-bold text-gray-500 tracking-widest mb-0.5 ml-1">Destination</p>
                       <input 
                         value={destination} onChange={(e) => handleDestinationSearch(e.target.value)}
                         className={`w-full text-lg font-black text-gray-900 placeholder:text-gray-400 bg-white/50 px-3 py-2 rounded-xl outline-none focus:ring-2 ${themeTheme.focusRing} transition-all border border-transparent focus:bg-white`}
                         placeholder="Where to?"
                       />
                       {destinationSuggestions.length > 0 && destination && (
                        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-[0_-8px_32px_rgba(0,0,0,0.1)] z-[100] border border-gray-100 max-h-60 overflow-y-auto">
                          {destinationSuggestions.map((item: any, i) => (
                            <div 
                              key={i}
                              className="px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer flex items-center justify-between gap-3 transition-colors"
                              onClick={() => {
                                setDestination(item.primary_name);
                                setSelectedDistance(item.distance);
                                setDestinationCoords({ lat: item.lat, lng: item.lon });
                                setDestinationSuggestions([]);
                              }}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                                  <MapPin size={14} className="text-emerald-600" />
                                </div>
                                <div className="flex flex-col min-w-0 flex-1">
                                  <p className="text-[15px] font-bold text-gray-900 line-clamp-1 mb-0.5">{item.primary_name}</p>
                                  <p className="text-[11px] font-medium text-gray-500 line-clamp-1 truncate">{item.secondary_name}</p>
                                </div>
                              </div>
                              {item.distance !== null && (
                                <div className="shrink-0 flex flex-col items-end pl-2 border-l border-gray-100">
                                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-0.5">Dist</p>
                                  <p className="text-[11px] font-bold text-gray-700">{item.distance} km</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                       )}
                     </div>
                   </div>
                 </div>
               )}
            </div>

            {/* AUTO SUBTYPES SELECTION (Only for Instant Ride & AUTO) */}
            {vehicleType === "AUTO" && serviceMode === "Instant Ride" && (
               <motion.div 
                 initial={{ opacity: 0, y: -10 }} 
                 animate={{ opacity: 1, y: 0 }}
                 className="bg-white/80  rounded-[24px] p-4 shadow-[0_8px_32px_rgba(0,0,0,0.04)] border border-white/60 relative overflow-hidden"
               >
                 <div className="flex items-center gap-2 mb-3">
                   <span className="text-xl">🛺</span>
                   <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Select Auto Category</p>
                 </div>
                 <div className="grid grid-cols-3 gap-2">
                   {AUTO_SUB_TYPES.map((subType) => {
                     const isSelected = autoSubType === subType.label;
                     return (
                       <motion.button
                         key={subType.id}
                         whileTap={{ scale: 0.98 }}
                         onClick={() => {
                           setAutoSubType(subType.label);
                           setSeater(subType.seater);
                           localStorage.setItem("bmg_auto_subtype", subType.label);
                         }}
                         className={`relative p-3 rounded-xl border-[1.5px] transition-all flex flex-col items-center justify-center cursor-pointer text-center ${
                           isSelected
                             ? "border-emerald-500 bg-emerald-50/60 shadow-sm"
                             : "border-gray-200 bg-white hover:border-gray-300"
                         }`}
                       >
                         <p className={`text-[10px] font-black ${isSelected ? 'text-emerald-600' : 'text-gray-700'} uppercase leading-[1.3]`}>
                           {subType.label.replace(' 5 Seater', '').replace(' 9 Seater', '')}
                         </p>
                         <p className={`text-[9px] font-bold mt-1 tracking-wider ${isSelected ? 'text-emerald-500' : 'text-gray-400'}`}>
                           {subType.seater} SEATS
                         </p>
                       </motion.button>
                     )
                   })}
                 </div>
               </motion.div>
            )}

            {/* TIMING BOXES: Separated Containers */}
            <div className="flex flex-col gap-3">
               <div className={`${isInstantHomeLayout ? `${rectangularCardClass} min-h-[118px]` : `bg-white/60 rounded-2xl p-4 shadow-[0_4px_16px_rgba(0,0,0,0.04)] border border-white ${themeTheme.shadowFocus}`} flex items-center justify-between`}>
                 <div className="flex flex-1 items-center gap-3.5">
                   <div className={`${isInstantHomeLayout ? "h-12 w-12 rounded-full bg-emerald-50" : `w-10 h-10 rounded-full ${serviceMode === 'Instant Ride' ? 'bg-emerald-100/50' : 'bg-indigo-100/50'}`} flex items-center justify-center shadow-inner`}>
                     <Clock size={isInstantHomeLayout ? 21 : 16} className={themeTheme.text} />
                   </div>
                   <div className="flex-1">
                     <p className={`${isInstantHomeLayout ? "mb-1 text-[11px] text-emerald-600 tracking-[0.24em]" : `text-[9px] ${themeTheme.text} tracking-widest mb-0.5 ml-1`} uppercase font-bold`}>Pickup Timing</p>
                     <div onClick={() => setPickupOffset(0)} className={`${isInstantHomeLayout ? "text-[15px]" : "text-sm"} font-extrabold text-gray-900 bg-transparent cursor-pointer select-none truncate max-w-[200px] hover:opacity-80 transition-opacity`} title="Click to Reset Instantly">
                       {serviceMode === 'reserved' ? formatDateTime(new Date(reservedPickupAt)) : getPickupLabel()}
                     </div>
                     {isInstantHomeLayout && <p className="mt-1.5 truncate whitespace-nowrap text-[11px] font-medium text-slate-500">{pickupOffset === 0 ? "Get a ride right away" : "After 30 minutes"}</p>}
                   </div>
                 </div>
                 {serviceMode === 'reserved' ? (
                   <div className="relative">
                     <div className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-md bg-white shadow-sm border border-gray-100 overflow-hidden cursor-pointer active:scale-95 transition-transform">
                       <CalendarDays size={14} className={themeTheme.text} />
                       <input
                         type="datetime-local"
                         value={reservedPickupAt}
                         onChange={(e) => handleReservedPickupChange(e.target.value)}
                         className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                       />
                     </div>
                   </div>
                 ) : isInstantHomeLayout ? (
                   <div className="flex flex-col items-center gap-1.5 pl-3">
                     <div className="flex items-center gap-2.5">
                       <button onClick={handlePickupOffsetDecrease} className={rectangularActionButtonClass}>
                         <Minus size={18} strokeWidth={2.6} />
                       </button>
                       <div className="min-w-[66px] text-center text-[14px] font-extrabold text-slate-900">30 Min</div>
                       <button onClick={handlePickupOffsetIncrease} className={rectangularActionButtonClass}>
                         <Plus size={18} strokeWidth={2.6} className="text-emerald-600" />
                       </button>
                     </div>
                     <p className="text-[11px] font-medium text-emerald-600">After 30 minutes</p>
                   </div>
                 ) : (
                   <button onClick={handlePickupOffsetIncrease} className={`text-[10px] font-black ${themeTheme.text} px-3 py-1.5 rounded-lg ${themeTheme.bgLight} border ${themeTheme.borderLight} transition-all active:scale-90 shadow-sm whitespace-nowrap flex items-center gap-1`}>
                     <Plus size={12} strokeWidth={3} /> 30 Min
                   </button>
                 )}
               </div>

               {journeyType === "roundtrip" && vehicleType !== "BOLERO" && (
                 <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className={`${isInstantHomeLayout ? `${rectangularCardClass} min-h-[150px]` : `bg-white/60 rounded-2xl p-4 shadow-[0_4px_16px_rgba(0,0,0,0.04)] border border-white ${themeTheme.shadowFocus}`} flex items-start gap-3.5`}>
                   <div className={`${isInstantHomeLayout ? "h-12 w-12" : "w-10 h-10"} rounded-full bg-slate-100 flex items-center justify-center shadow-inner shrink-0`}>
                      <CalendarDays size={isInstantHomeLayout ? 21 : 16} className="text-slate-700" />
                   </div>
                   <div className="flex-1 w-full">
                     <div className={`flex ${isInstantHomeLayout ? "items-start" : "items-center"} justify-between ${isInstantHomeLayout ? "mb-4" : "mb-1.5 ml-1"}`}>
                       <div>
                         <p className={`${isInstantHomeLayout ? "text-[11px] tracking-[0.24em] text-emerald-600" : "text-[9px] text-gray-500 tracking-widest"} uppercase font-bold`}>Returning Time</p>
                         <p className={`${isInstantHomeLayout ? "mt-1.5 truncate whitespace-nowrap text-[11px]" : "hidden"} font-medium text-slate-500`}>After reaching destination</p>
                       </div>
                     </div>
                     {isInstantHomeLayout ? (
                       <div className="space-y-2.5">
                         <div className="flex items-center justify-center gap-5">
                           <button onClick={() => shiftReturnTimeByHours(-3)} className={rectangularActionButtonClass}>
                             <Minus size={18} strokeWidth={2.6} />
                           </button>
                           <div className="min-w-[92px] text-center text-[15px] font-extrabold text-slate-900">{getReturnHoursLabel()}</div>
                           <button onClick={() => shiftReturnTimeByHours(3)} className={rectangularActionButtonClass}>
                             <Plus size={18} strokeWidth={2.6} />
                           </button>
                         </div>
                         <p className="text-center text-[11px] font-medium text-emerald-600">Return after {getReturnHoursLabel().toLowerCase()}</p>
                         <div className="relative mx-auto h-0 w-0">
                           <input
                             type="datetime-local"
                             onChange={handleNativeDateChange}
                             className="absolute -top-6 left-0 h-12 w-12 cursor-pointer opacity-0"
                           />
                         </div>
                       </div>
                     ) : (
                       <div className="relative">
                         <input 
                           value={returnTime} 
                           onChange={(e) => setReturnTime(e.target.value)}
                           className={`w-full text-sm font-black text-gray-900 bg-white/50 pl-3 pr-[40px] py-3 rounded-xl outline-none focus:ring-2 ${themeTheme.focusRing} transition-all border border-transparent focus:bg-white`}
                           placeholder="DD:MM:YY::h:mm A"
                         />
                         <div className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-md bg-white shadow-sm border border-gray-100 overflow-hidden cursor-pointer active:scale-95 transition-transform">
                           <CalendarDays size={14} className={themeTheme.text} />
                           <input 
                             type="datetime-local" 
                             onChange={handleNativeDateChange}
                             className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                           />
                         </div>
                       </div>
                     )}
                   </div>
                 </motion.div>
               )}

             </div>

            {/* CONDITIONAL RESERVATION DETAILS — Occasion & Logistics only (General has no extra box) */}
            {serviceMode === 'reserved' && selectedModel !== 'Swift' && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`bg-white/40  rounded-[28px] p-4 shadow-[0_8px_32px_rgba(0,0,0,0.03)] border ${themeTheme.borderLight}`}>
                <div className="flex items-center gap-2 mb-3 px-1">
                   <span className="text-lg">{selectedVehicleDetails.emoji}</span>
                   <h4 className={`text-[11px] font-black uppercase tracking-widest ${themeTheme.text}`}>
                      {selectedModel === 'Wedding Special' ? 'Event Details' : 'Cargo Information'}
                   </h4>
                </div>
                <div className="flex flex-col gap-3">
                  {selectedModel === 'Wedding Special' && (
                    <div className="bg-white/70 border border-white/80 p-2.5 rounded-2xl flex flex-col gap-1">
                      <span className="text-[8px] font-bold text-gray-400 uppercase">Occasion Type</span>
                      <select value={eventType} onChange={(e) => setEventType(e.target.value)} className="w-full bg-transparent text-xs font-black text-gray-900 outline-none cursor-pointer">
                        <option value="Wedding (Sadi)">Wedding (Sadi)</option>
                        <option value="Engagement (Cheka)">Engagement (Cheka)</option>
                        <option value="Tilak">Tilak</option>
                        <option value="Reception">Reception</option>
                        <option value="Other Events">Other Events</option>
                      </select>
                    </div>
                  )}
                  {selectedModel === 'Logistics' && (
                    <div className="bg-white/70 border border-white/80 p-2.5 rounded-2xl flex flex-col gap-1">
                      <span className="text-[8px] font-bold text-gray-400 uppercase">Material Type</span>
                      <select value={goodsType} onChange={(e) => setGoodsType(e.target.value)} className="w-full bg-transparent text-xs font-black text-gray-900 outline-none cursor-pointer">
                        <option value="Furniture">Furniture</option>
                        <option value="Farming Material">Farming Material</option>
                        <option value="Construction Goods">Construction Goods</option>
                        <option value="Household Shifting">Household Shifting</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* SINGLE / MULTIPLE VEHICLE TOGGLE — Reserved Only */}
            {serviceMode === 'reserved' && (selectedModel === 'Swift' || selectedModel === 'Wedding Special') && (
              <div className="bg-white/60  p-1.5 rounded-[20px] shadow-[0_8px_32px_rgba(0,0,0,0.05)] border border-white/80 flex items-center gap-2">
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => { setVehicleMode('single'); setVehicleList([createVehicleEntry(1)]); }}
                  className={`flex-1 py-3 px-2 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${vehicleMode === 'single' ? 'bg-white shadow-[0_4px_12px_rgba(0,0,0,0.06)] text-indigo-600' : 'text-gray-500'}`}
                >
                  <Car size={16}/> Single Vehicle
                </motion.button>
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => { setVehicleMode('multiple'); if (vehicleList.length < 2) addVehicle(); }}
                  className={`flex-1 py-3 px-2 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${vehicleMode === 'multiple' ? 'bg-white shadow-[0_4px_12px_rgba(0,0,0,0.06)] text-indigo-600' : 'text-gray-500'}`}
                >
                  <Plus size={16}/> Multiple Vehicles
                </motion.button>
              </div>
            )}

            {/* VEHICLE PREFERENCE CARDS — Reserved Modes */}
            {serviceMode === 'reserved' && (
              <div className="space-y-3">
                {vehicleList.map((v, idx) => (
                  <motion.div key={v.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
                    className={`bg-white/60  rounded-[24px] border ${expandedVehicle === v.id ? 'border-indigo-200 shadow-[0_8px_32px_rgba(99,102,241,0.08)]' : 'border-white/80 shadow-[0_4px_16px_rgba(0,0,0,0.04)]'} overflow-hidden`}
                  >
                    {/* Vehicle Header */}
                    <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpandedVehicle(expandedVehicle === v.id ? 0 : v.id)}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full ${expandedVehicle === v.id ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'} flex items-center justify-center font-black text-sm transition-all`}>
                          {idx + 1}
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900">Vehicle {idx + 1}</p>
                          <p className="text-[10px] font-bold text-gray-400">{v.acMode === 'ac' ? 'AC' : 'Non-AC'} · {v.seater} Seat · {v.condition.split('(')[0].trim()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {vehicleList.length > 1 && (
                          <button onClick={(e) => { e.stopPropagation(); removeVehicle(v.id); }} className="w-8 h-8 rounded-lg bg-rose-50 text-rose-400 flex items-center justify-center">
                            <Trash2 size={14}/>
                          </button>
                        )}
                        {expandedVehicle === v.id ? <ChevronUp size={18} className="text-gray-400"/> : <ChevronDown size={18} className="text-gray-400"/>}
                      </div>
                    </div>

                    {/* Vehicle Preferences (Expanded) */}
                    <AnimatePresence>
                      {expandedVehicle === v.id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="px-4 pb-4 space-y-3">
                            {/* Preference Row */}
                            <div className="flex gap-2">
                              <div className="flex-1 bg-white/70 border border-white/80 p-2 rounded-2xl flex flex-col gap-1">
                                <span className="text-[8px] font-bold text-gray-400 uppercase text-center">AC</span>
                                <select value={v.acMode} onChange={(e) => updateVehicle(v.id, 'acMode', e.target.value)} className="w-full bg-transparent text-[11px] font-black text-gray-900 outline-none text-center cursor-pointer">
                                  <option value="non_ac">No AC</option>
                                  <option value="ac">With AC</option>
                                </select>
                              </div>
                              <div className="flex-1 bg-white/70 border border-white/80 p-2 rounded-2xl flex flex-col gap-1">
                                <span className="text-[8px] font-bold text-gray-400 uppercase text-center">Seats</span>
                                <select value={v.seater} onChange={(e) => updateVehicle(v.id, 'seater', Number(e.target.value))} className="w-full bg-transparent text-[11px] font-black text-gray-900 outline-none text-center cursor-pointer">
                                  <option value={5}>5 Seat</option>
                                  <option value={7}>7 Seat</option>
                                  <option value={9}>9 Seat</option>
                                  <option value={11}>11 Seat</option>
                                </select>
                              </div>
                              <div className="flex-1 bg-white/70 border border-white/80 p-2 rounded-2xl flex flex-col gap-1">
                                <span className="text-[8px] font-bold text-gray-400 uppercase text-center">Quality</span>
                                <select value={v.condition} onChange={(e) => updateVehicle(v.id, 'condition', e.target.value)} className="w-full bg-transparent text-[11px] font-black text-gray-900 outline-none text-center cursor-pointer">
                                  <option value="Better (Up to 5yr)">Better</option>
                                  <option value="New (< 2yr)">New</option>
                                  <option value="Good (< 10yr)">Good</option>
                                  <option value="Avg (> 10yr)">Average</option>
                                </select>
                              </div>
                            </div>

                            {/* Role Assignment — Occasion Only */}
                            {selectedModel === 'Wedding Special' && (
                              <div className="bg-indigo-50/60 border border-indigo-100/60 p-3 rounded-2xl">
                                <p className="text-[8px] font-bold text-indigo-500 uppercase tracking-wider mb-2">🎯 Assign Role for this Vehicle</p>
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                  {ROLE_OPTIONS.map(r => (
                                    <button key={r} onClick={() => { updateVehicle(v.id, 'role', r); if (r !== 'Custom') updateVehicle(v.id, 'customRole', ''); }}
                                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${v.role === r ? 'bg-indigo-500 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-100'}`}
                                    >
                                      {r}
                                    </button>
                                  ))}
                                </div>
                                {v.role === 'Custom' && (
                                  <input value={v.customRole} onChange={(e) => updateVehicle(v.id, 'customRole', e.target.value)}
                                    className="w-full bg-white p-2 rounded-xl text-xs font-bold text-gray-900 outline-none border border-indigo-100 placeholder:text-gray-400"
                                    placeholder="Enter custom role (e.g., Videographer)"
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}

                {/* Add More Vehicle Button */}
                {vehicleMode === 'multiple' && vehicleList.length < 10 && (
                  <motion.button whileTap={{ scale: 0.97 }} onClick={addVehicle}
                    className="w-full py-3.5 rounded-2xl border-2 border-dashed border-indigo-200 text-indigo-500 text-xs font-bold flex items-center justify-center gap-2 bg-indigo-50/30 hover:bg-indigo-50/60 transition-colors"
                  >
                    <Plus size={16}/> Add Vehicle {vehicleList.length + 1}
                  </motion.button>
                )}
              </div>
            )}


            {/* CONDITIONAL CAR PREFERENCE BOX — Only in Instant Ride mode */}
            {mappedVehicleType === "car" && serviceMode === 'Instant Ride' && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} 
                className="bg-white/40  rounded-[28px] p-4 shadow-[0_8px_32px_rgba(0,0,0,0.03)] border border-white/60">
                <div className="flex items-center gap-2 mb-3 px-1">
                   <ShieldCheck size={14} className={themeTheme.text} />
                   <h4 className="text-[11px] font-black uppercase tracking-widest text-gray-700">Car Preferences</h4>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 bg-white/70 border border-white/80 p-2 rounded-2xl flex flex-col gap-1">
                    <span className="text-[8px] font-bold text-gray-400 uppercase text-center">Comfort</span>
                    <select value={acMode} onChange={(e) => setAcMode(e.target.value as any)} className="w-full bg-transparent text-[11px] font-black text-gray-900 outline-none text-center cursor-pointer">
                      <option value="non_ac">No AC</option>
                      <option value="ac">With AC</option>
                    </select>
                  </div>
                  <div className="flex-1 bg-white/70 border border-white/80 p-2 rounded-2xl flex flex-col gap-1">
                    <span className="text-[8px] font-bold text-gray-400 uppercase text-center">Seats</span>
                    <select value={seater} onChange={(e) => setSeater(Number(e.target.value))} className="w-full bg-transparent text-[11px] font-black text-gray-900 outline-none text-center cursor-pointer">
                      <option value={5}>5 Seat</option>
                      <option value={7}>7 Seat</option>
                      <option value={9}>9 Seat</option>
                      <option value={11}>11 Seat</option>
                    </select>
                  </div>
                  <div className="flex-1 bg-white/70 border border-white/80 p-2 rounded-2xl flex flex-col gap-1">
                    <span className="text-[8px] font-bold text-gray-400 uppercase text-center">Condition</span>
                    <select value={vehicleCondition} onChange={(e) => setVehicleCondition(e.target.value)} className="w-full bg-transparent text-[11px] font-black text-gray-900 outline-none text-center cursor-pointer">
                      <option value="Better (Up to 5yr)">Better</option>
                      <option value="New (< 2yr)">New</option>
                      <option value="Good (< 10yr)">Good</option>
                      <option value="Avg (> 10yr)">Average</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            <motion.button 
              whileTap={{ scale: 0.98 }}
              onClick={onShowPrice} 
              disabled={loading}
              className={`w-full ${isInstantHomeLayout ? "min-h-[78px] rounded-[24px] flex-col" : "h-[64px] rounded-[24px]"} bg-gradient-to-r ${themeTheme.grad} text-white font-black text-lg ${themeTheme.shadowBtn} mt-2 flex items-center justify-center gap-1.5 border ${themeTheme.borderSolid} disabled:opacity-50`}
            >
               {loading ? 'Calculating...' : isInstantHomeLayout ? (
                 <>
                   <div className="flex items-center gap-2.5 text-[17px]">
                     <Search size={21} strokeWidth={3} />
                     <span>Search Ride</span>
                   </div>
                   <span className="text-[12px] font-medium text-white/80">Find nearby drivers for you</span>
                 </>
               ) : <><Search size={20} strokeWidth={3} /> {serviceMode === 'Instant Ride' ? 'Search Ride' : `Show Price (${vehicleList.length} Vehicle${vehicleList.length > 1 ? 's' : ''})`}</>}
            </motion.button>
          </motion.div>
        )}

        {/* ===== RESERVE SUMMARY — Itemized pricing + booking guideline + advance payment ===== */}
        {bookingState === "reserve_summary" && (
          <motion.div key="reserve_summary" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pb-24">
            {/* Header / Detailed Booking Info */}
            <div className={`bg-white text-gray-800 rounded-[28px] p-5 relative overflow-hidden shadow-sm border ${themeTheme.borderSolid}`}>
              <div className={`absolute top-0 right-0 w-40 h-40 ${themeTheme.bgLight} rounded-full -mr-16 -mt-16`}></div>
              <div className="relative z-10">
                <h2 className={`text-2xl font-black tracking-tight ${themeTheme.textSolid} mb-2`}>
                  {serviceMode === 'Instant Ride' ? 'Instant Booking' : (selectedModel === 'Wedding Special' ? 'Events Booking' : 'Advance General Booking')}
                </h2>
                
                {/* Journey Type & Timing */}
                <div className="flex gap-2 mb-3">
                   <div className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl p-3 shadow-sm">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Navigation size={12}/> {journeyType === 'roundtrip' ? 'Round Trip' : 'One Way'}</p>
                      <p className="text-xs font-black text-gray-800">
                        {serviceMode === 'Advance' && reservedPickupAt ? new Date(reservedPickupAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Instantly'}
                      </p>
                   </div>
                   {journeyType === 'roundtrip' && returnTime && (
                     <div className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl p-3 shadow-sm">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1"><CalendarDays size={12}/> Return Timing</p>
                        <p className="text-xs font-black text-gray-800">
                           {new Date(returnTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                     </div>
                   )}
                </div>

                {/* Sub-Box: Route & Distance */}
                <div className={`bg-indigo-50/50 rounded-xl p-3 space-y-2 border border-indigo-100 shadow-sm`}>
                  {(selectedModel === 'Wedding Special' || selectedModel === 'Goods Vehicles') && (
                    <div className="flex items-start gap-2 border-b border-indigo-100/50 pb-2">
                      <span className="text-indigo-400 mt-0.5"><Zap size={14}/></span>
                      <p><span className="font-bold text-gray-900">{selectedModel === 'Wedding Special' ? 'Event' : 'Goods'}:</span> {selectedModel === 'Wedding Special' ? eventType : goodsType}</p>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <span className="text-indigo-400 mt-0.5"><MapPin size={14}/></span>
                    <div className="flex-1">
                       <p className="text-xs font-medium text-gray-700"><span className="font-bold text-gray-900">Pickup:</span> {pickup || 'Current Location'}</p>
                       <p className="text-xs font-medium text-gray-700 mt-1"><span className="font-bold text-gray-900">Drop:</span> {destination || 'Not specified'}</p>
                    </div>
                  </div>
                  {selectedDistance && (
                    <div className="flex items-start gap-2 pt-1 border-t border-indigo-100/50 mt-1">
                      <span className="text-indigo-400 mt-0.5"><Map size={14}/></span>
                      <p className="text-xs font-bold text-indigo-700">~{selectedDistance.toFixed(1)} km Total Distance</p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1 border-t border-indigo-100/50 mt-1">
                    <span className="px-2 py-1 rounded-lg bg-white text-[10px] font-black text-gray-700 border border-gray-200">
                      Source: {reservePriceSource.replaceAll("_", " ")}
                    </span>
                    <span className="px-2 py-1 rounded-lg bg-white text-[10px] font-black text-gray-700 border border-gray-200">
                      Drivers: {reserveNearbyDrivers}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Per-Vehicle Pricing */}
            <div className="bg-white rounded-[24px] p-4 shadow-sm border border-gray-100">
              <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Tag size={14} className="text-indigo-500"/> {vehicleList.length === 1 ? 'Single Vehicle With Price' : 'Multiple Vehicles With Price'}
              </h3>
              <div className="space-y-2">
                {vehicleList.map((v, idx) => (
                  <div key={v.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full ${themeTheme.bgLight} ${themeTheme.textSolid} flex items-center justify-center text-xs font-black shadow-sm border border-white/40`}>{idx + 1}</div>
                      <div>
                        <p className="text-xs font-black text-gray-900">Vehicle {idx + 1}
                          <span className={`ml-2 ${themeTheme.textSolid} bg-white shadow-sm border ${themeTheme.borderSolid} px-1.5 py-0.5 rounded-[6px] text-[9px] font-bold`}>
                            {v.role === 'Custom' ? v.customRole || v.type : v.role || v.type}
                          </span>
                        </p>
                        <p className="text-[10px] text-gray-500 font-bold mt-0.5 flex items-center gap-1.5">
                          <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">{v.acMode === 'ac' ? '❄️ AC' : '🪟 Non-AC'}</span>
                          <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">💺 {v.seater} Seat</span>
                          <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">⭐ {v.condition.split('(')[0].trim()}</span>
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-black text-gray-900">{formatMoney(v.estimatedPrice)}</p>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
                <p className="text-xs font-bold text-gray-500">Total ({vehicleList.length} vehicle{vehicleList.length > 1 ? 's' : ''})</p>
                <p className="text-xl font-black text-gray-900">{formatMoney(totalReservePrice)}</p>
              </div>
            </div>

            {/* 30% Advance Payment Box */}
            <div className={`bg-gradient-to-br ${themeTheme.grad} text-white rounded-[24px] p-5 relative overflow-hidden shadow-sm border ${themeTheme.borderSolid}`}>
              <div className="absolute inset-0 bg-white/5 backdrop-blur-md z-0 pointer-events-none"></div>
              <div className="absolute right-0 bottom-0 w-32 h-32 bg-white/20 blur-3xl rounded-full translate-x-10 translate-y-10 z-0"></div>
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <p className="text-[10px] font-bold text-amber-200 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Zap size={10} className="fill-amber-200" /> Pay Now for Booking Confirmation
                    </p>
                    <p className="text-[10px] font-bold text-white/90 uppercase tracking-widest flex items-center gap-1">
                       <CreditCard size={12}/> Advance Payment (30%)
                    </p>
                    <p className="text-3xl font-black mt-1 drop-shadow-md">{formatMoney(advancePayment)}</p>
                  </div>
                  <div className="w-14 h-14 rounded-[18px] bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner border border-white/20">
                    <Wallet size={28} className="text-white drop-shadow-sm" />
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-white font-bold bg-black/20 rounded-xl px-3 py-2 border border-white/10 backdrop-blur-sm">
                  <div className="flex flex-col gap-0.5">
                     <span className="text-white/70 text-[9px] uppercase tracking-wider">Total Amount</span>
                     <span className="text-sm">{formatMoney(totalReservePrice)}</span>
                  </div>
                  <div className="h-6 w-1 bg-white/10 rounded-full"></div>
                  <div className="flex flex-col gap-0.5 text-right">
                     <span className="text-white/70 text-[9px] uppercase tracking-wider">Remaining (Cash)</span>
                     <span className="text-sm text-green-300">{formatMoney(totalReservePrice - advancePayment)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 relative mt-4">
              <button
                onClick={() => {
                  setBookingState("form");
                  navigate("/app/home", { replace: true });
                }}
                className="w-[60px] h-[64px] rounded-[24px] bg-red-50 border border-red-100 flex items-center justify-center text-red-500 shrink-0 shadow-sm"
              >
                <X size={26} strokeWidth={3}/>
              </button>
              
              <div className={`flex-1 relative h-[64px] ${themeTheme.bgSolid} rounded-[24px] p-2 flex items-center shadow-lg group overflow-hidden border border-black/10`}>
                <motion.div 
                  drag="x"
                  dragConstraints={{ left: 0, right: 240 }}
                  dragElastic={0.02}
                  onDragEnd={(_, info) => {
                     if (info.offset.x > 180) {
                        onBookRide();
                     }
                  }}
                  className="w-[48px] h-[48px] bg-white rounded-[18px] flex items-center justify-center cursor-grab active:cursor-grabbing z-20 relative shadow-md hover:scale-105 transition-transform duration-200 border border-gray-100"
                >
                   <ChevronRight size={28} className={themeTheme.textSolid} strokeWidth={4} />
                </motion.div>
                
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none pl-12 pr-4">
                   <p className="text-white/80 text-[11px] font-black uppercase tracking-[0.15em] transition-all group-hover:text-white group-hover:tracking-[0.2em] duration-300 drop-shadow-sm">
                     {loading ? 'Processing...' : 'Swipe to Confirm Book'}
                   </p>
                </div>
                
                <div className="ml-auto pr-3 text-white/50 group-hover:text-white/80 transition-colors duration-300">
                   <ShieldCheck size={20} strokeWidth={2.5} />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {bookingState === "searching" && (
           <div className="flex flex-col items-center justify-center py-10">
             <div className="relative mb-12 mt-12">
                <div className={`w-32 h-32 rounded-full border-4 border-dashed ${serviceMode === 'Instant Ride' ? 'border-emerald-200' : 'border-indigo-200'} flex items-center justify-center animate-[spin_3s_linear_infinite]`}></div>
                <div className="absolute inset-0 flex items-center justify-center">
                   <div className={`w-20 h-20 ${themeTheme.bgSolid} rounded-full shadow-glass-md flex items-center justify-center text-white text-3xl z-10`}>
                     {selectedVehicleDetails.emoji}
                   </div>
                </div>
             </div>
             
             <h2 className="text-3xl font-black text-gray-900 tracking-tight text-center mb-2">{serviceMode === 'Instant Ride' ? 'Connecting...' : 'Processing...'}</h2>
             <p className="text-gray-500 font-medium text-center px-8 mb-12">
               {serviceMode === 'Instant Ride' ? 'Finding nearby drivers' : 'Preparing reservation request'} matching your fare of <strong className="text-gray-900">{formatMoney(offerPrice)}</strong>.
             </p>

             <button onClick={onCancelRide} disabled={loading} className="px-8 py-4 rounded-full bg-white border border-gray-200 text-rose-500 font-bold hover:bg-rose-50 transition-colors mx-auto block shadow-soft">
               Cancel Request
             </button>
           </div>
        )}
      </AnimatePresence>

      {/* Vehicle Selection Bottom Sheet */}
      <AnimatePresence>
        {showVehiclePicker && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowVehiclePicker(false)} className="fixed inset-0 bg-gray-900/50 z-50" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] p-6 pb-12 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
               <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6"></div>
               
               {/* SERVICE MODE TOGGLE INSIDE PICKER */}
               <div className="bg-gray-100/80 p-1 rounded-2xl flex items-center gap-1 mb-6 mx-2">
                  <motion.button 
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setServiceMode('Instant Ride'); setUrgencyType('ride'); }}
                    className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${serviceMode === 'Instant Ride' ? 'bg-white shadow-soft text-gray-900 border border-gray-200' : 'text-gray-500'}`}
                  >
                    <Zap size={14} className={serviceMode === 'Instant Ride' ? 'text-yellow-500' : ''}/> Instant Ride
                  </motion.button>
                  <motion.button 
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setServiceMode('reserved'); setUrgencyType('reserve'); }}
                    className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${serviceMode === 'reserved' ? 'bg-white shadow-soft text-gray-900 border border-gray-200' : 'text-gray-500'}`}
                  >
                    <ShieldCheck size={14} className={serviceMode === 'reserved' ? 'text-indigo-500' : ''}/> Reserved
                  </motion.button>
               </div>

               <h3 className="text-xl font-black text-gray-900 mb-4 px-2">Select {serviceMode === 'Instant Ride' ? 'Vehicle' : 'Service'}</h3>
               
               <div className="grid grid-cols-2 gap-3">
                {serviceMode === 'Instant Ride' ? (
                  quickVehicleIcons.map(item => (
                    <div 
                      key={item.label}
                      onClick={() => {
                        setVehicleType(item.type);
                        if (item.type === "AUTO") {
                          const savedSub = localStorage.getItem("bmg_auto_subtype") || "Normal Auto 5 Seater";
                          setAutoSubType(savedSub);
                          const autoEntry = AUTO_SUB_TYPES.find(a => a.label === savedSub);
                          setSeater(autoEntry ? autoEntry.seater : 5);
                          setSelectedModel("Auto");
                        } else {
                          setSelectedModel(item.model);
                          setSeater(item.seater);
                        }
                        setShowVehiclePicker(false);
                      }}
                      className={`relative p-4 rounded-2xl border-2 transition-all flex items-center gap-3 cursor-pointer ${vehicleType === item.type && selectedModel !== 'Wedding Special' && selectedModel !== 'Logistics' ? `${themeTheme.borderSolid} ${themeTheme.bgLight}` : 'border-gray-100 bg-white hover:border-gray-200'}`}
                    >
                        <span className="text-3xl">{item.emoji}</span>
                        <div>
                          <p className={`font-bold ${vehicleType === item.type ? themeTheme.text : 'text-gray-900'}`}>{item.label}</p>
                          <p className="text-[10px] font-semibold text-gray-500">{item.seater} seats</p>
                        </div>
                        {vehicleType === item.type && <div className={`absolute top-2 right-2 ${themeTheme.textLight}`}><Check size={16} strokeWidth={3}/></div>}
                    </div>
                  ))
                ) : (
                  <>
                    <div 
                      onClick={() => { setVehicleType('CAR'); setSelectedModel('Swift'); setUrgencyType('reserve'); setShowVehiclePicker(false); }}
                      className={`relative p-4 rounded-2xl border-2 transition-all flex items-center gap-4 cursor-pointer ${urgencyType === 'reserve' && selectedModel === 'Swift' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-100 bg-white'}`}
                    >
                        <span className="text-3xl">🗓️</span>
                        <div>
                          <p className="font-bold text-gray-900 leading-tight">General</p>
                          <p className="text-[10px] font-bold text-indigo-500">UP/Bihar (Sata)</p>
                          <p className="text-[9px] font-semibold text-gray-400 leading-tight">Reserve Full Day</p>
                        </div>
                    </div>
                    <div 
                      onClick={() => { setVehicleType('CAR'); setSelectedModel('Wedding Special'); setUrgencyType('reserve'); setShowVehiclePicker(false); }}
                      className={`relative p-4 rounded-2xl border-2 transition-all flex items-center gap-4 cursor-pointer ${selectedModel === 'Wedding Special' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-100 bg-white'}`}
                    >
                        <span className="text-3xl">🎉</span>
                        <div>
                          <p className="font-bold text-gray-900 leading-tight">Occasions</p>
                          <p className="text-[10px] font-bold text-indigo-500">Events / Party</p>
                          <p className="text-[9px] font-semibold text-gray-400 leading-tight">Sadi / Cheka Spec.</p>
                        </div>
                    </div>
                    <div 
                      onClick={() => { setVehicleType('BOLERO'); setSelectedModel('Logistics'); setUrgencyType('reserve'); setShowVehiclePicker(false); }}
                      className={`relative p-5 rounded-2xl border-2 transition-all flex items-center gap-5 cursor-pointer col-span-2 ${selectedModel === 'Logistics' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-100 bg-white'}`}
                    >
                        <span className="text-4xl">🚜</span>
                        <div>
                          <p className="font-bold text-gray-900 text-base">Cargo & Logistics</p>
                          <p className="text-[11px] font-semibold text-gray-500">Pickup / Lorry / Tractor Booking</p>
                        </div>
                        {selectedModel === 'Logistics' && <div className="ml-auto text-indigo-500"><Check size={24} strokeWidth={3}/></div>}
                    </div>
                  </>
                )}
               </div>
               
               <button onClick={() => setShowVehiclePicker(false)} className="w-full h-14 mt-6 bg-gray-100 text-gray-900 rounded-2xl font-bold">
                 Close
               </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Map Location Picker Modal */}
      <MapLocationPickerModal
        isOpen={isDestinationMapOpen}
        onClose={() => setIsDestinationMapOpen(false)}
        onSelect={(location) => {
          setDestination(location.address);
          setDestinationCoords({ lat: location.lat, lng: location.lng });
          setIsDestinationMapOpen(false);
        }}
      />
      </div>
    </div>
  );
};

export default HomePage;

