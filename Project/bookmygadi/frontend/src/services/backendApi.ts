import { resolveApiBaseUrl, toWebSocketUrl } from "./network";

const API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
const API_PREFIX = "/api/v1";
const TOKEN_KEY = "bmg_access_token";

export type UserRole = "customer" | "driver" | "admin";

export interface AuthToken {
  access_token: string;
  token_type: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  city?: string | null;
  bio?: string | null;
  emergency_number?: string | null;
  avatar_data?: string | null;
  role: UserRole;
  created_at: string;
}

export interface RidePreference {
  trip_type: "oneway" | "roundtrip";
  pickup_datetime?: string | null;
  return_datetime?: string | null;
  preferred_color?: string | null;
  vehicle_condition?: string | null;
  ac_required: boolean;
  seater_required?: number | null;
  vehicle_model?: string | null;
  urgency_type?: "quick_book" | "ride" | "emergency" | "reserve";
  pickup_area?: string | null;
  reserve_duration_hours?: number | null;
  reserve_radius_km?: number | null;
  reserve_quote_low?: number | null;
  reserve_quote_high?: number | null;
  reserve_price_source?: string | null;
  reserve_distance_km?: number | null;
  vehicle_count?: number | null;
  advance_payment_status?: string | null;
  advance_amount?: number | null;
  market_rate?: number | null;
  booking_mode?: "quick" | "normal" | "emergency" | null;
  supervisor_name?: string | null;
  supervisor_phone?: string | null;
}

export interface DriverVehicleDetails {
  model: string;
  number: string;
  color: string;
  condition: string;
  seater: number;
}

export interface Ride {
  id: string;
  customer_id: string;
  driver_id?: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  driver_vehicle_details?: DriverVehicleDetails | null;
  pickup_location: string;
  destination: string;
  vehicle_type: string;
  status: string;
  estimated_fare_min?: number | null;
  estimated_fare_max?: number | null;
  agreed_fare?: number | null;
  requested_fare?: number | null;
  start_otp?: string | null;
  payment_status?: string;
  driver_live_lat?: number | null;
  driver_live_lng?: number | null;
  customer_live_lat?: number | null;
  customer_live_lng?: number | null;
  accepted_at?: string | null;
  arrived_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  preference?: {
    trip_type: string;
    pickup_datetime?: string | null;
    return_datetime?: string | null;
    preferred_color?: string | null;
    vehicle_condition?: string | null;
    ac_required: boolean;
    seater_required?: number | null;
    vehicle_model?: string | null;
    urgency_type?: string;
    pickup_area?: string | null;
    vehicle_count?: number | null;
    advance_payment_status?: string | null;
    advance_amount?: number | null;
    market_rate?: number | null;
    supervisor_name?: string | null;
    supervisor_phone?: string | null;
  } | null;
}

export interface RideMessage {
  id: string;
  ride_id: string;
  sender_id: string;
  sender_type: string;
  message: string;
  created_at: string;
}

export interface RideNegotiation {
  id: string;
  ride_id: string;
  offered_by: string;
  amount: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface RideTracking {
  ride_id: string;
  status: string;
  pickup_location: string;
  destination: string;
  driver_live_lat?: number | null;
  driver_live_lng?: number | null;
  customer_live_lat?: number | null;
  customer_live_lng?: number | null;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
  destination_lat?: number | null;
  destination_lng?: number | null;
}

export interface RidePaymentRead {
  ride_id: string;
  payment_status: string;
  status: string;
}

export interface RideSupportTicketRead {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  severity: string;
  status: string;
  assigned_to?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VehicleInventory {
  id: string;
  model_name: string;
  vehicle_type: string;
  color: string;
  vehicle_condition: string;
  has_ac: boolean;
  seater_count: number;
  area: string;
  live_location: string;
  is_active: boolean;
  created_at: string;
}

export interface PricingQuote {
  pickup_area: string;
  destination_area: string;
  vehicle_type: string;
  estimated_distance_km: number;
  suggested_fare: number;
  min_fare: number;
  max_fare: number;
  demand_multiplier: number;
  vehicle_multiplier: number;
}

export interface NearbyRider {
  driver_id: string;
  driver_name?: string | null;
  lat: number;
  lng: number;
  distance_km: number;
}

export interface ReserveQuoteRow {
  driver_id: string;
  driver_name?: string | null;
  driver_phone?: string | null;
  route_from: string;
  route_to: string;
  quoted_price: number;
  radius_km: number;
}

export interface ReserveQuote {
  route_from: string;
  route_to: string;
  duration_hours: number;
  radius_km: number;
  nearby_driver_count: number;
  min_price: number;
  max_price: number;
  source: "driver_defined" | "recent_trip_data" | "admin_default";
  rows: ReserveQuoteRow[];
}

export interface ReserveRoutePrice {
  id: string;
  driver_id: string;
  route_from: string;
  route_to: string;
  vehicle_type: string;
  price_12h: number;
  price_24h: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReserveDefaultRate {
  id: string;
  route_from: string;
  route_to: string;
  vehicle_type: string;
  duration_hours: number;
  default_min_price: number;
  default_max_price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoutePriceRule {
  id: string;
  pickup_area: string;
  destination_area: string;
  base_km: number;
  base_fare: number;
  per_km_rate: number;
  min_fare: number;
  max_multiplier: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VehiclePriceModifier {
  id: string;
  vehicle_type: string;
  multiplier: number;
  flat_adjustment: number;
  min_fare_floor: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RiderVehicleRegistration {
  id: string;
  driver_id: string;
  vehicle_type: string;
  brand_model: string;
  registration_number: string;
  color?: string | null;
  seater_count: number;
  vehicle_condition?: string | null;
  area?: string | null;
  rc_number?: string | null;
  insurance_number?: string | null;
  notes?: string | null;
  status: "pending" | "approved" | "rejected";
  admin_note?: string | null;
  approved_by?: string | null;
  
  vehicle_category?: string | null;
  service_type?: string | null;
  model_year?: string | null;
  has_ac?: boolean | null;
  has_music?: boolean | null;
  owner_name?: string | null;
  owner_phone?: string | null;
  owner_email?: string | null;
  owner_address?: string | null;
  is_owner_driver?: boolean | null;
  driver_name?: string | null;
  driver_number?: string | null;
  driver_calling_number?: string | null;
  driver_dl_number?: string | null;
  rider_id_format?: string | null;

  created_at: string;
  updated_at: string;
}

export interface AdminAlert {
  severity: string;
  title: string;
  message: string;
  metric_value?: number | null;
}

export interface AdminDashboard {
  total_users: number;
  total_customers: number;
  total_riders: number;
  total_admins: number;
  total_rides: number;
  rides_pending: number;
  rides_active: number;
  rides_completed: number;
  rides_cancelled: number;
  rides_rejected: number;
  total_vehicles: number;
  active_vehicles: number;
  pending_vehicle_registrations: number;
  payments_paid_count: number;
  payments_unpaid_count: number;
  gmv_paid: number;
  gmv_unpaid: number;
  completion_rate: number;
  cancel_rate: number;
  rides_last_24h: number;
  alerts: AdminAlert[];
}

export interface AdminAreaLoad {
  area: string;
  total_requests: number;
  pending: number;
  active: number;
  completed: number;
  cancelled: number;
  rejected: number;
  avg_requested_fare?: number | null;
  avg_agreed_fare?: number | null;
  last_request_at?: string | null;
}

export interface AdminRideOps {
  id: string;
  customer_id: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  driver_id?: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  pickup_location: string;
  destination: string;
  pickup_area?: string | null;
  vehicle_type: string;
  status: string;
  payment_status: string;
  requested_fare?: number | null;
  agreed_fare?: number | null;
  estimated_fare_min?: number | null;
  estimated_fare_max?: number | null;
  urgency_type?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminUserOps {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  created_at: string;
  total_rides: number;
  completed_rides: number;
  cancelled_rides: number;
  last_ride_at?: string | null;
}

export interface AdminSystemHealth {
  status: string;
  server_time: string;
  uptime_seconds: number;
  db_status: string;
  db_size_mb: number;
  disk_total_gb: number;
  disk_used_gb: number;
  disk_free_gb: number;
  python_version: string;
  platform: string;
  warnings: string[];
}

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (!headers.has("Content-Type") && init.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new Error(`Unable to reach server at ${API_BASE_URL}. Please ensure backend is running and reachable.`);
  }

  if (!response.ok) {
    let errorMessage = `Request failed (${response.status})`;
    try {
      const data = await response.json();
      if (data?.detail) {
        if (typeof data.detail === "string") {
          errorMessage = data.detail;
        } else if (Array.isArray(data.detail)) {
          const first = data.detail[0];
          if (first?.loc && first?.msg) {
            const field = String(first.loc[first.loc.length - 1] ?? "field");
            errorMessage = `${field}: ${first.msg}`;
          } else {
            errorMessage = JSON.stringify(data.detail);
          }
        } else {
          errorMessage = JSON.stringify(data.detail);
        }
      }
    } catch {
      // Ignore JSON parse error, use fallback
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const authStore = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export const backendApi = {
  baseUrl: API_BASE_URL,

  health: () => request<{ status: string; message: string }>("/health"),

  getAdminDashboard: (token: string) => request<AdminDashboard>(`${API_PREFIX}/admin/dashboard`, { method: "GET" }, token),
  getAdminAreaLoad: (token: string, limit = 25) =>
    request<AdminAreaLoad[]>(`${API_PREFIX}/admin/area-load?limit=${limit}`, { method: "GET" }, token),
  getAdminRides: (token: string, params?: { status?: string; q?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.q) q.set("q", params.q);
    if (params?.limit != null) q.set("limit", String(params.limit));
    return request<AdminRideOps[]>(`${API_PREFIX}/admin/rides${q.toString() ? `?${q.toString()}` : ""}`, { method: "GET" }, token);
  },
  getAdminUsers: (token: string, params?: { role?: UserRole | ""; q?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.role) q.set("role", params.role);
    if (params?.q) q.set("q", params.q);
    if (params?.limit != null) q.set("limit", String(params.limit));
    return request<AdminUserOps[]>(`${API_PREFIX}/admin/users${q.toString() ? `?${q.toString()}` : ""}`, { method: "GET" }, token);
  },
  updateAdminUserRole: (userId: string, role: UserRole, token: string) =>
    request<UserProfile>(`${API_PREFIX}/admin/users/${userId}/role`, { method: "PATCH", body: JSON.stringify({ role }) }, token),
  getAdminSystemHealth: (token: string) => request<AdminSystemHealth>(`${API_PREFIX}/admin/system-health`, { method: "GET" }, token),

  forgotPassword: (emailOrMobile: string) => request<{ message: string }>(`${API_PREFIX}/auth/forgot-password`, {
    method: "POST",
    body: JSON.stringify({ email_or_mobile: emailOrMobile })
  }, false),

  login: async (email: string, password: string): Promise<AuthToken> => {
    const token = await request<AuthToken>(`${API_PREFIX}/auth/login`, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    authStore.setToken(token.access_token);
    return token;
  },

  register: async (payload: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    role?: UserRole;
  }): Promise<AuthToken> => {
    const token = await request<AuthToken>(`${API_PREFIX}/auth/register`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    authStore.setToken(token.access_token);
    return token;
  },

  me: (token: string) => request<UserProfile>(`${API_PREFIX}/auth/me`, { method: "GET" }, token),

  updateMe: (payload: Partial<UserProfile & { city: string, bio: string, emergency_number: string, avatar_data: string }>, token: string) =>
    request<UserProfile>(`${API_PREFIX}/auth/me`, { method: "PATCH", body: JSON.stringify(payload) }, token),

  createRide: (
    payload: {
      pickup_location: string;
      destination: string;
      vehicle_type: string;
      estimated_fare_min?: number;
      estimated_fare_max?: number;
      requested_fare?: number;
      pickup_lat?: number;
      pickup_lng?: number;
      destination_lat?: number;
      destination_lng?: number;
      preference?: RidePreference;
    },
    token: string,
  ) => request<Ride>(`${API_PREFIX}/rides`, { method: "POST", body: JSON.stringify(payload) }, token),

  listRides: (token: string) => request<Ride[]>(`${API_PREFIX}/rides`, { method: "GET" }, token),

  getRide: (rideId: string, token: string) =>
    request<Ride>(`${API_PREFIX}/rides/${rideId}`, { method: "GET" }, token),

  updateRideStatus: (
    rideId: string,
    payload: { status: string; agreed_fare?: number },
    token: string,
  ) =>
    request<Ride>(
      `${API_PREFIX}/rides/${rideId}/status`,
      { method: "PATCH", body: JSON.stringify(payload) },
      token,
    ),

  getRideMessages: (rideId: string, token: string) =>
    request<RideMessage[]>(`${API_PREFIX}/rides/${rideId}/messages`, { method: "GET" }, token),

  sendRideMessage: (
    rideId: string,
    payload: { message: string; sender_type?: "customer" | "driver" },
    token: string,
  ) =>
    request<RideMessage>(
      `${API_PREFIX}/rides/${rideId}/messages`,
      { method: "POST", body: JSON.stringify(payload) },
      token,
    ),

  listRideNegotiations: (rideId: string, token: string) =>
    request<RideNegotiation[]>(`${API_PREFIX}/rides/${rideId}/negotiations`, { method: "GET" }, token),

  createRideNegotiation: (rideId: string, amount: number, token: string) =>
    request<RideNegotiation>(
      `${API_PREFIX}/rides/${rideId}/negotiations`,
      { method: "POST", body: JSON.stringify({ amount }) },
      token,
    ),

  actionRideNegotiation: (rideId: string, negotiationId: string, action: "accept" | "reject", token: string) =>
    request<RideNegotiation>(
      `${API_PREFIX}/rides/${rideId}/negotiations/${negotiationId}/action`,
      { method: "POST", body: JSON.stringify({ action }) },
      token,
    ),

  updateCustomerLocation: (rideId: string, lat: number, lng: number, token: string) =>
    request<RideTracking>(
      `${API_PREFIX}/rides/${rideId}/customer-location`,
      { method: "POST", body: JSON.stringify({ lat, lng }) },
      token,
    ),

  getRideTracking: (rideId: string, token: string) =>
    request<RideTracking>(`${API_PREFIX}/rides/${rideId}/tracking`, { method: "GET" }, token),

  submitRideFeedback: (rideId: string, rating: number, comment: string, token: string) =>
    request<Ride>(`${API_PREFIX}/rides/${rideId}/feedback`, { method: "POST", body: JSON.stringify({ rating, comment }) }, token),

  createRideSupportTicket: (
    rideId: string,
    payload: {
      issue_type: "complaint" | "vehicle_issue" | "police" | "emergency";
      title?: string;
      description?: string;
      severity?: "low" | "medium" | "high" | "critical";
      source_panel?: "user" | "rider";
    },
    token: string,
  ) =>
    request<RideSupportTicketRead>(
      `${API_PREFIX}/rides/${rideId}/support-ticket`,
      { method: "POST", body: JSON.stringify(payload) },
      token,
    ),

  markRidePayment: (
    rideId: string,
    payload: { payment_method?: string; transaction_ref?: string },
    token: string,
  ) => request<RidePaymentRead>(`${API_PREFIX}/rides/${rideId}/payment`, { method: "POST", body: JSON.stringify(payload) }, token),

  listVehicles: (token: string, area?: string) => {
    const q = area ? `?area=${encodeURIComponent(area)}` : "";
    return request<VehicleInventory[]>(`${API_PREFIX}/vehicles${q}`, { method: "GET" }, token);
  },



  createVehicle: (
    payload: {
      model_name: string;
      vehicle_type: string;
      color: string;
      vehicle_condition: string;
      has_ac: boolean;
      seater_count: number;
      area: string;
      live_location: string;
      is_active: boolean;
    },
    token: string,
  ) => request<VehicleInventory>(`${API_PREFIX}/vehicles`, { method: "POST", body: JSON.stringify(payload) }, token),

  deleteVehicle: (vehicleId: string, token: string) =>
    request<void>(`${API_PREFIX}/vehicles/${vehicleId}`, { method: "DELETE" }, token),

  getPriceQuote: (
    payload: {
      pickup_area: string;
      destination_area: string;
      vehicle_type: string;
      pickup_lat?: number;
      pickup_lng?: number;
      destination_lat?: number;
      destination_lng?: number;
    },
    token: string,
  ) => {
    const q = new URLSearchParams({
      pickup_area: payload.pickup_area,
      destination_area: payload.destination_area,
      vehicle_type: payload.vehicle_type,
    });
    if (payload.pickup_lat != null) q.set("pickup_lat", String(payload.pickup_lat));
    if (payload.pickup_lng != null) q.set("pickup_lng", String(payload.pickup_lng));
    if (payload.destination_lat != null) q.set("destination_lat", String(payload.destination_lat));
    if (payload.destination_lng != null) q.set("destination_lng", String(payload.destination_lng));
    return request<PricingQuote>(`${API_PREFIX}/pricing/quote?${q.toString()}`, { method: "GET" }, token);
  },

  listNearbyRiders: (params: { pickup_lat: number, pickup_lng: number, radius_km?: number, limit?: number }, token: string) => {
    const url = `${API_PREFIX}/radar/nearby?lat=${params.pickup_lat}&lng=${params.pickup_lng}&radius_km=${params.radius_km || 10}`;
    return request<any>(url, { method: "GET" }, token).then((res) => {
      return res.drivers || [];
    });
  },

  getReserveQuote: (
    payload: {
      pickup_area: string;
      destination_area: string;
      duration_hours: number;
      radius_km?: number;
      pickup_lat?: number;
      pickup_lng?: number;
      vehicle_type: string;
    },
    token: string,
  ) => {
    const q = new URLSearchParams({
      pickup_area: payload.pickup_area,
      destination_area: payload.destination_area,
      duration_hours: String(payload.duration_hours),
      vehicle_type: payload.vehicle_type,
    });
    if (payload.pickup_lat != null) q.set("pickup_lat", String(payload.pickup_lat));
    if (payload.pickup_lng != null) q.set("pickup_lng", String(payload.pickup_lng));
    if (payload.radius_km != null) q.set("radius_km", String(payload.radius_km));
    return request<ReserveQuote>(`${API_PREFIX}/pricing/reserve/quote?${q.toString()}`, { method: "GET" }, token);
  },

  listRoutePriceRules: (token: string) => request<RoutePriceRule[]>(`${API_PREFIX}/pricing/routes`, { method: "GET" }, token),
  createRoutePriceRule: (
    payload: Omit<RoutePriceRule, "id" | "created_at" | "updated_at">,
    token: string,
  ) => request<RoutePriceRule>(`${API_PREFIX}/pricing/routes`, { method: "POST", body: JSON.stringify(payload) }, token),
  updateRoutePriceRule: (
    ruleId: string,
    payload: Partial<Omit<RoutePriceRule, "id" | "created_at" | "updated_at">>,
    token: string,
  ) => request<RoutePriceRule>(`${API_PREFIX}/pricing/routes/${ruleId}`, { method: "PUT", body: JSON.stringify(payload) }, token),
  bulkUpsertRoutePriceRules: (
    rows: Array<Omit<RoutePriceRule, "id" | "created_at" | "updated_at">>,
    token: string,
  ) => request<{ upserted: number }>(`${API_PREFIX}/pricing/routes/bulk-upsert`, { method: "POST", body: JSON.stringify({ rows }) }, token),

  listVehiclePriceModifiers: (token: string) => request<VehiclePriceModifier[]>(`${API_PREFIX}/pricing/vehicles`, { method: "GET" }, token),
  createVehiclePriceModifier: (
    payload: Omit<VehiclePriceModifier, "id" | "created_at" | "updated_at">,
    token: string,
  ) => request<VehiclePriceModifier>(`${API_PREFIX}/pricing/vehicles`, { method: "POST", body: JSON.stringify(payload) }, token),
  updateVehiclePriceModifier: (
    modifierId: string,
    payload: Partial<Omit<VehiclePriceModifier, "id" | "vehicle_type" | "created_at" | "updated_at">>,
    token: string,
  ) => request<VehiclePriceModifier>(`${API_PREFIX}/pricing/vehicles/${modifierId}`, { method: "PUT", body: JSON.stringify(payload) }, token),

  listMyReserveRoutePrices: (token: string) =>
    request<ReserveRoutePrice[]>(`${API_PREFIX}/pricing/reserve/driver-prices/me`, { method: "GET" }, token),
  createMyReserveRoutePrice: (
    payload: {
      route_from: string;
      route_to: string;
      vehicle_type: string;
      price_12h: number;
      price_24h: number;
      is_active?: boolean;
    },
    token: string,
  ) => request<ReserveRoutePrice>(`${API_PREFIX}/pricing/reserve/driver-prices`, { method: "POST", body: JSON.stringify(payload) }, token),
  updateMyReserveRoutePrice: (
    priceId: string,
    payload: Partial<{
      route_from: string;
      route_to: string;
      vehicle_type: string;
      price_12h: number;
      price_24h: number;
      is_active: boolean;
    }>,
    token: string,
  ) => request<ReserveRoutePrice>(`${API_PREFIX}/pricing/reserve/driver-prices/${priceId}`, { method: "PUT", body: JSON.stringify(payload) }, token),

  listAdminReserveRoutePrices: (token: string) =>
    request<ReserveRoutePrice[]>(`${API_PREFIX}/pricing/reserve/admin/driver-prices`, { method: "GET" }, token),
  listReserveDefaultRates: (token: string) =>
    request<ReserveDefaultRate[]>(`${API_PREFIX}/pricing/reserve/default-rates`, { method: "GET" }, token),
  createReserveDefaultRate: (
    payload: {
      route_from: string;
      route_to: string;
      vehicle_type: string;
      duration_hours: number;
      default_min_price: number;
      default_max_price: number;
      is_active?: boolean;
    },
    token: string,
  ) => request<ReserveDefaultRate>(`${API_PREFIX}/pricing/reserve/default-rates`, { method: "POST", body: JSON.stringify(payload) }, token),
  updateReserveDefaultRate: (
    rateId: string,
    payload: Partial<{
      route_from: string;
      route_to: string;
      vehicle_type: string;
      duration_hours: number;
      default_min_price: number;
      default_max_price: number;
      is_active: boolean;
    }>,
    token: string,
  ) => request<ReserveDefaultRate>(`${API_PREFIX}/pricing/reserve/default-rates/${rateId}`, { method: "PUT", body: JSON.stringify(payload) }, token),

  createRiderVehicleRegistration: (
    payload: {
      vehicle_category?: string | null;
      vehicle_type: string;
      service_type?: string | null;
      brand_model: string;
      registration_number: string;
      color?: string | null;
      seater_count: number;
      vehicle_condition?: string | null;
      model_year?: string | null;
      has_ac?: boolean | null;
      has_music?: boolean | null;
      owner_name?: string | null;
      owner_phone?: string | null;
      owner_email?: string | null;
      owner_address?: string | null;
      is_owner_driver?: boolean | null;
      driver_name?: string | null;
      driver_number?: string | null;
      driver_dl_number?: string | null;
      driver_calling_number?: string | null;
      area?: string | null;
      rc_number?: string | null;
      insurance_number?: string | null;
      notes?: string | null;
    },
    token: string,
  ) => request<RiderVehicleRegistration>(`${API_PREFIX}/vehicles/rider-registrations`, { method: "POST", body: JSON.stringify(payload) }, token),

  listMyRiderVehicleRegistrations: (token: string) =>
    request<RiderVehicleRegistration[]>(`${API_PREFIX}/vehicles/rider-registrations/me`, { method: "GET" }, token),

  listServices: () => request<any[]>(`${API_PREFIX}/services`),

  updateMyRiderVehicleRegistration: (
    registrationId: string,
    payload: Partial<{
      vehicle_type: string;
      brand_model: string;
      registration_number: string;
      color: string;
      seater_count: number;
      vehicle_condition: string;
      area: string;
      rc_number: string;
      insurance_number: string;
      notes: string;
    }>,
    token: string,
  ) =>
    request<RiderVehicleRegistration>(
      `${API_PREFIX}/vehicles/rider-registrations/${registrationId}`,
      { method: "PATCH", body: JSON.stringify(payload) },
      token,
    ),

  listRiderVehicleRegistrations: (token: string, statusFilter?: "pending" | "approved" | "rejected") =>
    request<RiderVehicleRegistration[]>(
      `${API_PREFIX}/vehicles/rider-registrations${statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : ""}`,
      { method: "GET" },
      token,
    ),

  approveRiderVehicleRegistration: (registrationId: string, admin_note: string | null, token: string) =>
    request<RiderVehicleRegistration>(
      `${API_PREFIX}/vehicles/rider-registrations/${registrationId}/approve`,
      { method: "POST", body: JSON.stringify({ admin_note }) },
      token,
    ),

  rejectRiderVehicleRegistration: (registrationId: string, admin_note: string | null, token: string) =>
    request<RiderVehicleRegistration>(
      `${API_PREFIX}/vehicles/rider-registrations/${registrationId}/reject`,
      { method: "POST", body: JSON.stringify({ admin_note }) },
      token,
    ),

  rideWebsocketUrl: (rideId: string) => toWebSocketUrl(API_BASE_URL, `/ws/rides/${rideId}`),
};
