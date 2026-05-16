import React, { useEffect, useState } from "react";
import * as Lucide from "lucide-react";
import { Card, Chip, Button } from "@/admin_v2/components/ui";
import { adminV2Api } from "@/admin_v2/services/adminApi";
import { useAdminV2Store } from "@/admin_v2/store/useAdminStore";

type DailyMetric = {
  date: string;
  total_rides: number;
  completed_rides: number;
  revenue: number;
  average_fare: number;
  paid: number;
  pending: number;
};

type DailyEarningsReportProps = {
  rides: any[];
};

export const DailyEarningsReport = ({ rides }: DailyEarningsReportProps) => {
  const { pushToast } = useAdminV2Store();
  const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "custom">("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetric | null>(null);
  const [loading, setLoading] = useState(false);

  const getDatesForRange = (range: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let start = new Date(today);
    let end = new Date(today);
    end.setHours(23, 59, 59, 999);

    if (range === "week") {
      start.setDate(today.getDate() - 6);
    } else if (range === "month") {
      start.setDate(1);
    }

    return { start, end };
  };

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const metrics = await adminV2Api.getDailyMetrics();
      setDailyMetrics(metrics);
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Failed to load metrics", "danger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const getFilteredRides = () => {
    const { start, end } = getDatesForRange(dateRange);
    return rides.filter(r => {
      const rideDate = new Date(r.created_at);
      return rideDate >= start && rideDate <= end;
    });
  };

  const calculateMetrics = () => {
    const filteredRides = getFilteredRides();
    const completedRides = filteredRides.filter(r => (r.status || "").toLowerCase() === "completed");
    const paidRides = completedRides.filter(r => (r.payment_status || "").toLowerCase() === "paid");
    const pendingRides = completedRides.filter(r => (r.payment_status || "").toLowerCase() === "unpaid");

    const totalRevenue = completedRides.reduce((sum, r) => sum + (Number(r.agreed_fare) || 0), 0);
    const platformCommission = totalRevenue * 0.10;
    const driverPayouts = totalRevenue * 0.90;
    const netProfit = totalRevenue - driverPayouts;

    return {
      total_rides: filteredRides.length,
      completed_rides: completedRides.length,
      revenue: totalRevenue,
      paid: paidRides.length,
      pending: pendingRides.length,
      avg_fare: completedRides.length > 0 ? totalRevenue / completedRides.length : 0,
      commission: platformCommission,
      payouts: driverPayouts,
      profit: netProfit
    };
  };

  const metrics = calculateMetrics();

  const MetricCard = ({ title, value, subtext, icon: Icon, color }: any) => (
    <Card className={`p-6 rounded-2xl border-0 shadow-sm bg-gradient-to-br ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-2">{title}</p>
          <p className="text-3xl font-black text-slate-900">{value}</p>
          {subtext && <p className="text-xs text-slate-600 mt-2">{subtext}</p>}
        </div>
        {Icon && <Icon size={48} className="opacity-20 text-slate-800" />}
      </div>
    </Card>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Daily Earnings Report</h1>
          <p className="text-slate-500 text-sm mt-1">Comprehensive revenue, commission & payout analytics.</p>
        </div>
        <Button onClick={loadMetrics} disabled={loading} variant="outline" className="border-slate-300">
          <Lucide.RefreshCw size={16} className="mr-2" /> {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      {/* Date Range Selector */}
      <Card className="p-4 border border-slate-200 shadow-sm rounded-2xl bg-white">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-bold uppercase text-slate-500">Period:</label>
          <button
            onClick={() => setDateRange("today")}
            className={`h-9 px-4 rounded-lg text-sm font-semibold transition-colors ${
              dateRange === "today"
                ? "bg-emerald-600 text-white border border-emerald-700"
                : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setDateRange("week")}
            className={`h-9 px-4 rounded-lg text-sm font-semibold transition-colors ${
              dateRange === "week"
                ? "bg-emerald-600 text-white border border-emerald-700"
                : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setDateRange("month")}
            className={`h-9 px-4 rounded-lg text-sm font-semibold transition-colors ${
              dateRange === "month"
                ? "bg-emerald-600 text-white border border-emerald-700"
                : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setDateRange("custom")}
            className={`h-9 px-4 rounded-lg text-sm font-semibold transition-colors ${
              dateRange === "custom"
                ? "bg-emerald-600 text-white border border-emerald-700"
                : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
            }`}
          >
            Custom
          </button>
          {dateRange === "custom" && (
            <div className="flex items-center gap-2 ml-2">
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="h-9 px-3 border border-slate-300 rounded-lg text-sm" />
              <span className="text-slate-500">to</span>
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="h-9 px-3 border border-slate-300 rounded-lg text-sm" />
            </div>
          )}
        </div>
      </Card>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Revenue"
          value={`₹${new Intl.NumberFormat('en-IN').format(metrics.revenue.toFixed(0))}`}
          subtext={`${metrics.completed_rides} completed rides`}
          icon={Lucide.TrendingUp}
          color="from-emerald-50 to-emerald-100"
        />
        <MetricCard
          title="Platform Commission (10%)"
          value={`₹${new Intl.NumberFormat('en-IN').format(metrics.commission.toFixed(0))}`}
          subtext="Retained by platform"
          icon={Lucide.PieChart}
          color="from-blue-50 to-blue-100"
        />
        <MetricCard
          title="Driver Payouts (90%)"
          value={`₹${new Intl.NumberFormat('en-IN').format(metrics.payouts.toFixed(0))}`}
          subtext="Owed to drivers"
          icon={Lucide.Send}
          color="from-amber-50 to-amber-100"
        />
        <MetricCard
          title="Net Profit"
          value={`₹${new Intl.NumberFormat('en-IN').format(metrics.profit.toFixed(0))}`}
          subtext="Revenue after commission"
          icon={Lucide.Award}
          color="from-indigo-50 to-indigo-100"
        />
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Status */}
        <Card className="p-0 border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <Lucide.PieChart size={20} className="text-indigo-600" /> Payment Status
            </h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-emerald-500"></div>
                <span className="font-medium text-slate-700">Collected (Paid)</span>
              </div>
              <div className="text-right">
                <p className="font-black text-emerald-600">₹{new Intl.NumberFormat('en-IN').format((metrics.revenue * metrics.paid / (metrics.paid + metrics.pending || 1)).toFixed(0))}</p>
                <p className="text-xs text-slate-500">{metrics.paid} rides</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-amber-400"></div>
                <span className="font-medium text-slate-700">Pending (Unpaid)</span>
              </div>
              <div className="text-right">
                <p className="font-black text-amber-600">₹{new Intl.NumberFormat('en-IN').format((metrics.revenue * metrics.pending / (metrics.paid + metrics.pending || 1)).toFixed(0))}</p>
                <p className="text-xs text-slate-500">{metrics.pending} rides</p>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-200">
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-amber-400"
                  style={{ width: `${(metrics.paid / (metrics.paid + metrics.pending || 1)) * 100}%` }}
                ></div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {((metrics.paid / (metrics.paid + metrics.pending || 1)) * 100).toFixed(1)}% payment success rate
              </p>
            </div>
          </div>
        </Card>

        {/* Ride Analytics */}
        <Card className="p-0 border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <Lucide.BarChart3 size={20} className="text-blue-600" /> Ride Analytics
            </h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-700">Total Ride Requests</span>
              <p className="font-black text-slate-800 text-xl">{metrics.total_rides}</p>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-700">Completed Rides</span>
              <p className="font-black text-emerald-600 text-xl">
                {metrics.completed_rides} <span className="text-sm text-slate-500 font-normal">({((metrics.completed_rides / metrics.total_rides) * 100).toFixed(1)}%)</span>
              </p>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-700">Average Fare per Ride</span>
              <p className="font-black text-slate-800 text-xl">₹{new Intl.NumberFormat('en-IN').format(metrics.avg_fare.toFixed(0))}</p>
            </div>
            <div className="pt-3 border-t border-slate-200">
              <p className="text-xs text-slate-600 font-semibold uppercase mb-2">Completion Rate</p>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${((metrics.completed_rides / metrics.total_rides) * 100) || 0}%` }}></div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Revenue Breakdown Table */}
      <Card className="p-0 border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <Lucide.Table size={20} className="text-slate-600" /> Detailed Breakdown
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-600">Metric</th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase text-slate-600">Value</th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase text-slate-600">% of Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <tr className="hover:bg-slate-50">
                <td className="px-6 py-4 font-semibold text-slate-700">Total Revenue (GMV)</td>
                <td className="px-6 py-4 text-right font-bold text-slate-800">₹{new Intl.NumberFormat('en-IN').format(metrics.revenue.toFixed(0))}</td>
                <td className="px-6 py-4 text-right text-slate-500">100%</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-6 py-4 font-semibold text-slate-700">Platform Commission (10%)</td>
                <td className="px-6 py-4 text-right font-bold text-blue-600">₹{new Intl.NumberFormat('en-IN').format(metrics.commission.toFixed(0))}</td>
                <td className="px-6 py-4 text-right text-slate-500">10%</td>
              </tr>
              <tr className="hover:bg-slate-50 bg-emerald-50">
                <td className="px-6 py-4 font-semibold text-emerald-800">Driver Payouts (90%)</td>
                <td className="px-6 py-4 text-right font-black text-emerald-600">₹{new Intl.NumberFormat('en-IN').format(metrics.payouts.toFixed(0))}</td>
                <td className="px-6 py-4 text-right text-emerald-700 font-bold">90%</td>
              </tr>
              <tr className="hover:bg-slate-50 bg-indigo-50">
                <td className="px-6 py-4 font-bold text-indigo-800">Net Platform Profit</td>
                <td className="px-6 py-4 text-right font-black text-indigo-600">₹{new Intl.NumberFormat('en-IN').format(metrics.profit.toFixed(0))}</td>
                <td className="px-6 py-4 text-right text-indigo-700 font-bold">10%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Export Options */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" className="border-slate-300">
          <Lucide.Download size={16} className="mr-2" /> Export as CSV
        </Button>
        <Button className="bg-emerald-600 text-white border-0 hover:bg-emerald-700">
          <Lucide.FileText size={16} className="mr-2" /> Generate PDF
        </Button>
      </div>
    </div>
  );
};

export default DailyEarningsReport;
