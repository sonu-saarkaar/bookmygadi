import React, { useEffect, useState } from "react";
import * as Lucide from "lucide-react";
import { Button, Card, Chip } from "@/admin_v2/components/ui";
import { useAdminV2Store } from "@/admin_v2/store/useAdminStore";
import { adminV2Api } from "@/admin_v2/services/adminApi";

export const BroadcastManagementBoard = () => {
  const { pushToast } = useAdminV2Store();
  const [activeTab, setActiveTab] = useState("notification");

  // Notification State
  const [targetAudience, setTargetAudience] = useState("all");
  const [messageTitle, setMessageTitle] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Referral State
  const [referralId, setReferralId] = useState("global_config");
  const [referrerBonus, setReferrerBonus] = useState(100);
  const [signupBonus, setSignupBonus] = useState(50);
  const [maxReferrals, setMaxReferrals] = useState(10);
  const [referralStatus, setReferralStatus] = useState(true);
  const [referralTerms, setReferralTerms] = useState("");
  const [stats, setStats] = useState({ total_referrals: 0, rewarded_count: 0, total_distributed_amount: 0 });

  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [h, s, st] = await Promise.all([
        adminV2Api.listBroadcasts(),
        adminV2Api.getReferralSettings(),
        adminV2Api.getReferralStats()
      ]);
      setHistory(h || []);
      setReferralStatus(s?.is_active ?? true);
      setReferrerBonus(s?.referrer_bonus ?? 100);
      setSignupBonus(s?.signup_bonus ?? 50);
      setMaxReferrals(s?.max_referrals_per_user ?? 10);
      setReferralTerms(s?.terms ?? "");
      setStats(st || { total_referrals: 0, rewarded_count: 0, total_distributed_amount: 0 });
    } catch (e) {
      pushToast("Failed to load marketing data", "danger");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSendBroadcast = async () => {
    if (!messageTitle.trim() || !messageBody.trim()) {
      pushToast("Title and Body are required", "warning");
      return;
    }
    setIsSending(true);
    try {
      const res = await adminV2Api.sendBroadcast({
        title: messageTitle,
        message: messageBody,
        target_audience: targetAudience,
        image_url: imageUrl || undefined
      });
      pushToast(`Broadcast sent to ${res.sent_count} devices!`, "success");
      setMessageTitle("");
      setMessageBody("");
      setImageUrl("");
      fetchData(); // Refresh history
    } catch (e: any) {
      pushToast(e.message || "Broadcast failed", "danger");
    } finally {
      setIsSending(false);
    }
  };

  const handleUpdateReferral = async () => {
    try {
      await adminV2Api.updateReferralSettings({
        is_active: referralStatus,
        signup_bonus: signupBonus,
        referrer_bonus: referrerBonus,
        max_referrals_per_user: maxReferrals,
        terms: referralTerms
      });
      pushToast("Referral settings updated", "success");
      fetchData();
    } catch (e: any) {
      pushToast(e.message || "Failed to update settings", "danger");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
             <Lucide.Megaphone className="text-indigo-600" />
             Communication & Broadcast
          </h2>
          <p className="text-sm text-slate-500 mt-1">Send push notifications, SMS, and manage referral programs.</p>
        </div>
        <Button onClick={fetchData} className="h-10 bg-slate-100 text-slate-600 hover:bg-slate-200">
           <Lucide.RefreshCcw size={16} className={isLoading ? "animate-spin" : ""} />
        </Button>
      </div>

      <div className="flex gap-4 border-b border-slate-200 pb-2">
        <button 
           onClick={() => setActiveTab("notification")}
           className={`px-4 py-2 font-bold text-sm rounded-lg transition-colors ${activeTab === "notification" ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-slate-100"}`}
        >
          Send Notification
        </button>
        <button 
           onClick={() => setActiveTab("referral")}
           className={`px-4 py-2 font-bold text-sm rounded-lg transition-colors ${activeTab === "referral" ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-slate-100"}`}
        >
          Referral System
        </button>
        <button 
           onClick={() => setActiveTab("history")}
           className={`px-4 py-2 font-bold text-sm rounded-lg transition-colors ${activeTab === "history" ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-slate-100"}`}
        >
          Campaign History
        </button>
      </div>

      {activeTab === "notification" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 bg-white border border-slate-200 shadow-sm rounded-2xl space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Target Audience</label>
              <select 
                className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-indigo-500 outline-none bg-white"
                value={targetAudience}
                onChange={e => setTargetAudience(e.target.value)}
              >
                <option value="all">Everyone (All App Users & Riders)</option>
                <option value="users">Customers Only</option>
                <option value="riders">Drivers Only</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Notification Title</label>
              <input 
                type="text" 
                placeholder="e.g. 50% Off on your next ride!"
                className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-indigo-500 outline-none"
                value={messageTitle}
                onChange={e => setMessageTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Message Body</label>
              <textarea 
                placeholder="Write your message here..."
                className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:border-indigo-500 outline-none min-h-[100px]"
                value={messageBody}
                onChange={e => setMessageBody(e.target.value)}
              />
              <p className="text-[10px] text-slate-400 mt-1 text-right">{messageBody.length}/200 characters</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Rich Image URL (Optional)</label>
              <input 
                type="text" 
                placeholder="https://example.com/banner.png"
                className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-indigo-500 outline-none"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
              />
            </div>

            <Button 
               className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg rounded-xl"
               onClick={handleSendBroadcast}
               disabled={isSending}
            >
              <Lucide.Send size={18} className="mr-2" />
              {isSending ? "Dispatching..." : "Send Broadcast Now"}
            </Button>
          </Card>

          {/* Live Preview Pane */}
          <div className="flex items-center justify-center bg-slate-100 rounded-2xl border border-slate-200 p-8">
            <div className="w-[300px] h-[600px] bg-slate-900 rounded-[2.5rem] p-3 shadow-2xl relative border-8 border-slate-800">
               <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-xl z-20"></div>
               <div className="bg-slate-50 w-full h-full rounded-[2rem] overflow-hidden relative">
                  <div className="absolute top-12 left-2 right-2 bg-white/80 backdrop-blur-md shadow-lg rounded-2xl p-4 border border-white/40 animate-in slide-in-from-top-4 fade-in z-30">
                    <div className="flex items-center gap-3 mb-2">
                       <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shadow-sm">
                          <span className="text-white text-[10px] font-black">BMG</span>
                       </div>
                       <div className="flex-1">
                          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">BookMyGadi</p>
                          <p className="text-xs font-bold text-slate-900 leading-tight">{messageTitle || "Notification Title"}</p>
                       </div>
                       <p className="text-[10px] text-slate-400">now</p>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-snug">{messageBody || "Your message body will appear here. Keep it concise and actionable."}</p>
                    {imageUrl && (
                       <div className="mt-3 rounded-lg overflow-hidden border border-slate-100">
                          <img src={imageUrl} alt="preview" className="w-full h-32 object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                       </div>
                    )}
                  </div>
                  <div className="w-full h-full bg-slate-200" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")' }}></div>
               </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "referral" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 bg-white border border-slate-200 shadow-sm rounded-2xl">
            <h3 className="text-lg font-bold text-slate-800 border-b pb-3 mb-5 flex items-center gap-2"><Lucide.Gift className="text-emerald-500"/> Referral Program Settings</h3>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <p className="font-bold text-slate-800">Program Status</p>
                  <p className="text-xs text-slate-500">Enable or disable global referrals</p>
                </div>
                <button 
                  onClick={() => setReferralStatus(!referralStatus)}
                  className={`w-12 h-6 rounded-full relative transition-colors ${referralStatus ? 'bg-emerald-500' : 'bg-slate-300'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${referralStatus ? 'left-7' : 'left-1'}`}></div>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Referrer Bonus (₹)</label>
                  <input 
                    type="number" 
                    className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-indigo-500 outline-none"
                    value={referrerBonus}
                    onChange={e => setReferrerBonus(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Sign-up Bonus (₹)</label>
                  <input 
                    type="number" 
                    className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-indigo-500 outline-none"
                    value={signupBonus}
                    onChange={e => setSignupBonus(Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Max Referrals Per User</label>
                <input 
                  type="number" 
                  className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm focus:border-indigo-500 outline-none"
                  value={maxReferrals}
                  onChange={e => setMaxReferrals(Number(e.target.value))}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Terms & Conditions Summary</label>
                <textarea 
                  className="w-full h-20 border border-slate-300 rounded-lg p-3 text-sm focus:border-indigo-500 outline-none"
                  value={referralTerms}
                  onChange={e => setReferralTerms(e.target.value)}
                  placeholder="Only valid for first 10 rides..."
                />
              </div>

              <Button onClick={handleUpdateReferral} className="w-full h-10 bg-slate-900 text-white font-bold">Save Program Config</Button>
            </div>
          </Card>
          
          <Card className="p-6 bg-gradient-to-br from-indigo-500 to-purple-600 border-0 shadow-lg rounded-2xl text-white">
             <h3 className="text-lg font-bold text-indigo-50 mb-6">Real-time Performance</h3>
             <div className="grid grid-cols-2 gap-4">
               <div className="bg-white/10 p-4 rounded-xl border border-white/20">
                 <p className="text-indigo-200 text-xs uppercase tracking-wider font-bold">Total Invitations</p>
                 <p className="text-3xl font-black mt-1">{stats.total_referrals.toLocaleString()}</p>
               </div>
               <div className="bg-white/10 p-4 rounded-xl border border-white/20">
                 <p className="text-indigo-200 text-xs uppercase tracking-wider font-bold">Rewarded Users</p>
                 <p className="text-3xl font-black mt-1">{stats.rewarded_count.toLocaleString()}</p>
               </div>
               <div className="bg-white/10 p-4 rounded-xl border border-white/20">
                 <p className="text-indigo-200 text-xs uppercase tracking-wider font-bold">Total Payouts</p>
                 <p className="text-3xl font-black mt-1">₹{stats.total_distributed_amount.toLocaleString()}</p>
               </div>
               <div className="bg-white/10 p-4 rounded-xl border border-white/20">
                 <p className="text-indigo-200 text-xs uppercase tracking-wider font-bold">Conversion</p>
                 <p className="text-3xl font-black mt-1">
                    {stats.total_referrals > 0 ? ((stats.rewarded_count / stats.total_referrals) * 100).toFixed(1) : 0}%
                 </p>
               </div>
             </div>
          </Card>
        </div>
      )}

      {activeTab === "history" && (
        <Card className="p-0 border border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Sent At</th>
                  <th className="px-6 py-4">Audience</th>
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Reach</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400 italic">No campaign history found.</td>
                  </tr>
                ) : (
                  history.map(row => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-500 text-xs">
                        {new Date(row.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 uppercase font-bold text-[10px] tracking-widest text-slate-400">{row.target}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">{row.title}</td>
                      <td className="px-6 py-4">
                        <Chip text={row.status} tone={row.status === 'sent' ? 'success' : 'danger'} />
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-indigo-600">
                        {row.sent_count} users
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
