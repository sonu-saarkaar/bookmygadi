import { type ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { authStore, backendApi } from "@/services/backendApi";
import { riderSession } from "./riderSession";

const RiderProtectedRoute = ({ children }: { children: ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const token = authStore.getToken();
    if (!token || !riderSession.isLoggedIn()) {
      setAllowed(false);
      setLoading(false);
      return;
    }
    backendApi
      .me(token)
      .then((me) => setAllowed(me.role === "driver" || me.role === "admin"))
      .catch(() => setAllowed(false))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-sm text-[#334155]">Loading rider panel...</div>;
  }
  if (!allowed) return <Navigate to="/rider/login" replace />;
  return <>{children}</>;
};

export default RiderProtectedRoute;
