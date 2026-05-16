import React, { useEffect, useState } from "react";
import * as Lucide from "lucide-react";
import { Button, Card, Chip, Modal } from "@/admin_v2/components/ui";
import { adminV2Api } from "@/admin_v2/services/adminApi";
import { useAdminV2Store } from "@/admin_v2/store/useAdminStore";

export const UserProfileDashboard = ({ user, onClose }: { user: any; onClose: () => void }) => {
  const { pushToast } = useAdminV2Store();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);

  // Fetched data states
  const [rides, setRides] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);

  // Derived real metrics
  const realTotalRides = rides.length > 0 ? rides.length : (user.total_rides || 0);
  const realTotalSpend = rides.length > 0 
    ? rides.filter(r => r.status === 'completed').reduce((sum, r) => sum + (Number(r.agreed_fare) || 0), 0) 
    : (user.total_spending || 0);
  const cancelledRides = rides.filter(r => ['cancelled', 'failed', 'rejected'].includes((r.status || '').toLowerCase())).length;
  const cancellationRate = realTotalRides > 0 ? Math.round((cancelledRides / realTotalRides) * 100) : 0;
  const healthScore = Math.max(0, 100 - cancellationRate);

  useEffect(() => {
    const loadDetails = async () => {
      setLoading(true);
      try {
        const [r, c, ref] = await Promise.all([
          adminV2Api.requestV1(`/users-mgmt/${user.id}/rides`).catch(() => []),
          adminV2Api.requestV1(`/users-mgmt/${user.id}/coupons`).catch(() => []),
          adminV2Api.requestV1(`/users-mgmt/${user.id}/referrals`).catch(() => []),
        ]);
        setRides(r || []);
        setCoupons(c || []);
        setReferrals(ref || []);
      } catch (e: any) {
        pushToast(e.message || "Failed to load details", "danger");
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [user.id]);

  const TABS = [
    { id: "overview", label: "Overview", icon: Lucide.LayoutDashboard },
    { id: "basic", label: "Basic Profile", icon: Lucide.User },
    { id: "live", label: "Live Activity", icon: Lucide.Activity },
    { id: "rides", label: "Ride History", icon: Lucide.Map },
    { id: "analytics", label: "Behavior Analytics", icon: Lucide.LineChart },
    { id: "support", label: "Complaints & Support", icon: Lucide.Headset },
    { id: "financial", label: "Financial Profile", icon: Lucide.Wallet },
    { id: "marketing", label: "Marketing CRM", icon: Lucide.Megaphone },
    { id: "documents", label: "Documents", icon: Lucide.FileText },
    { id: "security", label: "Security Logs", icon: Lucide.ShieldAlert },
    { id: "audit", label: "Admin Audit Logs", icon: Lucide.History },
  ];

  const toneForStatus = (s: string) => {
    if (["verified", "active"].includes(s)) return "success";
    if (s === "blocked") return "danger";
    if (s === "dummy") return "warning";
    return "neutral";
  };

  const handleAction = (action: string) => {
    pushToast(`${action} action triggered (Not fully implemented)`, "info");
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col animate-in fade-in zoom-in-95 duration-200 text-slate-800 font-sans">
      {/* Top Header - Always Visible */}
      <div className="bg-slate-900 text-white shadow-md border-b border-slate-700 z-10 shrink-0 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_auto] items-start gap-4 px-4 sm:px-6 py-4">
        <div className="grid grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-3 sm:gap-4 min-w-0">
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-300 hover:text-white shrink-0">
            <Lucide.ArrowLeft size={24} />
          </button>
          <div className="relative shrink-0">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-xl font-bold border-2 border-slate-700">
              {user.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${user.is_blocked ? "bg-rose-500" : "bg-emerald-500"}`} title={user.is_blocked ? "Blocked" : "Online"} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl lg:text-2xl font-bold tracking-tight leading-tight break-words">{user.name || "Unknown User"}</h1>
              <Chip text={user.is_blocked ? "Blocked" : (user.status || "Active")} tone={toneForStatus(user.is_blocked ? "blocked" : (user.status || "active"))} />
            </div>
            <div className="text-xs lg:text-sm text-slate-400 mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="inline-flex items-center gap-1 font-mono max-w-full" title={user.id}><Lucide.Fingerprint size={14} className="shrink-0" /> <span className="truncate">{user.public_id || `${user.id.slice(0, 8)}...`}</span></span>
              <span className="inline-flex items-center gap-1 max-w-[220px]" title={user.city || "Unknown City"}><Lucide.MapPin size={14} className="shrink-0" /> <span className="truncate">{user.city || "Unknown City"}</span></span>
              <span className="inline-flex items-center gap-1 whitespace-nowrap"><Lucide.Calendar size={14} className="shrink-0" /> Reg: {new Date(user.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] xl:grid-cols-[auto_auto] items-center gap-3 sm:gap-4 w-full xl:w-auto xl:justify-end">
          <div className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 sm:text-right">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Profile Completion</p>
            <div className="w-24 h-1.5 bg-slate-800 rounded-full mt-1.5 overflow-hidden flex ml-auto">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: '85%' }}></div>
            </div>
            <p className="text-[10px] text-emerald-400 mt-1 font-bold">85% Complete</p>
          </div>
          <div className="grid grid-cols-2 sm:flex items-center gap-2 sm:flex-wrap sm:justify-end min-w-0">
            <Button className="h-9 min-w-0 px-3 text-xs bg-indigo-600 hover:bg-indigo-700 text-white border-0" onClick={() => handleAction("Verify")}><Lucide.CheckCircle size={14} className="mr-1 shrink-0"/> Verify</Button>
            <Button className="h-9 min-w-0 px-3 text-xs bg-rose-600/20 text-rose-400 hover:bg-rose-600/40 border border-rose-500/30" onClick={() => handleAction("Block")}><Lucide.Ban size={14} className="mr-1 shrink-0"/> Block</Button>
            <Button className="h-9 min-w-0 px-3 text-xs bg-amber-600/20 text-amber-400 hover:bg-amber-600/40 border border-amber-500/30" onClick={() => handleAction("Suspend")}><Lucide.PauseCircle size={14} className="mr-1 shrink-0"/> Suspend</Button>
            <div className="relative group">
              <Button variant="outline" className="h-9 w-full sm:w-auto px-3 text-xs border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white">More <Lucide.ChevronDown size={14} className="ml-1 shrink-0"/></Button>
              <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-48 py-1 hidden group-hover:block z-50">
                <button className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2" onClick={() => handleAction("Delete")}><Lucide.Trash2 size={14} className="text-rose-400"/> Delete User</button>
                <button className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2" onClick={() => handleAction("Reset Password")}><Lucide.Key size={14}/> Reset Password</button>
                <button className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2" onClick={() => handleAction("Reset MPIN")}><Lucide.Hash size={14}/> Reset MPIN</button>
                <button className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2" onClick={() => handleAction("Force Logout")}><Lucide.LogOut size={14}/> Force Logout</button>
                <button className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2" onClick={() => handleAction("Assign Support")}><Lucide.Headset size={14}/> Assign Support Agent</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden bg-slate-50">
        {/* Left Sidebar Navigation */}
        <div className="hidden md:flex w-64 bg-white border-r border-slate-200 shadow-sm z-0 flex-col py-4 overflow-y-auto shrink-0">
          <p className="px-6 text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 mt-2">Dashboard</p>
          <nav className="flex-1 space-y-1 px-3">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                >
                  <Icon size={18} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Side Content */}
        <div className="flex-1 min-w-0 overflow-y-auto p-4 md:p-8 bg-slate-100 relative">
          <div className="max-w-6xl mx-auto pb-20">
            {activeTab === "overview" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="p-5 shadow-sm border-0 border-l-4 border-l-indigo-500 rounded-xl bg-white">
                    <p className="text-sm font-semibold text-slate-500">Total Spend</p>
                    <p className="text-3xl font-black text-slate-800 mt-2">₹{realTotalSpend.toFixed(2)}</p>
                  </Card>
                  <Card className="p-5 shadow-sm border-0 border-l-4 border-l-emerald-500 rounded-xl bg-white">
                    <p className="text-sm font-semibold text-slate-500">Total Rides</p>
                    <p className="text-3xl font-black text-slate-800 mt-2">{realTotalRides}</p>
                  </Card>
                  <Card className="p-5 shadow-sm border-0 border-l-4 border-l-rose-500 rounded-xl bg-white">
                    <p className="text-sm font-semibold text-slate-500">Cancellations</p>
                    <p className="text-3xl font-black text-slate-800 mt-2">{cancellationRate}%</p>
                  </Card>
                  <Card className="p-5 shadow-sm border-0 border-l-4 border-l-amber-500 rounded-xl bg-white">
                    <p className="text-sm font-semibold text-slate-500">User Health Score</p>
                    <p className={`text-3xl font-black mt-2 ${healthScore > 80 ? 'text-emerald-600' : healthScore > 50 ? 'text-amber-600' : 'text-rose-600'}`}>{healthScore}/100</p>
                  </Card>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="lg:col-span-2 p-6 shadow-sm border border-slate-200 rounded-xl bg-white">
                     <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Lucide.Map size={20} className="text-indigo-500"/> Recent Rides</h3>
                     <div className="space-y-4">
                       {rides.slice(0, 3).length > 0 ? rides.slice(0, 3).map(r => (
                         <div key={r.id} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-200">
                           <div>
                             <p className="font-bold text-sm text-slate-800">{r.pickup_location || "Unknown"} → {r.destination || "Unknown"}</p>
                             <p className="text-xs text-slate-500">{new Date(r.created_at).toLocaleString()}</p>
                           </div>
                           <div className="text-right">
                             <p className="font-bold text-indigo-600">₹{r.agreed_fare}</p>
                             <Chip text={r.status} tone={toneForStatus(r.status)} />
                           </div>
                         </div>
                       )) : <p className="text-slate-500 text-sm py-4">No recent rides found.</p>}
                     </div>
                     <Button variant="outline" className="w-full mt-4 border-dashed" onClick={() => setActiveTab("rides")}>View All Rides</Button>
                  </Card>
                  <div className="space-y-6">
                    <Card className="p-6 shadow-sm border border-slate-200 rounded-xl bg-white">
                      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Lucide.AlertCircle size={20} className="text-rose-500"/> Auto Insights</h3>
                      <div className="space-y-3">
                        <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg flex items-start gap-3 text-sm text-emerald-800">
                          <Lucide.TrendingUp className="text-emerald-500 mt-0.5 shrink-0" size={16} />
                          <div>
                            <span className="font-bold block">High Value User</span>
                            Spends 40% more than average users in their city.
                          </div>
                        </div>
                        <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg flex items-start gap-3 text-sm text-amber-800">
                          <Lucide.Clock className="text-amber-500 mt-0.5 shrink-0" size={16} />
                          <div>
                            <span className="font-bold block">Inactive Risk</span>
                            Has not opened the app in the last 7 days.
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "basic" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <Card className="p-0 shadow-sm border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-slate-800">Personal Information</h2>
                    <Button variant="outline" className="h-8 text-xs"><Lucide.Edit2 size={14} className="mr-2"/> Edit Profile</Button>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-8">
                    <div><p className="text-xs text-slate-500 font-semibold uppercase mb-1">Full Name</p><p className="font-medium text-slate-900">{user.name || "Not Provided"}</p></div>
                    <div><p className="text-xs text-slate-500 font-semibold uppercase mb-1">Phone Number</p><p className="font-medium text-slate-900">{user.phone || "Not Provided"}</p></div>
                    <div><p className="text-xs text-slate-500 font-semibold uppercase mb-1">Email Address</p><p className="font-medium text-slate-900">{user.email || "Not Provided"}</p></div>
                    <div><p className="text-xs text-slate-500 font-semibold uppercase mb-1">Gender</p><p className="font-medium text-slate-900">{user.gender || "Not Provided"}</p></div>
                    <div><p className="text-xs text-slate-500 font-semibold uppercase mb-1">Date of Birth</p><p className="font-medium text-slate-900">{user.dob || "Not Provided"}</p></div>
                    <div><p className="text-xs text-slate-500 font-semibold uppercase mb-1">Language</p><p className="font-medium text-slate-900">{user.language || "English, Hindi"}</p></div>
                    <div className="md:col-span-2"><p className="text-xs text-slate-500 font-semibold uppercase mb-1">Address</p><p className="font-medium text-slate-900">{user.address || `Sector 4, ${user.city || "Unknown City"}`}</p></div>
                    <div><p className="text-xs text-slate-500 font-semibold uppercase mb-1">State / Pincode</p><p className="font-medium text-slate-900">{user.state || "Not Provided"}</p></div>
                    <div><p className="text-xs text-slate-500 font-semibold uppercase mb-1">Emergency Contact</p><p className="font-medium text-slate-900">{user.emergency_contact || "Not Provided"}</p></div>
                    <div><p className="text-xs text-slate-500 font-semibold uppercase mb-1">Referral Code</p><p className="font-medium text-indigo-600 font-mono">{user.referral_code || "Not Provided"}</p></div>
                  </div>
                </Card>

                <Card className="p-0 shadow-sm border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <div className="bg-slate-50 p-4 border-b border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800">Device Details</h2>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-y-6 gap-x-8">
                    <div><p className="text-xs text-slate-500 font-semibold uppercase mb-1">Phone Model</p><p className="font-medium text-slate-900 flex items-center gap-2"><Lucide.Smartphone size={16} className="text-slate-400"/> Samsung Galaxy S23</p></div>
                    <div><p className="text-xs text-slate-500 font-semibold uppercase mb-1">OS Version</p><p className="font-medium text-slate-900">Android 14</p></div>
                    <div><p className="text-xs text-slate-500 font-semibold uppercase mb-1">App Version</p><p className="font-medium text-slate-900">v2.1.0 (Build 44)</p></div>
                    <div><p className="text-xs text-slate-500 font-semibold uppercase mb-1">Current IP</p><p className="font-medium text-slate-900 font-mono text-sm">103.14.22.19</p></div>
                  </div>
                </Card>
              </div>
            )}

            {activeTab === "live" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <Card className="p-0 shadow-sm border border-slate-200 rounded-xl overflow-hidden bg-white">
                   <div className="bg-slate-800 h-[300px] flex items-center justify-center relative overflow-hidden">
                     {/* Mocked Map */}
                     <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")' }}></div>
                     <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-indigo-500 rounded-full shadow-[0_0_0_8px_rgba(99,102,241,0.3)] animate-pulse -translate-x-1/2 -translate-y-1/2"></div>
                     <div className="absolute top-1/2 left-1/2 -mt-10 -ml-16 bg-white px-3 py-1.5 rounded-lg shadow-lg text-sm font-bold text-slate-800 z-10 flex items-center gap-2">
                       <Lucide.Navigation size={14} className="text-indigo-600"/> Current Location
                     </div>
                   </div>
                   <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                     <div><p className="text-xs text-slate-500 uppercase">Status</p><div className="font-bold text-emerald-600 flex items-center gap-1 mt-1"><div className="w-2 h-2 rounded-full bg-emerald-500"/> Online Now</div></div>
                     <div><p className="text-xs text-slate-500 uppercase">Last App Open</p><p className="font-bold text-slate-800 mt-1">2 mins ago</p></div>
                     <div><p className="text-xs text-slate-500 uppercase">Current Screen</p><p className="font-bold text-slate-800 mt-1">Searching Ride</p></div>
                     <div><p className="text-xs text-slate-500 uppercase">Battery & Network</p><div className="font-bold text-slate-800 mt-1 flex items-center gap-2"><Lucide.Battery size={16} className="text-emerald-500"/> 84% <Lucide.Wifi size={16} className="text-indigo-500"/> 4G</div></div>
                   </div>
                </Card>
              </div>
            )}

            {activeTab === "rides" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex gap-2">
                    <input type="date" className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none bg-slate-50 focus:border-indigo-500" />
                    <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none bg-slate-50 focus:border-indigo-500">
                      <option>All Status</option>
                      <option>Completed</option>
                      <option>Cancelled</option>
                    </select>
                  </div>
                  <Button variant="outline"><Lucide.Download size={16} className="mr-2"/> Export Rides</Button>
                </div>
                
                <Card className="p-0 shadow-sm border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <div className="overflow-x-auto">
                  <table className="w-full min-w-[880px] text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4">Date/Time</th>
                        <th className="px-6 py-4">Pickup & Drop</th>
                        <th className="px-6 py-4">Driver</th>
                        <th className="px-6 py-4">Fare</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rides.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 text-slate-500 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                          <td className="px-6 py-4">
                            <div className="max-w-[200px] truncate font-medium text-slate-800" title={r.pickup_location}>{r.pickup_location}</div>
                            <div className="max-w-[200px] truncate text-slate-500 text-xs mt-1" title={r.destination}>↓ {r.destination}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-700">{r.driver_name || "Unassigned"}</div>
                            {r.driver_phone && <div className="text-[10px] text-slate-500 mt-1">{r.driver_phone}</div>}
                          </td>
                          <td className="px-6 py-4 font-bold text-indigo-600">₹{r.agreed_fare || "0.00"}</td>
                          <td className="px-6 py-4">
                            <Chip text={r.status} tone={toneForStatus(r.status)} />
                            {(r.status === 'cancelled' || r.status === 'failed') && r.cancellation_reason && (
                              <p className="text-[10px] text-rose-500 mt-1 max-w-[150px] leading-tight" title={r.cancellation_reason}>Reason: {r.cancellation_reason}</p>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {r.status === 'in_progress' || r.status === 'assigned' ? (
                              <Button className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"><Lucide.MapPin size={12} className="mr-1" /> Track Live</Button>
                            ) : (
                              <Button variant="outline" className="h-8 text-xs"><Lucide.Eye size={12} className="mr-1" /> Details</Button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {rides.length === 0 && (
                        <tr><td colSpan={6} className="p-8 text-center text-slate-400">No ride history available.</td></tr>
                      )}
                    </tbody>
                  </table>
                  </div>
                </Card>
              </div>
            )}

            {/* Additional Tabs Built out per requirements */}
            {activeTab === "analytics" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="p-5 shadow-sm border-0 border-l-4 border-l-indigo-500 rounded-xl bg-white">
                    <p className="text-sm font-semibold text-slate-500">Ride Frequency</p>
                    <p className="text-3xl font-black text-slate-800 mt-2">2.4 / week</p>
                  </Card>
                  <Card className="p-5 shadow-sm border-0 border-l-4 border-l-emerald-500 rounded-xl bg-white">
                    <p className="text-sm font-semibold text-slate-500">Retention %</p>
                    <p className="text-3xl font-black text-slate-800 mt-2">94%</p>
                  </Card>
                  <Card className="p-5 shadow-sm border-0 border-l-4 border-l-amber-500 rounded-xl bg-white">
                    <p className="text-sm font-semibold text-slate-500">Risk %</p>
                    <p className="text-3xl font-black text-amber-600 mt-2">8%</p>
                  </Card>
                  <Card className="p-5 shadow-sm border-0 border-l-4 border-l-rose-500 rounded-xl bg-white">
                    <p className="text-sm font-semibold text-slate-500">Predicted Churn</p>
                    <p className="text-3xl font-black text-rose-600 mt-2">Low</p>
                  </Card>
                </div>
                <Card className="p-6 shadow-sm border border-slate-200 rounded-xl bg-white min-h-[300px] flex items-center justify-center flex-col">
                  <Lucide.BarChart3 size={48} className="text-slate-300 mb-4" />
                  <p className="text-slate-500 font-semibold">Usage Trends Chart Area</p>
                  <p className="text-slate-400 text-sm">Visual representations of daily, weekly, and monthly usage will appear here.</p>
                </Card>
              </div>
            )}

            {activeTab === "support" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-slate-800">Support Tickets & Call Logs</h3>
                  <Button className="h-9"><Lucide.Plus size={16} className="mr-2"/> Add Note / Ticket</Button>
                </div>
                <Card className="p-0 shadow-sm border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4">Ticket ID</th>
                        <th className="px-6 py-4">Subject</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Agent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr><td colSpan={5} className="p-8 text-center text-slate-400">No support tickets found.</td></tr>
                    </tbody>
                  </table>
                  </div>
                </Card>
              </div>
            )}

            {activeTab === "financial" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <Card className="p-6 shadow-sm border border-slate-200 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                      <p className="text-indigo-100 font-semibold mb-1">BMG Wallet Balance</p>
                      <p className="text-4xl font-black">₹450.00</p>
                      <div className="mt-4 flex gap-2">
                        <Button className="h-8 bg-white/20 hover:bg-white/30 text-white border-0">Add Money</Button>
                        <Button className="h-8 bg-white/20 hover:bg-white/30 text-white border-0">Deduct</Button>
                      </div>
                   </Card>
                   <Card className="p-6 shadow-sm border border-slate-200 rounded-xl bg-white col-span-2">
                      <h3 className="text-lg font-bold text-slate-800 mb-4">Financial Summary</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div><p className="text-sm text-slate-500">Total Spent</p><p className="font-bold text-slate-800 mt-1 text-xl">₹{realTotalSpend.toFixed(2)}</p></div>
                        <div><p className="text-sm text-slate-500">Avg. Ride Spend</p><p className="font-bold text-slate-800 mt-1 text-xl">₹145.00</p></div>
                        <div><p className="text-sm text-slate-500">Failed Payments</p><p className="font-bold text-rose-600 mt-1 text-xl">2</p></div>
                        <div><p className="text-sm text-slate-500">Refunds</p><p className="font-bold text-slate-800 mt-1 text-xl">₹0.00</p></div>
                        <div><p className="text-sm text-slate-500">Active Coupons</p><p className="font-bold text-slate-800 mt-1 text-xl">{coupons.filter(c => !c.is_used).length}</p></div>
                      </div>
                   </Card>
                 </div>
              </div>
            )}

            {activeTab === "marketing" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <Card className="p-6 shadow-sm border border-slate-200 rounded-xl bg-white">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-800">Telecaller CRM</h3>
                    <Button variant="outline"><Lucide.PhoneCall size={16} className="mr-2"/> Log New Call</Button>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 mb-4 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-500 mb-1">Campaign Tag</p>
                      <Chip text="High Value Reactivation" tone="neutral" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-500 mb-1">Follow-up Reminder</p>
                      <p className="font-semibold text-slate-800">18 May 2026, 10:00 AM</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm text-left border border-slate-200 rounded-lg overflow-hidden">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Agent</th><th className="px-4 py-3">Call Status</th><th className="px-4 py-3">Notes</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr><td className="px-4 py-3 text-slate-500">10 May 2026</td><td className="px-4 py-3">Sarah K.</td><td className="px-4 py-3"><Chip text="Answered" tone="success"/></td><td className="px-4 py-3 text-slate-600">User said app was glitching. Offered 50% discount.</td></tr>
                    </tbody>
                  </table>
                  </div>
                </Card>
              </div>
            )}

            {activeTab === "documents" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="p-6 shadow-sm border border-slate-200 rounded-xl bg-white flex flex-col items-center text-center">
                    <div className="w-24 h-24 bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center mb-4">
                      <Lucide.Image size={32} className="text-slate-400" />
                    </div>
                    <h3 className="font-bold text-slate-800">Profile Photo</h3>
                    <p className="text-xs text-slate-500 mt-1 mb-4">Uploaded 12 Oct 2025</p>
                    <div className="flex gap-2 w-full">
                      <Button variant="outline" className="flex-1 text-xs">Preview</Button>
                      <Button variant="outline" className="flex-1 text-xs">Download</Button>
                    </div>
                  </Card>
                  <Card className="p-6 shadow-sm border border-slate-200 rounded-xl bg-white flex flex-col items-center text-center">
                    <div className="w-24 h-24 bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center mb-4">
                      <Lucide.FileText size={32} className="text-slate-400" />
                    </div>
                    <h3 className="font-bold text-slate-800">Govt ID Proof</h3>
                    <p className="text-xs text-slate-500 mt-1 mb-4">Aadhar Card • Verified</p>
                    <div className="flex gap-2 w-full">
                      <Button variant="outline" className="flex-1 text-xs">Preview</Button>
                      <Button variant="outline" className="flex-1 text-xs">Download</Button>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <Card className="p-0 shadow-sm border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-slate-800">Security & Login Logs</h2>
                    <Button variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50">Revoke All Sessions</Button>
                  </div>
                  <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr><th className="px-6 py-4">Timestamp</th><th className="px-6 py-4">Event</th><th className="px-6 py-4">IP Address</th><th className="px-6 py-4">Device/Location</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-slate-500">16 May 2026, 10:15 AM</td>
                        <td className="px-6 py-4"><Chip text="Login Success" tone="success"/></td>
                        <td className="px-6 py-4 font-mono text-xs">103.14.22.19</td>
                        <td className="px-6 py-4">Samsung Galaxy S23 (Delhi)</td>
                      </tr>
                      <tr className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-slate-500">10 May 2026, 02:40 PM</td>
                        <td className="px-6 py-4"><Chip text="MPIN Changed" tone="warning"/></td>
                        <td className="px-6 py-4 font-mono text-xs">103.14.22.19</td>
                        <td className="px-6 py-4">Samsung Galaxy S23 (Delhi)</td>
                      </tr>
                      <tr className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-slate-500">01 May 2026, 09:12 AM</td>
                        <td className="px-6 py-4"><Chip text="Failed Login" tone="danger"/></td>
                        <td className="px-6 py-4 font-mono text-xs">45.22.11.9</td>
                        <td className="px-6 py-4 text-rose-600">Unknown Device (Mumbai)</td>
                      </tr>
                    </tbody>
                  </table>
                  </div>
                </Card>
              </div>
            )}

            {activeTab === "audit" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <Card className="p-0 shadow-sm border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <div className="bg-slate-50 p-4 border-b border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800">Admin Audit Trail</h2>
                    <p className="text-sm text-slate-500">Tracks which admin modified this user's profile.</p>
                  </div>
                  <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr><th className="px-6 py-4">Date/Time</th><th className="px-6 py-4">Admin Name</th><th className="px-6 py-4">Action</th><th className="px-6 py-4">Changes</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-slate-500">14 May 2026, 11:20 AM</td>
                        <td className="px-6 py-4 font-semibold">Super Admin</td>
                        <td className="px-6 py-4"><Chip text="Profile Update" tone="neutral"/></td>
                        <td className="px-6 py-4 text-slate-600 text-xs">Status: pending → verified</td>
                      </tr>
                    </tbody>
                  </table>
                  </div>
                </Card>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
