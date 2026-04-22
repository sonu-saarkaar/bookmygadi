import { useEffect, useState } from "react";
import { adminV2Api } from "@/admin_v2/services/adminApi";
import { useAdminV2Store } from "@/admin_v2/store/useAdminStore";
import { Button, Card } from "@/admin_v2/components/ui";

type PolicyType = "terms" | "privacy" | "refund";

export const PolicyManagementBoard = () => {
  const { pushToast } = useAdminV2Store();
  const [policyType, setPolicyType] = useState<PolicyType>("terms");
  const [form, setForm] = useState({ title: "", content: "", is_published: true });

  const load = async (type: PolicyType) => {
    try {
      const data = await adminV2Api.getPolicy(type);
      setForm({
        title: data?.title || type.toUpperCase(),
        content: data?.content || "",
        is_published: Boolean(data?.is_published),
      });
    } catch (e: any) {
      pushToast(e?.message || "Unable to load policy", "danger");
    }
  };

  useEffect(() => {
    load(policyType);
  }, [policyType]);

  const save = async () => {
    try {
      await adminV2Api.savePolicy(policyType, form);
      pushToast("Policy saved", "success");
    } catch (e: any) {
      pushToast(e?.message || "Unable to save policy", "danger");
    }
  };

  return (
    <Card>
      <h2 className="text-xl font-bold text-slate-900">Policy Management</h2>
      <p className="text-sm text-slate-500">Manage Terms & Conditions, Privacy Policy, and Refund Policy from admin panel</p>
      <div className="mt-3 flex gap-2">
        <Button onClick={() => setPolicyType("terms")} className={policyType === "terms" ? "bg-slate-900 text-white" : ""}>Terms</Button>
        <Button onClick={() => setPolicyType("privacy")} className={policyType === "privacy" ? "bg-slate-900 text-white" : ""}>Privacy</Button>
        <Button onClick={() => setPolicyType("refund")} className={policyType === "refund" ? "bg-slate-900 text-white" : ""}>Refund</Button>
      </div>
      <div className="mt-3 space-y-2">
        <input className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Policy title" />
        <textarea className="w-full rounded-lg border border-slate-300 p-3 text-sm" rows={14} value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} placeholder="Policy content" />
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input type="checkbox" checked={form.is_published} onChange={(e) => setForm((p) => ({ ...p, is_published: e.target.checked }))} />
          Published
        </label>
      </div>
      <div className="mt-3 flex gap-2">
        <Button onClick={save}>Save Policy</Button>
        <Button variant="outline" onClick={() => load(policyType)}>Reload</Button>
      </div>
    </Card>
  );
};
