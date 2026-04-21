import { useState } from "react";
import { adminTokenStore, adminV2Api } from "@/admin_v2/services/adminApi";
import { useAdminV2Store } from "@/admin_v2/store/useAdminStore";
import { Button, Card } from "@/admin_v2/components/ui";

const AdminV2LoginPage = () => {
  const { setIdentity } = useAdminV2Store();
  const [email, setEmail] = useState("admin@bookmygadi.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    setLoading(true);
    setError("");
    try {
      await adminV2Api.seedAdmins().catch(() => undefined);
      const auth = await adminV2Api.login(email, password);
      adminTokenStore.set(auth.access_token);
      setIdentity(auth.name, auth.role as any);
      window.location.href = "/admin-v2";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,_#1f2a48_0%,_#111a33_38%,_#0b1224_72%,_#09101f_100%)] p-4">
      <Card className="w-full max-w-md">
        <p className="text-xl font-bold text-slate-900">BookMyGadi Admin Login</p>
        <p className="text-sm text-slate-500">Roles: super_admin, ops_admin, support_agent, finance_manager</p>
        <div className="mt-3 space-y-2">
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" placeholder="Email" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" placeholder="Password" />
          <Button className="h-10 w-full bg-slate-900 text-white hover:bg-slate-800" onClick={onLogin} disabled={loading}>{loading ? "Logging in..." : "Login"}</Button>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>
      </Card>
    </div>
  );
};

export default AdminV2LoginPage;
