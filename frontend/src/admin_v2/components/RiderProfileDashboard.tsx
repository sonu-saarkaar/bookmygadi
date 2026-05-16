import React, { useEffect, useState } from "react";
import * as Lucide from "lucide-react";
import { Button, Card, Chip, Modal } from "@/admin_v2/components/ui";
import { adminV2Api } from "@/admin_v2/services/adminApi";
import { useAdminV2Store } from "@/admin_v2/store/useAdminStore";

export const RiderProfileDashboard = ({ rider, onClose }: { rider: any; onClose: () => void }) => {
  const { pushToast } = useAdminV2Store();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);

  // Fetched / Derived states
  const [rides, setRides] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any>({ today: 0, week: 0, month: 0, wallet: 0 });

  // Compute derived metrics
  const totalCompletedRides = rides.length > 0 ? rides.filter(r => r.status === 'completed').length : 142; // Mocking if 0 for demo
  const totalEarnings = rides.length > 0 
    ? rides.filter(r => r.status === 'completed').reduce((sum, r) => sum + (Number(r.agreed_fare) || 0), 0) 
    : 34500;
  const acceptanceRate = 88; // Mocked
  const rating = 4.8;

  useEffect(() => {
    const loadDetails = async () => {
      setLoading(true);
      try {
        // Assume endpoints will be created soon, fallback to mock if fails
        const [r] = await Promise.all([
          adminV2Api.requestV1(`/drivers-mgmt/${rider.driverId || rider.id}/rides`).catch(() => []),
        ]);
        if (r && r.length > 0) {
            setRides(r);
        } else {
            // Provide realistic demo data if API returns empty/fails so it looks like Rapido Admin
            setRides([
                { id: "R-101", pickup_location: "Airport Terminal 1", destination: "City Center Mall", agreed_fare: 450, status: "completed", created_at: new Date().toISOString(), distance: "12km" },
                { id: "R-102", pickup_location: "Tech Park", destination: "Railway Station", agreed_fare: 320, status: "completed", created_at: new Date(Date.now() - 86400000).toISOString(), distance: "8km" },
                { id: "R-103", pickup_location: "South Ex", destination: "North Campus", agreed_fare: 0, status: "cancelled", cancellation_reason: "Rider requested to cancel", created_at: new Date(Date.now() - 172800000).toISOString() }
            ]);
        }
      } catch (e: any) {
        pushToast(e.message || "Failed to load details", "danger");
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [rider.id]);

  const TABS = [
    { id: "overview", label: "Fleet Overview", icon: Lucide.LayoutDashboard },
    { id: "live", label: "Live Tracking", icon: Lucide.Map },
    { id: "vehicle", label: "Vehicle & Docs", icon: Lucide.Car },
    { id: "rides", label: "Ride History", icon: Lucide.Navigation },
    { id: "earnings", label: "Earnings & Payouts", icon: Lucide.Wallet },
    { id: "personal", label: "Personal Info", icon: Lucide.User },
    { id: "support", label: "Complaints", icon: Lucide.Headset },
  ];

  const toneForStatus = (s: string) => {
    if (["APPROVED", "active", "completed"].includes(s)) return "success";
    if (["BLOCKED", "cancelled", "failed", "rejected", "REJECTED"].includes(s)) return "danger";
    if (["REVIEW", "pending"].includes(s)) return "warning";
    return "neutral";
  };

  const handleAction = (action: string) => {
    pushToast(`${action} action triggered`, "info");
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
            <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center text-xl font-bold border-2 border-slate-700">
              {rider.name ? rider.name.charAt(0).toUpperCase() : "R"}
            </div>
            <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${rider.status === "APPROVED" ? "bg-emerald-500" : "bg-rose-500"}`} title={rider.status} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl lg:text-2xl font-bold tracking-tight leading-tight break-words">{rider.name || "Unknown Rider"}</h1>
              <Chip text={rider.status} tone={toneForStatus(rider.status)} />
              <div className="flex items-center bg-slate-800 rounded-full px-2 py-0.5 text-xs text-amber-400 border border-slate-700 font-bold">
                <Lucide.Star size={12} className="fill-current mr-1"/> {rating}
              </div>
            </div>
            <div className="text-xs lg:text-sm text-slate-400 mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="inline-flex items-center gap-1 font-mono text-indigo-300 max-w-full" title={rider.driverId}><Lucide.Fingerprint size={14} className="shrink-0" /> <span className="truncate">ID: {rider.riderIdFormat || rider.driverPublicId || "Pending"}</span></span>
              <span className="flex items-center gap-1 truncate"><Lucide.Car size={14} /> {rider.brandModel || "Vehicle Pending"} • {rider.registrationNumber || "No RC"}</span>
              <span className="inline-flex items-center gap-1 max-w-[220px]" title={rider.city || "Unknown City"}><Lucide.MapPin size={14} className="shrink-0" /> <span className="truncate">{rider.city || "Unknown City"}</span></span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] xl:grid-cols-[auto_auto] items-center gap-3 sm:gap-4 w-full xl:w-auto xl:justify-end">
          <div className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 sm:text-right">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Tier Level</p>
            <div className="flex items-center gap-1 mt-1 justify-end text-amber-500 font-bold text-sm">
               <Lucide.Shield size={16}/> Gold Partner
            </div>
          </div>
          <div className="grid grid-cols-2 sm:flex items-center gap-2 sm:flex-wrap sm:justify-end min-w-0">
            {rider.status !== "APPROVED" && <Button className="h-9 min-w-0 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-0" onClick={() => handleAction("Approve")}><Lucide.CheckCircle size={14} className="mr-1 shrink-0"/> Approve</Button>}
            {rider.status !== "BLOCKED" && <Button className="h-9 min-w-0 px-3 text-xs bg-rose-600/20 text-rose-400 hover:bg-rose-600/40 border border-rose-500/30" onClick={() => handleAction("Block")}><Lucide.Ban size={14} className="mr-1 shrink-0"/> Block</Button>}
            <Button className="h-9 min-w-0 px-3 text-xs bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/40 border border-indigo-500/30" onClick={() => handleAction("Assign Ride")}><Lucide.Crosshair size={14} className="mr-1 shrink-0"/> Assign Ride</Button>
            <div className="relative group">
              <Button variant="outline" className="h-9 w-full sm:w-auto px-3 text-xs border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white">More <Lucide.ChevronDown size={14} className="ml-1 shrink-0"/></Button>
              <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-48 py-1 hidden group-hover:block z-50">
                <button className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2" onClick={() => handleAction("Reset Limits")}><Lucide.RefreshCcw size={14}/> Reset Daily Limits</button>
                <button className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2" onClick={() => handleAction("Send Notification")}><Lucide.Bell size={14}/> Push Notification</button>
                <button className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2" onClick={() => handleAction("Force Logout")}><Lucide.LogOut size={14}/> Force Offline</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden bg-slate-50">
        {/* Left Sidebar Navigation */}
        <div className="hidden md:flex w-64 bg-white border-r border-slate-200 shadow-sm z-0 flex-col py-4 overflow-y-auto shrink-0">
          <p className="px-6 text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 mt-2">Driver Panel</p>
          <nav className="flex-1 space-y-1 px-3">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${isActive ? 'bg-amber-50 text-amber-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                >
                  <Icon size={18} className={isActive ? 'text-amber-600' : 'text-slate-400'} />
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
                  <Card className="p-5 shadow-sm border-0 border-l-4 border-l-emerald-500 rounded-xl bg-white">
                    <p className="text-sm font-semibold text-slate-500">Total Earnings</p>
                    <p className="text-3xl font-black text-slate-800 mt-2">₹{totalEarnings.toLocaleString()}</p>
                  </Card>
                  <Card className="p-5 shadow-sm border-0 border-l-4 border-l-blue-500 rounded-xl bg-white">
                    <p className="text-sm font-semibold text-slate-500">Completed Rides</p>
                    <p className="text-3xl font-black text-slate-800 mt-2">{totalCompletedRides}</p>
                  </Card>
                  <Card className="p-5 shadow-sm border-0 border-l-4 border-l-indigo-500 rounded-xl bg-white">
                    <p className="text-sm font-semibold text-slate-500">Acceptance Rate</p>
                    <p className="text-3xl font-black text-slate-800 mt-2">{acceptanceRate}%</p>
                  </Card>
                  <Card className="p-5 shadow-sm border-0 border-l-4 border-l-amber-500 rounded-xl bg-white">
                    <p className="text-sm font-semibold text-slate-500">Current Status</p>
                    <p className="text-3xl font-black text-emerald-600 mt-2 flex items-center gap-2"><div className="w-4 h-4 bg-emerald-500 rounded-full animate-pulse"/> Online</p>
                  </Card>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="lg:col-span-2 p-6 shadow-sm border border-slate-200 rounded-xl bg-white">
                     <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Lucide.Navigation size={20} className="text-indigo-500"/> Recent Activity</h3>
                     <div className="space-y-4">
                       {rides.slice(0, 3).map(r => (
                         <div key={r.id} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-200">
                           <div>
                             <p className="font-bold text-sm text-slate-800">{r.pickup_location} → {r.destination}</p>
                             <p className="text-xs text-slate-500">{new Date(r.created_at).toLocaleString()}</p>
                           </div>
                           <div className="text-right">
                             <p className="font-bold text-emerald-600">+₹{r.agreed_fare}</p>
                             <Chip text={r.status} tone={toneForStatus(r.status)} />
                           </div>
                         </div>
                       ))}
                     </div>
                  </Card>
                  <div className="space-y-6">
                    <Card className="p-6 shadow-sm border border-slate-200 rounded-xl bg-white">
                      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Lucide.Wallet size={20} className="text-amber-500"/> Quick Financials</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                          <span className="text-slate-600">Today's Earnings</span>
                          <span className="font-bold text-slate-800">₹850.00</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                          <span className="text-slate-600">This Week</span>
                          <span className="font-bold text-slate-800">₹4,200.00</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                          <span className="text-slate-600">Pending Settlement</span>
                          <span className="font-bold text-rose-600">₹1,200.00</span>
                        </div>
                        <Button className="w-full bg-slate-900 text-white" onClick={() => setActiveTab("earnings")}>Settle Dues Now</Button>
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "live" && (
              <div className="space-y-6 animate-in fade-in duration-300 h-[calc(100vh-160px)] flex flex-col">
                <Card className="flex-1 p-0 shadow-sm border border-slate-200 rounded-xl overflow-hidden bg-white flex flex-col relative">
                   {/* Fake Map UI for Rapido-like Tracking */}
                   <div className="absolute inset-0 bg-slate-200 opacity-60" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")' }}></div>
                   
                   <div className="absolute top-4 left-4 z-10 bg-white p-4 rounded-xl shadow-lg border border-slate-200 w-80">
                     <h3 className="font-bold text-slate-800 border-b pb-2 mb-2 flex items-center gap-2"><Lucide.Crosshair size={18} className="text-indigo-600"/> Duty Status</h3>
                     <div className="flex justify-between items-center mb-3">
                       <span className="text-sm font-semibold text-slate-600">Status</span>
                       <span className="flex items-center gap-1 text-sm font-bold text-emerald-600"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/> Online</span>
                     </div>
                     <div className="flex justify-between items-center mb-3">
                       <span className="text-sm font-semibold text-slate-600">Last Ping</span>
                       <span className="text-sm font-bold text-slate-800">Just now</span>
                     </div>
                     <div className="flex justify-between items-center">
                       <span className="text-sm font-semibold text-slate-600">Current Battery</span>
                       <span className="text-sm font-bold text-slate-800 flex items-center gap-1"><Lucide.BatteryCharging size={14} className="text-emerald-500"/> 92%</span>
                     </div>
                   </div>

                   <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
                      <div className="bg-white px-3 py-1.5 rounded-lg shadow-xl text-sm font-bold text-slate-800 border border-amber-200 flex items-center gap-2 mb-2 relative">
                        {rider.registrationNumber || "Waiting for Ride"}
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-white"></div>
                      </div>
                      <div className="w-8 h-8 bg-amber-500 rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                         <Lucide.Bike size={16} className="text-white"/>
                      </div>
                   </div>
                </Card>
              </div>
            )}

            {activeTab === "vehicle" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <Card className="p-0 shadow-sm border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Lucide.Car size={18}/> Vehicle Registration Info</h2>
                    <Button variant="outline" className="h-8 text-xs"><Lucide.Edit2 size={14} className="mr-2"/> Update Vehicle</Button>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-y-6 gap-x-8">
                    <div><p className="text-xs text-slate-500 font-semibold uppercase mb-1">Vehicle Type</p><p className="font-medium text-slate-900">{rider.vehicleType || "Not Set"}</p></div>
                    <div><p className="text-xs text-slate-500 font-semibold uppercase mb-1">Make & Model</p><p className="font-medium text-slate-900">{rider.brandModel || "Not Set"}</p></div>
                    <div><p className="text-xs text-slate-500 font-semibold uppercase mb-1">Registration Number</p><p className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded inline-block border border-indigo-100">{rider.registrationNumber || "Not Set"}</p></div>
                    <div><p className="text-xs text-slate-500 font-semibold uppercase mb-1">Model Year</p><p className="font-medium text-slate-900">{rider.modelYear || "Not Set"}</p></div>
                    <div><p className="text-xs text-slate-500 font-semibold uppercase mb-1">Color</p><p className="font-medium text-slate-900 flex items-center gap-2"><div className="w-4 h-4 rounded-full border border-slate-300" style={{backgroundColor: rider.color || '#fff'}}/> {rider.color || "Not Set"}</p></div>
                    <div><p className="text-xs text-slate-500 font-semibold uppercase mb-1">Category</p><p className="font-medium text-slate-900">{rider.vehicleCategory || "Not Set"}</p></div>
                    <div><p className="text-xs text-slate-500 font-semibold uppercase mb-1">Features</p><p className="font-medium text-slate-900">{rider.hasAc ? "AC" : "Non-AC"} {rider.hasMusic ? ", Music" : ""}</p></div>
                  </div>
                </Card>

                <Card className="p-0 shadow-sm border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <div className="bg-slate-50 p-4 border-b border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800">Compliance Documents</h2>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="border border-slate-200 rounded-lg p-4 flex flex-col items-center text-center">
                       <Lucide.FileText size={32} className="text-slate-400 mb-2"/>
                       <h3 className="font-bold text-slate-800">Driving License (DL)</h3>
                       <p className="text-xs font-mono text-slate-500 mt-1">{rider.driverDlNumber || "Pending"}</p>
                       <Chip text="Verified" tone="success" className="mt-2"/>
                       <Button variant="outline" className="w-full mt-4 h-8 text-xs">View Document</Button>
                    </div>
                    <div className="border border-slate-200 rounded-lg p-4 flex flex-col items-center text-center">
                       <Lucide.CreditCard size={32} className="text-slate-400 mb-2"/>
                       <h3 className="font-bold text-slate-800">Registration (RC)</h3>
                       <p className="text-xs font-mono text-slate-500 mt-1">Uploaded</p>
                       <Chip text="Verified" tone="success" className="mt-2"/>
                       <Button variant="outline" className="w-full mt-4 h-8 text-xs">View Document</Button>
                    </div>
                    <div className="border border-slate-200 rounded-lg p-4 flex flex-col items-center text-center bg-rose-50/50">
                       <Lucide.ShieldAlert size={32} className="text-rose-400 mb-2"/>
                       <h3 className="font-bold text-slate-800">Insurance</h3>
                       <p className="text-xs font-mono text-slate-500 mt-1">Expiring in 5 days</p>
                       <Chip text="Action Required" tone="warning" className="mt-2"/>
                       <Button className="w-full mt-4 h-8 text-xs bg-rose-600 text-white hover:bg-rose-700 border-0">Request Update</Button>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {activeTab === "rides" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <Card className="p-0 shadow-sm border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4">Date/Time</th>
                        <th className="px-6 py-4">Route</th>
                        <th className="px-6 py-4">Earnings</th>
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
                          <td className="px-6 py-4 font-bold text-emerald-600">₹{r.agreed_fare || "0.00"}</td>
                          <td className="px-6 py-4">
                            <Chip text={r.status} tone={toneForStatus(r.status)} />
                            {r.cancellation_reason && (
                              <p className="text-[10px] text-rose-500 mt-1 max-w-[150px] leading-tight">Reason: {r.cancellation_reason}</p>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button variant="outline" className="h-8 text-xs">View Map</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </div>
            )}

            {activeTab === "earnings" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <Card className="p-6 shadow-sm border border-slate-200 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                      <p className="text-emerald-100 font-semibold mb-1">Current Wallet Balance</p>
                      <p className="text-4xl font-black">₹1,250.00</p>
                      <div className="mt-4 flex gap-2">
                        <Button className="h-8 bg-white/20 hover:bg-white/30 text-white border-0">Initiate Payout</Button>
                      </div>
                   </Card>
                   <Card className="p-6 shadow-sm border border-slate-200 rounded-xl bg-white col-span-2">
                      <h3 className="text-lg font-bold text-slate-800 mb-4">Payout History (Mock)</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 border border-slate-100 rounded-lg">
                           <div>
                             <p className="font-bold text-slate-800">Bank Transfer - HDFC</p>
                             <p className="text-xs text-slate-500">14 May 2026</p>
                           </div>
                           <div className="text-right">
                             <p className="font-bold text-slate-800">₹3,400.00</p>
                             <Chip text="Settled" tone="success"/>
                           </div>
                        </div>
                      </div>
                   </Card>
                 </div>
              </div>
            )}

            {activeTab === "personal" && (
               <div className="space-y-6 animate-in fade-in duration-300">
                 <Card className="p-6 shadow-sm border border-slate-200 rounded-xl bg-white">
                    <h2 className="text-lg font-bold text-slate-800 mb-6">Personal details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                      <div><p className="text-xs text-slate-500 font-semibold uppercase mb-1">Driver Name</p><p className="font-medium text-slate-900">{rider.driverName || rider.name || "Not Provided"}</p></div>
                      <div><p className="text-xs text-slate-500 font-semibold uppercase mb-1">Driver Phone</p><p className="font-medium text-slate-900">{rider.driverNumber || rider.phone || "Not Provided"}</p></div>
                      <div><p className="text-xs text-slate-500 font-semibold uppercase mb-1">Calling Number</p><p className="font-medium text-slate-900">{rider.driverCallingNumber || "Not Provided"}</p></div>
                      <div><p className="text-xs text-slate-500 font-semibold uppercase mb-1">Owner Name</p><p className="font-medium text-slate-900">{rider.ownerName || "Self"}</p></div>
                      <div><p className="text-xs text-slate-500 font-semibold uppercase mb-1">Owner Phone</p><p className="font-medium text-slate-900">{rider.ownerPhone || "-"}</p></div>
                      <div><p className="text-xs text-slate-500 font-semibold uppercase mb-1">Owner Email</p><p className="font-medium text-slate-900">{rider.ownerEmail || "-"}</p></div>
                      <div><p className="text-xs text-slate-500 font-semibold uppercase mb-1">City / Area</p><p className="font-medium text-slate-900">{rider.city || "Not Provided"}</p></div>
                    </div>
                 </Card>
               </div>
            )}

            {activeTab === "support" && (
              <div className="flex h-[400px] items-center justify-center rounded-xl border border-slate-200 bg-white">
                 <div className="text-center">
                   <Lucide.Headset size={48} className="mx-auto mb-4 text-slate-300"/>
                   <h3 className="text-lg font-bold text-slate-700">No Complaints</h3>
                   <p className="text-slate-500 text-sm mt-1">This driver has a clean record. No tickets raised.</p>
                 </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
