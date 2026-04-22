import { useEffect, useState } from "react";
import { adminV2Api } from "@/admin_v2/services/adminApi";
import { useAdminV2Store } from "@/admin_v2/store/useAdminStore";
import { Button, Card } from "@/admin_v2/components/ui";

const ROLE_OPTIONS = ["ceo", "co_founder", "operations", "technical", "marketing"];

export const TeamManagementBoard = () => {
  const { pushToast } = useAdminV2Store();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "operations",
    permissions: "",
    access_level: "standard",
    ownership_percentage: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      setRows(await adminV2Api.listEnterpriseTeamMembers());
    } catch (e: any) {
      pushToast(e?.message || "Unable to load team members", "danger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      pushToast("Name and email required", "warning");
      return;
    }
    try {
      await adminV2Api.createEnterpriseTeamMember({
        ...form,
        ownership_percentage: form.ownership_percentage ? Number(form.ownership_percentage) : null,
      });
      pushToast("Team member created", "success");
      setForm({ name: "", email: "", role: "operations", permissions: "", access_level: "standard", ownership_percentage: "" });
      load();
    } catch (e: any) {
      pushToast(e?.message || "Unable to create team member", "danger");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-xl font-bold text-slate-900">Team Management</h2>
        <p className="text-sm text-slate-500">Create and manage CEO / Co-Founder / Operations / Technical / Marketing members</p>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
          <input className="h-10 rounded-lg border border-slate-300 px-3 text-sm" placeholder="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <input className="h-10 rounded-lg border border-slate-300 px-3 text-sm" placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
          <select className="h-10 rounded-lg border border-slate-300 px-3 text-sm bg-white" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}>
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <input className="h-10 rounded-lg border border-slate-300 px-3 text-sm md:col-span-2" placeholder="Permissions (comma separated)" value={form.permissions} onChange={(e) => setForm((p) => ({ ...p, permissions: e.target.value }))} />
          <input className="h-10 rounded-lg border border-slate-300 px-3 text-sm" placeholder="Access level" value={form.access_level} onChange={(e) => setForm((p) => ({ ...p, access_level: e.target.value }))} />
          <input type="number" className="h-10 rounded-lg border border-slate-300 px-3 text-sm" placeholder="Ownership % (optional)" value={form.ownership_percentage} onChange={(e) => setForm((p) => ({ ...p, ownership_percentage: e.target.value }))} />
        </div>
        <div className="mt-3 flex gap-2">
          <Button onClick={save}>Create Team Member</Button>
          <Button variant="outline" onClick={load}>Reload</Button>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-bold text-slate-900 mb-2">Members</h3>
        {loading ? <p className="text-sm text-slate-500">Loading...</p> : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="rounded-lg border border-slate-200 p-3">
                <p className="font-semibold text-slate-800">{r.name} ({r.role})</p>
                <p className="text-xs text-slate-500">{r.email} | Access: {r.access_level} | Ownership: {r.ownership_percentage ?? "-"}</p>
                <p className="text-xs text-slate-600 mt-1">Permissions: {r.permissions || "-"}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
