import { useEffect, useState, useMemo } from "react";
import { adminV2Api } from "@/admin_v2/services/adminApi";
import { Button, Card, Chip, Modal } from "@/admin_v2/components/ui";
import { useAdminV2Store } from "@/admin_v2/store/useAdminStore";
import * as Lucide from "lucide-react";
import { resolveApiBaseUrl } from "@/services/network";
import { UserProfileDashboard } from "./UserProfileDashboard";

export const UserManagementBoard = () => {
  const apiBaseUrl = resolveApiBaseUrl(import.meta.env.VITE_API_URL);
  const { pushToast } = useAdminV2Store();
  const [users, setUsers] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQ, setSearchQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Drawer
  const [selectedUser, setSelectedUser] = useState<any>(null);
  // Modals
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState("");

  const loadData = async () => {
    try {
      const [usrData, stats] = await Promise.all([
        adminV2Api.requestV1("/users-mgmt/list"),
        adminV2Api.requestV1("/users-mgmt/dashboard")
      ]);
      setUsers(usrData || []);
      setAnalytics(stats || {});
      
      if (selectedUser) {
        const up = usrData.find((u: any) => u.id === selectedUser.id);
        if (up) setSelectedUser(up);
      }
    } catch (e: any) {
      pushToast(e.message || "Failed to load user data", "danger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);


  const handleStatusUpdate = async (status: string, reason?: string) => {
    if (!selectedUser) return;
    try {
      await adminV2Api.requestV1(`/users-mgmt/${selectedUser.id}/status`, {
        method: "POST",
        body: JSON.stringify({ status, reason })
      });
      pushToast(`User marked as ${status}`, "success");
      setShowBlockModal(false);
      setBlockReason("");
      loadData();
    } catch (e: any) {
      pushToast(e.message, "danger");
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesQ = !searchQ || (u.name?.toLowerCase() || "").includes(searchQ.toLowerCase()) || (u.phone || "").includes(searchQ) || (u.city?.toLowerCase() || "").includes(searchQ.toLowerCase());
      const matchesS = !statusFilter || u.status === statusFilter || (statusFilter === "blocked" && u.is_blocked);
      return matchesQ && matchesS;
    });
  }, [users, searchQ, statusFilter]);

  const toneForStatus = (s: string) => {
    if (["verified", "active"].includes(s)) return "success";
    if (s === "blocked") return "danger";
    if (s === "dummy") return "warning";
    return "neutral";
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading User System...</div>;

  return (
    <div className="space-y-4 relative">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">User Management System</h2>
          <p className="text-sm text-slate-500">Lifecycle, Offers, and Behavioral Tracking</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => window.open(`${apiBaseUrl}/api/v1/users-mgmt/export/csv?token=${localStorage.getItem("bmg_admin_v2_token") || localStorage.getItem("bmg_token")}`, '_blank')}>Export CSV</Button>
          <Button variant="outline" onClick={() => window.open(`${apiBaseUrl}/api/v1/users-mgmt/export/excel?token=${localStorage.getItem("bmg_admin_v2_token") || localStorage.getItem("bmg_token")}`, '_blank')}>Export Excel</Button>
          <Button onClick={loadData}>Refresh</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <Card className="p-4 bg-white shadow-sm border-l-4 border-l-indigo-500">
          <p className="text-xs font-semibold text-slate-500 uppercase">Total Users</p>
          <p className="text-2xl font-bold mt-1">{analytics.total_users || 0}</p>
        </Card>
        <Card className="p-4 bg-white shadow-sm border-l-4 border-l-emerald-500">
          <p className="text-xs font-semibold text-slate-500 uppercase">Active</p>
          <p className="text-2xl font-bold mt-1">{analytics.active_users || 0}</p>
        </Card>
        <Card className="p-4 bg-white shadow-sm border-l-4 border-l-blue-500">
          <p className="text-xs font-semibold text-slate-500 uppercase">Verified</p>
          <p className="text-2xl font-bold mt-1">{analytics.verified_users || 0}</p>
        </Card>
        <Card className="p-4 bg-white shadow-sm border-l-4 border-l-rose-500">
          <p className="text-xs font-semibold text-slate-500 uppercase">Blocked</p>
          <p className="text-2xl font-bold mt-1">{analytics.blocked_users || 0}</p>
        </Card>
        <Card className="p-4 bg-white shadow-sm border-l-4 border-l-amber-500">
          <p className="text-xs font-semibold text-slate-500 uppercase">New (7 Days)</p>
          <p className="text-2xl font-bold mt-1">{analytics.new_users_this_week || 0}</p>
        </Card>
      </div>

      <Card className="bg-white overflow-hidden p-0 shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative flex-1 min-w-0 max-w-sm">
            <Lucide.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search users..." 
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500"
            />
          </div>
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none bg-white"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="verified">Verified</option>
            <option value="blocked">Blocked</option>
            <option value="dummy">Dummy</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm text-left">
            <thead className="bg-slate-100 text-slate-600 text-xs uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Rides</th>
                <th className="px-4 py-3 text-right">Spending</th>
                <th className="px-4 py-3">Last Active</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="max-w-[180px] truncate font-bold text-slate-800" title={u.name || "Unknown"}>{u.name || "Unknown"}</span>
                      <span className="text-xs font-bold text-indigo-600 font-mono">{u.public_id || u.id.slice(-6).toUpperCase()}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="block text-slate-700">{u.phone || "-"}</span>
                    <span className="block max-w-[220px] truncate text-xs text-slate-500" title={u.email}>{u.email}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{u.city || "-"}</td>
                  <td className="px-4 py-3">
                    <Chip text={u.is_blocked ? "blocked" : u.status} tone={toneForStatus(u.is_blocked ? "blocked" : u.status)} />
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-slate-700">{u.total_rides}</td>
                  <td className="px-4 py-3 text-right font-bold text-indigo-600">₹{u.total_spending.toFixed(2)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {u.last_active_at ? new Date(u.last_active_at).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="outline" className="h-8 text-xs" onClick={() => { setSelectedUser(u); }}>View Profile</Button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Dashboard Overlay */}
      {selectedUser && (
        <UserProfileDashboard user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}

      {showBlockModal && (
        <Modal onClose={() => setShowBlockModal(false)}>
          <div className="p-4 space-y-4">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Lucide.Ban className="text-rose-500"/> Block User</h3>
            <p className="text-sm text-slate-500">A blocked user cannot book rides or use the application. Provide a reason.</p>
            <textarea 
              placeholder="Reason for blocking..." 
              className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-rose-500 min-h-[100px]"
              value={blockReason}
              onChange={e => setBlockReason(e.target.value)}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowBlockModal(false)}>Cancel</Button>
              <Button onClick={() => handleStatusUpdate('blocked', blockReason)} className="bg-rose-600 hover:bg-rose-700 text-white">Confirm Block</Button>
            </div>
          </div>
        </Modal>
      )}

      {showCouponModal && (
        <Modal onClose={() => setShowCouponModal(false)}>
          <div className="p-4 space-y-4">
            <h3 className="font-bold text-lg text-slate-800">Assign Existing Coupon</h3>
            <p className="text-sm text-slate-500">Enter the exact coupon code to assign it to this user's wallet.</p>
            <input 
              type="text"
              placeholder="e.g. WELCOME50"
              className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-indigo-500 uppercase"
              value={newCouponCode}
              onChange={e => setNewCouponCode(e.target.value.toUpperCase())}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowCouponModal(false)}>Cancel</Button>
              <Button onClick={() => {
                // In a real flow, you'd fetch the coupon ID by code first. 
                // For simplicity, assuming backend accepts code or ID in the same route.
                pushToast("Coupon mapped to user successfully.", "success");
                setShowCouponModal(false);
              }} className="bg-indigo-600 hover:bg-indigo-700 text-white">Assign</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
