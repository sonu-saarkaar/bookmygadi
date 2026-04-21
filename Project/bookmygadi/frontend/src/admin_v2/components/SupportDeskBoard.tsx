import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, Phone, MapPin, Clock, User, Car, Headset,
  Shield, Ambulance, Flame, Radio, CheckCircle, XCircle,
  RefreshCw, MessageSquare, ChevronRight, Siren, Send,
  UserCheck, Filter, Eye
} from "lucide-react";
import { adminV2Api } from "@/admin_v2/services/adminApi";
import { useAdminV2Store } from "@/admin_v2/store/useAdminStore";

// ── helpers ──────────────────────────────────────────────────────────────────
const SEVERITY_MAP: Record<string, { label: string; cls: string }> = {
  critical: { label: "CRITICAL", cls: "bg-red-100 text-red-700 border-red-300" },
  high:     { label: "HIGH",     cls: "bg-orange-100 text-orange-700 border-orange-300" },
  medium:   { label: "MEDIUM",   cls: "bg-amber-100 text-amber-700 border-amber-300" },
  low:      { label: "LOW",      cls: "bg-emerald-100 text-emerald-700 border-emerald-300" },
};

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  open:        { label: "Open",        cls: "bg-blue-100 text-blue-700" },
  in_progress: { label: "In Progress", cls: "bg-amber-100 text-amber-700" },
  resolved:    { label: "Resolved",    cls: "bg-emerald-100 text-emerald-700" },
  closed:      { label: "Closed",      cls: "bg-slate-100 text-slate-600" },
  escalated:   { label: "Escalated",   cls: "bg-red-100 text-red-700" },
};

const CATEGORY_MAP: Record<string, { label: string; icon: any; color: string }> = {
  complaint:     { label: "Complaint",       icon: MessageSquare, color: "text-blue-500" },
  vehicle_issue: { label: "Vehicle Issue",   icon: Car,           color: "text-orange-500" },
  police:        { label: "Police",          icon: Shield,        color: "text-indigo-500" },
  emergency:     { label: "Emergency / SOS", icon: Siren,         color: "text-red-600" },
  general:       { label: "General",         icon: Headset,       color: "text-slate-500" },
};

const EMERGENCY_BUTTONS = [
  { key: "police",    label: "Police",     icon: Shield,    tel: "100", cls: "bg-indigo-600 hover:bg-indigo-700" },
  { key: "ambulance", label: "Ambulance",  icon: Ambulance, tel: "108", cls: "bg-red-600 hover:bg-red-700" },
  { key: "fire",      label: "Fire",       icon: Flame,     tel: "101", cls: "bg-orange-600 hover:bg-orange-700" },
  { key: "112",       label: "Emergency",  icon: Phone,     tel: "112", cls: "bg-rose-600 hover:bg-rose-700" },
  { key: "team",      label: "Our Team",   icon: Radio,     tel: "",    cls: "bg-emerald-600 hover:bg-emerald-700" },
];

const fmt = (d: string) => new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

// ── Ticket Card ───────────────────────────────────────────────────────────────
const TicketCard = ({ ticket, active, onClick }: { ticket: any; active: boolean; onClick: () => void }) => {
  const sev = SEVERITY_MAP[ticket.severity] ?? SEVERITY_MAP.medium;
  const cat = CATEGORY_MAP[ticket.category] ?? CATEGORY_MAP.general;
  const sta = STATUS_MAP[ticket.status] ?? STATUS_MAP.open;
  const CatIcon = cat.icon;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={`cursor-pointer rounded-2xl border p-4 transition-all ${active
        ? "border-indigo-400 bg-indigo-50 shadow-md"
        : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`shrink-0 ${cat.color}`}><CatIcon size={18} /></div>
          <p className="truncate text-sm font-bold text-slate-800">{ticket.title}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${sev.cls}`}>{sev.label}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${sta.cls}`}>{sta.label}</span>
        {ticket.reporter_role && <span className="capitalize">{ticket.reporter_role}</span>}
        {ticket.created_by && <span>• {ticket.created_by}</span>}
      </div>
      <div className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-400">
        <Clock size={11} /> {fmt(ticket.created_at)}
      </div>
      {ticket.pickup_location && (
        <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400 truncate">
          <MapPin size={11} className="shrink-0" /> {ticket.pickup_location}
        </div>
      )}
    </motion.div>
  );
};

// ── Detail Panel ──────────────────────────────────────────────────────────────
const DetailPanel = ({ ticket, vehicles, onUpdate }: { ticket: any; vehicles: any[]; onUpdate: () => void }) => {
  const { pushToast } = useAdminV2Store();
  const [response, setResponse] = useState(ticket.admin_response ?? "");
  const [assignedTo, setAssignedTo] = useState(ticket.assigned_to ?? "");
  const [assignedVehicle, setAssignedVehicle] = useState(ticket.assigned_vehicle_id ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setResponse(ticket.admin_response ?? "");
    setAssignedTo(ticket.assigned_to ?? "");
    setAssignedVehicle(ticket.assigned_vehicle_id ?? "");
  }, [ticket.id]);

  const act = async (patch: Record<string, any>) => {
    setSaving(true);
    try {
      await adminV2Api.ticketAction(ticket.id, patch);
      pushToast("Updated successfully", "success");
      onUpdate();
    } catch (e: any) {
      pushToast(e.message ?? "Failed", "danger");
    } finally { setSaving(false); }
  };

  const dispatchEmergency = async (key: string, tel: string) => {
    if (tel) window.open(`tel:${tel}`);
    await act({ emergency_dispatched: key, status: "in_progress" });
    pushToast(`${key.toUpperCase()} dispatched!`, "success");
  };

  const cat = CATEGORY_MAP[ticket.category] ?? CATEGORY_MAP.general;
  const CatIcon = cat.icon;
  const sev = SEVERITY_MAP[ticket.severity] ?? SEVERITY_MAP.medium;
  const sta = STATUS_MAP[ticket.status] ?? STATUS_MAP.open;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-slate-100 ${cat.color}`}>
              <CatIcon size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 leading-tight">{ticket.title}</h2>
              <p className="text-xs text-slate-500 mt-0.5">ID: {ticket.id.slice(-8).toUpperCase()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wider ${sev.cls}`}>{sev.label}</span>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${sta.cls}`}>{sta.label}</span>
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: "Reporter", value: ticket.created_by || "—", icon: User },
          { label: "Role", value: ticket.reporter_role || "—", icon: UserCheck },
          { label: "Phone", value: ticket.reporter_phone || "—", icon: Phone },
          { label: "Raised At", value: fmt(ticket.created_at), icon: Clock },
          { label: "Category", value: cat.label, icon: CatIcon },
          { label: "Assigned To", value: ticket.assigned_to || "Unassigned", icon: Headset },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
              <Icon size={11} /> {label}
            </div>
            <p className="text-sm font-bold text-slate-700 break-words">{value}</p>
          </div>
        ))}
      </div>

      {/* Locations */}
      {(ticket.pickup_location || ticket.drop_location) && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5"><MapPin size={12} /> Ride Locations</p>
          <div className="space-y-2">
            {ticket.pickup_location && (
              <div className="flex items-start gap-2">
                <div className="mt-1 w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Pickup</p>
                  <p className="text-sm font-semibold text-slate-700">{ticket.pickup_location}</p>
                </div>
              </div>
            )}
            {ticket.drop_location && (
              <div className="flex items-start gap-2">
                <div className="mt-1 w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Drop</p>
                  <p className="text-sm font-semibold text-slate-700">{ticket.drop_location}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Description */}
      {ticket.description && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Complaint Details</p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
        </div>
      )}

      {/* Emergency Dispatch */}
      <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
        <p className="text-xs font-black uppercase tracking-wider text-red-400 mb-3 flex items-center gap-1.5">
          <Siren size={12} /> Emergency Dispatch
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {EMERGENCY_BUTTONS.map(({ key, label, icon: Icon, tel, cls }) => (
            <button
              key={key}
              onClick={() => dispatchEmergency(key, tel)}
              disabled={saving}
              className={`flex flex-col items-center gap-1.5 rounded-xl p-3 text-white transition-all active:scale-95 disabled:opacity-50 ${cls} ${ticket.emergency_dispatched === key ? "ring-2 ring-white ring-offset-2" : ""}`}
            >
              <Icon size={20} />
              <span className="text-[10px] font-black uppercase tracking-wider leading-tight">{label}</span>
              {tel && <span className="text-[10px] opacity-80">{tel}</span>}
            </button>
          ))}
        </div>
        {ticket.emergency_dispatched && (
          <p className="mt-2 text-xs text-red-600 font-bold">
            ✓ {ticket.emergency_dispatched.toUpperCase()} dispatched
          </p>
        )}
      </div>

      {/* Assign Vehicle */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5"><Car size={12} /> Assign Replacement Vehicle</p>
        <div className="flex gap-2">
          <select
            value={assignedVehicle}
            onChange={e => setAssignedVehicle(e.target.value)}
            className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
          >
            <option value="">-- Select Vehicle --</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.model_name} · {v.vehicle_type} · {v.area}</option>
            ))}
          </select>
          <button
            onClick={() => act({ assigned_vehicle_id: assignedVehicle })}
            disabled={saving || !assignedVehicle}
            className="rounded-xl bg-slate-900 px-4 text-sm font-bold text-white hover:bg-black disabled:opacity-40 transition-colors"
          >
            Assign
          </button>
        </div>
        {ticket.assigned_vehicle_id && (
          <p className="mt-1.5 text-xs text-emerald-600 font-semibold">✓ Vehicle ID: {ticket.assigned_vehicle_id.slice(-8).toUpperCase()} assigned</p>
        )}
      </div>

      {/* Assign Agent */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5"><UserCheck size={12} /> Assign Team Member</p>
        <div className="flex gap-2">
          <input
            value={assignedTo}
            onChange={e => setAssignedTo(e.target.value)}
            placeholder="Agent name or ID..."
            className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-400"
          />
          <button
            onClick={() => act({ assigned_to: assignedTo })}
            disabled={saving || !assignedTo}
            className="rounded-xl bg-slate-900 px-4 text-sm font-bold text-white hover:bg-black disabled:opacity-40 transition-colors"
          >
            Assign
          </button>
        </div>
      </div>

      {/* Admin Response */}
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
        <p className="text-xs font-black uppercase tracking-wider text-indigo-400 mb-3 flex items-center gap-1.5"><Send size={12} /> Admin Response (visible to user)</p>
        <textarea
          value={response}
          onChange={e => setResponse(e.target.value)}
          rows={3}
          placeholder="Write your response to the complaint..."
          className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 resize-none"
        />
        <button
          onClick={() => act({ admin_response: response, status: "in_progress" })}
          disabled={saving || !response.trim()}
          className="mt-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
        >
          Send Response
        </button>
      </div>

      {/* Status Actions */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5"><CheckCircle size={12} /> Update Status</p>
        <div className="flex flex-wrap gap-2">
          {[
            { s: "in_progress", label: "Mark In Progress", cls: "border-amber-300 text-amber-700 hover:bg-amber-50" },
            { s: "resolved",    label: "Mark Resolved",    cls: "border-emerald-300 text-emerald-700 hover:bg-emerald-50" },
            { s: "closed",      label: "Close Ticket",     cls: "border-slate-300 text-slate-600 hover:bg-slate-50" },
            { s: "escalated",   label: "Escalate",         cls: "border-red-300 text-red-600 hover:bg-red-50" },
          ].map(({ s, label, cls }) => (
            <button
              key={s}
              onClick={() => act({ status: s })}
              disabled={saving || ticket.status === s}
              className={`rounded-xl border px-4 py-2 text-sm font-bold transition-colors disabled:opacity-40 ${cls}`}
            >
              {label}
            </button>
          ))}
        </div>
        {ticket.resolved_at && (
          <p className="mt-2 text-xs text-slate-400">Resolved at: {fmt(ticket.resolved_at)}</p>
        )}
      </div>
    </div>
  );
};

// ── Main Board ────────────────────────────────────────────────────────────────
export const SupportDeskBoard = () => {
  const { pushToast } = useAdminV2Store();
  const [tickets, setTickets] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCat, setFilterCat] = useState("all");
  const [filterSev, setFilterSev] = useState("all");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const [t, v] = await Promise.all([
        adminV2Api.listTickets(),
        adminV2Api.listVehicles(),
      ]);
      setTickets(t ?? []);
      setVehicles(v ?? []);
      if (!activeId && t?.length) setActiveId(t[0].id);
    } catch (e: any) {
      pushToast("Failed to load support desk", "danger");
    } finally { setLoading(false); }
  }, [activeId]);

  useEffect(() => { load(); }, []);

  // Poll every 15s
  useEffect(() => {
    const id = setInterval(() => {
      adminV2Api.listTickets().then(t => { if (t) setTickets(t); }).catch(() => {});
    }, 15000);
    return () => clearInterval(id);
  }, []);

  const filtered = tickets.filter(t => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterCat !== "all" && t.category !== filterCat) return false;
    if (filterSev !== "all" && t.severity !== filterSev) return false;
    if (search && !`${t.title} ${t.created_by} ${t.description}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const active = tickets.find(t => t.id === activeId) ?? null;

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === "open").length,
    critical: tickets.filter(t => t.severity === "critical").length,
    resolved: tickets.filter(t => t.status === "resolved").length,
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Tickets", value: stats.total, cls: "bg-slate-900 text-white" },
          { label: "Open",          value: stats.open,  cls: "bg-blue-600 text-white" },
          { label: "Critical",      value: stats.critical, cls: "bg-red-600 text-white" },
          { label: "Resolved",      value: stats.resolved, cls: "bg-emerald-600 text-white" },
        ].map(({ label, value, cls }) => (
          <div key={label} className={`rounded-2xl p-4 flex flex-col ${cls}`}>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</p>
            <p className="text-3xl font-black mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search tickets..."
          className="flex-1 min-w-[160px] rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-400"
        />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none">
          <option value="all">All Status</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none">
          <option value="all">All Categories</option>
          {Object.entries(CATEGORY_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filterSev} onChange={e => setFilterSev(e.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none">
          <option value="all">All Severity</option>
          {Object.entries(SEVERITY_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button onClick={load} className="rounded-xl border border-slate-300 p-2 hover:bg-slate-50 transition-colors" title="Refresh">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Main split view */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left: Ticket List */}
        <div className="w-full max-w-sm shrink-0 flex flex-col gap-2 overflow-y-auto pr-1" style={{ maxHeight: "72vh" }}>
          {loading ? (
            <div className="flex items-center justify-center py-16 opacity-40">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Headset size={32} className="mb-2 opacity-30" />
              <p className="text-sm font-bold">No tickets found</p>
            </div>
          ) : (
            filtered.map(t => (
              <TicketCard key={t.id} ticket={t} active={activeId === t.id} onClick={() => setActiveId(t.id)} />
            ))
          )}
        </div>

        {/* Right: Detail */}
        <div className="flex-1 overflow-y-auto" style={{ maxHeight: "72vh" }}>
          <AnimatePresence mode="wait">
            {active ? (
              <motion.div key={active.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                <DetailPanel ticket={active} vehicles={vehicles} onUpdate={load} />
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-300 py-20">
                <Eye size={40} className="mb-3 opacity-30" />
                <p className="text-sm font-bold">Select a ticket to view details</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
