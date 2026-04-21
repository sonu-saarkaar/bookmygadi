import { create } from "zustand";

type AdminRole = "super_admin" | "ops_admin" | "support_agent" | "finance_manager";

type Toast = { id: string; message: string; kind: "success" | "info" | "warning" | "danger" };

type AdminState = {
  role: AdminRole | "";
  name: string;
  module: string;
  query: string;
  toasts: Toast[];
  setIdentity: (name: string, role: AdminRole) => void;
  setModule: (module: string) => void;
  setQuery: (query: string) => void;
  pushToast: (message: string, kind?: Toast["kind"]) => void;
  removeToast: (id: string) => void;
};

export const useAdminV2Store = create<AdminState>((set) => ({
  role: "",
  name: "",
  module: "dashboard",
  query: "",
  toasts: [],
  setIdentity: (name, role) => set({ name, role }),
  setModule: (module) => set({ module }),
  setQuery: (query) => set({ query }),
  pushToast: (message, kind = "info") =>
    set((state) => ({ toasts: [{ id: `${Date.now()}-${Math.random()}`, message, kind }, ...state.toasts].slice(0, 4) })),
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
