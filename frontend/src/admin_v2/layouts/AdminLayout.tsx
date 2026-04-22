import { useAdminV2Store } from "@/admin_v2/store/useAdminStore";
import { Button, Card, Chip } from "@/admin_v2/components/ui";

import * as Lucide from "lucide-react";

const menuGroups = [
  {
    title: "Operations",
    items: [
      { key: "dashboard", label: "Dashboard", icon: Lucide.LayoutDashboard },
      { key: "rides", label: "Live Rides", icon: Lucide.Navigation },
      { key: "live-search", label: "Live Search Monitor", icon: Lucide.Search },
      { key: "services", label: "Service Management", icon: Lucide.Settings2 },
      { key: "price-mgmt", label: "Price Management", icon: Lucide.IndianRupee },
    ],
  },
  {
    title: "User Panel",
    items: [
      { key: "users-mgmt", label: "User Management System", icon: Lucide.Users },
    ],
  },
  {
    title: "Rider Panel",
    items: [
      { key: "rider-mgmt", label: "Rider Management System", icon: Lucide.UsersRound },
      { key: "registrations", label: "Vehicle KYC Approvals", icon: Lucide.ClipboardCheck },
    ],
  },
  {
    title: "Team & Support",
    items: [
      { key: "team-mgmt", label: "Team Management", icon: Lucide.Users2 },
      { key: "company-structure", label: "Company Structure", icon: Lucide.Building2 },
      { key: "tasks", label: "Team Tasks", icon: Lucide.ClipboardList },
      { key: "support", label: "Support Desk", icon: Lucide.Headset },
    ],
  },
  {
    title: "System Control",
    items: [
      { key: "finance", label: "Finance", icon: Lucide.IndianRupee },
      { key: "policies", label: "Policy Management", icon: Lucide.FileText },
      { key: "logs", label: "System Logs", icon: Lucide.History },
    ],
  },
] as const;

export const AdminSidebarV2 = () => {
  const { module, setModule } = useAdminV2Store();
  return (
    <aside className="hidden h-screen w-72 shrink-0 border-r border-white/10 bg-[radial-gradient(circle_at_top,_#1f2a48_0%,_#111a33_38%,_#0b1224_72%,_#09101f_100%)] p-4 text-white lg:block overflow-y-auto">
      <Card className="mb-6 border-emerald-300/30 bg-white/10">
        <p className="text-xs tracking-[0.2em] text-slate-300">BOOKMYGADI</p>
        <p className="text-lg font-bold">Admin Console</p>
      </Card>
      
      <div className="space-y-6">
        {menuGroups.map((group) => (
          <div key={group.title}>
            <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 opacity-60">
              {group.title}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <button 
                  key={item.key} 
                  onClick={() => setModule(item.key)} 
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                    module === item.key 
                      ? "bg-emerald-500/20 text-emerald-400 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.3)]" 
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <item.icon size={18} strokeWidth={module === item.key ? 2.5 : 2} className={module === item.key ? "text-emerald-400" : "text-slate-400"} />
                  <span>{item.label}</span>
                  {item.key === "registrations" && <span className="ml-auto w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

export const AdminTopbarV2 = ({ onLogout }: { onLogout: () => void }) => {
  const { query, setQuery, role, name, module, setModule } = useAdminV2Store();
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <select value={module} onChange={(e) => setModule(e.target.value)} className="h-10 rounded-lg border border-slate-300 px-3 text-sm bg-white lg:hidden">
          {menuGroups.flatMap((group) => group.items).map((item) => (
            <option key={item.key} value={item.key}>{item.label}</option>
          ))}
        </select>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search rides, riders, drivers, tickets" className="h-10 min-w-[220px] flex-1 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500" />
        <Chip text={role ? `Role: ${role}` : "Role: -"} tone="neutral" />
        <Chip text={name ? `Admin: ${name}` : "Admin: -"} tone="success" />
        <Button onClick={onLogout}>Logout</Button>
      </div>
    </header>
  );
};
