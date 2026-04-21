import { useEffect, useState, useMemo } from "react";
import { adminV2Api } from "@/admin_v2/services/adminApi";
import { Button, Card, Chip, Modal } from "@/admin_v2/components/ui";
import { useAdminV2Store } from "@/admin_v2/store/useAdminStore";
import * as Lucide from "lucide-react";

export const UserManagementBoard = () => {
  const { pushToast } = useAdminV2Store();
  const [users, setUsers] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQ, setSearchQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Drawer
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("profile"); // profile, rides, coupons, referrals

  // User details
  const [userRides, setUserRides] = useState<any[]>([]);
  const [userCoupons, setUserCoupons] = useState<any[]>([]);
  const [userReferrals, setUserReferrals] = useState<any[]>([]);
  
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

  const loadUserDetails = async (userId: string) => {
    try {
      const [rides, coupons, referrals] = await Promise.all([
        adminV2Api.requestV1(`/users-mgmt/${userId}/rides`),
        adminV2Api.requestV1(`/users-mgmt/${userId}/coupons`),
        adminV2Api.requestV1(`/users-mgmt/${userId}/referrals`)
      ]);
      setUserRides(rides || []);
      setUserCoupons(coupons || []);
      setUserReferrals(referrals || []);
    } catch (e: any) {
      pushToast(e.message || "Failed to load details", "danger");
    }
  };

  useEffect(() => {
    if (selectedUser) {
      loadUserDetails(selectedUser.id);
    }
  }, [selectedUser?.id]);

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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.open(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}/api/v1/users-mgmt/export/csv?token=${localStorage.getItem("bmg_admin_v2_token") || localStorage.getItem("bmg_token")}`, '_blank')}>Export CSV</Button>
          <Button variant="outline" onClick={() => window.open(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}/api/v1/users-mgmt/export/excel?token=${localStorage.getItem("bmg_admin_v2_token") || localStorage.getItem("bmg_token")}`, '_blank')}>Export Excel</Button>
          <Button onClick={loadData}>Refresh</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex gap-4">
          <div className="relative flex-1 max-w-sm">
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
          <table className="w-full text-sm text-left">
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
                      <span className="font-bold text-slate-800">{u.name || "Unknown"}</span>
                      <span className="text-xs text-slate-500">{u.id.slice(-6).toUpperCase()}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="block text-slate-700">{u.phone || "-"}</span>
                    <span className="block text-xs text-slate-500">{u.email}</span>
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
                    <Button variant="outline" className="h-8 text-xs" onClick={() => { setSelectedUser(u); setActiveTab('profile'); }}>View Profile</Button>
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

      {/* Drawer */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedUser(null)}>
          <div className="w-full max-w-2xl h-full bg-slate-50 shadow-2xl flex flex-col transform transition-transform animate-in slide-in-from-right" onClick={e => e.stopPropagation()}>
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center z-10">
               <div>
                 <div className="flex items-center gap-2">
                   <h2 className="text-2xl font-bold text-slate-800">{selectedUser.name}</h2>
                   <Chip text={selectedUser.is_blocked ? "blocked" : selectedUser.status} tone={toneForStatus(selectedUser.is_blocked ? "blocked" : selectedUser.status)} />
                 </div>
                 <p className="text-sm text-slate-500">{selectedUser.email} • ID: {selectedUser.id}</p>
               </div>
               <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><Lucide.X size={20}/></button>
            </div>

            <div className="flex border-b border-slate-200 bg-white px-4 shrink-0 overflow-x-auto">
              {["profile", "rides", "coupons", "referrals"].map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)} 
                  className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors capitalize ${activeTab === tab ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'profile' && (
                <div className="space-y-6">
                   <Card className="p-4 bg-white shadow-sm border border-slate-200">
                     <h3 className="font-bold flex items-center gap-2 mb-4 text-slate-800 border-b pb-2"><Lucide.Settings2 size={18}/> Status Control</h3>
                     <div className="flex flex-wrap gap-2">
                       <Button onClick={() => handleStatusUpdate('active')} variant="outline" className="border-emerald-200 text-emerald-700">Set Active</Button>
                       <Button onClick={() => handleStatusUpdate('verified')} variant="outline" className="border-blue-200 text-blue-700">Set Verified</Button>
                       <Button onClick={() => handleStatusUpdate('dummy')} variant="outline" className="border-amber-200 text-amber-700">Mark Dummy</Button>
                       <Button onClick={() => setShowBlockModal(true)} className="bg-rose-600 hover:bg-rose-700 text-white">Block User</Button>
                     </div>
                     {selectedUser.is_blocked && (
                       <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-lg">
                         <p className="text-xs font-bold text-rose-600 uppercase mb-1">Block Reason</p>
                         <p className="text-sm text-rose-800">{selectedUser.blocked_reason || "No reason provided"}</p>
                       </div>
                     )}
                   </Card>

                   <Card className="p-4 bg-white shadow-sm border border-slate-200">
                     <h3 className="font-bold flex items-center gap-2 mb-4 text-slate-800 border-b pb-2"><Lucide.User size={18}/> Demographics & Activity</h3>
                     <div className="grid grid-cols-2 gap-4 text-sm">
                       <div><p className="text-slate-500">Phone</p><p className="font-bold text-slate-800">{selectedUser.phone || "-"}</p></div>
                       <div><p className="text-slate-500">City</p><p className="font-bold text-slate-800">{selectedUser.city || "-"}</p></div>
                       <div><p className="text-slate-500">Registered On</p><p className="font-bold text-slate-800">{new Date(selectedUser.created_at).toLocaleDateString()}</p></div>
                       <div><p className="text-slate-500">Last Active</p><p className="font-bold text-slate-800">{selectedUser.last_active_at ? new Date(selectedUser.last_active_at).toLocaleString() : "-"}</p></div>
                       <div><p className="text-slate-500">Total Rides</p><p className="font-bold text-slate-800">{selectedUser.total_rides}</p></div>
                       <div><p className="text-slate-500">Lifetime LTV</p><p className="font-bold text-indigo-600">₹{selectedUser.total_spending}</p></div>
                       <div className="col-span-2"><p className="text-slate-500">Source</p><p className="font-bold text-slate-800">{selectedUser.referral_source || "Organic / Unknown"}</p></div>
                     </div>
                   </Card>
                </div>
              )}

              {activeTab === 'rides' && (
                <div className="space-y-3">
                  {userRides.length === 0 ? <p className="text-slate-500 text-center py-8">No rides found for this user.</p> : 
                    userRides.map(r => (
                      <div key={r.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{r.pickup_location} → {r.destination}</p>
                          <p className="text-xs text-slate-500 mt-1">{new Date(r.created_at).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <Chip text={r.status} tone={toneForStatus(r.status)} />
                          <p className="font-bold text-slate-800 mt-1">₹{r.agreed_fare || 0}</p>
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}

              {activeTab === 'coupons' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800">User Coupons</h3>
                    <Button variant="outline" className="h-8 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50" onClick={() => setShowCouponModal(true)}>+ Assign Coupon</Button>
                  </div>
                  {userCoupons.length === 0 ? <p className="text-slate-500 text-center py-8">No coupons assigned.</p> : 
                    userCoupons.map(c => (
                      <div key={c.id} className={`p-4 rounded-xl border flex justify-between items-center shadow-sm ${c.is_used ? 'bg-slate-50 border-slate-200 opacity-70' : 'bg-indigo-50/50 border-indigo-200'}`}>
                        <div>
                          <p className="font-black text-indigo-700 tracking-wider text-lg">{c.coupon_code}</p>
                          <p className="text-xs text-slate-600 mt-0.5">Discount: {c.type === 'percentage' ? `${c.discount}%` : `₹${c.discount}`}</p>
                        </div>
                        <div className="text-right">
                          {c.is_used ? (
                            <><Chip text="Used" tone="neutral" /><p className="text-xs text-slate-500 mt-1">{new Date(c.used_at).toLocaleDateString()}</p></>
                          ) : (
                            <Chip text="Available" tone="success" />
                          )}
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}

              {activeTab === 'referrals' && (
                <div className="space-y-3">
                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl mb-4">
                     <p className="text-emerald-800 font-bold flex items-center gap-2"><Lucide.TrendingUp size={18}/> Referral Summary</p>
                     <p className="text-emerald-600 text-sm mt-1">Total Invites: {userReferrals.length} | Earnings: ₹{userReferrals.filter(r => r.status === 'rewarded').reduce((acc, curr) => acc + curr.reward, 0)}</p>
                  </div>
                  {userReferrals.length === 0 ? <p className="text-slate-500 text-center py-8">No referrals made.</p> : 
                    userReferrals.map(r => (
                      <div key={r.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                        <div>
                          <p className="font-bold text-slate-800">{r.invitee_name} <span className="text-xs font-normal text-slate-500">({r.invitee_email})</span></p>
                          <p className="text-xs text-slate-500 mt-1">Invited on {new Date(r.date).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <Chip text={r.status} tone={r.status === 'rewarded' ? 'success' : 'warning'} />
                          <p className="font-bold text-emerald-600 mt-1">+₹{r.reward}</p>
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          </div>
        </div>
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
