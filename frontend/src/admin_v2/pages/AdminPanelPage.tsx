import { useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { adminTokenStore, adminV2Api, type RiderRegistrationItem } from "@/admin_v2/services/adminApi";
import { useAdminV2Store } from "@/admin_v2/store/useAdminStore";
import { usePolling } from "@/admin_v2/hooks/usePolling";
import { DataTable } from "@/admin_v2/components/DataTable";
import { Button, Card, Chip } from "@/admin_v2/components/ui";
import { AdminSidebarV2, AdminTopbarV2 } from "@/admin_v2/layouts/AdminLayout";
import { RiderManagementBoard } from "@/admin_v2/components/RiderManagementBoard";
import { UserManagementBoard } from "@/admin_v2/components/UserManagementBoard";
import { LiveRidesBoard } from "@/admin_v2/components/LiveRidesBoard";
import { ServiceManagementBoard } from "@/admin_v2/components/ServiceManagementBoard";
import { PriceManagementBoard } from "@/admin_v2/components/PriceManagementBoard";
import { TeamManagementBoard } from "@/admin_v2/components/TeamManagementBoard";
import { CompanyStructureBoard } from "@/admin_v2/components/CompanyStructureBoard";
import { PolicyManagementBoard } from "@/admin_v2/components/PolicyManagementBoard";
import { LiveSearchMonitorBoard } from "@/admin_v2/components/LiveSearchMonitorBoard";
import { SupportDeskBoard } from "@/admin_v2/components/SupportDeskBoard";
import { AdminDashboardOverview } from "@/admin_v2/components/AdminDashboardOverview";
import { EnterpriseDashboard } from "@/admin_v2/components/EnterpriseDashboard";
import { FinanceSettlementBoard } from "@/admin_v2/components/FinanceSettlementBoard";
import { DailyEarningsReport } from "@/admin_v2/components/DailyEarningsReport";
import { BroadcastManagementBoard } from "@/admin_v2/components/BroadcastManagementBoard";

const toneForStatus = (status?: string) => {
  const s = (status || "").toLowerCase();
  if (["paid", "approved", "active", "completed", "online", "resolved"].includes(s)) return "success" as const;
  if (["pending", "assigned", "in_progress", "todo", "changes_requested"].includes(s)) return "warning" as const;
  if (["blocked", "rejected", "failed", "cancelled"].includes(s)) return "danger" as const;
  return "info" as const;
};

const KV = ({ title, value }: { title: string; value: string | number }) => (
  <Card>
    <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{title}</p>
    <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
  </Card>
);

const DetailField = ({ label, value }: { label: string; value: any }) => {
  const display = typeof value === "boolean" ? (value ? "Yes" : "No") : value;
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-800">{display || "-"}</p>
    </div>
  );
};

export const AdminV2PanelPage = () => {
  const { module, query, pushToast } = useAdminV2Store();
  const [kpis, setKpis] = useState<Record<string, number>>({});
  const [live, setLive] = useState<any>({ pending_rides: [], driver_live: [], alerts: [] });
  const [riders, setRiders] = useState<any[]>([]);
  const [managedUsers, setManagedUsers] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [rides, setRides] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [finance, setFinance] = useState<any>({ rows: [] });
  const [tasks, setTasks] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<RiderRegistrationItem[]>([]);
  const [allRegistrations, setAllRegistrations] = useState<RiderRegistrationItem[]>([]);
  const [registrationStatus, setRegistrationStatus] = useState("pending");
  const [selectedRegistrationId, setSelectedRegistrationId] = useState<string>("");
  const [registrationDraft, setRegistrationDraft] = useState<Partial<RiderRegistrationItem> | null>(null);
  const [registrationRemark, setRegistrationRemark] = useState("");
  const [registrationSearch, setRegistrationSearch] = useState("");

  const loadRegistrations = async (resetSelection = false) => {
    try {
      const rows = await adminV2Api.listRiderRegistrations(registrationStatus === "all" ? undefined : registrationStatus);
      setRegistrations(rows);
      if (resetSelection) {
        setSelectedRegistrationId("");
        setRegistrationDraft(null);
        setRegistrationRemark("");
      }
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Unable to load rider registrations", "danger");
    }
  };

  const handleRegistrationAction = async (id: string, action: "approve" | "reject") => {
    const note = window.prompt(action === "approve" ? "Approval note (optional)" : "Rejection note (optional)", "") ?? "";
    try {
      if (action === "approve") {
        await adminV2Api.approveRiderRegistration(id, note);
        pushToast("Registration approved", "success");
      } else {
        await adminV2Api.rejectRiderRegistration(id, note);
        pushToast("Registration rejected", "warning");
      }
      setSelectedRegistrationId("");
      setRegistrationDraft(null);
      setRegistrationRemark("");
      await loadRegistrations(true);
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Registration action failed", "danger");
    }
  };

  const handleRegistrationModify = async (row: RiderRegistrationItem) => {
    const brand_model = window.prompt("Update vehicle model", row.brand_model || "") ?? row.brand_model;
    const service_type = window.prompt("Update service type", row.service_type || "Instant Ride") ?? row.service_type;
    const area = window.prompt("Update area/city", row.area || "") ?? row.area;

    try {
      await adminV2Api.updateRiderRegistration(row.id, {
        brand_model,
        service_type,
        area,
      });
      pushToast("Registration updated", "success");
      loadRegistrations();
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Unable to modify registration", "danger");
    }
  };

  const handleSelectRegistration = (row: RiderRegistrationItem) => {
    setSelectedRegistrationId(row.id);
    setRegistrationDraft(row);
    setRegistrationRemark(row.admin_note || "");
  };

  const handleRegistrationFieldChange = (key: keyof RiderRegistrationItem, value: any) => {
    setRegistrationDraft((prev) => ({ ...(prev || {}), [key]: value }));
  };

  const handleSaveRegistrationDraft = async () => {
    if (!selectedRegistrationId || !registrationDraft) return;
    try {
      await adminV2Api.updateRiderRegistration(selectedRegistrationId, {
        brand_model: registrationDraft.brand_model,
        registration_number: registrationDraft.registration_number,
        vehicle_category: registrationDraft.vehicle_category,
        vehicle_type: registrationDraft.vehicle_type,
        service_type: registrationDraft.service_type,
        color: registrationDraft.color,
        seater_count: registrationDraft.seater_count,
        vehicle_condition: registrationDraft.vehicle_condition,
        rc_number: registrationDraft.rc_number,
        insurance_number: registrationDraft.insurance_number,
        notes: registrationDraft.notes,
        model_year: registrationDraft.model_year,
        has_ac: registrationDraft.has_ac,
        has_music: registrationDraft.has_music,
        owner_name: registrationDraft.owner_name,
        owner_phone: registrationDraft.owner_phone,
        owner_email: registrationDraft.owner_email,
        owner_address: registrationDraft.owner_address,
        driver_name: registrationDraft.driver_name,
        driver_number: registrationDraft.driver_number,
        driver_calling_number: registrationDraft.driver_calling_number,
        driver_dl_number: registrationDraft.driver_dl_number,
        area: registrationDraft.area,
      });
      pushToast("Registration details saved", "success");
      loadRegistrations();
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Unable to save registration", "danger");
    }
  };

  const handleRegistrationDecision = async (action: "approve" | "reject" | "refile") => {
    if (!selectedRegistrationId) return;
    try {
      if (action === "approve") {
        await adminV2Api.approveRiderRegistration(selectedRegistrationId, registrationRemark);
        pushToast("Registration verified/approved", "success");
      } else if (action === "reject") {
        await adminV2Api.rejectRiderRegistration(selectedRegistrationId, registrationRemark || "Rejected by admin");
        pushToast("Registration rejected", "warning");
      } else {
        await adminV2Api.requestChangesRiderRegistration(selectedRegistrationId, registrationRemark || "Please refile with corrections");
        pushToast("Sent for refile", "info");
      }
      setSelectedRegistrationId("");
      setRegistrationDraft(null);
      setRegistrationRemark("");
      await loadRegistrations(true);
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Registration action failed", "danger");
    }
  };

  const refreshAll = async () => {
    const results = await Promise.allSettled([
      adminV2Api.getKpis(),
      adminV2Api.getLiveOps(),
      adminV2Api.listRiders(query),
      adminV2Api.listDrivers(),
      adminV2Api.listVehicles(),
      adminV2Api.listRides(),
      adminV2Api.listApprovals(),
      adminV2Api.listTickets(),
      adminV2Api.financeOverview(),
      adminV2Api.listTasks(),
      adminV2Api.logs(),
      adminV2Api.listAllServices(),
      adminV2Api.listRiderRegistrations(),
      adminV2Api.listManagedUsers(),
    ]);

    const valueOr = <T,>(index: number, fallback: T): T => {
      const r = results[index];
      return r.status === "fulfilled" ? (r.value as T) : fallback;
    };

    setKpis(valueOr(0, {}));
    setLive(valueOr(1, { pending_rides: [], driver_live: [], alerts: [] }));
    setRiders(valueOr(2, []));
    setDrivers(valueOr(3, []));
    setVehicles(valueOr(4, []));
    setRides(valueOr(5, []));
    setApprovals(valueOr(6, []));
    setTickets(valueOr(7, []));
    setFinance(valueOr(8, { rows: [] }));
    setTasks(valueOr(9, []));
    setLogs(valueOr(10, []));
    setAllRegistrations(valueOr(12, []));
    setManagedUsers(valueOr(13, []));

    loadRegistrations();

    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length > 0) {
      pushToast(`${failed.length} module(s) failed to load. Others are working.`, "warning");
    }
  };

  useEffect(() => {
    adminV2Api.seedAdmins().catch(() => undefined);
    adminV2Api.seedData().catch(() => undefined);
    refreshAll();
  }, []);

  usePolling(() => {
    if (module === "dashboard" || module === "rides") {
      adminV2Api.getLiveOps().then(setLive).catch(() => undefined);
      adminV2Api.getKpis().then(setKpis).catch(() => undefined);
    }
  }, 5000, [module]);

  useEffect(() => { refreshAll(); }, [query]);
  useEffect(() => {
    if (module === "registrations") {
      loadRegistrations(true);
    }
  }, [module, registrationStatus]);

  useEffect(() => {
    if (!registrations.length) {
      setSelectedRegistrationId("");
      setRegistrationDraft(null);
      setRegistrationRemark("");
      return;
    }
    const selected = registrations.find((r) => r.id === selectedRegistrationId);
    if (selected) {
      setRegistrationDraft(selected);
      setRegistrationRemark(selected.admin_note || "");
    } else if (selectedRegistrationId) {
      setSelectedRegistrationId("");
      setRegistrationDraft(null);
      setRegistrationRemark("");
    }
  }, [registrations, selectedRegistrationId]);

  const riderCols = useMemo<ColumnDef<any>[]>(() => [
    { header: "Name", accessorKey: "name" },
    { header: "Phone", accessorKey: "phone" },
    { header: "City", accessorKey: "city" },
    { header: "Status", cell: ({ row }) => <Chip text={row.original.status || "active"} tone={toneForStatus(row.original.status)} /> },
    { header: "Actions", cell: ({ row }) => <div className="flex gap-1"><Button className="h-8 px-2" onClick={() => adminV2Api.blockRider(row.original.id).then(refreshAll)}>Block</Button><Button className="h-8 px-2" onClick={() => adminV2Api.unblockRider(row.original.id).then(refreshAll)}>Unblock</Button></div> },
  ], []);



  const rideCols = useMemo<ColumnDef<any>[]>(() => [
    { header: "Rider", accessorKey: "rider_name" },
    { header: "Pickup", accessorKey: "pickup" },
    { header: "Drop", accessorKey: "drop" },
    { header: "Fare", accessorKey: "fare" },
    { header: "Status", cell: ({ row }) => <Chip text={row.original.status || "-"} tone={toneForStatus(row.original.status)} /> },
    { header: "Payment", cell: ({ row }) => <Chip text={row.original.payment_status || "unpaid"} tone={toneForStatus(row.original.payment_status)} /> },
    { header: "Actions", cell: ({ row }) => <div className="flex gap-1"><Button className="h-8 px-2" onClick={() => adminV2Api.updateRideStatus(row.original.id, "completed").then(refreshAll)}>Complete</Button><Button className="h-8 px-2" onClick={() => adminV2Api.updateRideStatus(row.original.id, "cancelled").then(refreshAll)}>Cancel</Button></div> },
  ], []);



  const ticketCols = useMemo<ColumnDef<any>[]>(() => [
    { header: "Title", accessorKey: "title" },
    { header: "Category", accessorKey: "category" },
    { header: "Severity", accessorKey: "severity" },
    { header: "Status", cell: ({ row }) => <Chip text={row.original.status} tone={toneForStatus(row.original.status)} /> },
    { header: "Assignee", accessorKey: "assigned_to" },
    { header: "Actions", cell: ({ row }) => <div className="flex gap-1"><Button className="h-8 px-2" onClick={() => adminV2Api.updateTicketStatus(row.original.id, "resolved").then(refreshAll)}>Resolve</Button></div> },
  ], []);

  const paymentCols = useMemo<ColumnDef<any>[]>(() => [
    { header: "Ride", accessorKey: "ride_id" },
    { header: "Driver", accessorKey: "driver_id" },
    { header: "Amount", accessorKey: "amount" },
    { header: "Method", accessorKey: "method" },
    { header: "Status", cell: ({ row }) => <Chip text={row.original.status} tone={toneForStatus(row.original.status)} /> },
    { header: "Actions", cell: ({ row }) => <Button className="h-8 px-2" onClick={() => adminV2Api.payoutDriver(row.original.id).then(refreshAll)}>Payout</Button> },
  ], []);

  const taskCols = useMemo<ColumnDef<any>[]>(() => [
    { header: "Title", accessorKey: "title" },
    { header: "Type", accessorKey: "type" },
    { header: "Priority", accessorKey: "priority" },
    { header: "Assignee", accessorKey: "assignee_admin_id" },
    { header: "Status", cell: ({ row }) => <Chip text={row.original.status} tone={toneForStatus(row.original.status)} /> },
    { header: "Actions", cell: ({ row }) => <div className="flex gap-1"><Button className="h-8 px-2" onClick={() => adminV2Api.updateTaskStatus(row.original.id, "in_progress").then(refreshAll)}>Start</Button><Button className="h-8 px-2" onClick={() => adminV2Api.updateTaskStatus(row.original.id, "resolved").then(refreshAll)}>Resolve</Button></div> },
  ], []);

  const logCols = useMemo<ColumnDef<any>[]>(() => [
    { header: "Module", accessorKey: "module" },
    { header: "Action", accessorKey: "action" },
    { header: "Admin", accessorKey: "admin_name" },
    { header: "Role", accessorKey: "admin_role" },
    { header: "Status", accessorKey: "status" },
    { header: "Time", accessorKey: "created_at" },
  ], []);



  const selectedRegistration = registrations.find((r) => r.id === selectedRegistrationId) || null;
  const selectedRegistrationDriver = selectedRegistration ? drivers.find((driver) => driver.id === selectedRegistration.driver_id) : null;
  const orderedRegistrations = useMemo(() => {
    const search = registrationSearch.trim().toLowerCase();
    return [...registrations]
      .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime())
      .filter((r) => {
        if (!search) return true;
        return [
          r.brand_model,
          r.registration_number,
          r.vehicle_type,
          r.service_type,
          r.owner_name,
          r.owner_phone,
          r.driver_name,
          r.driver_number,
          r.area,
          r.rider_id_format,
          r.request_public_id,
        ].some((value) => String(value || "").toLowerCase().includes(search));
      });
  }, [registrations, registrationSearch]);

  const moduleView = () => {
    if (module === "dashboard") return (
      <AdminDashboardOverview
        kpis={kpis}
        live={live}
        rides={rides}
        drivers={drivers}
        users={managedUsers}
        finance={finance}
        tickets={tickets}
        registrations={allRegistrations}
        onRefresh={refreshAll}
      />
    );
    if (module === "users-mgmt") return <UserManagementBoard />;
    if (module === "rider-mgmt") return <RiderManagementBoard drivers={drivers} registrations={allRegistrations} onRefresh={refreshAll} />;
    if (module === "rides") return <LiveRidesBoard />;
    if (module === "live-search") return <LiveSearchMonitorBoard />;
    if (module === "services") return <ServiceManagementBoard />;
    if (module === "price-mgmt") return <PriceManagementBoard />;
    if (module === "team-mgmt") return <TeamManagementBoard />;
    if (module === "company-structure") return <CompanyStructureBoard />;
    if (module === "policies") return <PolicyManagementBoard />;
    if (module === "support") return <SupportDeskBoard />;
    if (module === "broadcast") return <BroadcastManagementBoard />;

    if (module === "registrations") return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xl font-bold text-slate-800">Vehicle KYC Approvals</p>
            <p className="text-sm text-slate-500">Oldest vehicle request stays on top. Open details to verify, modify, approve, reject, or send for refile.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Status</label>
            <select
              value={registrationStatus}
              onChange={(e) => setRegistrationStatus(e.target.value)}
              className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm"
            >
              <option value="pending">Pending</option>
              <option value="changes_requested">Refile</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All</option>
            </select>
            <Button onClick={loadRegistrations}>Refresh</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <KV title="Total" value={registrations.length} />
          <KV title="Approved" value={registrations.filter((r) => (r.status || "").toLowerCase() === "approved").length} />
          <KV title="Pending" value={registrations.filter((r) => (r.status || "").toLowerCase() === "pending").length} />
          <KV title="Refile" value={registrations.filter((r) => (r.status || "").toLowerCase() === "changes_requested").length} />
        </div>

        {!selectedRegistration && (
        <Card className="overflow-hidden bg-white p-0 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 p-4">
            <div>
              <p className="font-bold text-slate-800">Vehicle KYC Request List</p>
              <p className="text-xs text-slate-500">{orderedRegistrations.length} records shown, sorted by first submitted.</p>
            </div>
            <input
              value={registrationSearch}
              onChange={(e) => setRegistrationSearch(e.target.value)}
              placeholder="Search vehicle, owner, driver, RC, city"
              className="h-10 min-w-[260px] rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-500"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-100 text-xs font-bold uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Vehicle</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Driver</th>
                  <th className="px-4 py-3">Area</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orderedRegistrations.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-800">{r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN") : "-"}</p>
                      <p className="text-xs text-slate-500">{r.created_at ? new Date(r.created_at).toLocaleTimeString("en-IN") : "Oldest first"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-800">{r.brand_model || "Vehicle details pending"}</p>
                      <p className="text-xs font-semibold uppercase text-slate-500">{r.registration_number || "RC pending"}</p>
                      <p className="text-xs text-slate-400">{r.vehicle_category || r.vehicle_type || "-"} / {r.service_type || "Service not set"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-700">{r.owner_name || "-"}</p>
                      <p className="text-xs text-slate-500">{r.owner_phone || r.owner_email || "-"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-700">{r.driver_name || "-"}</p>
                      <p className="text-xs text-slate-500">{r.driver_number || r.driver_calling_number || "-"}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.area || "-"}</td>
                    <td className="px-4 py-3">
                      <Chip text={r.status || "pending"} tone={toneForStatus(r.status)} />
                      {r.request_public_id && <p className="mt-1 text-[11px] font-bold uppercase text-blue-600">{r.request_public_id}</p>}
                      {r.rider_id_format && <p className="text-[11px] font-bold uppercase text-emerald-600">{r.rider_id_format}</p>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button className="h-8 px-3 text-xs" variant="outline" onClick={() => handleSelectRegistration(r)}>View Details</Button>
                    </td>
                  </tr>
                ))}
                {orderedRegistrations.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">No vehicle KYC requests found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
        )}

        {selectedRegistration && registrationDraft && (
          <div className="space-y-4">
            <Card className="overflow-hidden p-0">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
                <div>
                  <p className="text-lg font-black text-slate-900">Vehicle KYC Details Page</p>
                  <p className="text-xs text-slate-500">All details submitted by the rider during vehicle registration are shown below.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Chip text={selectedRegistration.status || "pending"} tone={toneForStatus(selectedRegistration.status)} />
                  <Button variant="ghost" onClick={() => { setSelectedRegistrationId(""); setRegistrationDraft(null); setRegistrationRemark(""); }}>Back to List</Button>
                </div>
              </div>
              <div className="p-5">
                <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <Card className="rounded-lg p-3">
                    <p className="text-xs uppercase tracking-wider text-slate-500">Submitted At</p>
                    <p className="mt-2 text-sm font-bold text-slate-800">{new Date(selectedRegistration.created_at).toLocaleString("en-IN")}</p>
                  </Card>
                  <Card className="rounded-lg p-3">
                    <p className="text-xs uppercase tracking-wider text-slate-500">BMG Request ID</p>
                    <p className="mt-2 text-sm font-bold text-slate-800">{selectedRegistration.request_public_id || selectedRegistration.id}</p>
                  </Card>
                  <Card className="rounded-lg p-3">
                    <p className="text-xs uppercase tracking-wider text-slate-500">BMG Rider ID</p>
                    <p className="mt-2 text-sm font-bold text-slate-800">{selectedRegistration.rider_id_format || "Pending Generation"}</p>
                  </Card>
                </div>

                <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
                  <Card className="rounded-lg xl:col-span-1">
                    <p className="mb-3 font-bold text-slate-900">Submitted Vehicle Details</p>
                    <div className="grid grid-cols-1 gap-3">
                      <DetailField label="Vehicle Category" value={selectedRegistration.vehicle_category} />
                      <DetailField label="Vehicle Type" value={selectedRegistration.vehicle_type} />
                      <DetailField label="Service Type" value={selectedRegistration.service_type} />
                      <DetailField label="Brand / Model" value={selectedRegistration.brand_model} />
                      <DetailField label="Registration Number" value={selectedRegistration.registration_number} />
                      <DetailField label="RC Number" value={selectedRegistration.rc_number} />
                      <DetailField label="Insurance Number" value={selectedRegistration.insurance_number} />
                      <DetailField label="Color" value={selectedRegistration.color} />
                      <DetailField label="Model Year" value={selectedRegistration.model_year} />
                      <DetailField label="Seater Count" value={selectedRegistration.seater_count} />
                      <DetailField label="Vehicle Condition" value={selectedRegistration.vehicle_condition} />
                      <DetailField label="AC Available" value={selectedRegistration.has_ac} />
                      <DetailField label="Music Available" value={selectedRegistration.has_music} />
                    </div>
                  </Card>

                  <Card className="rounded-lg xl:col-span-1">
                    <p className="mb-3 font-bold text-slate-900">Submitted Owner Details</p>
                    <div className="grid grid-cols-1 gap-3">
                      <DetailField label="Owner Name" value={selectedRegistration.owner_name} />
                      <DetailField label="Owner Phone" value={selectedRegistration.owner_phone} />
                      <DetailField label="Owner Email" value={selectedRegistration.owner_email} />
                      <DetailField label="Owner Address" value={selectedRegistration.owner_address} />
                      <DetailField label="Owner is Driver" value={selectedRegistration.is_owner_driver} />
                      <DetailField label="Operating Area / City" value={selectedRegistration.area} />
                    </div>
                  </Card>

                  <Card className="rounded-lg xl:col-span-1">
                    <p className="mb-3 font-bold text-slate-900">Submitted Driver & Admin Details</p>
                    <div className="grid grid-cols-1 gap-3">
                      <DetailField label="Driver Name" value={selectedRegistration.driver_name} />
                      <DetailField label="Driver Number" value={selectedRegistration.driver_number} />
                      <DetailField label="Calling Number" value={selectedRegistration.driver_calling_number} />
                      <DetailField label="Driver DL Number" value={selectedRegistration.driver_dl_number} />
                      <DetailField label="Driver User ID" value={selectedRegistrationDriver?.public_id || selectedRegistration.driver_id} />
                      <DetailField label="Internal Driver UUID" value={selectedRegistration.driver_id} />
                      <DetailField label="Admin Note" value={selectedRegistration.admin_note} />
                      <DetailField label="User Notes" value={selectedRegistration.notes} />
                      <DetailField label="Approved By" value={selectedRegistration.approved_by} />
                      <DetailField label="Last Updated" value={selectedRegistration.updated_at ? new Date(selectedRegistration.updated_at).toLocaleString("en-IN") : ""} />
                    </div>
                  </Card>
                </div>

                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                  <Card className="rounded-lg">
                    <p className="mb-3 font-bold text-slate-900">Admin Correction - Vehicle Details</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <input value={registrationDraft.brand_model || ""} onChange={(e) => handleRegistrationFieldChange("brand_model", e.target.value)} className="h-10 rounded-lg border border-slate-300 px-3 text-sm" placeholder="Vehicle model" />
                      <input value={registrationDraft.registration_number || ""} onChange={(e) => handleRegistrationFieldChange("registration_number", e.target.value.toUpperCase())} className="h-10 rounded-lg border border-slate-300 px-3 text-sm uppercase" placeholder="Registration number" />
                      <input value={registrationDraft.vehicle_category || ""} onChange={(e) => handleRegistrationFieldChange("vehicle_category", e.target.value)} className="h-10 rounded-lg border border-slate-300 px-3 text-sm" placeholder="Vehicle category" />
                      <input value={registrationDraft.vehicle_type || ""} onChange={(e) => handleRegistrationFieldChange("vehicle_type", e.target.value)} className="h-10 rounded-lg border border-slate-300 px-3 text-sm" placeholder="Vehicle type" />
                      <input value={registrationDraft.service_type || ""} onChange={(e) => handleRegistrationFieldChange("service_type", e.target.value)} className="h-10 rounded-lg border border-slate-300 px-3 text-sm" placeholder="Service type" />
                      <input value={registrationDraft.area || ""} onChange={(e) => handleRegistrationFieldChange("area", e.target.value)} className="h-10 rounded-lg border border-slate-300 px-3 text-sm" placeholder="Area/City" />
                      <input value={registrationDraft.color || ""} onChange={(e) => handleRegistrationFieldChange("color", e.target.value)} className="h-10 rounded-lg border border-slate-300 px-3 text-sm" placeholder="Color" />
                      <input value={registrationDraft.model_year || ""} onChange={(e) => handleRegistrationFieldChange("model_year", e.target.value)} className="h-10 rounded-lg border border-slate-300 px-3 text-sm" placeholder="Model year" />
                      <input type="number" value={registrationDraft.seater_count || ""} onChange={(e) => handleRegistrationFieldChange("seater_count", Number(e.target.value) || undefined)} className="h-10 rounded-lg border border-slate-300 px-3 text-sm" placeholder="Seater count" />
                      <input value={registrationDraft.vehicle_condition || ""} onChange={(e) => handleRegistrationFieldChange("vehicle_condition", e.target.value)} className="h-10 rounded-lg border border-slate-300 px-3 text-sm" placeholder="Vehicle condition" />
                      <input value={registrationDraft.rc_number || ""} onChange={(e) => handleRegistrationFieldChange("rc_number", e.target.value.toUpperCase())} className="h-10 rounded-lg border border-slate-300 px-3 text-sm uppercase" placeholder="RC number" />
                      <input value={registrationDraft.insurance_number || ""} onChange={(e) => handleRegistrationFieldChange("insurance_number", e.target.value.toUpperCase())} className="h-10 rounded-lg border border-slate-300 px-3 text-sm uppercase" placeholder="Insurance number" />
                      <div className="flex h-10 items-center gap-3 rounded-lg border border-slate-300 px-3">
                        <label className="text-sm text-slate-600">AC</label>
                        <input type="checkbox" checked={Boolean(registrationDraft.has_ac)} onChange={(e) => handleRegistrationFieldChange("has_ac", e.target.checked)} />
                        <label className="text-sm text-slate-600">Music</label>
                        <input type="checkbox" checked={Boolean(registrationDraft.has_music)} onChange={(e) => handleRegistrationFieldChange("has_music", e.target.checked)} />
                      </div>
                      <textarea value={registrationDraft.notes || ""} onChange={(e) => handleRegistrationFieldChange("notes", e.target.value)} className="min-h-[80px] rounded-lg border border-slate-300 p-3 text-sm sm:col-span-2" placeholder="User notes / vehicle notes" />
                    </div>
                  </Card>

                  <Card className="rounded-lg">
                    <p className="mb-3 font-bold text-slate-900">Admin Correction - Owner & Driver Details</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <input value={registrationDraft.owner_name || ""} onChange={(e) => handleRegistrationFieldChange("owner_name", e.target.value)} className="h-10 rounded-lg border border-slate-300 px-3 text-sm" placeholder="Owner name" />
                      <input value={registrationDraft.owner_phone || ""} onChange={(e) => handleRegistrationFieldChange("owner_phone", e.target.value)} className="h-10 rounded-lg border border-slate-300 px-3 text-sm" placeholder="Owner phone" />
                      <input value={registrationDraft.owner_email || ""} onChange={(e) => handleRegistrationFieldChange("owner_email", e.target.value)} className="h-10 rounded-lg border border-slate-300 px-3 text-sm" placeholder="Owner email" />
                      <input value={registrationDraft.driver_name || ""} onChange={(e) => handleRegistrationFieldChange("driver_name", e.target.value)} className="h-10 rounded-lg border border-slate-300 px-3 text-sm" placeholder="Driver name" />
                      <input value={registrationDraft.driver_number || ""} onChange={(e) => handleRegistrationFieldChange("driver_number", e.target.value)} className="h-10 rounded-lg border border-slate-300 px-3 text-sm" placeholder="Driver number" />
                      <input value={registrationDraft.driver_calling_number || ""} onChange={(e) => handleRegistrationFieldChange("driver_calling_number", e.target.value)} className="h-10 rounded-lg border border-slate-300 px-3 text-sm" placeholder="Driver calling number" />
                      <input value={registrationDraft.driver_dl_number || ""} onChange={(e) => handleRegistrationFieldChange("driver_dl_number", e.target.value)} className="h-10 rounded-lg border border-slate-300 px-3 text-sm" placeholder="Driver DL number" />
                      <textarea value={registrationDraft.owner_address || ""} onChange={(e) => handleRegistrationFieldChange("owner_address", e.target.value)} className="min-h-[80px] rounded-lg border border-slate-300 p-3 text-sm sm:col-span-2" placeholder="Owner address" />
                    </div>
                  </Card>
                </div>

                <div className="mt-4">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Admin Remark</label>
                  <textarea value={registrationRemark} onChange={(e) => setRegistrationRemark(e.target.value)} className="h-24 w-full rounded-lg border border-slate-300 p-3 text-sm" placeholder="Write verification note / rejection reason / refile instruction" />
                </div>

                <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
                  <Button className="h-9 px-3" onClick={handleSaveRegistrationDraft}>Modify Save</Button>
                  <Button className="h-9 px-3 border-emerald-300 text-emerald-700 hover:bg-emerald-50" onClick={() => handleRegistrationDecision("approve")}>Approve / Verify</Button>
                  <Button className="h-9 px-3 border-amber-300 text-amber-700 hover:bg-amber-50" onClick={() => handleRegistrationDecision("refile")}>Send for Refile</Button>
                  <Button className="h-9 px-3 border-rose-300 text-rose-700 hover:bg-rose-50" onClick={() => handleRegistrationDecision("reject")}>Reject</Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    );

    if (module === "support") return <DataTable data={tickets} columns={ticketCols} />;
    if (module === "finance") return <DataTable data={finance.rows || []} columns={paymentCols} />;
    if (module === "finance-dashboard") return <EnterpriseDashboard kpis={kpis} live={live} rides={rides} drivers={drivers} onRefresh={refreshAll} />;
    if (module === "finance-settlement") return <FinanceSettlementBoard onRefresh={refreshAll} />;
    if (module === "earnings-report") return <DailyEarningsReport rides={rides} />;
    if (module === "tasks") {
      const lanes = ["todo", "in_progress", "in_review", "blocked", "resolved"];
      return (
        <div className="space-y-4">
          <DataTable data={tasks} columns={taskCols} />
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-5">
            {lanes.map((lane) => (
              <Card key={lane}>
                <p className="text-sm font-semibold uppercase text-slate-600">{lane.replace("_", " ")}</p>
                <div className="mt-2 space-y-2">
                  {tasks.filter((t) => (t.status || "").toLowerCase() === lane).map((t) => (
                    <div key={t.id} className="rounded-lg border border-slate-200 p-2 text-xs">
                      <p className="font-semibold">{t.title}</p>
                      <p className="text-slate-500">{t.assignee_admin_id}</p>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      );
    }
    return <DataTable data={logs} columns={logCols} />;
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex">
        <AdminSidebarV2 />
        <div className="min-w-0 flex-1">
          <AdminTopbarV2 onLogout={() => { adminTokenStore.clear(); window.location.href = "/admin-v2/login"; }} />
          <div className="space-y-4 p-4">{moduleView()}</div>
        </div>
      </div>
    </div>
  );
};

const ServiceForm = ({ initialData, onClose, onSave }: { initialData: any; onClose: () => void; onSave: () => void }) => {
  const [form, setForm] = useState(initialData || { 
    title: "", description: "", vehicle_type: "car", service_mode: "Instant Ride", 
    vehicle_model: "Swift", icon_name: "Car", tag_highlight: "", 
    color_scheme: "from-emerald-400 to-emerald-600", display_order: 0, is_active: true 
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (initialData?.id) {
        await adminV2Api.updateService(initialData.id, form);
      } else {
        await adminV2Api.addService(form);
      }
      onSave();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <h3 className="text-xl font-bold text-slate-900 mb-6">{initialData ? "Edit Service" : "Add New Service"}</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Service Title</label>
            <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm" placeholder="e.g. Wedding Special" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
            <textarea required value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full border border-slate-200 rounded-lg p-3 text-sm h-20" placeholder="Service description..." />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vehicle Type</label>
            <select value={form.vehicle_type} onChange={e => setForm({...form, vehicle_type: e.target.value})} className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm">
              <option value="car">Car (4 Wheeler)</option>
              <option value="bike">Bike (2 Wheeler)</option>
              <option value="auto">Auto (3 Wheeler / E-Rikhsaw)</option>
              <option value="bolero">Pickup & Logistics (Bolero)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Service Mode</label>
            <select value={form.service_mode} onChange={e => setForm({...form, service_mode: e.target.value})} className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm">
              <option value="Instant Ride">Instant Ride</option>
              <option value="reserve">Reserved Trip</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vehicle Model (Backend Match)</label>
            <input value={form.vehicle_model} onChange={e => setForm({...form, vehicle_model: e.target.value})} className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm" placeholder="e.g. Swift, Wedding Special, Logistics" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Icon Name (Lucide)</label>
            <input value={form.icon_name} onChange={e => setForm({...form, icon_name: e.target.value})} className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm" placeholder="e.g. PartyPopper, Heart, Car" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Color Scheme (Tailwind)</label>
            <select value={form.color_scheme} onChange={e => setForm({...form, color_scheme: e.target.value})} className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm">
              <optgroup label="Greens">
                <option value="from-emerald-400 to-emerald-600">Emerald</option>
                <option value="from-teal-400 to-teal-600">Teal</option>
                <option value="from-green-500 to-green-700">Classic Green</option>
              </optgroup>
              <optgroup label="Blues">
                <option value="from-cyan-500 to-blue-600">Cyan to Blue</option>
                <option value="from-indigo-400 to-blue-600">Indigo</option>
                <option value="from-blue-500 to-blue-700">Royal Blue</option>
              </optgroup>
              <optgroup label="Warm">
                <option value="from-amber-400 to-orange-500">Amber / Orange</option>
                <option value="from-rose-500 to-pink-600">Rose / Pink</option>
                <option value="from-red-500 to-red-700">Red</option>
              </optgroup>
              <optgroup label="Darks">
                <option value="from-slate-700 to-slate-900">Slate Dark</option>
                <option value="from-gray-800 to-black">Midnight Black</option>
              </optgroup>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Display Order</label>
            <input type="number" value={form.display_order} onChange={e => setForm({...form, display_order: parseInt(e.target.value)})} className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} className="w-4 h-4" />
            <label className="text-sm font-bold text-slate-700">Service Active</label>
          </div>
          <div className="md:col-span-2 flex justify-end gap-3 mt-4 border-t pt-4">
             <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
             <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Service"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminV2PanelPage;



