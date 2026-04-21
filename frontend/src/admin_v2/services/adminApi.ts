import { resolveApiBaseUrl } from "@/services/network";

const API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_API_URL);
export const ADMIN_V2_API_BASE = import.meta.env.VITE_ADMIN_V2_API_BASE || `${API_BASE_URL}/api/v2`;
const ADMIN_V1_API_BASE = `${API_BASE_URL}/api/v1`;
const TOKEN_KEY = "bmg_admin_v2_token";

export const adminTokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY) || localStorage.getItem("bmg_token"),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

async function requestV1<T>(path: string, init: RequestInit = {}, withAuth = true): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (!headers.has("Content-Type") && init.body) headers.set("Content-Type", "application/json");
  if (withAuth) {
    const token = adminTokenStore.get();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${ADMIN_V1_API_BASE}${path}`, { ...init, headers });
  } catch {
    throw new Error(`Unable to reach server at ${API_BASE_URL}. Please ensure backend is running.`);
  }
  if (!response.ok) {
    let errorMessage = `Request failed (${response.status})`;
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

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function mapRideToOps(row: any) {
  return {
    id: row.id,
    rider_name: row.customer_name || "-",
    pickup: row.pickup_location || "-",
    drop: row.destination || "-",
    fare: row.agreed_fare ?? row.requested_fare ?? row.estimated_fare_max ?? row.estimated_fare_min ?? 0,
    status: row.status || "pending",
    payment_status: row.payment_status || "unpaid",
    driver_id: row.driver_id,
    driver_name: row.driver_name,
  };
}

export interface RiderRegistrationItem {
  id: string;
  driver_id: string;
  rider_id_format?: string | null;
  vehicle_category?: string | null;
  vehicle_type: string;
  service_type?: string | null;
  brand_model: string;
  registration_number: string;
  color?: string | null;
  model_year?: string | null;
  has_ac?: boolean | null;
  has_music?: boolean | null;
  owner_name?: string | null;
  owner_phone?: string | null;
  owner_email?: string | null;
  is_owner_driver?: boolean | null;
  driver_name?: string | null;
  driver_number?: string | null;
  driver_calling_number?: string | null;
  driver_dl_number?: string | null;
  area?: string | null;
  status: string;
  admin_note?: string | null;
  created_at: string;
}

export const adminV2Api = {
  seedAdmins: async () => ({ seeded: true, message: "Using existing admin users" }),
  seedData: async () => ({ ok: true }),
  login: async (email: string, password: string) => {
    const token = await requestV1<{ access_token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }, false);
    const me = await fetch(`${ADMIN_V1_API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    }).then((r) => r.json());
    if (me?.role !== "admin") {
      throw new Error("Only admin users can access admin console");
    }
    return { access_token: token.access_token, role: "super_admin", name: me.name || "Admin" };
  },

  getKpis: async () => {
    const d = await requestV1<any>("/admin/dashboard");
    return {
      total_riders: d.total_customers ?? 0,
      total_drivers: d.total_riders ?? 0,
      active_rides: d.rides_active ?? 0,
      revenue: d.gmv_paid ?? 0,
    };
  },
  getLiveOps: async () => {
    const [rides, dash] = await Promise.all([
      requestV1<any[]>("/admin/rides?limit=120"),
      requestV1<any>("/admin/dashboard"),
    ]);
    return {
      server_time: new Date().toISOString(),
      pending_rides: rides.filter((r) => (r.status || "").toLowerCase() === "pending"),
      driver_live: rides.filter((r) => ["accepted", "arriving", "in_progress"].includes((r.status || "").toLowerCase())),
      alerts: dash.alerts || [],
    };
  },

  listRiders: (q = "") => requestV1<any[]>(`/admin/riders${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  getRider: (id: string) => requestV1<any>(`/admin/riders?q=${encodeURIComponent(id)}`),
  blockRider: (id: string) => requestV1<any>(`/admin/riders/${id}/block`, { method: "PATCH", body: JSON.stringify({ status: "blocked" }) }),
  unblockRider: (id: string) => requestV1<any>(`/admin/riders/${id}/unblock`, { method: "PATCH", body: JSON.stringify({ status: "active" }) }),

  listDrivers: () => requestV1<any[]>("/admin/drivers"),
  getDriver: (id: string) => requestV1<any>(`/admin/drivers?q=${encodeURIComponent(id)}`),
  approveDriver: (id: string) => requestV1<any>(`/admin/drivers/${id}/approve`, { method: "POST" }),
  rejectDriver: (id: string) => requestV1<any>(`/admin/drivers/${id}/reject`, { method: "POST" }),

  listVehicles: () => requestV1<any[]>("/admin/vehicles"),
  addVehicle: (payload: any) => requestV1<any>("/vehicles", { method: "POST", body: JSON.stringify(payload) }),
  approveVehicle: (id: string) => requestV1<any>(`/admin/vehicles/${id}/approve`, { method: "POST" }),

  listRides: async () => {
    const rows = await requestV1<any[]>("/admin/rides?limit=200");
    return rows;
  },
  getRideFull: (id: string) => requestV1<any>(`/rides/${id}`),
  getRideNegotiations: (id: string) => requestV1<any[]>(`/rides/${id}/negotiations`),
  getRideMessages: (id: string) => requestV1<any[]>(`/rides/${id}/messages`),
  postRideMessage: (id: string, message: string) => requestV1<any>(`/rides/${id}/messages`, { method: "POST", body: JSON.stringify({ message }) }),
  createSupportTicket: (ride_id: string, payload: any) => requestV1<any>(`/rides/${ride_id}/support-ticket`, { method: "POST", body: JSON.stringify(payload) }),
  updateRideStatus: (id: string, status: string) => requestV1<any>(`/rides/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  assignRideDriver: (id: string, driver_id: string) => requestV1<any>(`/rides/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: "accepted", driver_id }) }),

  listApprovals: async () => {
    const rows = await requestV1<RiderRegistrationItem[]>("/vehicles/rider-registrations?status=pending");
    return rows.map((r) => ({
      id: r.id,
      applicant_name: r.owner_name || r.driver_name || r.driver_id,
      city: r.area || "-",
      risk_score: 20,
      doc_score: 85,
      reviewer: "auto",
      status: r.status,
    }));
  },
  approvalAction: async (id: string, action: "approve" | "reject" | "request_changes", note = "") => {
    if (action === "approve") {
      return requestV1<any>(`/vehicles/rider-registrations/${id}/approve`, { method: "POST", body: JSON.stringify({ admin_note: note }) });
    }
    return requestV1<any>(`/vehicles/rider-registrations/${id}/reject`, { method: "POST", body: JSON.stringify({ admin_note: note || (action === "request_changes" ? "Please update details" : "Rejected") }) });
  },

  financeOverview: async () => {
    const rides = await requestV1<any[]>("/admin/rides?limit=300");
    const rows = rides.map((r) => ({
      id: r.id,
      ride_id: r.id,
      driver_id: r.driver_id || "unassigned",
      amount: r.agreed_fare ?? r.requested_fare ?? r.estimated_fare_max ?? 0,
      method: "cash",
      status: (r.payment_status || "unpaid").toLowerCase() === "paid" ? "paid" : "pending",
    }));
    return { rows };
  },
  payoutDriver: async (payment_id: string) => ({ ok: true, payment_id }),

  listTasks: () => requestV1<any[]>("/admin/tasks"),
  createTask: (payload: any) => requestV1<any>("/admin/tasks", { method: "POST", body: JSON.stringify(payload) }),
  assignTask: (id: string, assignee_admin_id: string) => requestV1<any>(`/admin/tasks/${id}/assign`, { method: "PATCH", body: JSON.stringify({ assignee_admin_id }) }),
  updateTaskStatus: (id: string, status: string) => requestV1<any>(`/admin/tasks/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  logs: () => requestV1<any[]>("/admin/logs"),

  // Support Tickets
  listTickets: (filters?: { status?: string; category?: string; severity?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.category) params.append("category", filters.category);
    if (filters?.severity) params.append("severity", filters.severity);
    const qs = params.toString();
    return requestV1<any[]>(`/admin/support/tickets${qs ? "?" + qs : ""}`);
  },
  ticketAction: (id: string, payload: {
    admin_response?: string;
    emergency_dispatched?: string;
    assigned_vehicle_id?: string;
    assigned_to?: string;
    status?: string;
  }) => requestV1<any>(`/admin/support/tickets/${id}/action`, { method: "PATCH", body: JSON.stringify(payload) }),
  assignTicket: (id: string, assignee_admin_id: string) =>
    requestV1<any>(`/admin/support/tickets/${id}/assign`, { method: "PATCH", body: JSON.stringify({ assignee_admin_id }) }),
  updateTicketStatus: (id: string, status: string) =>
    requestV1<any>(`/admin/support/tickets/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  // Service Management
  listAllServices: () => requestV1<any[]>("/services/all"),
  addService: (payload: any) => requestV1<any>("/services/", { method: "POST", body: JSON.stringify(payload) }),
  updateService: (id: string, payload: any) => requestV1<any>(`/services/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteService: (id: string) => requestV1<any>(`/services/${id}`, { method: "DELETE" }),

  // Rider vehicle registration approvals (API v1)
  listRiderRegistrations: (statusFilter?: string) =>
    requestV1<RiderRegistrationItem[]>(`/vehicles/rider-registrations${statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : ""}`),
  updateRiderRegistration: (id: string, payload: Partial<RiderRegistrationItem>) =>
    requestV1<RiderRegistrationItem>(`/vehicles/rider-registrations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  approveRiderRegistration: (id: string, admin_note = "") =>
    requestV1<RiderRegistrationItem>(`/vehicles/rider-registrations/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ admin_note }),
    }),
  requestChangesRiderRegistration: (id: string, admin_note = "") =>
    requestV1<RiderRegistrationItem>(`/vehicles/rider-registrations/${id}/request-changes`, {
      method: "POST",
      body: JSON.stringify({ admin_note }),
    }),
  rejectRiderRegistration: (id: string, admin_note = "") =>
    requestV1<RiderRegistrationItem>(`/vehicles/rider-registrations/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ admin_note }),
    }),

  // Driver CRM
  crmListDrivers: (status?: string, assignedMemberId?: string) => {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (assignedMemberId) params.append("assigned_member_id", assignedMemberId);
    const qs = params.toString();
    return requestV1<any[]>(`/crm/drivers${qs ? "?" + qs : ""}`);
  },
  crmListTeamMembers: () => requestV1<any[]>("/crm/team-members"),
  crmAssignDriver: (id: string, team_member_id: string) => requestV1<any>(`/crm/drivers/${id}/assign`, { method: "POST", body: JSON.stringify({ team_member_id }) }),
  crmApproveDriver: (id: string, note = "") => requestV1<any>(`/crm/drivers/${id}/approve`, { method: "POST", body: JSON.stringify({ note }) }),
  crmRejectDriver: (id: string, note = "") => requestV1<any>(`/crm/drivers/${id}/reject`, { method: "POST", body: JSON.stringify({ note }) }),
  crmRefileDriver: (id: string, note = "") => requestV1<any>(`/crm/drivers/${id}/refile`, { method: "POST", body: JSON.stringify({ note }) }),
  crmBlockDriver: (id: string, reason: string) => requestV1<any>(`/crm/drivers/${id}/block`, { method: "POST", body: JSON.stringify({ reason }) }),
  crmDashboard: () => requestV1<any>("/crm/dashboard-analytics"),
  requestV1: <T>(path: string, init?: RequestInit) => requestV1<T>(path, init),
};
