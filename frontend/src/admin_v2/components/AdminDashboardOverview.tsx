import { useMemo } from "react";
import * as Lucide from "lucide-react";
import { Button, Card, Chip } from "@/admin_v2/components/ui";
import { useAdminV2Store } from "@/admin_v2/store/useAdminStore";

type AdminDashboardOverviewProps = {
  kpis: any;
  live: any;
  rides: any[];
  drivers: any[];
  users?: any[];
  finance?: any;
  tickets?: any[];
  registrations?: any[];
  onRefresh?: () => Promise<void> | void;
};

const ACTIVE_RIDE_STATUSES = new Set(["accepted", "arriving", "assigned", "in_progress", "searching"]);
const CLOSED_STATUSES = new Set(["completed", "cancelled", "rejected"]);

const asNumber = (value: any) => Number(value ?? 0) || 0;
const safeStatus = (value: any) => String(value || "").toLowerCase();
const safeTime = (value: any) => {
  const ms = new Date(value || 0).getTime();
  return Number.isFinite(ms) ? ms : 0;
};

const rideAmount = (ride: any) =>
  asNumber(ride.agreed_fare ?? ride.requested_fare ?? ride.estimated_fare_max ?? ride.estimated_fare_min ?? ride.fare);

const money = (value: any) => `Rs ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(asNumber(value))}`;

const pct = (value: number) => `${Math.max(0, Math.min(100, Math.round(value)))}%`;

const toneForStatus = (status?: string) => {
  const s = safeStatus(status);
  if (["paid", "approved", "active", "completed", "online", "resolved", "verified"].includes(s)) return "success" as const;
  if (["pending", "assigned", "in_progress", "todo", "changes_requested", "searching", "open"].includes(s)) return "warning" as const;
  if (["blocked", "rejected", "failed", "cancelled", "critical"].includes(s)) return "danger" as const;
  return "info" as const;
};

const formatShortDate = (date: Date) =>
  date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

const StatTile = ({
  label,
  value,
  caption,
  icon: Icon,
  tone = "slate",
}: {
  label: string;
  value: string | number;
  caption: string;
  icon: Lucide.LucideIcon;
  tone?: "emerald" | "blue" | "amber" | "rose" | "slate" | "indigo";
}) => {
  const toneMap = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
    slate: "bg-slate-50 text-slate-700 border-slate-100",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
  };

  return (
    <Card className="rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 truncate text-2xl font-black text-slate-900">{value}</p>
          <p className="mt-1 text-xs font-medium text-slate-500">{caption}</p>
        </div>
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border ${toneMap[tone]}`}>
          <Icon size={19} />
        </div>
      </div>
    </Card>
  );
};

export const AdminDashboardOverview = ({
  kpis,
  live,
  rides,
  drivers,
  users = [],
  finance,
  tickets = [],
  registrations = [],
  onRefresh,
}: AdminDashboardOverviewProps) => {
  const { setModule } = useAdminV2Store();
  const analytics = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const weekStartMs = now.getTime() - 6 * 24 * 60 * 60 * 1000;

    const todayRides = rides.filter((ride) => safeTime(ride.created_at) >= todayStart.getTime());
    const activeRides = rides.filter((ride) => ACTIVE_RIDE_STATUSES.has(safeStatus(ride.status)));
    const completedRides = rides.filter((ride) => safeStatus(ride.status) === "completed");
    const pendingRides = rides.filter((ride) => ["pending", "searching"].includes(safeStatus(ride.status)));
    const unpaidRides = rides.filter((ride) => safeStatus(ride.payment_status) !== "paid");

    const todayEarning = todayRides
      .filter((ride) => safeStatus(ride.payment_status) === "paid" || safeStatus(ride.status) === "completed")
      .reduce((sum, ride) => sum + rideAmount(ride), 0);
    const grossRevenue = asNumber(kpis.revenue || kpis.gmv_paid) || completedRides.reduce((sum, ride) => sum + rideAmount(ride), 0);
    const pendingCollection = unpaidRides.reduce((sum, ride) => sum + rideAmount(ride), 0);
    const totalCustomerSpend = users.reduce((sum, user) => sum + asNumber(user.total_spending), 0);

    const activeUsers = users.filter((user) => !user.is_blocked && ["active", "verified"].includes(safeStatus(user.status))).length;
    const newUsersWeek = users.filter((user) => safeTime(user.created_at) >= weekStartMs).length;
    const approvedDrivers = drivers.filter((driver) => ["approved", "active"].includes(safeStatus(driver.status))).length;
    const pendingKyc = registrations.filter((row) => ["pending", "changes_requested"].includes(safeStatus(row.status))).length;
    const openTickets = tickets.filter((ticket) => !["resolved", "closed"].includes(safeStatus(ticket.status))).length;

    const sevenDays = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (6 - index));
      date.setHours(0, 0, 0, 0);
      const next = new Date(date);
      next.setDate(date.getDate() + 1);
      const rows = rides.filter((ride) => {
        const ts = safeTime(ride.created_at);
        return ts >= date.getTime() && ts < next.getTime();
      });
      return {
        label: formatShortDate(date),
        rides: rows.length,
        earning: rows
          .filter((ride) => safeStatus(ride.payment_status) === "paid" || safeStatus(ride.status) === "completed")
          .reduce((sum, ride) => sum + rideAmount(ride), 0),
      };
    });

    const maxDailyEarning = Math.max(...sevenDays.map((day) => day.earning), 1);

    const settlementMap = new Map<string, any>();
    completedRides.forEach((ride) => {
      const driverId = ride.driver_id || "unassigned";
      const amount = rideAmount(ride);
      const current = settlementMap.get(driverId) || {
        driverId,
        name: ride.driver_name || drivers.find((driver) => driver.id === driverId)?.name || "Unassigned driver",
        gross: 0,
        payable: 0,
        cashPending: 0,
        rides: 0,
      };
      current.gross += amount;
      current.rides += 1;
      if (safeStatus(ride.payment_status) === "paid") {
        current.payable += amount * 0.85;
      } else {
        current.cashPending += amount;
      }
      settlementMap.set(driverId, current);
    });
    const settlementRows = Array.from(settlementMap.values())
      .filter((row) => row.driverId !== "unassigned")
      .sort((a, b) => b.payable + b.cashPending - (a.payable + a.cashPending))
      .slice(0, 6);
    const payableTotal = settlementRows.reduce((sum, row) => sum + row.payable, 0);

    const userDues = new Map<string, any>();
    unpaidRides.forEach((ride) => {
      const userId = ride.customer_id || "guest";
      const profile = users.find((user) => user.id === userId);
      const current = userDues.get(userId) || {
        userId,
        name: ride.customer_name || profile?.name || "Unknown user",
        phone: ride.customer_phone || profile?.phone || "-",
        due: 0,
        rides: 0,
      };
      current.due += rideAmount(ride);
      current.rides += 1;
      userDues.set(userId, current);
    });

    const userMoneyRows = Array.from(userDues.values())
      .sort((a, b) => b.due - a.due)
      .slice(0, 5);

    const topCustomers = [...users]
      .sort((a, b) => asNumber(b.total_spending) - asNumber(a.total_spending))
      .slice(0, 5);

    const demandByArea = Array.from(
      rides.reduce((map, ride) => {
        const area = String(ride.pickup_area || ride.pickup_location || "Unknown").trim() || "Unknown";
        const key = area.length > 32 ? `${area.slice(0, 32)}...` : area;
        const current = map.get(key) || { area: key, total: 0, active: 0, pending: 0, earning: 0 };
        current.total += 1;
        current.earning += rideAmount(ride);
        if (ACTIVE_RIDE_STATUSES.has(safeStatus(ride.status))) current.active += 1;
        if (["pending", "searching"].includes(safeStatus(ride.status))) current.pending += 1;
        map.set(key, current);
        return map;
      }, new Map<string, any>()).values()
    )
      .sort((a, b) => b.pending + b.active - (a.pending + a.active) || b.total - a.total)
      .slice(0, 5);

    const vehicleMix = Array.from(
      rides.reduce((map, ride) => {
        const type = String(ride.vehicle_type || "Standard").toUpperCase();
        map.set(type, (map.get(type) || 0) + 1);
        return map;
      }, new Map<string, number>())
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    const completionBase = completedRides.length + rides.filter((ride) => CLOSED_STATUSES.has(safeStatus(ride.status)) && safeStatus(ride.status) !== "completed").length;
    const completionRate = completionBase ? Math.round((completedRides.length / completionBase) * 100) : asNumber(kpis.completion_rate);

    return {
      activeRides,
      approvedDrivers,
      completionRate,
      demandByArea,
      grossRevenue,
      maxDailyEarning,
      newUsersWeek,
      openTickets,
      payableTotal,
      pendingCollection,
      pendingKyc,
      pendingRides,
      settlementRows,
      sevenDays,
      todayEarning,
      todayRides,
      totalCustomerSpend,
      topCustomers,
      activeUsers,
      userMoneyRows,
      vehicleMix,
    };
  }, [drivers, kpis, registrations, rides, tickets, users]);

  const recentRides = useMemo(
    () => [...rides].sort((a, b) => safeTime(b.created_at) - safeTime(a.created_at)).slice(0, 7),
    [rides]
  );

  const financeRows = finance?.rows || [];
  const paidFinanceRows = financeRows.filter((row: any) => safeStatus(row.status) === "paid").length;
  const lastSync = live?.server_time ? new Date(live.server_time).toLocaleTimeString("en-IN") : new Date().toLocaleTimeString("en-IN");

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-950">BookMyGadi Command Center</h1>
              <Chip text="Live synced" tone="success" />
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Earnings, rides, users, rider KYC, settlement, support, and live dispatch in one operations view.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
              Last sync: {lastSync}
            </div>
            <Button onClick={onRefresh} className="gap-2">
              <Lucide.RefreshCw size={15} />
              Sync now
            </Button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
        <StatTile label="Today earning" value={money(analytics.todayEarning)} caption={`${analytics.todayRides.length} rides today`} icon={Lucide.IndianRupee} tone="emerald" />
        <StatTile label="Active rides" value={analytics.activeRides.length || kpis.active_rides || 0} caption={`${analytics.pendingRides.length} waiting/searching`} icon={Lucide.Navigation} tone="blue" />
        <StatTile label="Active users" value={analytics.activeUsers || kpis.total_riders || 0} caption={`${analytics.newUsersWeek} new this week`} icon={Lucide.Users} tone="indigo" />
        <StatTile label="Approved fleet" value={`${analytics.approvedDrivers}/${drivers.length || kpis.total_drivers || 0}`} caption={`${analytics.pendingKyc} KYC pending`} icon={Lucide.CarFront} tone="slate" />
        <StatTile label="To settle" value={money(analytics.payableTotal)} caption={`${analytics.settlementRows.length} riders in queue`} icon={Lucide.WalletCards} tone="amber" />
        <StatTile label="Open support" value={analytics.openTickets} caption={`${analytics.completionRate || 0}% completion rate`} icon={Lucide.Headset} tone={analytics.openTickets ? "rose" : "emerald"} />
      </div>

      <div className="rounded-lg border border-slate-200 bg-gradient-to-r from-emerald-50 to-blue-50 shadow-sm p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-sm font-black text-slate-900">Finance Management</p>
            <p className="text-xs text-slate-500">Access detailed financial dashboards and settlement tools.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => setModule("finance-dashboard")}
            className="p-4 bg-white rounded-lg border border-slate-200 hover:border-emerald-400 hover:shadow-md transition-all text-left"
          >
            <div className="flex items-center gap-2 mb-2">
              <Lucide.BarChart3 size={18} className="text-emerald-600" />
              <p className="font-semibold text-slate-900">Finance Dashboard</p>
            </div>
            <p className="text-xs text-slate-500">Real-time earnings, revenue breakdown & metrics</p>
          </button>
          <button
            onClick={() => setModule("finance-settlement")}
            className="p-4 bg-white rounded-lg border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all text-left"
          >
            <div className="flex items-center gap-2 mb-2">
              <Lucide.Wallet size={18} className="text-amber-600" />
              <p className="font-semibold text-slate-900">Settlement Mgmt</p>
            </div>
            <p className="text-xs text-slate-500">Driver wallets, payouts & pending settlements</p>
          </button>
          <button
            onClick={() => setModule("earnings-report")}
            className="p-4 bg-white rounded-lg border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all text-left"
          >
            <div className="flex items-center gap-2 mb-2">
              <Lucide.TrendingUp size={18} className="text-blue-600" />
              <p className="font-semibold text-slate-900">Daily Earnings</p>
            </div>
            <p className="text-xs text-slate-500">Detailed earnings reports & analytics</p>
          </button>
          <button
            onClick={() => setModule("finance")}
            className="p-4 bg-white rounded-lg border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all text-left"
          >
            <div className="flex items-center gap-2 mb-2">
              <Lucide.CreditCard size={18} className="text-indigo-600" />
              <p className="font-semibold text-slate-900">Payments</p>
            </div>
            <p className="text-xs text-slate-500">Payment records & transaction history</p>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.95fr)]">
        <section className="space-y-5">
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-black text-slate-900">Live Dispatch Floor</p>
                <p className="text-xs text-slate-500">Real ride queue, demand pressure, and fleet availability.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Chip text={`${analytics.activeRides.length} moving`} tone="info" />
                <Chip text={`${analytics.pendingRides.length} pending`} tone={analytics.pendingRides.length ? "warning" : "success"} />
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.25fr)_320px]">
              <div className="relative min-h-[360px] overflow-hidden bg-[#101827]">
                <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:44px_44px]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_28%,rgba(16,185,129,.22),transparent_28%),radial-gradient(circle_at_76%_38%,rgba(59,130,246,.20),transparent_24%),radial-gradient(circle_at_54%_76%,rgba(245,158,11,.18),transparent_26%)]" />
                {recentRides.slice(0, 10).map((ride, index) => {
                  const isPending = ["pending", "searching"].includes(safeStatus(ride.status));
                  const x = 12 + ((index * 19) % 76);
                  const y = 16 + ((index * 27) % 68);
                  return (
                    <div
                      key={ride.id || index}
                      className={`absolute grid h-8 w-8 place-items-center rounded-full border-2 border-white shadow-lg ${isPending ? "bg-amber-400 text-amber-950" : "bg-emerald-400 text-emerald-950"}`}
                      style={{ left: `${x}%`, top: `${y}%` }}
                      title={ride.pickup_location || ride.pickup || "Ride"}
                    >
                      {isPending ? <Lucide.Timer size={15} /> : <Lucide.Car size={15} />}
                    </div>
                  );
                })}
                <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-white/15 bg-white/10 p-3 text-white backdrop-blur">
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div>
                      <p className="text-xs text-slate-300">Gross GMV</p>
                      <p className="text-lg font-black">{money(analytics.grossRevenue)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-300">Pending collection</p>
                      <p className="text-lg font-black">{money(analytics.pendingCollection)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-300">User spending</p>
                      <p className="text-lg font-black">{money(analytics.totalCustomerSpend)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-300">Paid ledger</p>
                      <p className="text-lg font-black">{paidFinanceRows}/{financeRows.length}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-200 bg-slate-50 p-4 lg:border-l lg:border-t-0">
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">Demand hotspots</p>
                <div className="mt-3 space-y-3">
                  {analytics.demandByArea.length ? analytics.demandByArea.map((area) => (
                    <div key={area.area}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate font-bold text-slate-800">{area.area}</span>
                        <span className="shrink-0 text-xs font-semibold text-slate-500">{area.total} rides</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: pct((area.pending + area.active) * 20) }} />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{area.pending} pending, {area.active} active, {money(area.earning)} GMV</p>
                    </div>
                  )) : (
                    <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">No ride demand yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-900">Per-day Earning</p>
                  <p className="text-xs text-slate-500">Last 7 days from ride ledger.</p>
                </div>
                <Lucide.BarChart3 className="text-emerald-600" size={20} />
              </div>
              <div className="mt-5 flex h-56 items-end gap-3">
                {analytics.sevenDays.map((day) => (
                  <div key={day.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                    <div className="flex h-40 w-full items-end rounded-lg bg-slate-50 px-2">
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-emerald-600 to-blue-500"
                        style={{ height: pct((day.earning / analytics.maxDailyEarning) * 100) }}
                        title={`${day.label}: ${money(day.earning)}`}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-[11px] font-bold text-slate-600">{day.label}</p>
                      <p className="text-[10px] text-slate-400">{day.rides} rides</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-900">Ride Mix & Quality</p>
                  <p className="text-xs text-slate-500">Completion, vehicle demand, and cancelled pressure.</p>
                </div>
                <Lucide.Gauge className="text-blue-600" size={20} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs font-bold uppercase text-slate-500">Completion</p>
                  <p className="mt-1 text-2xl font-black text-slate-900">{analytics.completionRate || 0}%</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs font-bold uppercase text-slate-500">KYC queue</p>
                  <p className="mt-1 text-2xl font-black text-slate-900">{analytics.pendingKyc}</p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {analytics.vehicleMix.length ? analytics.vehicleMix.map(([type, count]) => (
                  <div key={type}>
                    <div className="flex justify-between text-sm">
                      <span className="font-bold text-slate-700">{type}</span>
                      <span className="text-slate-500">{count} rides</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-indigo-500" style={{ width: pct((count / Math.max(rides.length, 1)) * 100) }} />
                    </div>
                  </div>
                )) : (
                  <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">Vehicle mix will appear after rides are created.</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-black text-slate-900">Recent Ride Control</p>
                <p className="text-xs text-slate-500">Latest bookings with fare, payment, rider, and route.</p>
              </div>
              <Chip text={`${rides.length} loaded`} tone="neutral" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Ride</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Rider</th>
                    <th className="px-4 py-3">Route</th>
                    <th className="px-4 py-3 text-right">Fare</th>
                    <th className="px-4 py-3">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentRides.length ? recentRides.map((ride) => (
                    <tr key={ride.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Chip text={ride.status || "pending"} tone={toneForStatus(ride.status)} />
                        <p className="mt-1 text-[11px] font-black text-emerald-600">{ride.booking_display_id || ride.public_id || ""}</p>
                        <p className="mt-1 text-[11px] text-slate-400">{safeTime(ride.created_at) ? new Date(ride.created_at).toLocaleString("en-IN") : "-"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-800">{ride.customer_name || ride.rider_name || "Unknown"}</p>
                        <p className="text-xs text-slate-500">{ride.customer_phone || "-"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-800">{ride.driver_name || "Unassigned"}</p>
                        <p className="text-xs text-slate-500">{ride.driver_phone || ride.driver_id || "-"}</p>
                      </td>
                      <td className="max-w-[340px] px-4 py-3">
                        <p className="truncate text-xs font-semibold text-slate-700">Pickup: {ride.pickup_location || ride.pickup || "-"}</p>
                        <p className="mt-1 truncate text-xs font-semibold text-slate-700">Drop: {ride.destination || ride.drop || "-"}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-900">{money(rideAmount(ride))}</td>
                      <td className="px-4 py-3"><Chip text={ride.payment_status || "unpaid"} tone={toneForStatus(ride.payment_status)} /></td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} className="p-8 text-center text-slate-400">No rides found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <div className="rounded-lg border border-amber-200 bg-white shadow-sm">
            <div className="border-b border-amber-100 bg-amber-50 px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-black text-amber-950"><Lucide.WalletCards size={18} /> Rider Settlement Queue</p>
              <p className="mt-1 text-xs text-amber-800">Payable is computed from paid completed rides at 85% rider share.</p>
            </div>
            <div className="divide-y divide-slate-100">
              {analytics.settlementRows.length ? analytics.settlementRows.map((row) => (
                <div key={row.driverId} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-900">{row.name}</p>
                      <p className="text-xs text-slate-500">{row.rides} completed rides</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-emerald-700">{money(row.payable)}</p>
                      <p className="text-xs text-slate-500">gross {money(row.gross)}</p>
                    </div>
                  </div>
                  {row.cashPending > 0 && <p className="mt-2 text-xs font-semibold text-amber-700">Cash/unpaid follow-up: {money(row.cashPending)}</p>}
                </div>
              )) : (
                <p className="p-4 text-sm text-slate-500">No rider settlement pending from loaded rides.</p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-black text-slate-900"><Lucide.UserRoundSearch size={18} /> User Money Desk</p>
              <p className="mt-1 text-xs text-slate-500">Unpaid user dues plus top spender visibility.</p>
            </div>
            <div className="p-4">
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">Pending user amount</p>
              <div className="mt-2 space-y-2">
                {analytics.userMoneyRows.length ? analytics.userMoneyRows.map((row) => (
                  <div key={row.userId} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800">{row.name}</p>
                      <p className="text-xs text-slate-500">{row.phone} / {row.rides} rides</p>
                    </div>
                    <p className="shrink-0 font-black text-rose-700">{money(row.due)}</p>
                  </div>
                )) : (
                  <p className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500">No unpaid user amount in loaded rides.</p>
                )}
              </div>

              <p className="mt-4 text-xs font-black uppercase tracking-wider text-slate-500">Top user spending</p>
              <div className="mt-2 space-y-2">
                {analytics.topCustomers.length ? analytics.topCustomers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800">{user.name || "Unknown"}</p>
                      <p className="text-xs text-slate-500">{user.phone || user.email || "-"}</p>
                    </div>
                    <p className="shrink-0 font-black text-slate-900">{money(user.total_spending)}</p>
                  </div>
                )) : (
                  <p className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500">User spending data will appear after sync.</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-black text-slate-900"><Lucide.AlertTriangle size={18} /> Ops Attention</p>
            </div>
            <div className="space-y-3 p-4">
              {(live?.alerts || []).map((alert: any, index: number) => (
                <div key={`${alert.title}-${index}`} className="rounded-lg border border-rose-100 bg-rose-50 p-3">
                  <p className="text-sm font-black text-rose-900">{alert.title}</p>
                  <p className="mt-1 text-xs text-rose-700">{alert.message}</p>
                </div>
              ))}
              {analytics.pendingKyc > 0 && (
                <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
                  <p className="text-sm font-black text-amber-900">Rider KYC waiting</p>
                  <p className="mt-1 text-xs text-amber-700">{analytics.pendingKyc} vehicle/rider requests need admin decision.</p>
                </div>
              )}
              {analytics.openTickets > 0 && (
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                  <p className="text-sm font-black text-blue-900">Support desk open</p>
                  <p className="mt-1 text-xs text-blue-700">{analytics.openTickets} tickets are not closed yet.</p>
                </div>
              )}
              {!analytics.pendingKyc && !analytics.openTickets && !(live?.alerts || []).length && (
                <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                  <p className="text-sm font-black text-emerald-900">All clear</p>
                  <p className="mt-1 text-xs text-emerald-700">No critical ops queue in the current sync.</p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
