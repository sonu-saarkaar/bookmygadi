import { useEffect, useState, useMemo } from "react";
import { adminV2Api } from "@/admin_v2/services/adminApi";
import { Button, Card, Chip, Modal } from "@/admin_v2/components/ui";
import { useAdminV2Store } from "@/admin_v2/store/useAdminStore";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapPin, ListChecks, Siren } from "lucide-react";

// Fix Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const redIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const greenIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const blueIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export const LiveRidesBoard = () => {
  const { pushToast } = useAdminV2Store();
  const [rides, setRides] = useState<any[]>([]);
  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);
  
  // Detail States
  const [rideDetails, setRideDetails] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [negotiations, setNegotiations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("details"); // details, chat, map
  const [loading, setLoading] = useState(true);

  // Forms
  const [chatMsg, setChatMsg] = useState("");
  const [assignDriverId, setAssignDriverId] = useState("");
  const [showAssign, setShowAssign] = useState(false);

  const loadList = async () => {
    try {
      const data = await adminV2Api.listRides();
      setRides(data || []);
      if (!selectedRideId && data?.length > 0) {
        setSelectedRideId(data[0].id);
      }
    } catch (e: any) {
      pushToast(e.message || "Failed to load rides", "danger");
    } finally {
      setLoading(false);
    }
  };

  const loadDetails = async (id: string) => {
    try {
      const [details, msgs, negos] = await Promise.all([
        adminV2Api.getRideFull(id),
        adminV2Api.getRideMessages(id),
        adminV2Api.getRideNegotiations(id)
      ]);
      setRideDetails(details);
      setMessages(msgs || []);
      setNegotiations(negos || []);
    } catch (e: any) {
      pushToast(e.message || "Failed to load ride details", "danger");
    }
  };

  useEffect(() => {
    loadList();
    const interval = setInterval(loadList, 10000); // Polling every 10s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedRideId) {
      loadDetails(selectedRideId);
      const interval = setInterval(() => loadDetails(selectedRideId), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedRideId]);

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMsg.trim() || !selectedRideId) return;
    try {
      await adminV2Api.postRideMessage(selectedRideId, chatMsg);
      setChatMsg("");
      loadDetails(selectedRideId);
    } catch (e: any) {
      pushToast(e.message, "danger");
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!selectedRideId) return;
    try {
      await adminV2Api.updateRideStatus(selectedRideId, status);
      pushToast(`Ride marked as ${status}`, "success");
      loadDetails(selectedRideId);
      loadList();
    } catch (e: any) {
      pushToast(e.message, "danger");
    }
  };

  const handleAssignDriver = async () => {
    if (!selectedRideId || !assignDriverId) return;
    try {
      await adminV2Api.assignRideDriver(selectedRideId, assignDriverId);
      pushToast("Driver assigned successfully", "success");
      setShowAssign(false);
      setAssignDriverId("");
      loadDetails(selectedRideId);
      loadList();
    } catch (e: any) {
      pushToast(e.message, "danger");
    }
  };

  const handleSOS = async () => {
    if (!selectedRideId) return;
    try {
      await adminV2Api.createSupportTicket(selectedRideId, { 
        issue_type: "emergency", 
        title: "SOS Triggered by Admin", 
        description: "Admin initiated SOS protocol from Live Ops Board.", 
        source_panel: "Admin", 
        severity: "critical" 
      });
      pushToast("SOS Protocol Activated & Ticket Created", "danger");
    } catch (e: any) {
      pushToast(e.message, "danger");
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading Live Ops...</div>;

  return (
    <div className="flex h-[calc(100vh-140px)] gap-4 overflow-hidden">
      {/* Left List */}
      <Card className="w-1/3 flex flex-col p-0 overflow-hidden bg-white shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="font-bold text-slate-800 text-lg">Active Rides</h2>
          <Chip text={rides.length.toString()} tone="neutral" />
        </div>
        <div className="overflow-y-auto flex-1 p-2 space-y-2">
          {rides.map(r => (
            <div 
              key={r.id} 
              onClick={() => setSelectedRideId(r.id)}
              className={`p-3 rounded-lg cursor-pointer border transition-all ${
                selectedRideId === r.id 
                ? "border-emerald-500 bg-emerald-50 shadow-sm" 
                : "border-slate-200 hover:border-emerald-300 hover:bg-slate-50"
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <p className="font-bold text-slate-800 text-sm">{r.rider_name || r.customer_name || 'Customer'}</p>
                <Chip text={r.status || 'pending'} tone={r.status === 'pending' ? 'warning' : r.status === 'completed' ? 'success' : 'info'} />
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-1 mt-2">
                <MapPin size={12} className="text-green-500"/>
                <span className="truncate w-full">{r.pickup_location || r.pickup || '-'}</span>
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                <MapPin size={12} className="text-red-500"/>
                <span className="truncate w-full">{r.destination || r.drop || '-'}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Right Detail */}
      <Card className="w-2/3 flex flex-col p-0 overflow-hidden bg-white shadow-lg border border-slate-200">
        {!rideDetails ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">Select a ride to view details</div>
        ) : (
          <>
            {/* Header */}
            <div className="p-4 border-b border-slate-200 bg-white">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold text-slate-800">Ride #{rideDetails.id.slice(-6).toUpperCase()}</h2>
                    <Chip text={rideDetails.status} tone={rideDetails.status === 'completed' ? 'success' : 'warning'} />
                  </div>
                  <p className="text-sm text-slate-500">Customer: <span className="font-semibold text-slate-700">{rideDetails.customer?.name || 'Guest'}</span> ({rideDetails.customer?.phone || '-'})</p>
                  <p className="text-sm text-slate-500">Driver: <span className="font-semibold text-slate-700">{rideDetails.driver?.name || 'Unassigned'}</span> ({rideDetails.driver?.phone || '-'})</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={handleSOS}>
                    <Siren size={16} className="mr-1"/> SOS Alert
                  </Button>
                  <Button variant="outline" onClick={() => setShowAssign(true)}>Assign Driver</Button>
                  <Button onClick={() => handleStatusChange('completed')}>Complete</Button>
                  <Button variant="outline" className="border-slate-300" onClick={() => handleStatusChange('cancelled')}>Cancel</Button>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-4">
              <button onClick={() => setActiveTab('details')} className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'details' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Overview & Route</button>
              <button onClick={() => setActiveTab('chat')} className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'chat' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Communications</button>
              <button onClick={() => setActiveTab('nego')} className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'nego' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Negotiations ({negotiations.length})</button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto bg-slate-50 relative">
              {activeTab === 'details' && (
                <div className="p-4 space-y-4">
                  {/* Map */}
                  {rideDetails.pickup_lat && rideDetails.pickup_lng && (
                    <div className="h-64 rounded-xl overflow-hidden shadow-sm border border-slate-200 z-0 relative">
                       <MapContainer center={[rideDetails.pickup_lat, rideDetails.pickup_lng]} zoom={12} scrollWheelZoom={false} className="h-full w-full">
                         <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                         <Marker position={[rideDetails.pickup_lat, rideDetails.pickup_lng]} icon={greenIcon}>
                           <Popup>Pickup: {rideDetails.pickup_location}</Popup>
                         </Marker>
                         {rideDetails.destination_lat && rideDetails.destination_lng && (
                           <Marker position={[rideDetails.destination_lat, rideDetails.destination_lng]} icon={redIcon}>
                             <Popup>Drop: {rideDetails.destination}</Popup>
                           </Marker>
                         )}
                         {rideDetails.driver_live_lat && rideDetails.driver_live_lng && (
                           <Marker position={[rideDetails.driver_live_lat, rideDetails.driver_live_lng]} icon={blueIcon}>
                             <Popup>Driver Live</Popup>
                           </Marker>
                         )}
                         {rideDetails.pickup_lat && rideDetails.destination_lat && (
                           <Polyline positions={[
                             [rideDetails.pickup_lat, rideDetails.pickup_lng],
                             [rideDetails.destination_lat, rideDetails.destination_lng]
                           ]} color="#10b981" weight={4} dashArray="10, 10" />
                         )}
                       </MapContainer>
                    </div>
                  )}

                  {/* Booking Preferences */}
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <ListChecks size={18} className="text-emerald-500"/>
                      Booking Preferences & Details
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Vehicle Type</p>
                        <p className="font-semibold text-slate-800">{rideDetails.vehicle_type}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Estimated Fare</p>
                        <p className="font-semibold text-slate-800">₹{rideDetails.estimated_fare_min} - ₹{rideDetails.estimated_fare_max}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Agreed Fare</p>
                        <p className="font-semibold text-emerald-600">{rideDetails.agreed_fare ? `₹${rideDetails.agreed_fare}` : 'Pending'}</p>
                      </div>
                      {rideDetails.preference && Object.entries(rideDetails.preference).map(([k, v]) => {
                        if (!v || ['id', 'ride_id', 'created_at'].includes(k)) return null;
                        return (
                          <div key={k}>
                            <p className="text-xs text-slate-500 uppercase tracking-wider">{k.replace(/_/g, ' ')}</p>
                            <p className="font-semibold text-slate-800">{String(v)}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'chat' && (
                <div className="flex flex-col h-full bg-white">
                  <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
                    {messages.length === 0 ? (
                      <div className="text-center text-slate-400 mt-10">No messages yet. Start communication.</div>
                    ) : messages.map((msg, idx) => {
                      const isAdmin = msg.sender_type === "admin";
                      const isCustomer = msg.sender_type === "customer";
                      return (
                        <div key={idx} className={`flex flex-col max-w-[80%] ${isAdmin ? 'self-end ml-auto' : 'self-start mr-auto'}`}>
                          <span className={`text-[10px] uppercase font-bold text-slate-400 mb-0.5 ${isAdmin ? 'text-right' : 'text-left'}`}>
                            {msg.sender_type} • {new Date(msg.created_at).toLocaleTimeString()}
                          </span>
                          <div className={`p-3 rounded-2xl ${isAdmin ? 'bg-emerald-500 text-white rounded-tr-sm' : isCustomer ? 'bg-blue-100 text-blue-900 rounded-tl-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'}`}>
                            {msg.message}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <form onSubmit={handleSendChat} className="p-3 bg-white border-t border-slate-200 flex gap-2">
                    <input 
                      type="text" 
                      value={chatMsg} 
                      onChange={e => setChatMsg(e.target.value)} 
                      placeholder="Type a message as Admin..." 
                      className="flex-1 border border-slate-300 rounded-xl px-4 py-2 outline-none focus:border-emerald-500"
                    />
                    <Button type="submit" disabled={!chatMsg.trim()}>Send</Button>
                  </form>
                </div>
              )}

              {activeTab === 'nego' && (
                <div className="p-4 space-y-3">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-4">
                    <p className="text-sm text-slate-600 mb-2">Current System Requested Fare: <strong className="text-lg text-slate-900">₹{rideDetails.requested_fare}</strong></p>
                    <p className="text-sm text-slate-600">Agreed Final Fare: <strong className="text-lg text-emerald-600">₹{rideDetails.agreed_fare || 'N/A'}</strong></p>
                  </div>
                  {negotiations.length === 0 ? (
                     <div className="text-center text-slate-400 p-8">No negotiations recorded.</div>
                  ) : negotiations.map(n => (
                    <div key={n.id} className="flex justify-between items-center p-3 rounded-lg bg-white shadow-sm border border-slate-200">
                      <div>
                        <p className="font-bold text-slate-800">₹{n.amount} <span className="text-sm font-normal text-slate-500">offered by</span> <span className="text-sm font-bold text-emerald-600 capitalize">{n.offered_by}</span></p>
                        <p className="text-xs text-slate-400">{new Date(n.created_at).toLocaleString()}</p>
                      </div>
                      <Chip text={n.status} tone={n.status === 'accepted' ? 'success' : n.status === 'rejected' ? 'danger' : 'warning'} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </Card>

      {/* Assign Driver Modal */}
      {showAssign && (
        <Modal onClose={() => setShowAssign(false)}>
          <div className="p-4 space-y-4">
            <h3 className="font-bold text-lg text-slate-800">Assign / Change Driver</h3>
            <p className="text-sm text-slate-500">Enter the Driver ID manually to assign them to this ride. This will notify the driver and override any existing assignment.</p>
            <input 
              type="text" 
              placeholder="Driver ID (e.g. 1234...)" 
              className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-emerald-500"
              value={assignDriverId}
              onChange={e => setAssignDriverId(e.target.value)}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowAssign(false)}>Cancel</Button>
              <Button onClick={handleAssignDriver}>Confirm Assignment</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
