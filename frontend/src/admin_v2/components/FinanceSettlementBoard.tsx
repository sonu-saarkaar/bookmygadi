import React, { useEffect, useState, useMemo } from "react";
import * as Lucide from "lucide-react";
import { Card, Chip, Button, Modal } from "@/admin_v2/components/ui";
import { DataTable } from "@/admin_v2/components/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { adminV2Api } from "@/admin_v2/services/adminApi";
import { useAdminV2Store } from "@/admin_v2/store/useAdminStore";

interface DriverWallet {
  driver_id: string;
  name: string;
  balance: number;
  pending_settlement: number;
  total_earned: number;
  rides_count: number;
}

type FinanceSettlementBoardProps = {
  onRefresh?: () => void;
};

export const FinanceSettlementBoard = ({ onRefresh }: FinanceSettlementBoardProps) => {
  const { pushToast } = useAdminV2Store();
  const [wallets, setWallets] = useState<DriverWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "settled">("pending");
  const [selectedDrivers, setSelectedDrivers] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<"balance" | "pending" | "earned">("pending");
  const [selectedWallet, setSelectedWallet] = useState<DriverWallet | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [processingSettlement, setProcessingSettlement] = useState(false);
  const [settlementAmount, setSettlementAmount] = useState(0);

  const loadWallets = async () => {
    try {
      setLoading(true);
      const data = await adminV2Api.getDriverWallets();
      setWallets(data);
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Failed to load wallets", "danger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWallets();
  }, []);

  const filteredWallets = useMemo(() => {
    let filtered = [...wallets];

    if (filterStatus === "pending") {
      filtered = filtered.filter(w => w.pending_settlement > 0);
    } else if (filterStatus === "settled") {
      filtered = filtered.filter(w => w.pending_settlement === 0 && w.balance > 0);
    }

    if (sortBy === "pending") {
      filtered.sort((a, b) => b.pending_settlement - a.pending_settlement);
    } else if (sortBy === "balance") {
      filtered.sort((a, b) => b.balance - a.balance);
    } else if (sortBy === "earned") {
      filtered.sort((a, b) => b.total_earned - a.total_earned);
    }

    return filtered;
  }, [wallets, filterStatus, sortBy]);

  const selectedWalletsData = wallets.filter(w => selectedDrivers.has(w.driver_id));
  const totalSelectedPending = selectedWalletsData.reduce((sum, w) => sum + w.pending_settlement, 0);
  const totalWalletBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
  const totalPending = wallets.reduce((sum, w) => sum + w.pending_settlement, 0);
  const pendingDriversCount = wallets.filter(w => w.pending_settlement > 0).length;

  const handleSelectDriver = (driverId: string, checked: boolean) => {
    const newSet = new Set(selectedDrivers);
    if (checked) {
      newSet.add(driverId);
    } else {
      newSet.delete(driverId);
    }
    setSelectedDrivers(newSet);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedDrivers(new Set(filteredWallets.map(w => w.driver_id)));
    } else {
      setSelectedDrivers(new Set());
    }
  };

  const handleProcessSettlement = async (driverId: string, amount: number) => {
    try {
      setProcessingSettlement(true);
      await adminV2Api.processSettlement(driverId, amount);
      pushToast("Settlement processed successfully", "success");
      loadWallets();
      setShowDetailModal(false);
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Settlement failed", "danger");
    } finally {
      setProcessingSettlement(false);
    }
  };

  const handleBulkSettle = async () => {
    if (selectedDrivers.size === 0) {
      pushToast("No drivers selected", "warning");
      return;
    }

    try {
      setProcessingSettlement(true);
      const promises = Array.from(selectedDrivers).map(driverId => {
        const wallet = wallets.find(w => w.driver_id === driverId);
        if (wallet && wallet.pending_settlement > 0) {
          return adminV2Api.processSettlement(driverId, wallet.pending_settlement);
        }
        return Promise.resolve();
      });

      await Promise.all(promises);
      pushToast(`${selectedDrivers.size} settlements processed`, "success");
      loadWallets();
      setSelectedDrivers(new Set());
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Bulk settlement failed", "danger");
    } finally {
      setProcessingSettlement(false);
    }
  };

  const columns = useMemo<ColumnDef<DriverWallet>[]>(() => [
    {
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllRowsSelected()}
          onChange={(e) => handleSelectAll(e.target.checked)}
          className="w-4 h-4 cursor-pointer"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={selectedDrivers.has(row.original.driver_id)}
          onChange={(e) => handleSelectDriver(row.original.driver_id, e.target.checked)}
          className="w-4 h-4 cursor-pointer"
        />
      ),
      size: 50,
    },
    {
      header: "Driver Name",
      cell: ({ row }) => (
        <button
          onClick={() => {
            setSelectedWallet(row.original);
            setSettlementAmount(row.original.pending_settlement);
            setShowDetailModal(true);
          }}
          className="font-semibold text-emerald-600 hover:underline cursor-pointer"
        >
          {row.original.name}
        </button>
      ),
    },
    {
      header: "Driver ID",
      cell: ({ row }) => <span className="text-xs text-slate-500 font-mono">{row.original.driver_id.slice(0, 12)}...</span>,
    },
    {
      header: "Total Earned",
      cell: ({ row }) => <span className="font-bold text-slate-800">₹{new Intl.NumberFormat('en-IN').format(row.original.total_earned)}</span>,
    },
    {
      header: "Available Balance",
      cell: ({ row }) => (
        <div>
          <p className="font-bold text-emerald-600">₹{new Intl.NumberFormat('en-IN').format(row.original.balance)}</p>
          <p className="text-xs text-slate-500">{row.original.rides_count} rides</p>
        </div>
      ),
    },
    {
      header: "Pending Settlement",
      cell: ({ row }) => (
        <div>
          {row.original.pending_settlement > 0 ? (
            <>
              <p className="font-bold text-rose-600">₹{new Intl.NumberFormat('en-IN').format(row.original.pending_settlement)}</p>
              <Chip text="Pending Payout" tone="warning" />
            </>
          ) : (
            <Chip text="Settled" tone="success" />
          )}
        </div>
      ),
    },
    {
      header: "Action",
      cell: ({ row }) => (
        <Button
          className="h-8 px-3 text-xs"
          onClick={() => {
            setSelectedWallet(row.original);
            setSettlementAmount(row.original.pending_settlement);
            setShowDetailModal(true);
          }}
          disabled={row.original.pending_settlement === 0}
        >
          {row.original.pending_settlement > 0 ? "Settle" : "View"}
        </Button>
      ),
    },
  ], [selectedDrivers]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Settlement Management</h1>
          <p className="text-slate-500 text-sm mt-1">Manage driver wallets and process payouts.</p>
        </div>
        <Button onClick={loadWallets} disabled={loading} variant="outline" className="border-slate-300">
          <Lucide.RefreshCw size={16} className="mr-2" /> {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 bg-gradient-to-br from-rose-50 to-rose-100 border border-rose-200 rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-bold text-rose-700 mb-1">Pending Payouts</p>
              <p className="text-3xl font-black text-rose-800">₹{new Intl.NumberFormat('en-IN').format(totalPending)}</p>
              <p className="text-xs text-rose-600 mt-2">{pendingDriversCount} drivers</p>
            </div>
            <Lucide.AlertCircle size={48} className="text-rose-300 opacity-50" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-bold text-slate-700 mb-1">Total Balances</p>
              <p className="text-3xl font-black text-slate-800">₹{new Intl.NumberFormat('en-IN').format(totalWalletBalance)}</p>
              <p className="text-xs text-slate-600 mt-2">{wallets.length} drivers</p>
            </div>
            <Lucide.Wallet size={48} className="text-slate-300 opacity-50" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-bold text-emerald-700 mb-1">Selected for Payout</p>
              <p className="text-3xl font-black text-emerald-800">₹{new Intl.NumberFormat('en-IN').format(totalSelectedPending)}</p>
              <p className="text-xs text-emerald-600 mt-2">{selectedDrivers.size} selected</p>
            </div>
            <Lucide.CheckCircle2 size={48} className="text-emerald-300 opacity-50" />
          </div>
        </Card>
      </div>

      {/* Filters & Actions */}
      <Card className="p-4 border border-slate-200 shadow-sm rounded-2xl bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold uppercase text-slate-500">Filter by:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="h-9 px-3 text-sm border border-slate-300 rounded-lg bg-white"
            >
              <option value="all">All Drivers</option>
              <option value="pending">Pending Payouts</option>
              <option value="settled">Settled</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold uppercase text-slate-500">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-9 px-3 text-sm border border-slate-300 rounded-lg bg-white"
            >
              <option value="pending">Pending Amount</option>
              <option value="balance">Available Balance</option>
              <option value="earned">Total Earned</option>
            </select>
          </div>

          {selectedDrivers.size > 0 && (
            <Button
              onClick={handleBulkSettle}
              disabled={processingSettlement}
              className="bg-emerald-600 text-white border-0 hover:bg-emerald-700"
            >
              <Lucide.Send size={14} className="mr-2" />
              {processingSettlement ? "Processing..." : `Process ${selectedDrivers.size} Settlements`}
            </Button>
          )}
        </div>
      </Card>

      {/* Wallets Table */}
      <Card className="p-0 border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Lucide.Users size={20} /> Driver Wallets ({filteredWallets.length})
          </h3>
        </div>
        <DataTable data={filteredWallets} columns={columns} />
      </Card>

      {/* Detail Modal */}
      {showDetailModal && selectedWallet && (
        <Modal isOpen={true} onClose={() => setShowDetailModal(false)} title={`Settlement Details - ${selectedWallet.name}`}>
          <div className="space-y-6 py-4">
            {/* Driver Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-xs text-slate-500 font-bold uppercase mb-1">Driver ID</p>
                <p className="font-mono text-sm font-bold text-slate-800">{selectedWallet.driver_id}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-xs text-slate-500 font-bold uppercase mb-1">Total Rides</p>
                <p className="text-2xl font-black text-slate-800">{selectedWallet.rides_count}</p>
              </div>
            </div>

            {/* Wallet Summary */}
            <div className="space-y-3 border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">Total Earned (Lifetime)</span>
                <span className="text-2xl font-black text-emerald-600">₹{new Intl.NumberFormat('en-IN').format(selectedWallet.total_earned)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">Available Balance</span>
                <span className="text-2xl font-black text-blue-600">₹{new Intl.NumberFormat('en-IN').format(selectedWallet.balance)}</span>
              </div>
              <div className="flex items-center justify-between bg-rose-50 p-3 rounded-lg border border-rose-200">
                <span className="font-bold text-rose-800">Pending Settlement</span>
                <span className="text-2xl font-black text-rose-600">₹{new Intl.NumberFormat('en-IN').format(selectedWallet.pending_settlement)}</span>
              </div>
            </div>

            {/* Settlement Action */}
            {selectedWallet.pending_settlement > 0 && (
              <div className="space-y-3 border-t border-slate-200 pt-4">
                <label className="block text-sm font-bold text-slate-700">Settlement Amount</label>
                <input
                  type="number"
                  value={settlementAmount}
                  onChange={(e) => setSettlementAmount(Number(e.target.value))}
                  className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm"
                  placeholder="Enter amount"
                />
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-emerald-600 text-white border-0 hover:bg-emerald-700"
                    onClick={() => handleProcessSettlement(selectedWallet.driver_id, settlementAmount)}
                    disabled={processingSettlement || settlementAmount <= 0}
                  >
                    {processingSettlement ? "Processing..." : "Process Settlement"}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowDetailModal(false)}
                    disabled={processingSettlement}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {selectedWallet.pending_settlement === 0 && (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg text-center">
                <Lucide.CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-600" />
                <p className="font-bold text-emerald-800">Already Settled</p>
                <p className="text-sm text-emerald-700 mt-1">No pending settlement for this driver.</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default FinanceSettlementBoard;
