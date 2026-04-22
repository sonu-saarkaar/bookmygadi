import { useEffect, useState } from "react";
import { adminV2Api } from "@/admin_v2/services/adminApi";
import { useAdminV2Store } from "@/admin_v2/store/useAdminStore";
import { Button, Card } from "@/admin_v2/components/ui";

export const LiveSearchMonitorBoard = () => {
  const { pushToast } = useAdminV2Store();
  const [statusFilter, setStatusFilter] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [dispatchMode, setDispatchMode] = useState<"auto" | "manual" | "hybrid">("auto");

  const load = async () => {
    try {
      const [events, driverRows, dispatch] = await Promise.all([
        adminV2Api.listSearchMonitor(statusFilter || undefined),
        adminV2Api.listDrivers(),
        adminV2Api.getDispatchControl(),
      ]);
      setRows(events || []);
      setDrivers(driverRows || []);
      setDispatchMode((dispatch?.mode || "auto") as any);
    } catch (e: any) {
      pushToast(e?.message || "Unable to load live search monitor", "danger");
    }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const assignDriver = async (eventId: string) => {
    const selected = window.prompt("Enter driver id to assign")?.trim();
    if (!selected) return;
    try {
      await adminV2Api.assignSearchDriver(eventId, selected);
      pushToast("Driver assigned", "success");
      load();
    } catch (e: any) {
      pushToast(e?.message || "Unable to assign driver", "danger");
    }
  };

  const acceptSearch = async (eventId: string) => {
    try {
      await adminV2Api.acceptSearch(eventId);
      pushToast("Search accepted", "success");
      load();
    } catch (e: any) {
      pushToast(e?.message || "Unable to accept search", "danger");
    }
  };

  const saveDispatchMode = async (mode: "auto" | "manual" | "hybrid") => {
    try {
      await adminV2Api.updateDispatchControl(mode, "Updated from live monitor");
      pushToast("Dispatch mode updated", "success");
      setDispatchMode(mode);
    } catch (e: any) {
      pushToast(e?.message || "Unable to update dispatch mode", "danger");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-xl font-bold text-slate-900">Live Search Monitoring</h2>
        <p className="text-sm text-slate-500">Track user ride searches, assign drivers manually, and control auto/manual dispatch mode</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => saveDispatchMode("auto")} className={dispatchMode === "auto" ? "bg-slate-900 text-white" : ""}>Auto Mode</Button>
          <Button onClick={() => saveDispatchMode("manual")} className={dispatchMode === "manual" ? "bg-slate-900 text-white" : ""}>Manual Mode</Button>
          <Button onClick={() => saveDispatchMode("hybrid")} className={dispatchMode === "hybrid" ? "bg-slate-900 text-white" : ""}>Hybrid Mode</Button>
          <select className="h-9 rounded-lg border border-slate-300 px-3 text-sm bg-white" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            <option value="searching">Searching</option>
            <option value="assigned">Assigned</option>
            <option value="accepted">Accepted</option>
          </select>
          <Button variant="outline" onClick={load}>Refresh</Button>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-bold text-slate-900 mb-2">Available Drivers ({drivers.length})</h3>
        <p className="text-xs text-slate-500">Use any driver ID in assign action</p>
        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-auto">
          {drivers.map((d) => (
            <div key={d.id} className="rounded-lg border border-slate-200 p-2 text-xs">
              <p className="font-semibold text-slate-800">{d.name}</p>
              <p className="text-slate-500">{d.id}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-bold text-slate-900 mb-2">Search Events</h3>
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl border border-slate-200 p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-900">{r.pickup_location} -&gt; {r.drop_location}</p>
                <p className="text-xs text-slate-500 uppercase">{r.search_mode} | {r.vehicle_type} | Status: {r.status}</p>
                <p className="text-xs text-slate-600">Searching Time: {r.searched_seconds}s | User: {r.user_id || "-"}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => assignDriver(r.id)}>Assign Driver</Button>
                <Button onClick={() => acceptSearch(r.id)}>Accept</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
