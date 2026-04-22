import { useState } from "react";
import { adminTokenStore, adminV2Api } from "@/admin_v2/services/adminApi";
import { useAdminV2Store } from "@/admin_v2/store/useAdminStore";
import { Button, Card } from "@/admin_v2/components/ui";

const AdminV2LoginPage = () => {
  const { setIdentity } = useAdminV2Store();
  const [email, setEmail] = useState("admin@bookmygadi.app");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [forgotStep, setForgotStep] = useState<"start" | "verify">("start");
  const [forgotMsg, setForgotMsg] = useState("");

  const onLogin = async () => {
    setLoading(true);
    setError("");
    try {
      await adminV2Api.seedAdmins().catch(() => undefined);
      const auth = await adminV2Api.login(email, password);
      adminTokenStore.set(auth.access_token);
      setIdentity(auth.name, "admin");
      window.location.href = "/admin-v2";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const onStartForgot = async () => {
    setError("");
    setForgotMsg("");
    try {
      const res = await adminV2Api.adminForgotPasswordStart(email.trim().toLowerCase());
      setForgotMsg(res.message || "OTP sent.");
      setForgotStep("verify");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to start password reset");
    }
  };

  const onVerifyForgot = async () => {
    setError("");
    setForgotMsg("");
    try {
      const res = await adminV2Api.adminForgotPasswordVerify(email.trim().toLowerCase(), otp.trim(), newPassword);
      setForgotMsg(res.message || "Password updated.");
      setShowForgot(false);
      setForgotStep("start");
      setOtp("");
      setNewPassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to verify OTP");
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,_#1f2a48_0%,_#111a33_38%,_#0b1224_72%,_#09101f_100%)] p-4">
      <Card className="w-full max-w-md">
        <p className="text-xl font-bold text-slate-900">BookMyGadi Admin Login</p>
        <p className="text-sm text-slate-500">Role: Admin</p>
        <form autoComplete="off" className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); onLogin(); }}>
          <input autoComplete="off" name="admin_email_hidden" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" placeholder="Email" />
          <input autoComplete="new-password" name="admin_password_hidden" value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" placeholder="Password" />
          <Button type="submit" className="h-10 w-full bg-slate-900 text-white hover:bg-slate-800" disabled={loading}>{loading ? "Logging in..." : "Login"}</Button>
        </form>
        <button className="mt-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900" onClick={() => setShowForgot((v) => !v)}>
          {showForgot ? "Close Forgot Password" : "Forgot Password?"}
        </button>

        {showForgot && (
          <div className="mt-3 rounded-xl border border-slate-200 p-3 space-y-2">
            <p className="text-sm font-bold text-slate-800">Reset Admin Password (OTP)</p>
            {forgotStep === "start" ? (
              <>
                <input autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" placeholder="Admin email" />
                <Button className="h-10 w-full" onClick={onStartForgot}>Send OTP</Button>
              </>
            ) : (
              <>
                <input autoComplete="off" value={otp} onChange={(e) => setOtp(e.target.value)} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" placeholder="OTP" />
                <input autoComplete="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" placeholder="New Password (min 8 chars)" />
                <Button className="h-10 w-full" onClick={onVerifyForgot}>Verify OTP & Reset</Button>
              </>
            )}
            {forgotMsg && <p className="text-xs text-emerald-700">{forgotMsg}</p>}
          </div>
        )}
        {error && <p className="text-sm text-rose-600 mt-2">{error}</p>}
      </Card>
    </div>
  );
};

export default AdminV2LoginPage;
