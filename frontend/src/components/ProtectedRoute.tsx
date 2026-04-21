import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { authStore, backendApi, type UserProfile, type UserRole } from "@/services/backendApi";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const run = async () => {
      const token = authStore.getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const profile = await backendApi.me(token);
        setUser(profile);
      } catch {
        authStore.clear();
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-sm">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
};
