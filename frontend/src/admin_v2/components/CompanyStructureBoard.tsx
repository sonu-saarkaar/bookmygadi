import { useEffect, useState } from "react";
import { adminV2Api } from "@/admin_v2/services/adminApi";
import { useAdminV2Store } from "@/admin_v2/store/useAdminStore";
import { Button, Card } from "@/admin_v2/components/ui";

export const CompanyStructureBoard = () => {
  const { pushToast } = useAdminV2Store();
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({
    founder_type: "founder",
    full_name: "",
    email: "",
    phone: "",
    identity_document: "",
    company_documents: "",
    contact_address: "",
    is_admin_enabled: true,
  });

  const load = async () => {
    try {
      setRows(await adminV2Api.listFounderProfiles());
    } catch (e: any) {
      pushToast(e?.message || "Unable to load founder profiles", "danger");
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.full_name.trim() || !form.email.trim()) {
      pushToast("Name and email are required", "warning");
      return;
    }
    try {
      await adminV2Api.upsertFounderProfile(form);
      pushToast("Founder profile saved", "success");
      setForm({ founder_type: "founder", full_name: "", email: "", phone: "", identity_document: "", company_documents: "", contact_address: "", is_admin_enabled: true });
      load();
    } catch (e: any) {
      pushToast(e?.message || "Unable to save founder profile", "danger");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-xl font-bold text-slate-900">Company Structure</h2>
        <p className="text-sm text-slate-500">Founder and Co-Founder setup with identity/documents/contact and admin access control</p>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
          <select className="h-10 rounded-lg border border-slate-300 px-3 text-sm bg-white" value={form.founder_type} onChange={(e) => setForm((p) => ({ ...p, founder_type: e.target.value }))}>
            <option value="founder">Founder</option>
            <option value="co_founder">Co-Founder</option>
          </select>
          <input className="h-10 rounded-lg border border-slate-300 px-3 text-sm" placeholder="Full Name" value={form.full_name} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))} />
          <input className="h-10 rounded-lg border border-slate-300 px-3 text-sm" placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
          <input className="h-10 rounded-lg border border-slate-300 px-3 text-sm" placeholder="Phone" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
          <textarea className="rounded-lg border border-slate-300 p-3 text-sm" rows={2} placeholder="Identity document info / URL" value={form.identity_document} onChange={(e) => setForm((p) => ({ ...p, identity_document: e.target.value }))} />
          <textarea className="rounded-lg border border-slate-300 p-3 text-sm" rows={2} placeholder="Company documents info / URL" value={form.company_documents} onChange={(e) => setForm((p) => ({ ...p, company_documents: e.target.value }))} />
          <textarea className="rounded-lg border border-slate-300 p-3 text-sm md:col-span-2" rows={2} placeholder="Contact Address" value={form.contact_address} onChange={(e) => setForm((p) => ({ ...p, contact_address: e.target.value }))} />
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <input type="checkbox" checked={form.is_admin_enabled} onChange={(e) => setForm((p) => ({ ...p, is_admin_enabled: e.target.checked }))} />
            Admin Access Enabled
          </label>
        </div>
        <div className="mt-3 flex gap-2">
          <Button onClick={save}>Save Founder Profile</Button>
          <Button variant="outline" onClick={load}>Reload</Button>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-bold text-slate-900 mb-2">Founder Records</h3>
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="rounded-lg border border-slate-200 p-3">
              <p className="font-semibold text-slate-800">{r.full_name} ({r.founder_type})</p>
              <p className="text-xs text-slate-500">{r.email} | {r.phone || "-"} | Admin: {r.is_admin_enabled ? "Yes" : "No"}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
