import { authStore } from "./backendApi";
import { resolveApiBaseUrl } from "./network";

const API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_API_URL);
const API_PREFIX = "/api/v1/rider";
const EMBEDDED_RIDER_API_KEY = import.meta.env.VITE_RIDER_APP_API_KEY || "rider_app_linked_key_change_in_production";

export interface RiderRequest {
  id: string;
  booking_display_id: string;
  pickup_location: string;
  destination: string;
  vehicle_type: string;
  status: string;
  estimated_fare_min?: number | null;
  estimated_fare_max?: number | null;
  agreed_fare?: number | null;
  requested_fare?: number | null;
  latest_offer_amount?: number | null;
  latest_offer_by?: string | null;
  latest_offer_status?: string | null;
  accepted_at?: string | null;
  arrived_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  preference?: {
    urgency_type?: string;
    booking_mode?: string;
  } | null;
}

export interface RiderActiveRide {
  id: string;
  booking_display_id: string;
  pickup_location: string;
  destination: string;
  vehicle_type: string;
  status: string;
  payment_status?: string | null;
  agreed_fare?: number | null;
  estimated_fare_min?: number | null;
  estimated_fare_max?: number | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  accepted_at?: string | null;
  arrived_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  preference?: {
    urgency_type?: string;
    booking_mode?: string;
  } | null;
  created_at: string;
}

export interface RiderTracking {
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

export interface RiderSchedule {
  id: string;
  driver_id: string;
  ride_date: string;
  pickup_time?: string | null;
  pickup_location?: string | null;
  destination?: string | null;
  vehicle_type: string;
  fare?: number | null;
  notes?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

async function riderRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (!headers.has("Content-Type") && init.body) headers.set("Content-Type", "application/json");
  headers.set("X-API-Key", EMBEDDED_RIDER_API_KEY);
  
  const token = authStore.getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new Error("Unable to reach rider server. Please check internet or backend connection.");
  }
  if (!response.ok) {
    let errorMessage = `Rider request failed (${response.status})`;
    try {
      const data = await response.json();
      if (data?.detail) {
        errorMessage = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
      }
    } catch {
      // Ignore JSON parse error, use fallback
    }
    throw new Error(errorMessage);
  }
  return response.json() as Promise<T>;
}

export const riderApi = {
  listRequests: () => riderRequest<RiderRequest[]>(`${API_PREFIX}/requests`, { method: "GET" }),
  listActiveRides: () => riderRequest<RiderActiveRide[]>(`${API_PREFIX}/active`, { method: "GET" }),
  acceptRequest: (rideId: string, agreed_fare?: number) =>
    riderRequest<RiderRequest>(`${API_PREFIX}/requests/${rideId}/accept`, {
      method: "POST",
      body: JSON.stringify({ agreed_fare }),
    }),
  rejectRequest: (rideId: string) =>
    riderRequest<RiderRequest>(`${API_PREFIX}/requests/${rideId}/reject`, { method: "POST", body: JSON.stringify({}) }),
  negotiateRequest: (rideId: string, agreed_fare: number) =>
    riderRequest<RiderRequest>(`${API_PREFIX}/requests/${rideId}/negotiate`, {
      method: "POST",
      body: JSON.stringify({ agreed_fare }),
    }),
  updateActiveRideStatus: (rideId: string, status: "arriving" | "in_progress" | "completed" | "cancelled") =>
    riderRequest<RiderActiveRide>(`${API_PREFIX}/active/${rideId}/status`, {
      method: "POST",
      body: JSON.stringify({ status }),
    }),
  updateActiveRideStatusWithOtp: (rideId: string, status: "arriving" | "in_progress" | "completed" | "cancelled", start_otp?: string) =>
    riderRequest<RiderActiveRide>(`${API_PREFIX}/active/${rideId}/status`, {
      method: "POST",
      body: JSON.stringify({ status, start_otp }),
    }),
  updateDriverLocation: (rideId: string, lat: number, lng: number) =>
    riderRequest<RiderActiveRide>(`${API_PREFIX}/active/${rideId}/driver-location`, {
      method: "POST",
      body: JSON.stringify({ lat, lng }),
    }),
  receivePayment: (rideId: string) =>
    riderRequest<{ ride_id: string; payment_status: string; status: string }>(`${API_PREFIX}/active/${rideId}/payment-received`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  getMessages: (rideId: string) =>
    riderRequest<any[]>(`${API_PREFIX}/active/${rideId}/messages`, { method: "GET" }),
  sendMessage: (rideId: string, message: string) =>
    riderRequest<any>(`${API_PREFIX}/active/${rideId}/messages`, {
      method: "POST",
      body: JSON.stringify({ message, sender_type: "driver" }),
    }),
  submitFeedback: (rideId: string, rating: number, comment: string) =>
    riderRequest<{ ride_id: string; saved: boolean }>(`${API_PREFIX}/active/${rideId}/feedback`, {
      method: "POST",
      body: JSON.stringify({ rating, comment }),
    }),
  createRideSupportTicket: (
    rideId: string,
    payload: {
      issue_type: "complaint" | "vehicle_issue" | "police" | "emergency";
      title?: string;
      description?: string;
      severity?: "low" | "medium" | "high" | "critical";
      source_panel?: "user" | "rider";
    },
  ) =>
    riderRequest<any>(`/api/v1/rides/${rideId}/support-ticket`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  listSchedule: (month?: string) =>
    riderRequest<RiderSchedule[]>(`${API_PREFIX}/schedule${month ? `?month=${encodeURIComponent(month)}` : ""}`, { method: "GET" }),
  createSchedule: (payload: {
    ride_date: string;
    pickup_time?: string | null;
    pickup_location?: string | null;
    destination?: string | null;
    vehicle_type?: string;
    fare?: number | null;
    notes?: string | null;
  }) =>
    riderRequest<RiderSchedule>(`${API_PREFIX}/schedule`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateSchedule: (scheduleId: string, payload: {
    ride_date?: string;
    pickup_time?: string | null;
    pickup_location?: string | null;
    destination?: string | null;
    vehicle_type?: string;
    fare?: number | null;
    notes?: string | null;
    status?: string;
  }) =>
    riderRequest<RiderSchedule>(`${API_PREFIX}/schedule/${scheduleId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  cancelSchedule: (scheduleId: string) =>
    riderRequest<RiderSchedule>(`${API_PREFIX}/schedule/${scheduleId}/cancel`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  getActiveTracking: (rideId: string) =>
    riderRequest<RiderTracking>(`${API_PREFIX}/active/${rideId}/tracking`, { method: "GET" }),
};
