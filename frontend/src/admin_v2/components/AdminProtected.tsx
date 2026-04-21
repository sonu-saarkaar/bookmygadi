import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { adminTokenStore } from "@/admin_v2/services/adminApi";

const AdminV2Protected = ({ children }: { children: ReactNode }) => {
  const token = adminTokenStore.get();
  if (!token) return <Navigate to="/admin-v2/login" replace />;
  return <>{children}</>;
};

export default AdminV2Protected;
