import { useMemo, useState } from "react";
import { type RiderRegistrationItem, adminV2Api } from "@/admin_v2/services/adminApi";
import { Button, Card, Chip, Modal } from "@/admin_v2/components/ui";
import { useAdminV2Store } from "@/admin_v2/store/useAdminStore";
import * as Lucide from "lucide-react";

const COLUMNS = [
  { id: "NEW", label: "New Requests", tone: "info" as const },
  { id: "REVIEW", label: "Under Review", tone: "warning" as const },
  { id: "APPROVED", label: "Approved Fleet", tone: "success" as const },
  { id: "BLOCKED", label: "Blocked Riders", tone: "neutral" as const },
  { id: "REJECTED", label: "Rejected", tone: "danger" as const },
];

type DriverRow = {
  id: string;
  name?: string;
  phone?: string;
  city?: string;
  rating?: number;
  status?: string;
};

type BoardDriver = {
  id: string;
  driverId: string;
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
    if (!searchQ.trim()) return boardDrivers;
    const q = searchQ.trim().toLowerCase();
    return boardDrivers.filter((row) =>
      row.name.toLowerCase().includes(q) ||
      row.phone.toLowerCase().includes(q) ||
      row.registrationNumber.toLowerCase().includes(q) ||
      row.brandModel.toLowerCase().includes(q) ||
      row.riderIdFormat.toLowerCase().includes(q),
    );
  }, [boardDrivers, searchQ]);

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
          <div className="relative">
            <Lucide.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search riders by name, phone, RC..."
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              className="w-64 rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm outline-none focus:border-emerald-500"
            />
          </div>
          <Button variant="outline" onClick={exportCsv}>Export CSV</Button>
          <Button variant="outline" onClick={exportExcel}>Export Excel</Button>
          <Button onClick={refreshBoard} disabled={isUpdating}>Refresh</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
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

      <div className="flex gap-4 overflow-x-auto pb-4 pt-2">
        {COLUMNS.map((column) => {
          const columnDrivers = filteredDrivers.filter((row) => row.status === column.id);
          return (
            <div
              key={column.id}
              className="flex h-[calc(100vh-320px)] w-80 flex-shrink-0 flex-col rounded-xl bg-slate-200/50 p-3"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">{column.label}</h3>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-600 shadow-sm">{columnDrivers.length}</span>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {columnDrivers.map((driver) => (
                  <div
                    key={driver.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, driver.driverId)}
                    onClick={() => setSelectedRider(driver)}
                    className="cursor-grab rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-colors hover:border-emerald-400 active:cursor-grabbing"
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{driver.name}</p>
                        <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{driver.riderIdFormat !== "-" ? driver.riderIdFormat : "Driver Registry"}</p>
                      </div>
                      <Chip text={driver.vehicleType} tone="neutral" />
                    </div>
                    <p className="mb-1 flex items-center gap-1 text-xs text-slate-500"><Lucide.Phone size={12} /> {driver.phone}</p>
                    <p className="mb-1 flex items-center gap-1 text-xs text-slate-500"><Lucide.MapPin size={12} /> {driver.city}</p>
                    <p className="mb-3 flex items-center gap-1 text-xs text-slate-500"><Lucide.Car size={12} /> {driver.brandModel} · {driver.registrationNumber}</p>

                    <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
                      <Chip text={column.label} tone={column.tone} />
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        {column.id !== "APPROVED" && (
                          <button
                            type="button"
                            onClick={() => syncStatus(driver, "APPROVED")}
                            className="rounded-md border border-emerald-200 px-2 py-1 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
                          >
                            Approve
                          </button>
                        )}
                        {column.id !== "REJECTED" && (
                          <button
                            type="button"
                            onClick={() => syncStatus(driver, "REJECTED")}
                            className="rounded-md border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-700 transition-colors hover:bg-rose-50"
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {columnDrivers.length === 0 && (
                  <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed border-slate-300 opacity-50">
                    <p className="text-xs font-semibold text-slate-400">Drag &amp; Drop Rider</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

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
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedRider(null)}>
          <div className="h-full w-full max-w-xl animate-in overflow-y-auto bg-slate-50 shadow-2xl slide-in-from-right" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">{selectedRider.name}</h2>
                <p className="text-slate-500">{selectedRider.phone} · {selectedRider.city}</p>
              </div>
              <button onClick={() => setSelectedRider(null)} className="rounded-full p-2 transition-colors hover:bg-slate-100"><Lucide.X size={20} /></button>
            </div>

            <div className="space-y-6 p-6">
              <Card className="flex items-center justify-between border border-slate-200 bg-white p-4 shadow-sm">
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Current Status</p>
                  <Chip text={COLUMNS.find((item) => item.id === selectedRider.status)?.label || selectedRider.status} tone={COLUMNS.find((item) => item.id === selectedRider.status)?.tone || "info"} />
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Rider ID</p>
                  <p className="mt-1 text-sm font-bold text-slate-800">{selectedRider.riderIdFormat}</p>
                </div>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="mb-3 flex items-center gap-2 border-b pb-2 font-bold text-slate-700"><Lucide.User size={16} /> Personal Info</h3>
                  <div className="space-y-2">
                    <p><span className="inline-block w-20 text-xs text-slate-500">Phone</span> <span className="text-sm font-semibold">{selectedRider.phone}</span></p>
                    <p><span className="inline-block w-20 text-xs text-slate-500">Owner</span> <span className="text-sm font-semibold">{selectedRider.ownerName || "-"}</span></p>
                    <p><span className="inline-block w-20 text-xs text-slate-500">City</span> <span className="text-sm font-semibold">{selectedRider.city}</span></p>
                    <p><span className="inline-block w-20 text-xs text-slate-500">Area</span> <span className="text-sm font-semibold">{selectedRider.area || "-"}</span></p>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="mb-3 flex items-center gap-2 border-b pb-2 font-bold text-slate-700"><Lucide.Car size={16} /> Vehicle Info</h3>
                  <div className="space-y-2">
                    <p><span className="inline-block w-20 text-xs text-slate-500">Type</span> <span className="text-sm font-semibold">{selectedRider.vehicleType}</span></p>
                    <p><span className="inline-block w-20 text-xs text-slate-500">Model</span> <span className="text-sm font-semibold">{selectedRider.brandModel}</span></p>
                    <p><span className="inline-block w-20 text-xs text-slate-500">Reg No</span> <span className="text-sm font-semibold">{selectedRider.registrationNumber}</span></p>
                    <p><span className="inline-block w-20 text-xs text-slate-500">Service</span> <span className="text-sm font-semibold">{selectedRider.serviceType || "-"}</span></p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 flex items-center gap-2 border-b pb-2 font-bold text-slate-700"><Lucide.FileText size={16} /> Documents & Registration</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <p className="mb-1 text-xs text-slate-500">Driver DL</p>
                    <p className="text-sm font-bold text-slate-800">{selectedRider.driverDlNumber || "Missing"}</p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <p className="mb-1 text-xs text-slate-500">Vehicle Category</p>
                    <p className="text-sm font-bold text-slate-800">{selectedRider.vehicleCategory || "Missing"}</p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <p className="mb-1 text-xs text-slate-500">Model Year</p>
                    <p className="text-sm font-bold text-slate-800">{selectedRider.modelYear || "Missing"}</p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <p className="mb-1 text-xs text-slate-500">Owner Phone</p>
                    <p className="text-sm font-bold text-slate-800">{selectedRider.ownerPhone || "Missing"}</p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <p className="mb-1 text-xs text-slate-500">Owner Email</p>
                    <p className="text-sm font-bold text-slate-800">{selectedRider.ownerEmail || "Missing"}</p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <p className="mb-1 text-xs text-slate-500">Comfort</p>
                    <p className="text-sm font-bold text-slate-800">{selectedRider.hasAc ? "AC" : "Non AC"} {selectedRider.hasMusic ? "· Music" : ""}</p>
                  </div>
                </div>
                {selectedRider.adminNote ? (
                  <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm text-amber-900">
                    <p className="font-semibold">Admin Note</p>
                    <p className="mt-1">{selectedRider.adminNote}</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
