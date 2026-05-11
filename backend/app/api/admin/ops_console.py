"""Minimal browser console for SQL-backed dispatch (Bearer admin JWT)."""

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter(prefix="/admin", tags=["admin-ops"])

_DISPATCH_HTML = r"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><title>BMG Dispatch Console</title>
<style>
body{font-family:system-ui,sans-serif;margin:16px;max-width:1200px}
label{display:block;margin:8px 0 4px}
input,button,select{padding:8px;margin-right:8px}
table{border-collapse:collapse;width:100%;margin-top:16px}
th,td{border:1px solid #ccc;padding:8px;text-align:left}
th{background:#f4f4f4}
.err{color:#b00020}
.ok{color:#0a0}
</style></head><body>
<h1>BookMyGadi — Dispatch console</h1>
<p>Paste a valid <strong>admin</strong> JWT, then load pending rides and assign drivers.</p>
<label>API base (no trailing slash)</label>
<input id="base" type="text" size="60" value="" placeholder="https://api.bookmygadi.app"/>
<label>Bearer token</label>
<input id="tok" type="password" size="80" placeholder="eyJ..."/>
<div style="margin-top:12px">
<button type="button" id="load">Load pending rides</button>
<button type="button" id="loadSearch">Load search monitor</button>
</div>
<div id="msg"></div>
<h2>Pending rides</h2>
<table id="rt"><thead><tr><th>ID</th><th>Pickup</th><th>Drop</th><th>Type</th><th>Assign driver ID</th><th></th></tr></thead><tbody></tbody></table>
<h2>Search events (searching)</h2>
<table id="st"><thead><tr><th>Event</th><th>User</th><th>Mode</th><th>Assign driver ID</th><th></th></tr></thead><tbody></tbody></table>
<script>
const $ = (id) => document.getElementById(id);
const api = (path) => {
  const b = ($("base").value || window.location.origin).replace(/\/$/, "");
  const p = path.startsWith("/api/v1") ? path : "/api/v1" + path;
  return b + p;
};
const hdr = () => ({ "Authorization": "Bearer " + $("tok").value.trim(), "Content-Type": "application/json", "Accept": "application/json" });
function show(t, ok) { const m = $("msg"); m.textContent = t; m.className = ok ? "ok" : "err"; }
async function loadRides() {
  show("Loading…", true);
  const r = await fetch(api("/admin/rides?status=pending&limit=50"), { headers: hdr() });
  if (!r.ok) { show(await r.text(), false); return; }
  const rows = await r.json();
  const tb = $("#rt tbody"); tb.innerHTML = "";
  for (const row of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td><small>${row.id}</small></td><td>${row.pickup_location||""}</td><td>${row.destination||""}</td><td>${row.vehicle_type||""}</td>
      <td><input type="text" class="did" data-ride="${row.id}" placeholder="driver uuid" size="36"/></td>
      <td><button type="button" class="asg">Assign</button></td>`;
    tr.querySelector(".asg").onclick = async () => {
      const inp = tr.querySelector(".did");
      const driverId = inp.value.trim();
      if (!driverId) { show("Driver id required", false); return; }
      const u = await fetch(api("/admin/rides/" + row.id + "/assign-driver"), { method: "PATCH", headers: hdr(), body: JSON.stringify({ driver_id: driverId }) });
      show(u.ok ? "Assigned" : await u.text(), u.ok);
      if (u.ok) loadRides();
    };
    tb.appendChild(tr);
  }
  show("Loaded " + rows.length + " rides", true);
}
async function loadSearch() {
  show("Loading search monitor…", true);
  const r = await fetch(api("/admin/enterprise/search-monitor?status=searching&limit=40"), { headers: hdr() });
  if (!r.ok) { show(await r.text(), false); return; }
  const rows = await r.json();
  const tb = $("#st tbody"); tb.innerHTML = "";
  for (const row of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td><small>${row.id}</small></td><td>${row.user_id||""}</td><td>${row.search_mode||""}</td>
      <td><input type="text" class="sid" data-eid="${row.id}" placeholder="driver uuid" size="36"/></td>
      <td><button type="button" class="sasg">Assign</button></td>`;
    tr.querySelector(".sasg").onclick = async () => {
      const inp = tr.querySelector(".sid");
      const driverId = inp.value.trim();
      if (!driverId) { show("Driver id required", false); return; }
      const u = await fetch(api("/admin/enterprise/search-monitor/" + row.id + "/assign-driver"), { method: "PATCH", headers: hdr(), body: JSON.stringify({ driver_id: driverId }) });
      show(u.ok ? "Search assigned" : await u.text(), u.ok);
      if (u.ok) loadSearch();
    };
    tb.appendChild(tr);
  }
  show("Loaded " + rows.length + " search events", true);
}
$("load").onclick = loadRides;
$("loadSearch").onclick = loadSearch;
$("base").value = window.location.origin;
</script>
</body></html>"""


@router.get("/dispatch-console", response_class=HTMLResponse)
def dispatch_console() -> HTMLResponse:
    """Public HTML; all API calls require admin JWT entered in the page."""
    return HTMLResponse(_DISPATCH_HTML)
