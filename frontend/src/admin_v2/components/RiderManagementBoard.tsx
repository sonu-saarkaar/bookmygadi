import { useMemo, useState } from "react";
import { type RiderRegistrationItem, adminV2Api } from "@/admin_v2/services/adminApi";
import { Button, Card, Chip, Modal } from "@/admin_v2/components/ui";
import { useAdminV2Store } from "@/admin_v2/store/useAdminStore";
import * as Lucide from "lucide-react";
import { RiderProfileDashboard } from "./RiderProfileDashboard";

const COLUMNS = [
  { id: "NEW", label: "New Requests", tone: "info" as const },
  { id: "REVIEW", label: "Under Review", tone: "warning" as const },
  { id: "APPROVED", label: "Approved Fleet", tone: "success" as const },
  { id: "BLOCKED", label: "Blocked Riders", tone: "neutral" as const },
  { id: "REJECTED", label: "Rejected", tone: "danger" as const },
];

type DriverRow = {
  id: string;
  public_id?: string;
  name?: string;
  phone?: string;
  city?: string;
  rating?: number;
  status?: string;
};

type BoardDriver = {
  id: string;
  driverId: string;
  driverPublicId?: string;
  registrationId?: string;
  name: string;
  phone: string;
  city: string;
  status: string;
  brandModel: string;
  registrationNumber: string;
  vehicleType: string;
  riderIdFormat: string;
  createdAt?: string;
  ownerName?: string;
  ownerPhone?: string;
  ownerEmail?: string;
  driverName?: string;
  driverNumber?: string;
  driverCallingNumber?: string;
  driverDlNumber?: string;
  area?: string;
  vehicleCategory?: string;
  serviceType?: string;
  color?: string;
  modelYear?: string;
  hasAc?: boolean | null;
  hasMusic?: boolean | null;
  adminNote?: string | null;
  source: "driver" | "registration";
};

const normalizeBoardStatus = (driverStatus?: string, registrationStatus?: string) => {
  const raw = String(registrationStatus || driverStatus || "pending_review").toLowerCase();
  if (["approved", "active"].includes(raw)) return "APPROVED";
  if (["blocked", "block"].includes(raw)) return "BLOCKED";
  if (["rejected", "declined"].includes(raw)) return "REJECTED";
  if (["changes_requested", "under_review", "review", "in_review"].includes(raw)) return "REVIEW";
  return "NEW";
};

const formatBoardDrivers = (drivers: DriverRow[], registrations: RiderRegistrationItem[]) => {
  const registrationByDriverId = new Map(registrations.map((row) => [row.driver_id, row]));
  const mappedDrivers = drivers.map((driver) => {
    const registration = registrationByDriverId.get(driver.id);
    return {
      id: registration?.id || driver.id,
      driverId: driver.id,
      driverPublicId: driver.public_id,
      registrationId: registration?.id,
      name: registration?.driver_name || driver.name || "Unnamed Rider",
      phone: registration?.driver_number || driver.phone || "-",
      city: registration?.area || driver.city || "-",
      status: normalizeBoardStatus(driver.status, registration?.status),
      brandModel: registration?.brand_model || "Vehicle details pending",
      registrationNumber: registration?.registration_number || "Pending RC",
      vehicleType: registration?.vehicle_type || "Driver",
      riderIdFormat: registration?.rider_id_format || "-",
      createdAt: registration?.created_at,
      ownerName: registration?.owner_name || undefined,
      ownerPhone: registration?.owner_phone || undefined,
      ownerEmail: registration?.owner_email || undefined,
      driverName: registration?.driver_name || driver.name || undefined,
      driverNumber: registration?.driver_number || driver.phone || undefined,
      driverCallingNumber: registration?.driver_calling_number || undefined,
      driverDlNumber: registration?.driver_dl_number || undefined,
      area: registration?.area || driver.city || undefined,
      vehicleCategory: registration?.vehicle_category || undefined,
      serviceType: registration?.service_type || undefined,
      color: registration?.color || undefined,
      modelYear: registration?.model_year || undefined,
      hasAc: registration?.has_ac,
      hasMusic: registration?.has_music,
      adminNote: registration?.admin_note,
      source: registration ? "registration" : "driver",
    } satisfies BoardDriver;
  });

  const orphanRegistrations = registrations
    .filter((registration) => !drivers.some((driver) => driver.id === registration.driver_id))
    .map((registration) => ({
      id: registration.id,
      driverId: registration.driver_id,
      driverPublicId: undefined,
      registrationId: registration.id,
      name: registration.driver_name || registration.owner_name || "Unnamed Rider",
      phone: registration.driver_number || registration.owner_phone || "-",
      city: registration.area || "-",
      status: normalizeBoardStatus(undefined, registration.status),
      brandModel: registration.brand_model || "Vehicle details pending",
      registrationNumber: registration.registration_number || "Pending RC",
      vehicleType: registration.vehicle_type || "Driver",
      riderIdFormat: registration.rider_id_format || "-",
      createdAt: registration.created_at,
      ownerName: registration.owner_name || undefined,
      ownerPhone: registration.owner_phone || undefined,
      ownerEmail: registration.owner_email || undefined,
      driverName: registration.driver_name || undefined,
      driverNumber: registration.driver_number || undefined,
      driverCallingNumber: registration.driver_calling_number || undefined,
      driverDlNumber: registration.driver_dl_number || undefined,
      area: registration.area || undefined,
      vehicleCategory: registration.vehicle_category || undefined,
      serviceType: registration.service_type || undefined,
      color: registration.color || undefined,
      modelYear: registration.model_year || undefined,
      hasAc: registration.has_ac,
      hasMusic: registration.has_music,
      adminNote: registration.admin_note,
      source: "registration" as const,
    }));

  return [...mappedDrivers, ...orphanRegistrations];
};

const downloadTextFile = (filename: string, content: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const toCsv = (rows: BoardDriver[]) => {
  const headers = ["Name", "Phone", "City", "Status", "Vehicle Type", "Brand Model", "Registration Number", "Rider ID"];
  const body = rows.map((row) => [
    row.name,
    row.phone,
    row.city,
    row.status,
    row.vehicleType,
    row.brandModel,
    row.registrationNumber,
    row.riderIdFormat,
  ]);
  return [headers, ...body]
    .map((cols) => cols.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
};

type RiderManagementBoardProps = {
  drivers: DriverRow[];
  registrations: RiderRegistrationItem[];
  onRefresh: () => Promise<void> | void;
};

export const RiderManagementBoard = ({ drivers, registrations, onRefresh }: RiderManagementBoardProps) => {
  const { pushToast } = useAdminV2Store();
  const [searchQ, setSearchQ] = useState("");
  const [selectedRider, setSelectedRider] = useState<BoardDriver | null>(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockDriverId, setBlockDriverId] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const boardDrivers = useMemo(() => formatBoardDrivers(drivers, registrations), [drivers, registrations]);

  const analytics = useMemo(() => ({
    total: boardDrivers.length,
    pending: boardDrivers.filter((row) => row.status === "NEW" || row.status === "REVIEW").length,
    approved: boardDrivers.filter((row) => row.status === "APPROVED").length,
    blocked: boardDrivers.filter((row) => row.status === "BLOCKED").length,
    rejected: boardDrivers.filter((row) => row.status === "REJECTED").length,
  }), [boardDrivers]);

  const filteredDrivers = useMemo(() => {
    return boardDrivers.filter((row) => {
      const matchesQ = !searchQ.trim() || 
        row.name.toLowerCase().includes(searchQ.trim().toLowerCase()) ||
        row.phone.toLowerCase().includes(searchQ.trim().toLowerCase()) ||
        row.registrationNumber.toLowerCase().includes(searchQ.trim().toLowerCase()) ||
        row.brandModel.toLowerCase().includes(searchQ.trim().toLowerCase()) ||
        row.riderIdFormat.toLowerCase().includes(searchQ.trim().toLowerCase());
        
      const matchesS = !statusFilter || row.status === statusFilter;
      return matchesQ && matchesS;
    });
  }, [boardDrivers, searchQ, statusFilter]);

  const exportCsv = () => {
    downloadTextFile("bookmygadi-riders.csv", toCsv(filteredDrivers), "text/csv;charset=utf-8;");
  };

  const exportExcel = () => {
    const tabular = [
      ["Name", "Phone", "City", "Status", "Vehicle Type", "Brand Model", "Registration Number", "Rider ID"].join("\t"),
      ...filteredDrivers.map((row) => [
        row.name,
        row.phone,
        row.city,
        row.status,
        row.vehicleType,
        row.brandModel,
        row.registrationNumber,
        row.riderIdFormat,
      ].join("\t")),
    ].join("\n");
    downloadTextFile("bookmygadi-riders.xls", tabular, "application/vnd.ms-excel;charset=utf-8;");
  };

  const refreshBoard = async () => {
    await onRefresh();
  };

  const handleDragStart = (e: React.DragEvent, driverId: string) => {
    e.dataTransfer.setData("driverId", driverId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const syncStatus = async (row: BoardDriver, newStatus: string) => {
    if (newStatus === row.status) return;
    if (newStatus === "BLOCKED") {
      setBlockDriverId(row.driverId);
      setShowBlockModal(true);
      return;
    }

    if (newStatus === "REVIEW" || newStatus === "NEW") {
      pushToast("Use registration review flow for review/refile states. Approved and rejected actions sync live here.", "info");
      return;
    }

    setIsUpdating(true);
    try {
      if (newStatus === "APPROVED") {
        if (row.registrationId) {
          await adminV2Api.approveRiderRegistration(row.registrationId, "Approved from rider board");
        } else {
          await adminV2Api.approveDriver(row.driverId);
        }
        pushToast("Rider approved successfully", "success");
      } else if (newStatus === "REJECTED") {
        if (row.registrationId) {
          await adminV2Api.rejectRiderRegistration(row.registrationId, "Rejected from rider board");
        } else {
          await adminV2Api.rejectDriver(row.driverId);
        }
        pushToast("Rider rejected successfully", "warning");
      }
      await refreshBoard();
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Unable to update rider status", "danger");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const driverId = e.dataTransfer.getData("driverId");
    const row = boardDrivers.find((item) => item.driverId === driverId);
    if (!row) return;
    await syncStatus(row, newStatus);
  };

  const handleBlockConfirm = async () => {
    if (!blockReason.trim()) {
      pushToast("Block reason is required", "warning");
      return;
    }
    pushToast("Live admin API currently does not expose block action for drivers. Approve/reject sync is active.", "info");
    setShowBlockModal(false);
    setBlockReason("");
    setBlockDriverId("");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Unified Rider Management System</h2>
          <p className="text-sm text-slate-500">Registry, Fleet, Verifications, and Pipeline</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportCsv}>Export CSV</Button>
          <Button variant="outline" onClick={exportExcel}>Export Excel</Button>
          <Button onClick={refreshBoard} disabled={isUpdating}>Refresh</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card className="border-l-4 border-l-blue-500 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">Total Riders</p>
          <p className="mt-1 text-2xl font-bold">{analytics.total}</p>
        </Card>
        <Card className="border-l-4 border-l-amber-500 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">Pending</p>
          <p className="mt-1 text-2xl font-bold">{analytics.pending}</p>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">Approved Fleet</p>
          <p className="mt-1 text-2xl font-bold">{analytics.approved}</p>
        </Card>
        <Card className="border-l-4 border-l-slate-800 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">Blocked</p>
          <p className="mt-1 text-2xl font-bold">{analytics.blocked}</p>
        </Card>
        <Card className="border-l-4 border-l-rose-500 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">Rejected</p>
          <p className="mt-1 text-2xl font-bold">{analytics.rejected}</p>
        </Card>
      </div>

      <Card className="bg-white overflow-hidden p-0 shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 min-w-0 max-w-sm">
            <Lucide.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search riders by name, phone, RC..." 
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-emerald-500"
            />
          </div>
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none bg-white min-w-[150px]"
          >
            <option value="">All Statuses</option>
            {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm text-left">
            <thead className="bg-slate-100 text-slate-600 text-xs uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Rider Info</th>
                <th className="px-4 py-3">Vehicle Details</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Registration</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDrivers.map(driver => (
                <tr key={driver.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="max-w-[190px] truncate font-bold text-slate-800" title={driver.name}>{driver.name}</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Lucide.Phone size={10} /> {driver.phone}</span>
                      {driver.driverPublicId && <span className="text-[10px] font-bold text-blue-600 mt-1 uppercase">{driver.driverPublicId}</span>}
                      {driver.riderIdFormat !== "-" && <span className="text-[10px] font-semibold text-emerald-600 mt-1 uppercase">{driver.riderIdFormat}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="max-w-[220px] truncate font-bold text-slate-700 text-xs" title={driver.brandModel}>{driver.brandModel}</span>
                      <span className="max-w-[220px] truncate text-xs text-slate-500 mt-0.5" title={driver.registrationNumber}>{driver.registrationNumber}</span>
                      <span className="text-[10px] text-slate-400 uppercase mt-1 tracking-wider">{driver.vehicleType}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 font-medium">{driver.city}</td>
                  <td className="px-4 py-3">
                    <Chip text={COLUMNS.find(c => c.id === driver.status)?.label || driver.status} tone={COLUMNS.find(c => c.id === driver.status)?.tone || "info"} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    {driver.source === "registration" ? (
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">App Flow</span>
                    ) : (
                      <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">Manual</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2 whitespace-nowrap">
                      <Button variant="outline" className="h-8 text-xs bg-white" onClick={() => setSelectedRider(driver)}>View Profile</Button>
                      <div className="relative group">
                        <Button variant="outline" className="h-8 px-2 bg-white text-slate-500 hover:text-slate-900 border-slate-200 hover:bg-slate-50"><Lucide.MoreVertical size={14} /></Button>
                        <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl w-32 py-1 hidden group-hover:block z-50">
                          {driver.status !== "APPROVED" && <button className="w-full text-left px-4 py-2 text-xs text-emerald-600 hover:bg-emerald-50 font-bold" onClick={() => syncStatus(driver, "APPROVED")}>Approve</button>}
                          {driver.status !== "REJECTED" && <button className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 font-bold" onClick={() => syncStatus(driver, "REJECTED")}>Reject</button>}
                          <button className="w-full text-left px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 font-bold" onClick={() => syncStatus(driver, "BLOCKED")}>Block</button>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredDrivers.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400 font-medium">No riders found matching the criteria.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showBlockModal && (
        <Modal onClose={() => setShowBlockModal(false)}>
          <div className="space-y-4 p-4">
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800"><Lucide.Ban className="text-rose-500" /> Block Rider</h3>
            <p className="text-sm text-slate-500">Block action ka UI ready hai, but live admin API me dedicated driver block endpoint abhi available nahi hai. Reason note yahan save karke aap team ke saath share kar sakte ho.</p>
            <textarea
              placeholder="Reason for blocking (e.g. Fraud, bad behavior)..."
              className="min-h-[100px] w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-rose-500"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowBlockModal(false)}>Cancel</Button>
              <Button onClick={handleBlockConfirm} className="bg-rose-600 text-white hover:bg-rose-700">Save Note</Button>
            </div>
          </div>
        </Modal>
      )}

      {selectedRider && (
        <RiderProfileDashboard rider={selectedRider} onClose={() => setSelectedRider(null)} />
      )}
    </div>
  );
};
