import { useEffect, useState } from "react";
import { adminV2Api } from "@/admin_v2/services/adminApi";
import { Button, Card, Chip } from "@/admin_v2/components/ui";
import { useAdminV2Store } from "@/admin_v2/store/useAdminStore";

const COLUMNS = [
  { id: "NEW REQUEST", label: "New Request" },
  { id: "UNDER REVIEW", label: "Under Review" },
  { id: "DOCUMENT PENDING", label: "Document Pending" },
  { id: "APPROVED", label: "Approved" },
  { id: "REJECTED", label: "Rejected" },
  { id: "REFILED", label: "Refiled" },
];

export const CRMBoard = () => {
  const { pushToast } = useAdminV2Store();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const loadCRM = async () => {
    setLoading(true);
    try {
      const [drvs, tms, stats] = await Promise.all([
        adminV2Api.crmListDrivers(),
        adminV2Api.crmListTeamMembers(),
        adminV2Api.crmDashboard(),
      ]);
      setDrivers(drvs);
      setTeamMembers(tms);
      setAnalytics(stats);
    } catch (e: any) {
      pushToast(e.message || "Failed to load CRM data", "danger");
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

    // Fast optimistic UI update
    setDrivers(prev => prev.map(d => d.id === driverId ? { ...d, status: newStatus } : d));

    try {
      // Find the appropriate API call based on status
      if (newStatus === "APPROVED") {
        await adminV2Api.crmApproveDriver(driverId, "Moved via Board");
      } else if (newStatus === "REJECTED") {
        await adminV2Api.crmRejectDriver(driverId, "Moved via Board");
      } else if (newStatus === "REFILED") {
        await adminV2Api.crmRefileDriver(driverId, "Moved via Board");
      } else {
        // Technically other status updates need a generic status patch API, but we'll use refile/approve for now, 
        // or just rely on the API. To be complete, we can just log a toast if it's an unmapped drag.
        pushToast(`Moved to ${newStatus}. (Requires full edit API to save non-terminal status).`, "info");
      }
      loadCRM(); // Reload real state
    } catch (e: any) {
      pushToast(e.message || "Failed to update status", "danger");
      loadCRM(); // Rollback
    }
  };

  const handleAssign = async (driverId: string, memberId: string) => {
    try {
      await adminV2Api.crmAssignDriver(driverId, memberId);
      pushToast("Driver assigned", "success");
      loadCRM();
    } catch (e: any) {
      pushToast(e.message || "Failed to assign driver", "danger");
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading CRM Board...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Driver Management CRM</h2>
          <p className="text-sm text-slate-500">Operations pipeline for driver onboarding</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.open(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}/api/v1/crm/export-csv?token=${localStorage.getItem("bmg_admin_v2_token")}`, '_blank')}>Export CSV</Button>
          <Button variant="outline" onClick={() => window.open(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}/api/v1/crm/export-excel?token=${localStorage.getItem("bmg_admin_v2_token")}`, '_blank')}>Export Excel</Button>
          <Button onClick={loadCRM}>Refresh Board</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-white shadow-sm border-l-4 border-l-blue-500">
          <p className="text-xs font-semibold text-slate-500 uppercase">Total Drivers</p>
          <p className="text-2xl font-bold mt-1">{analytics.total_drivers || 0}</p>
        </Card>
        <Card className="p-4 bg-white shadow-sm border-l-4 border-l-amber-500">
          <p className="text-xs font-semibold text-slate-500 uppercase">Pending Approvals</p>
          <p className="text-2xl font-bold mt-1">{analytics.pending_approvals || 0}</p>
        </Card>
        <Card className="p-4 bg-white shadow-sm border-l-4 border-l-emerald-500">
          <p className="text-xs font-semibold text-slate-500 uppercase">Approved</p>
          <p className="text-2xl font-bold mt-1">{analytics.approved_drivers || 0}</p>
        </Card>
        <Card className="p-4 bg-white shadow-sm border-l-4 border-l-rose-500">
          <p className="text-xs font-semibold text-slate-500 uppercase">Rejected</p>
          <p className="text-2xl font-bold mt-1">{analytics.rejected_drivers || 0}</p>
        </Card>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 pt-2">
        {COLUMNS.map(col => {
          const colDrivers = drivers.filter(d => d.status === col.id);
          return (
            <div 
              key={col.id} 
              className="flex-shrink-0 w-80 bg-slate-200/50 rounded-xl p-3 flex flex-col h-[calc(100vh-280px)]"
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
                      className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 cursor-grab active:cursor-grabbing hover:border-emerald-400 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-bold text-slate-900 text-sm">{driver.name}</p>
                        <Chip text={driver.vehicle_type} tone="neutral" />
                      </div>
                      <p className="text-xs text-slate-500 mb-1">📞 {driver.phone}</p>
                      <p className="text-xs text-slate-500 mb-3">🚗 {driver.brand_model} • {driver.registration_number}</p>
                      
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100">
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
                          <div className="flex items-center gap-1">
                            <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">
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
                    <p className="text-xs font-semibold text-slate-400">Drop here</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
