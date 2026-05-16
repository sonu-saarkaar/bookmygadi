import React, { useEffect, useState } from "react";
import * as Lucide from "lucide-react";
import { Card, Chip, Button } from "@/admin_v2/components/ui";
import { adminV2Api } from "@/admin_v2/services/adminApi";
import { useAdminV2Store } from "@/admin_v2/store/useAdminStore";

interface FinanceDashboardData {
  today?: { rides: number; revenue: number; paid: number; pending: number };
  week?: { rides: number; revenue: number };
  month?: { rides: number; revenue: number };
}

interface DriverWallet {
  driver_id: string;
  name: string;
  balance: number;
  pending_settlement: number;
  total_earned: number;
  rides_count: number;
}

interface DailyMetric {
  date: string;
  total_rides: number;
  completed_rides: number;
  revenue: number;
  average_fare: number;
  paid: number;
  pending: number;
}

type EnterpriseDashboardProps = {
  kpis: any;
  live: any;
  rides: any[];
  drivers: any[];
  onRefresh?: () => void;
};

const KVCard = ({ title, value, subtext, tone }: { title: string; value: string | number; subtext?: string; tone?: "success" | "warning" | "danger" | "info" }) => (
  <Card className="p-6 bg-white rounded-2xl shadow-sm border border-slate-200">
    <p className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">{title}</p>
    <p className="text-3xl font-black text-slate-900">{value}</p>
    {subtext && <p className="text-xs text-slate-500 mt-2">{subtext}</p>}
  </Card>
);

export const EnterpriseDashboard = ({ kpis, live, rides, drivers, onRefresh }: EnterpriseDashboardProps) => {
  const { pushToast } = useAdminV2Store();
  const [financeDash, setFinanceDash] = useState<FinanceDashboardData | null>(null);
  const [wallets, setWallets] = useState<DriverWallet[]>([]);
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetric | null>(null);
  const [loading, setLoading] = useState(true);

  const loadFinanceData = async () => {
    try {
      setLoading(true);
      const [finance, walletsData, metrics] = await Promise.all([
        adminV2Api.getFinanceDashboard(),
        adminV2Api.getDriverWallets(),
        adminV2Api.getDailyMetrics()
      ]);
      setFinanceDash(finance);
      setWallets(walletsData);
      setDailyMetrics(metrics);
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Failed to load finance data", "danger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinanceData();
  }, []);

  const todayRevenue = financeDash?.today?.revenue || 0;
  const todayRides = financeDash?.today?.rides || 0;
  const weekRevenue = financeDash?.week?.revenue || 0;
  const totalPending = wallets.reduce((sum, w) => sum + w.pending_settlement, 0);
  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
  const avgFare = dailyMetrics?.average_fare || 0;
  const completionRate = todayRides > 0 ? ((dailyMetrics?.completed_rides || 0) / todayRides * 100).toFixed(1) : "0";

  const topDrivers = wallets.slice().sort((a, b) => b.total_earned - a.total_earned).slice(0, 5);
  const pendingSettlements = wallets.filter(w => w.pending_settlement > 0).sort((a, b) => b.pending_settlement - a.pending_settlement).slice(0, 5);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Enterprise Finance Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Real-time earnings, settlements & operations metrics.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadFinanceData} disabled={loading} variant="outline" className="border-slate-300">
            <Lucide.RefreshCw size={16} className="mr-2" /> {loading ? "Loading..." : "Refresh"}
          </Button>
          <Button className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white border-0">
            <Lucide.Download size={16} className="mr-2" /> Report
          </Button>
        </div>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="p-6 border-0 shadow-sm bg-gradient-to-br from-emerald-600 to-emerald-800 text-white rounded-2xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-emerald-100 font-medium text-sm mb-1 uppercase tracking-wider">Today's Revenue</p>
              <h2 className="text-4xl font-black">₹{new Intl.NumberFormat('en-IN').format(todayRevenue)}</h2>
              <div className="mt-4 text-xs font-medium text-emerald-200 flex items-center gap-1">
                <Lucide.TrendingUp size={14} className="text-emerald-300" /> +8.2% from yesterday
              </div>
            </div>
            <Lucide.Wallet size={48} className="opacity-20" />
          </div>
        </Card>

        <Card className="p-6 bg-white border border-slate-200 shadow-sm rounded-2xl">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-slate-500 font-bold text-sm uppercase tracking-wider">Weekly Revenue</p>
              <h2 className="text-3xl font-black text-slate-800 mt-2">₹{new Intl.NumberFormat('en-IN').format(weekRevenue)}</h2>
            </div>
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Lucide.BarChart3 size={20} /></div>
          </div>
          <p className="text-xs text-slate-500 mt-3">7-day aggregate</p>
        </Card>

        <Card className="p-6 bg-white border border-slate-200 shadow-sm rounded-2xl">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-slate-500 font-bold text-sm uppercase tracking-wider">Pending Settlements</p>
              <h2 className="text-3xl font-black text-slate-800 mt-2">₹{new Intl.NumberFormat('en-IN').format(totalPending)}</h2>
            </div>
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><Lucide.AlertCircle size={20} /></div>
          </div>
          <p className="text-xs text-amber-600 mt-3">{pendingSettlements.length} drivers awaiting payout</p>
        </Card>

        <Card className="p-6 bg-white border border-slate-200 shadow-sm rounded-2xl">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-slate-500 font-bold text-sm uppercase tracking-wider">Driver Balances</p>
              <h2 className="text-3xl font-black text-slate-800 mt-2">₹{new Intl.NumberFormat('en-IN').format(totalBalance)}</h2>
            </div>
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Lucide.Users size={20} /></div>
          </div>
          <p className="text-xs text-slate-500 mt-3">Total settled balances</p>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="xl:col-span-2 space-y-6">
          {/* Today's Metrics */}
          <Card className="p-0 border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><Lucide.Calendar size={20} className="text-emerald-600" /> Today's Performance</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5">
              <div className="flex flex-col">
                <p className="text-xs text-slate-500 font-bold uppercase">Rides</p>
                <p className="text-2xl font-black text-slate-800 mt-2">{todayRides}</p>
                <p className="text-xs text-slate-500 mt-1">total requests</p>
              </div>
              <div className="flex flex-col">
                <p className="text-xs text-slate-500 font-bold uppercase">Completed</p>
                <p className="text-2xl font-black text-emerald-600 mt-2">{dailyMetrics?.completed_rides || 0}</p>
                <p className="text-xs text-slate-500 mt-1">{completionRate}% success</p>
              </div>
              <div className="flex flex-col">
                <p className="text-xs text-slate-500 font-bold uppercase">Avg Fare</p>
                <p className="text-2xl font-black text-slate-800 mt-2">₹{avgFare.toFixed(0)}</p>
                <p className="text-xs text-slate-500 mt-1">per ride</p>
              </div>
              <div className="flex flex-col">
                <p className="text-xs text-slate-500 font-bold uppercase">Payment Rate</p>
                <p className="text-2xl font-black text-emerald-600 mt-2">{todayRides > 0 ? ((dailyMetrics?.paid || 0) / todayRides * 100).toFixed(0) : 0}%</p>
                <p className="text-xs text-slate-500 mt-1">collected</p>
              </div>
            </div>
          </Card>

          {/* Revenue Breakdown */}
          <Card className="p-0 border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><Lucide.PieChart size={20} className="text-indigo-600" /> Revenue Breakdown</h3>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="font-medium text-slate-700">Paid (Collected)</span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-800">₹{new Intl.NumberFormat('en-IN').format(todayRevenue * 0.75)}</p>
                  <p className="text-xs text-slate-500">75% of total</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                  <span className="font-medium text-slate-700">Pending (Unpaid)</span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-800">₹{new Intl.NumberFormat('en-IN').format(todayRevenue * 0.25)}</p>
                  <p className="text-xs text-slate-500">25% of total</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="font-bold text-slate-700">Platform Commission (10%)</span>
                <p className="font-bold text-slate-800">₹{new Intl.NumberFormat('en-IN').format(todayRevenue * 0.10)}</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">Driver Payouts (90%)</span>
                <p className="font-bold text-emerald-600">₹{new Intl.NumberFormat('en-IN').format(todayRevenue * 0.90)}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Top Earning Drivers */}
          <Card className="p-0 border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><Lucide.Trophy size={20} className="text-amber-500" /> Top Earners (This Week)</h3>
            </div>
            <div className="divide-y divide-slate-50">
              {topDrivers.length > 0 ? topDrivers.map((driver, idx) => (
                <div key={driver.driver_id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                        #{idx + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{driver.name}</p>
                        <p className="text-xs text-slate-500">{driver.rides_count} rides</p>
                      </div>
                    </div>
                  </div>
                  <p className="font-bold text-emerald-600 text-sm">₹{new Intl.NumberFormat('en-IN').format(driver.total_earned)}</p>
                </div>
              )) : (
                <div className="p-4 text-center text-slate-500 text-sm">No data available</div>
              )}
            </div>
          </Card>

          {/* Pending Settlements Queue */}
          <Card className="p-0 border border-rose-200 shadow-sm rounded-2xl overflow-hidden bg-rose-50/50">
            <div className="p-5 border-b border-rose-100 bg-rose-50">
              <h3 className="font-bold text-rose-900 text-lg flex items-center gap-2">
                <Lucide.Clock size={20} className="text-rose-600" /> Settlement Queue
              </h3>
              <p className="text-xs text-rose-700 mt-1">{pendingSettlements.length} drivers awaiting payout</p>
            </div>
            <div className="divide-y divide-rose-100 max-h-80 overflow-y-auto">
              {pendingSettlements.length > 0 ? pendingSettlements.map((driver) => (
                <div key={driver.driver_id} className="p-4 hover:bg-rose-100/50 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{driver.name}</p>
                      <p className="text-xs text-slate-500">{driver.driver_id}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-rose-600">₹{new Intl.NumberFormat('en-IN').format(driver.pending_settlement)}</p>
                      <Chip text="Pending" tone="warning" />
                    </div>
                  </div>
                </div>
              )) : (
                <div className="p-4 text-center text-slate-500 text-sm">No pending settlements</div>
              )}
            </div>
            {pendingSettlements.length > 0 && (
              <div className="p-3 border-t border-rose-100 bg-rose-50">
                <Button className="w-full h-9 text-sm border-rose-300 text-rose-700 hover:bg-rose-100">
                  <Lucide.Send size={14} className="mr-2" /> Process Selected
                </Button>
              </div>
            )}
          </Card>

          {/* Quick Actions */}
          <Card className="p-0 border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><Lucide.Zap size={18} className="text-amber-500" /> Quick Actions</h3>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <button className="flex flex-col items-center justify-center p-3 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl transition-colors">
                <Lucide.CheckCircle2 size={24} className="text-emerald-500 mb-1" />
                <span className="text-xs font-bold text-slate-700 text-center">Settle All</span>
              </button>
              <button className="flex flex-col items-center justify-center p-3 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl transition-colors">
                <Lucide.Download size={24} className="text-indigo-500 mb-1" />
                <span className="text-xs font-bold text-slate-700 text-center">Export</span>
              </button>
              <button className="flex flex-col items-center justify-center p-3 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl transition-colors">
                <Lucide.BarChart3 size={24} className="text-blue-500 mb-1" />
                <span className="text-xs font-bold text-slate-700 text-center">Reports</span>
              </button>
              <button className="flex flex-col items-center justify-center p-3 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl transition-colors">
                <Lucide.Settings size={24} className="text-slate-500 mb-1" />
                <span className="text-xs font-bold text-slate-700 text-center">Settings</span>
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EnterpriseDashboard;
