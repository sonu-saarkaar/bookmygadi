import { useEffect, useMemo, useState } from "react";
import { Navigation, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { backendApi } from "@/services/backendApi";
import { adminTokenStore, adminV2Api } from "@/admin_v2/services/adminApi";
import { useAdminV2Store } from "@/admin_v2/store/useAdminStore";
import { Button } from "@/admin_v2/components/ui";

const formatMoney = (value: number) => `Rs ${new Intl.NumberFormat("en-IN").format(Number(value || 0))}`;

export const PriceManagementBoard = () => {
  const { pushToast } = useAdminV2Store();
  const [viewType, setViewType] = useState<"Instant Ride" | "reserve">("Instant Ride");

  const [instantLoading, setInstantLoading] = useState(false);
  const [routeRules, setRouteRules] = useState<any[]>([]);
  const [vehicleModifiers, setVehicleModifiers] = useState<any[]>([]);
  const [routeRuleForm, setRouteRuleForm] = useState({
    pickup_area: "",
    destination_area: "",
    base_km: 5,
    base_fare: 120,
    per_km_rate: 14,
    min_fare: 100,
    max_multiplier: 2,
  });
  const [vehicleModifierForm, setVehicleModifierForm] = useState({
    vehicle_type: "car",
    multiplier: 1,
    flat_adjustment: 0,
    min_fare_floor: 120,
  });

  const [pricingLoading, setPricingLoading] = useState(false);
  const [driverRoutePrices, setDriverRoutePrices] = useState<any[]>([]);
  const [defaultRates, setDefaultRates] = useState<any[]>([]);
  const [rateForm, setRateForm] = useState({
    route_from: "",
    route_to: "",
    vehicle_type: "car",
    duration_hours: 12,
    default_min_price: 2500,
    default_max_price: 3200,
  });

  const getAdminToken = () => adminTokenStore.get() || "";

  const loadInstantPricing = async () => {
    const token = getAdminToken();
    if (!token) {
      pushToast("Admin session expired. Please login again.", "warning");
      return;
    }
    setInstantLoading(true);
    try {
      const [rules, modifiers] = await Promise.all([
        backendApi.listRoutePriceRules(token),
        backendApi.listVehiclePriceModifiers(token),
      ]);
      setRouteRules(rules || []);
      setVehicleModifiers(modifiers || []);
    } catch (e: any) {
      pushToast(e?.message || "Unable to load instant pricing", "danger");
    } finally {
      setInstantLoading(false);
    }
  };

  const loadReservePricing = async () => {
    setPricingLoading(true);
    try {
      const [driverRows, rateRows] = await Promise.all([
        adminV2Api.requestV1<any[]>("/pricing/reserve/admin/driver-prices"),
        adminV2Api.requestV1<any[]>("/pricing/reserve/default-rates"),
      ]);
      setDriverRoutePrices(driverRows || []);
      setDefaultRates(rateRows || []);
    } catch (e: any) {
      pushToast(e?.message || "Unable to load reservation pricing", "danger");
    } finally {
      setPricingLoading(false);
    }
  };

  useEffect(() => {
    if (viewType === "reserve") {
      loadReservePricing();
      return;
    }
    loadInstantPricing();
  }, [viewType]);

  const upsertRouteRule = async () => {
    if (!routeRuleForm.pickup_area.trim() || !routeRuleForm.destination_area.trim()) {
      pushToast("Pickup and destination areas are required", "warning");
      return;
    }

    const token = getAdminToken();
    if (!token) {
      pushToast("Admin session expired. Please login again.", "warning");
      return;
    }

    const payload = {
      pickup_area: routeRuleForm.pickup_area.trim(),
      destination_area: routeRuleForm.destination_area.trim(),
      base_km: Number(routeRuleForm.base_km),
      base_fare: Number(routeRuleForm.base_fare),
      per_km_rate: Number(routeRuleForm.per_km_rate),
      min_fare: Number(routeRuleForm.min_fare),
      max_multiplier: Number(routeRuleForm.max_multiplier),
      is_active: true,
    };

    const existing = routeRules.find(
      (r) =>
        (r.pickup_area || "").toLowerCase().trim() === payload.pickup_area.toLowerCase() &&
        (r.destination_area || "").toLowerCase().trim() === payload.destination_area.toLowerCase(),
    );

    try {
      if (existing?.id) {
        await backendApi.updateRoutePriceRule(existing.id, payload, token);
        pushToast("Instant route rule updated", "success");
      } else {
        await backendApi.createRoutePriceRule(payload as any, token);
        pushToast("Instant route rule added", "success");
      }
      await loadInstantPricing();
    } catch (e: any) {
      pushToast(e?.message || "Unable to save instant route rule", "danger");
    }
  };

  const editRouteRule = async (row: any) => {
    const baseFare = window.prompt("Base fare", String(row.base_fare || "")) ?? "";
    const perKm = window.prompt("Per km rate", String(row.per_km_rate || "")) ?? "";
    const minFare = window.prompt("Min fare", String(row.min_fare || "")) ?? "";
    const maxMultiplier = window.prompt("Max multiplier", String(row.max_multiplier || "")) ?? "";

    const token = getAdminToken();
    if (!token) {
      pushToast("Admin session expired. Please login again.", "warning");
      return;
    }

    try {
      await backendApi.updateRoutePriceRule(
        row.id,
        {
          base_fare: Number(baseFare || 0),
          per_km_rate: Number(perKm || 0),
          min_fare: Number(minFare || 0),
          max_multiplier: Number(maxMultiplier || 1),
        },
        token,
      );
      pushToast("Instant route rule updated", "success");
      await loadInstantPricing();
    } catch (e: any) {
      pushToast(e?.message || "Unable to update route rule", "danger");
    }
  };

  const upsertVehicleModifier = async () => {
    if (!vehicleModifierForm.vehicle_type.trim()) {
      pushToast("Vehicle type is required", "warning");
      return;
    }

    const token = getAdminToken();
    if (!token) {
      pushToast("Admin session expired. Please login again.", "warning");
      return;
    }

    const payload = {
      vehicle_type: vehicleModifierForm.vehicle_type.trim().toLowerCase(),
      multiplier: Number(vehicleModifierForm.multiplier),
      flat_adjustment: Number(vehicleModifierForm.flat_adjustment),
      min_fare_floor: Number(vehicleModifierForm.min_fare_floor),
      is_active: true,
    };

    const existing = vehicleModifiers.find(
      (r) => (r.vehicle_type || "").toLowerCase().trim() === payload.vehicle_type,
    );

    try {
      if (existing?.id) {
        await backendApi.updateVehiclePriceModifier(
          existing.id,
          {
            multiplier: payload.multiplier,
            flat_adjustment: payload.flat_adjustment,
            min_fare_floor: payload.min_fare_floor,
            is_active: payload.is_active,
          },
          token,
        );
        pushToast("Vehicle modifier updated", "success");
      } else {
        await backendApi.createVehiclePriceModifier(payload as any, token);
        pushToast("Vehicle modifier added", "success");
      }
      await loadInstantPricing();
    } catch (e: any) {
      pushToast(e?.message || "Unable to save vehicle modifier", "danger");
    }
  };

  const editVehicleModifier = async (row: any) => {
    const multiplier = window.prompt("Multiplier", String(row.multiplier || "")) ?? "";
    const flat = window.prompt("Flat adjustment", String(row.flat_adjustment || "")) ?? "";
    const floor = window.prompt("Min fare floor", String(row.min_fare_floor || "")) ?? "";

    const token = getAdminToken();
    if (!token) {
      pushToast("Admin session expired. Please login again.", "warning");
      return;
    }

    try {
      await backendApi.updateVehiclePriceModifier(
        row.id,
        {
          multiplier: Number(multiplier || 1),
          flat_adjustment: Number(flat || 0),
          min_fare_floor: Number(floor || 0),
        },
        token,
      );
      pushToast("Vehicle modifier updated", "success");
      await loadInstantPricing();
    } catch (e: any) {
      pushToast(e?.message || "Unable to update vehicle modifier", "danger");
    }
  };

  const upsertDefaultRate = async () => {
    if (
      !rateForm.route_from.trim() ||
      !rateForm.route_to.trim() ||
      rateForm.default_min_price < 0 ||
      rateForm.default_max_price < rateForm.default_min_price
    ) {
      pushToast("Please fill valid route and min/max pricing", "warning");
      return;
    }

    const payload = {
      route_from: rateForm.route_from.trim(),
      route_to: rateForm.route_to.trim(),
      vehicle_type: rateForm.vehicle_type.toLowerCase(),
      duration_hours: Number(rateForm.duration_hours),
      default_min_price: Number(rateForm.default_min_price),
      default_max_price: Number(rateForm.default_max_price),
      is_active: true,
    };

    const existing = defaultRates.find(
      (r) =>
        (r.route_from || "").toLowerCase().trim() === payload.route_from.toLowerCase() &&
        (r.route_to || "").toLowerCase().trim() === payload.route_to.toLowerCase() &&
        (r.vehicle_type || "").toLowerCase().trim() === payload.vehicle_type &&
        Number(r.duration_hours) === payload.duration_hours,
    );

    try {
      if (existing?.id) {
        await adminV2Api.requestV1(`/pricing/reserve/default-rates/${existing.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        pushToast("Default route rate updated", "success");
      } else {
        await adminV2Api.requestV1("/pricing/reserve/default-rates", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        pushToast("Default route rate added", "success");
      }
      await loadReservePricing();
    } catch (e: any) {
      pushToast(e?.message || "Unable to save default route rate", "danger");
    }
  };

  const editDriverRoutePrice = async (row: any) => {
    const p6 = window.prompt("6h fare", String(row.price_6h || "")) ?? "";
    const p12 = window.prompt("12h fare", String(row.price_12h || "")) ?? "";
    const p24 = window.prompt("24h fare", String(row.price_24h || "")) ?? "";
    const payload = {
      price_6h: Number(p6 || 0),
      price_12h: Number(p12 || 0),
      price_24h: Number(p24 || 0),
    };

    if (payload.price_12h <= 0) {
      pushToast("12h fare required", "warning");
      return;
    }

    try {
      await adminV2Api.requestV1(`/pricing/reserve/admin/driver-prices/${row.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      pushToast("Driver route fare updated", "success");
      await loadReservePricing();
    } catch (e: any) {
      pushToast(e?.message || "Unable to update driver route fare", "danger");
    }
  };

  const routeMatrix = useMemo(
    () =>
      Object.values(
        driverRoutePrices.reduce((acc: Record<string, any>, row) => {
          const key = `${row.route_from}__${row.route_to}__${row.vehicle_type}`;
          if (!acc[key]) {
            acc[key] = {
              route_from: row.route_from,
              route_to: row.route_to,
              vehicle_type: row.vehicle_type,
              min_6h: row.price_6h,
              max_6h: row.price_6h,
              min_12h: row.price_12h,
              max_12h: row.price_12h,
              min_24h: row.price_24h,
              max_24h: row.price_24h,
              drivers: 1,
            };
          } else {
            acc[key].min_6h = Math.min(acc[key].min_6h, row.price_6h);
            acc[key].max_6h = Math.max(acc[key].max_6h, row.price_6h);
            acc[key].min_12h = Math.min(acc[key].min_12h, row.price_12h);
            acc[key].max_12h = Math.max(acc[key].max_12h, row.price_12h);
            acc[key].min_24h = Math.min(acc[key].min_24h, row.price_24h);
            acc[key].max_24h = Math.max(acc[key].max_24h, row.price_24h);
            acc[key].drivers += 1;
          }
          return acc;
        }, {}),
      ) as any[],
    [driverRoutePrices],
  );

  return (
    <div className="relative isolate w-full px-2 min-h-[90vh] pb-24 max-w-5xl mx-auto">
      <div className="py-2 px-1 mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Price Management</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Configure instant and reservation pricing logic</p>
        </div>
      </div>

      <div className="bg-gray-100 p-1.5 rounded-[24px] flex items-center gap-1.5 mb-8 shadow-inner ring-1 ring-gray-200">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setViewType("Instant Ride")}
          className={`flex-1 py-4 px-2 rounded-[18px] text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
            viewType === "Instant Ride" ? "bg-white shadow-soft text-emerald-600" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Navigation size={16} strokeWidth={3} className={viewType === "Instant Ride" ? "text-emerald-500" : ""} />
          Instant Ride
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setViewType("reserve")}
          className={`flex-1 py-4 px-2 rounded-[18px] text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
            viewType === "reserve" ? "bg-white shadow-soft text-indigo-600" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Clock size={16} strokeWidth={3} className={viewType === "reserve" ? "text-indigo-500" : ""} />
          Reserved
        </motion.button>
      </div>

      {viewType === "Instant Ride" && (
        <div className="space-y-5">
          <div className="bg-white rounded-[24px] border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Instant Route Logic</h3>
                <p className="text-xs font-semibold text-slate-500">Route based formula for instant quote generation</p>
              </div>
              <Button onClick={loadInstantPricing} className="h-9 px-4">Refresh</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <input value={routeRuleForm.pickup_area} onChange={(e) => setRouteRuleForm((p) => ({ ...p, pickup_area: e.target.value }))} className="h-10 rounded-xl border border-slate-300 px-3 text-sm" placeholder="Pickup area" />
              <input value={routeRuleForm.destination_area} onChange={(e) => setRouteRuleForm((p) => ({ ...p, destination_area: e.target.value }))} className="h-10 rounded-xl border border-slate-300 px-3 text-sm" placeholder="Destination area" />
              <input type="number" value={routeRuleForm.base_km} onChange={(e) => setRouteRuleForm((p) => ({ ...p, base_km: Number(e.target.value || 0) }))} className="h-10 rounded-xl border border-slate-300 px-3 text-sm" placeholder="Base km" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
              <input type="number" value={routeRuleForm.base_fare} onChange={(e) => setRouteRuleForm((p) => ({ ...p, base_fare: Number(e.target.value || 0) }))} className="h-10 rounded-xl border border-slate-300 px-3 text-sm" placeholder="Base fare" />
              <input type="number" value={routeRuleForm.per_km_rate} onChange={(e) => setRouteRuleForm((p) => ({ ...p, per_km_rate: Number(e.target.value || 0) }))} className="h-10 rounded-xl border border-slate-300 px-3 text-sm" placeholder="Per km rate" />
              <input type="number" value={routeRuleForm.min_fare} onChange={(e) => setRouteRuleForm((p) => ({ ...p, min_fare: Number(e.target.value || 0) }))} className="h-10 rounded-xl border border-slate-300 px-3 text-sm" placeholder="Min fare" />
              <input type="number" step="0.1" value={routeRuleForm.max_multiplier} onChange={(e) => setRouteRuleForm((p) => ({ ...p, max_multiplier: Number(e.target.value || 0) }))} className="h-10 rounded-xl border border-slate-300 px-3 text-sm" placeholder="Max multiplier" />
            </div>
            <div className="flex gap-2 mb-4">
              <Button onClick={upsertRouteRule} className="h-10 px-5 bg-slate-900 text-white hover:bg-black">Save Route Rule</Button>
            </div>

            {instantLoading ? (
              <p className="text-sm text-slate-500">Loading instant pricing...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-200">
                      <th className="py-2 pr-3">Route</th>
                      <th className="py-2 pr-3">Base</th>
                      <th className="py-2 pr-3">Per Km</th>
                      <th className="py-2 pr-3">Min Fare</th>
                      <th className="py-2 pr-3">Max Mult.</th>
                      <th className="py-2 pr-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routeRules.map((r) => (
                      <tr key={r.id} className="border-b border-slate-100">
                        <td className="py-2 pr-3 font-semibold text-slate-800">{r.pickup_area} -&gt; {r.destination_area}</td>
                        <td className="py-2 pr-3">{formatMoney(r.base_fare)} / {r.base_km}km</td>
                        <td className="py-2 pr-3">{formatMoney(r.per_km_rate)}</td>
                        <td className="py-2 pr-3">{formatMoney(r.min_fare)}</td>
                        <td className="py-2 pr-3">{r.max_multiplier}x</td>
                        <td className="py-2 pr-3"><Button variant="outline" className="h-8 px-3" onClick={() => editRouteRule(r)}>Edit</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white rounded-[24px] border border-slate-200 p-5 shadow-sm">
            <h3 className="text-lg font-black text-slate-900">Instant Vehicle Logic</h3>
            <p className="text-xs font-semibold text-slate-500 mb-4">Vehicle multipliers and floor rates for instant pricing</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
              <input value={vehicleModifierForm.vehicle_type} onChange={(e) => setVehicleModifierForm((p) => ({ ...p, vehicle_type: e.target.value }))} className="h-10 rounded-xl border border-slate-300 px-3 text-sm lowercase" placeholder="vehicle type (car/auto/bike)" />
              <input type="number" step="0.1" value={vehicleModifierForm.multiplier} onChange={(e) => setVehicleModifierForm((p) => ({ ...p, multiplier: Number(e.target.value || 0) }))} className="h-10 rounded-xl border border-slate-300 px-3 text-sm" placeholder="Multiplier" />
              <input type="number" value={vehicleModifierForm.flat_adjustment} onChange={(e) => setVehicleModifierForm((p) => ({ ...p, flat_adjustment: Number(e.target.value || 0) }))} className="h-10 rounded-xl border border-slate-300 px-3 text-sm" placeholder="Flat adjustment" />
              <input type="number" value={vehicleModifierForm.min_fare_floor} onChange={(e) => setVehicleModifierForm((p) => ({ ...p, min_fare_floor: Number(e.target.value || 0) }))} className="h-10 rounded-xl border border-slate-300 px-3 text-sm" placeholder="Min fare floor" />
            </div>
            <div className="flex gap-2 mb-4">
              <Button onClick={upsertVehicleModifier} className="h-10 px-5 bg-slate-900 text-white hover:bg-black">Save Vehicle Modifier</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="py-2 pr-3">Vehicle</th>
                    <th className="py-2 pr-3">Multiplier</th>
                    <th className="py-2 pr-3">Flat Adj.</th>
                    <th className="py-2 pr-3">Min Floor</th>
                    <th className="py-2 pr-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicleModifiers.map((v) => (
                    <tr key={v.id} className="border-b border-slate-100">
                      <td className="py-2 pr-3 uppercase text-xs font-bold text-slate-700">{v.vehicle_type}</td>
                      <td className="py-2 pr-3">{v.multiplier}x</td>
                      <td className="py-2 pr-3">{formatMoney(v.flat_adjustment)}</td>
                      <td className="py-2 pr-3">{formatMoney(v.min_fare_floor)}</td>
                      <td className="py-2 pr-3"><Button variant="outline" className="h-8 px-3" onClick={() => editVehicleModifier(v)}>Edit</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {viewType === "reserve" && (
        <div className="space-y-5">
          <div className="bg-white rounded-[24px] border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Reservation Route Matrix</h3>
                <p className="text-xs font-semibold text-slate-500">Driver market rates by route and time slabs (6h/12h/24h)</p>
              </div>
              <Button onClick={loadReservePricing} className="h-9 px-4">Refresh</Button>
            </div>
            {pricingLoading ? (
              <p className="text-sm text-slate-500">Loading reservation pricing...</p>
            ) : routeMatrix.length === 0 ? (
              <p className="text-sm text-slate-500">No driver route prices available.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-200">
                      <th className="py-2 pr-3">Route</th>
                      <th className="py-2 pr-3">Vehicle</th>
                      <th className="py-2 pr-3">6h Range</th>
                      <th className="py-2 pr-3">12h Range</th>
                      <th className="py-2 pr-3">24h Range</th>
                      <th className="py-2 pr-3">Drivers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routeMatrix.map((row: any, idx) => (
                      <tr key={`${row.route_from}-${row.route_to}-${idx}`} className="border-b border-slate-100">
                        <td className="py-2 pr-3 font-semibold text-slate-800">{row.route_from} -&gt; {row.route_to}</td>
                        <td className="py-2 pr-3 uppercase text-xs font-bold text-slate-600">{row.vehicle_type}</td>
                        <td className="py-2 pr-3">{formatMoney(row.min_6h)} - {formatMoney(row.max_6h)}</td>
                        <td className="py-2 pr-3">{formatMoney(row.min_12h)} - {formatMoney(row.max_12h)}</td>
                        <td className="py-2 pr-3">{formatMoney(row.min_24h)} - {formatMoney(row.max_24h)}</td>
                        <td className="py-2 pr-3">{row.drivers}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white rounded-[24px] border border-slate-200 p-5 shadow-sm">
            <h3 className="text-lg font-black text-slate-900">Admin Default Route Rates</h3>
            <p className="text-xs font-semibold text-slate-500 mb-4">Use this when driver has not added route pricing. Search algorithm will fallback here.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <input value={rateForm.route_from} onChange={(e) => setRateForm((p) => ({ ...p, route_from: e.target.value }))} className="h-10 rounded-xl border border-slate-300 px-3 text-sm" placeholder="From location" />
              <input value={rateForm.route_to} onChange={(e) => setRateForm((p) => ({ ...p, route_to: e.target.value }))} className="h-10 rounded-xl border border-slate-300 px-3 text-sm" placeholder="To location" />
              <input value={rateForm.vehicle_type} onChange={(e) => setRateForm((p) => ({ ...p, vehicle_type: e.target.value }))} className="h-10 rounded-xl border border-slate-300 px-3 text-sm lowercase" placeholder="vehicle type (car/auto/bike)" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <select value={rateForm.duration_hours} onChange={(e) => setRateForm((p) => ({ ...p, duration_hours: Number(e.target.value) }))} className="h-10 rounded-xl border border-slate-300 px-3 text-sm bg-white">
                <option value={6}>6 hours</option>
                <option value={12}>12 hours</option>
                <option value={24}>24 hours</option>
              </select>
              <input type="number" value={rateForm.default_min_price} onChange={(e) => setRateForm((p) => ({ ...p, default_min_price: Number(e.target.value || 0) }))} className="h-10 rounded-xl border border-slate-300 px-3 text-sm" placeholder="Min price" />
              <input type="number" value={rateForm.default_max_price} onChange={(e) => setRateForm((p) => ({ ...p, default_max_price: Number(e.target.value || 0) }))} className="h-10 rounded-xl border border-slate-300 px-3 text-sm" placeholder="Max price" />
            </div>
            <div className="flex gap-2">
              <Button onClick={upsertDefaultRate} className="h-10 px-5 bg-slate-900 text-white hover:bg-black">Save Default Rate</Button>
              <Button variant="outline" onClick={loadReservePricing} className="h-10 px-5">Reload</Button>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="py-2 pr-3">Route</th>
                    <th className="py-2 pr-3">Vehicle</th>
                    <th className="py-2 pr-3">Duration</th>
                    <th className="py-2 pr-3">Min</th>
                    <th className="py-2 pr-3">Max</th>
                  </tr>
                </thead>
                <tbody>
                  {defaultRates.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100">
                      <td className="py-2 pr-3 font-semibold text-slate-800">{r.route_from} -&gt; {r.route_to}</td>
                      <td className="py-2 pr-3 uppercase text-xs font-bold text-slate-600">{r.vehicle_type}</td>
                      <td className="py-2 pr-3">{r.duration_hours}h</td>
                      <td className="py-2 pr-3">{formatMoney(r.default_min_price)}</td>
                      <td className="py-2 pr-3">{formatMoney(r.default_max_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-[24px] border border-slate-200 p-5 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 mb-3">All Driver Route Prices</h3>
            <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
              {driverRoutePrices.map((row) => (
                <div key={row.id} className="rounded-xl border border-slate-200 p-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{row.route_from} -&gt; {row.route_to}</p>
                    <p className="text-xs font-semibold text-slate-500 uppercase">{row.vehicle_type} | Driver {String(row.driver_id).slice(0, 8)}</p>
                    <p className="text-xs text-slate-700 mt-1">6h {formatMoney(row.price_6h)} | 12h {formatMoney(row.price_12h)} | 24h {formatMoney(row.price_24h)}</p>
                  </div>
                  <Button variant="outline" className="h-9 px-3" onClick={() => editDriverRoutePrice(row)}>Edit</Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
