import { useEffect } from "react";
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { adminTokenStore } from "@/admin_v2/services/adminApi";

const AdminV2Protected = ({ children }: { children: ReactNode }) => {
  const token = adminTokenStore.get();
  const expMs = adminTokenStore.getExpMs();

  useEffect(() => {
    if (!expMs) return;
    const check = () => {
      if (Date.now() >= expMs) {
        adminTokenStore.clear();
        window.location.href = "/admin-v2/login";
      }
    };
    check();
    const timer = window.setInterval(check, 15_000);
    return () => window.clearInterval(timer);
  }, [expMs]);

  if (!token) return <Navigate to="/admin-v2/login" replace />;
  if (expMs && Date.now() >= expMs) {
    adminTokenStore.clear();
    return <Navigate to="/admin-v2/login" replace />;
  }
  return <>{children}</>;
};

export default AdminV2Protected;
