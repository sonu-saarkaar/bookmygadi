import { useEffect, useState, useMemo } from "react";
import { adminV2Api } from "@/admin_v2/services/adminApi";
import { Button, Card, Chip, Modal } from "@/admin_v2/components/ui";
import { useAdminV2Store } from "@/admin_v2/store/useAdminStore";
import * as Lucide from "lucide-react";

const COLUMNS = [
  { id: "NEW", label: "New Requests", tone: "info" },
  { id: "REVIEW", label: "Under Review", tone: "warning" },
  { id: "APPROVED", label: "Approved Fleet", tone: "success" },
  { id: "BLOCKED", label: "Blocked Riders", tone: "neutral" },
  { id: "REJECTED", label: "Rejected", tone: "danger" },
];

export const RiderManagementBoard = () => {
  const { pushToast } = useAdminV2Store();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQ, setSearchQ] = useState("");

  // Block Modal
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockDriverId, setBlockDriverId] = useState("");
  const [blockReason, setBlockReason] = useState("");

  // Drawer (Rider Profile)
  const [selectedRider, setSelectedRider] = useState<any>(null);

  const loadCRM = async () => {
    try {
      const [drvs, tms, stats] = await Promise.all([
        adminV2Api.crmListDrivers(),
        adminV2Api.crmListTeamMembers(),
        adminV2Api.crmDashboard(),
      ]);
      setDrivers(drvs);
      setTeamMembers(tms);
      setAnalytics(stats);
      if (selectedRider) {
         setSelectedRider(drvs.find((d: any) => d.id === selectedRider.id));
      }
    } catch (e: any) {
      pushToast(e.message || "Failed to load rider data", "danger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCRM();
  }, []);

  const handleDragStart = (e: React.DragEvent, driverId: string) => {
    e.dataTransfer.setData("driverId", driverId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const driverId = e.dataTransfer.getData("driverId");
    if (!driverId) return;

    if (newStatus === "BLOCKED") {
      setBlockDriverId(driverId);
      setShowBlockModal(true);
      return;
    }

    setDrivers(prev => prev.map(d => d.id === driverId ? { ...d, status: newStatus } : d));

    try {
      if (newStatus === "APPROVED") {
        await adminV2Api.crmApproveDriver(driverId, "Moved via Board");
      } else if (newStatus === "REJECTED") {
        await adminV2Api.crmRejectDriver(driverId, "Moved via Board");
      } else if (newStatus === "REVIEW") {
        await adminV2Api.crmRefileDriver(driverId, "Moved via Board");
      } else {
        pushToast(`Status ${newStatus} needs direct API update.`, "info");
      }
      loadCRM(); 
    } catch (e: any) {
      pushToast(e.message || "Failed to update status", "danger");
      loadCRM(); 
    }
  };

  const handleBlockConfirm = async () => {
    if (!blockReason.trim()) return pushToast("Block reason is required", "warning");
    try {
      await adminV2Api.crmBlockDriver(blockDriverId, blockReason);
      pushToast("Rider blocked successfully", "success");
      setShowBlockModal(false);
      setBlockReason("");
      setBlockDriverId("");
      loadCRM();
    } catch (e: any) {
      pushToast(e.message || "Failed to block rider", "danger");
    }
  };

  const handleAssign = async (driverId: string, memberId: string) => {
    try {
      await adminV2Api.crmAssignDriver(driverId, memberId);
      pushToast("Rider assigned", "success");
      loadCRM();
    } catch (e: any) {
      pushToast(e.message || "Failed to assign rider", "danger");
    }
  };

  const filteredDrivers = useMemo(() => {
    if (!searchQ) return drivers;
    const q = searchQ.toLowerCase();
    return drivers.filter(d => 
      d.name?.toLowerCase().includes(q) || 
      d.phone?.includes(q) || 
      d.registration_number?.toLowerCase().includes(q)
    );
  }, [drivers, searchQ]);

  if (loading) return <div className="p-8 text-center text-slate-500">Loading Unified Rider System...</div>;

  return (
    <div className="space-y-4">
      {/* Header & Export */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Unified Rider Management System</h2>
          <p className="text-sm text-slate-500">Registry, Fleet, Verifications, and Pipeline</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Lucide.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search riders by name, phone, RC..." 
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm w-64 outline-none focus:border-emerald-500"
            />
          </div>
          <Button variant="outline" onClick={() => window.open(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}/api/v1/crm/export-csv?token=${localStorage.getItem("bmg_admin_v2_token")}`, '_blank')}>Export CSV</Button>
          <Button variant="outline" onClick={() => window.open(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}/api/v1/crm/export-excel?token=${localStorage.getItem("bmg_admin_v2_token")}`, '_blank')}>Export Excel</Button>
          <Button onClick={loadCRM}>Refresh</Button>
        </div>
      </div>

      {/* KPI Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4 bg-white shadow-sm border-l-4 border-l-blue-500">
          <p className="text-xs font-semibold text-slate-500 uppercase">Total Riders</p>
          <p className="text-2xl font-bold mt-1">{analytics.total_drivers || 0}</p>
        </Card>
        <Card className="p-4 bg-white shadow-sm border-l-4 border-l-amber-500">
          <p className="text-xs font-semibold text-slate-500 uppercase">Pending</p>
          <p className="text-2xl font-bold mt-1">{analytics.pending_approvals || 0}</p>
        </Card>
        <Card className="p-4 bg-white shadow-sm border-l-4 border-l-emerald-500">
          <p className="text-xs font-semibold text-slate-500 uppercase">Approved Fleet</p>
          <p className="text-2xl font-bold mt-1">{analytics.approved_drivers || 0}</p>
        </Card>
        <Card className="p-4 bg-white shadow-sm border-l-4 border-l-slate-800">
          <p className="text-xs font-semibold text-slate-500 uppercase">Blocked</p>
          <p className="text-2xl font-bold mt-1">{analytics.blocked_drivers || 0}</p>
        </Card>
        <Card className="p-4 bg-white shadow-sm border-l-4 border-l-rose-500">
          <p className="text-xs font-semibold text-slate-500 uppercase">Rejected</p>
          <p className="text-2xl font-bold mt-1">{analytics.rejected_drivers || 0}</p>
        </Card>
      </div>

      {/* Pipeline Board */}
      <div className="flex gap-4 overflow-x-auto pb-4 pt-2">
        {COLUMNS.map(col => {
          const colDrivers = filteredDrivers.filter(d => d.status === col.id);
          return (
            <div 
              key={col.id} 
              className="flex-shrink-0 w-80 bg-slate-200/50 rounded-xl p-3 flex flex-col h-[calc(100vh-320px)]"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <div className="flex justify-between items-center mb-3 px-1">
                <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">{col.label}</h3>
                <span className="bg-white text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">{colDrivers.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {colDrivers.map(driver => {
                  const assignedTo = teamMembers.find(t => t.id === driver.assigned_member_id);
                  return (
                    <div 
                      key={driver.id} 
                      draggable 
                      onDragStart={(e) => handleDragStart(e, driver.id)}
                      onClick={() => setSelectedRider(driver)}
                      className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 cursor-grab active:cursor-grabbing hover:border-emerald-400 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-bold text-slate-900 text-sm">{driver.name}</p>
                        <Chip text={driver.vehicle_type} tone="neutral" />
                      </div>
                      <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Lucide.Phone size={12}/> {driver.phone}</p>
                      <p className="text-xs text-slate-500 mb-3 flex items-center gap-1"><Lucide.Car size={12}/> {driver.brand_model} • {driver.registration_number}</p>
                      
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100" onClick={e => e.stopPropagation()}>
                        <select 
                          className="text-xs bg-slate-50 border border-slate-200 rounded p-1 outline-none focus:border-emerald-400 max-w-[120px]"
                          value={driver.assigned_member_id || ""}
                          onChange={(e) => {
                            if (e.target.value) handleAssign(driver.id, e.target.value);
                          }}
                        >
                          <option value="">Assign...</option>
                          {teamMembers.map(tm => (
                            <option key={tm.id} value={tm.id}>{tm.name}</option>
                          ))}
                        </select>
                        {assignedTo && (
                          <div className="flex items-center gap-1" title={`Assigned to ${assignedTo.name}`}>
                            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold border border-emerald-200 shadow-sm">
                              {assignedTo.name.charAt(0)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {colDrivers.length === 0 && (
                  <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-300 rounded-lg opacity-50">
                    <p className="text-xs font-semibold text-slate-400">Drag & Drop Rider</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Block Modal */}
      {showBlockModal && (
        <Modal onClose={() => setShowBlockModal(false)}>
          <div className="p-4 space-y-4">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Lucide.Ban className="text-rose-500"/> Block Rider</h3>
            <p className="text-sm text-slate-500">You are about to block this rider from the platform. A reason is required for auditing purposes.</p>
            <textarea 
              placeholder="Reason for blocking (e.g. Fraud, Bad behavior)..." 
              className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-rose-500 min-h-[100px]"
              value={blockReason}
              onChange={e => setBlockReason(e.target.value)}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowBlockModal(false)}>Cancel</Button>
              <Button onClick={handleBlockConfirm} className="bg-rose-600 hover:bg-rose-700 text-white">Confirm Block</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Full Profile Drawer / Modal */}
      {selectedRider && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedRider(null)}>
          <div className="w-full max-w-xl h-full bg-slate-50 shadow-2xl overflow-y-auto transform transition-transform animate-in slide-in-from-right" onClick={e => e.stopPropagation()}>
             <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center z-10">
               <div>
                 <h2 className="text-2xl font-bold text-slate-800">{selectedRider.name}</h2>
                 <p className="text-slate-500">{selectedRider.phone} • Added {new Date(selectedRider.created_at).toLocaleDateString()}</p>
               </div>
               <button onClick={() => setSelectedRider(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><Lucide.X size={20}/></button>
             </div>

             <div className="p-6 space-y-6">
                {/* Status Card */}
                <Card className="flex items-center justify-between bg-white border border-slate-200 shadow-sm p-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Current Status</p>
                    <Chip text={selectedRider.status} tone={COLUMNS.find(c => c.id === selectedRider.status)?.tone as any} />
                  </div>
                  {selectedRider.status === 'BLOCKED' && selectedRider.blocked_reason && (
                    <div className="text-right max-w-xs">
                      <p className="text-xs text-rose-500 font-bold"><Lucide.ShieldAlert size={12} className="inline mr-1"/>Blocked by {selectedRider.blocked_by}</p>
                      <p className="text-xs text-slate-600 mt-1">{selectedRider.blocked_reason}</p>
                    </div>
                  )}
                </Card>

                {/* Personal & Vehicle Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold flex items-center gap-2 mb-3 text-slate-700 border-b pb-2"><Lucide.User size={16}/> Personal Info</h3>
                    <div className="space-y-2">
                      <p><span className="text-xs text-slate-500 w-16 inline-block">Phone</span> <span className="font-semibold text-sm">{selectedRider.phone}</span></p>
                      <p><span className="text-xs text-slate-500 w-16 inline-block">Address</span> <span className="font-semibold text-sm">{selectedRider.address || '-'}</span></p>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold flex items-center gap-2 mb-3 text-slate-700 border-b pb-2"><Lucide.Car size={16}/> Vehicle Info</h3>
                    <div className="space-y-2">
                      <p><span className="text-xs text-slate-500 w-16 inline-block">Type</span> <span className="font-semibold text-sm capitalize">{selectedRider.vehicle_type}</span></p>
                      <p><span className="text-xs text-slate-500 w-16 inline-block">Model</span> <span className="font-semibold text-sm">{selectedRider.brand_model}</span></p>
                      <p><span className="text-xs text-slate-500 w-16 inline-block">Reg No</span> <span className="font-semibold text-sm">{selectedRider.registration_number}</span></p>
                    </div>
                  </div>
                </div>

                {/* Documents */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold flex items-center gap-2 mb-3 text-slate-700 border-b pb-2"><Lucide.FileText size={16}/> Documents</h3>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <p className="text-xs text-slate-500 mb-1">License No</p>
                      <p className="font-bold text-sm text-slate-800">{selectedRider.license_number || 'Missing'}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <p className="text-xs text-slate-500 mb-1">RC No</p>
                      <p className="font-bold text-sm text-slate-800">{selectedRider.rc_number || 'Missing'}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <p className="text-xs text-slate-500 mb-1">Insurance</p>
                      <p className="font-bold text-sm text-slate-800">{selectedRider.insurance_number || 'Missing'}</p>
                    </div>
                  </div>
                </div>

                {/* Referral */}
                {selectedRider.referral && (
                   <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
                     <p className="text-indigo-800 font-bold flex items-center gap-2 text-sm"><Lucide.TrendingUp size={16}/> Referral Information</p>
                     <p className="text-indigo-600 text-sm mt-1">Sourced via <strong>{selectedRider.referral.referral_type}</strong> • {selectedRider.referral.referral_name}</p>
                   </div>
                )}

                {/* Action Logs */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold flex items-center gap-2 mb-3 text-slate-700 border-b pb-2"><Lucide.History size={16}/> Action Logs</h3>
                  <div className="space-y-4">
                    {selectedRider.logs?.map((log: any, idx: number) => (
                      <div key={idx} className="flex gap-3 relative before:absolute before:left-3 before:top-6 before:bottom-[-16px] before:w-0.5 before:bg-slate-200 last:before:hidden">
                        <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center shrink-0 z-10">
                           <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{log.action}</p>
                          <p className="text-xs text-slate-500">By {log.changed_by_name} • {new Date(log.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                    {(!selectedRider.logs || selectedRider.logs.length === 0) && (
                      <p className="text-sm text-slate-500 text-center py-2">No actions recorded yet.</p>
                    )}
                  </div>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
