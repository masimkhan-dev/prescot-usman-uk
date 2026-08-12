import { createFileRoute } from "@tanstack/react-router";
import { useState, lazy, Suspense } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listRepairs, getRepairMetrics, linkCustomerToRepair } from "@/lib/repairs.functions";
import { formatGBP } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { TableSkeleton } from "@/components/dashboard/TableSkeleton";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { CreateRepairInvoiceModal } from "@/components/dashboard/CreateRepairInvoiceModal";
import { RepairA4InvoiceModal } from "@/components/dashboard/RepairA4InvoiceModal";
import {
  Plus,
  Receipt,
  Search,
  Printer,
  UserPlus,
  ShieldCheck,
  X,
  Loader2,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

// WarrantyClaimLookupModal kept — still useful
const WarrantyClaimLookupModal = lazy(() =>
  import("@/components/dashboard/WarrantyClaimLookupModal").then((m) => ({
    default: m.WarrantyClaimLookupModal,
  })),
);

export const Route = createFileRoute("/_authenticated/dashboard/repairs")({
  component: RepairInvoicesPage,
});

// ── Inline Link Customer Modal ─────────────────────────────────────────────
function LinkCustomerModal({
  repairId,
  onClose,
  onSuccess,
}: {
  repairId: string;
  onClose: () => void;
  onSuccess: (customer: any) => void;
}) {
  const linkFn = useServerFn(linkCustomerToRepair);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Customer name is required");
      return;
    }
    setSaving(true);
    try {
      const result = await linkFn({
        data: {
          repair_id: repairId,
          customer_name: name.trim(),
          customer_phone: phone.trim() || null,
        },
      });
      toast.success("Customer linked successfully!");
      onSuccess(result.customer);
    } catch (err: any) {
      toast.error(err?.message || "Failed to link customer");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-brand" />
            <span className="font-extrabold text-sm text-slate-900 dark:text-white">
              Add Customer
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Links a customer to this invoice. Financial data remains locked.
          </p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Customer Name *"
            autoFocus
            className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-semibold text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 placeholder:text-slate-400 placeholder:font-normal"
          />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone (optional)"
            className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-semibold text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 placeholder:text-slate-400 placeholder:font-normal"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 bg-brand hover:bg-brand/90 disabled:opacity-50 text-white font-extrabold rounded-xl text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
function RepairInvoicesPage() {
  const queryClient = useQueryClient();
  const listFn = useServerFn(listRepairs);
  const metricsFn = useServerFn(getRepairMetrics);

  const [activeTab, setActiveTab] = useState<"all" | "paid" | "unpaid">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [page, setPage] = useState(0);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [printRepair, setPrintRepair] = useState<any | null>(null);
  const [linkCustomerRepairId, setLinkCustomerRepairId] = useState<string | null>(null);
  const [claimLookupOpen, setClaimLookupOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  // Map tab → backend status filter (all completed invoices)
  const statusFilter = "completed"; // always show completed (finalized invoices only)

  const { data: repairsData, isLoading } = useQuery({
    queryKey: ["repairs", "invoices", activeTab, debouncedSearch, page],
    queryFn: () =>
      listFn({
        data: {
          status: statusFilter,
          search: debouncedSearch || null,
          page,
          limit: 25,
        },
      }),
    staleTime: 1000 * 15,
  });

  const { data: metrics } = useQuery({
    queryKey: ["repair-metrics"],
    queryFn: () => metricsFn(),
    staleTime: 1000 * 15,
  });

  function refreshAll() {
    queryClient.invalidateQueries({ queryKey: ["repairs"] });
    queryClient.invalidateQueries({ queryKey: ["repair-metrics"] });
  }

  // Client-side paid/unpaid filter on top of completed status
  const rows = (repairsData?.rows ?? []) as any[];
  const filteredRows = rows.filter((r) => {
    if (activeTab === "paid") return r.amount_paid_pence >= r.total_price_pence;
    if (activeTab === "unpaid") return r.amount_paid_pence < r.total_price_pence;
    return true;
  });

  // Handle customer link success — optimistically update the row
  function handleCustomerLinked(repairId: string, customer: any) {
    queryClient.setQueryData(
      ["repairs", "invoices", activeTab, debouncedSearch, page],
      (old: any) => {
        if (!old) return old;
        return {
          ...old,
          rows: old.rows.map((r: any) =>
            r.id === repairId ? { ...r, customer_id: customer.id, customers: customer } : r,
          ),
        };
      },
    );
    setLinkCustomerRepairId(null);
  }

  // Today's revenue from metrics
  const todayRevenue = formatGBP((metrics?.totalRevenuePence ?? 0) / 100);

  return (
    <div className="db-page space-y-5">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-brand" />
            <h1 className="db-page-title">Repair Invoices</h1>
          </div>
          <p className="db-page-subtitle">Create and print repair invoices instantly.</p>
        </div>

        <div className="flex items-center gap-2">
          {/* More ▾ dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMoreMenuOpen((v) => !v)}
              className="px-3.5 py-2.5 bg-muted/60 hover:bg-muted border border-border text-foreground font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer min-h-[42px]"
            >
              More <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            {moreMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-44 bg-card border border-border rounded-xl shadow-xl z-30 py-1 text-xs font-semibold animate-in fade-in zoom-in-95 duration-100"
                onClick={() => setMoreMenuOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setClaimLookupOpen(true)}
                  className="w-full text-left px-4 py-2 hover:bg-muted flex items-center gap-2 text-foreground"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-brand" /> Warranty Lookup
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="px-5 py-2.5 bg-brand hover:bg-brand/90 text-white font-extrabold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer text-xs sm:text-sm min-h-[42px]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Create Repair Invoice
          </button>
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="db-card p-4 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
            Today's Invoices
          </span>
          <div className="font-extrabold text-2xl text-foreground font-mono">
            {metrics?.todayCount ?? 0}
          </div>
        </div>

        <div className="db-card p-4 space-y-1 bg-emerald-50/40 border-emerald-200">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 block">
            Total Revenue
          </span>
          <div className="font-extrabold text-2xl text-emerald-950 font-mono">{todayRevenue}</div>
        </div>
      </div>

      {/* ── Search & Filters ─────────────────────────────────────────── */}
      <div className="db-card p-3.5 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search REP #, customer, phone, device..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-xl text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {(["all", "paid", "unpaid"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveTab(tab);
                  setPage(0);
                }}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[36px] capitalize ${
                  activeTab === tab
                    ? "bg-brand text-white shadow-xs"
                    : "bg-muted/40 hover:bg-muted text-muted-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Invoice List ─────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="db-card p-4">
          <TableSkeleton rows={6} cols={6} />
        </div>
      ) : (
        <div className="db-card !p-0 overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="db-table min-w-[680px]">
              <thead>
                <tr>
                  <th className="db-th">Invoice #</th>
                  <th className="db-th">Customer</th>
                  <th className="db-th">Device</th>
                  <th className="db-th">Work Done</th>
                  <th className="db-th text-right">Total</th>
                  <th className="db-th text-center">Status</th>
                  <th className="db-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length > 0 ? (
                  filteredRows.map((r: any) => {
                    const totalPence = r.total_price_pence || 0;
                    const paidPence = r.amount_paid_pence || 0;
                    const isPaid = paidPence >= totalPence;
                    const hasCustomer = !!r.customer_id;

                    return (
                      <tr key={r.id} className="db-tr-hover">
                        <td className="db-td font-extrabold font-mono text-brand text-xs">
                          {r.rep_number}
                        </td>
                        <td className="db-td">
                          <span className="font-bold text-foreground block text-xs">
                            {r.customers?.name || "Walk-in Customer"}
                          </span>
                          {r.customers?.phone && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {r.customers.phone}
                            </span>
                          )}
                        </td>
                        <td className="db-td text-xs text-foreground font-semibold">
                          {r.device || r.model}
                        </td>
                        <td className="db-td max-w-[180px] truncate text-xs text-muted-foreground">
                          {r.issue}
                        </td>
                        <td className="db-td text-right font-extrabold font-mono text-foreground text-xs">
                          {formatGBP(totalPence / 100)}
                        </td>
                        <td className="db-td text-center">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> PAID
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold border border-amber-200">
                              DUE {formatGBP(Math.max(0, totalPence - paidPence) / 100)}
                            </span>
                          )}
                        </td>
                        <td className="db-td text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setLinkCustomerRepairId(r.id)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px] transition-colors cursor-pointer inline-flex items-center gap-1 min-h-[32px]"
                              title="Add or edit customer for this invoice"
                            >
                              <UserPlus className="w-3 h-3" />{" "}
                              {hasCustomer ? "Edit Customer" : "+ Add Customer"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setPrintRepair(r)}
                              className="px-3 py-1.5 bg-brand/10 hover:bg-brand/20 text-brand font-extrabold rounded-lg text-[10px] transition-colors cursor-pointer inline-flex items-center gap-1 min-h-[32px]"
                            >
                              <Printer className="w-3 h-3" /> Print
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState
                        title="No repair invoices found"
                        description="Create your first repair invoice using the button above."
                        actionLabel="+ Create Repair Invoice"
                        onAction={() => setCreateModalOpen(true)}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="sm:hidden divide-y divide-border">
            {filteredRows.length > 0 ? (
              filteredRows.map((r: any) => {
                const totalPence = r.total_price_pence || 0;
                const paidPence = r.amount_paid_pence || 0;
                const isPaid = paidPence >= totalPence;
                const hasCustomer = !!r.customer_id;

                return (
                  <div key={r.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-brand font-mono text-xs">
                        {r.rep_number}
                      </span>
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> PAID
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold border border-amber-200">
                          DUE {formatGBP(Math.max(0, totalPence - paidPence) / 100)}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="font-bold text-sm text-foreground block">
                        {r.customers?.name || "Walk-in Customer"}
                      </span>
                      <span className="text-xs text-muted-foreground block">
                        {r.device} • {r.issue}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="font-extrabold font-mono text-foreground text-sm">
                        {formatGBP(totalPence / 100)}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setLinkCustomerRepairId(r.id)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1"
                        >
                          <UserPlus className="w-3 h-3" />{" "}
                          {hasCustomer ? "Edit Customer" : "+ Add Customer"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPrintRepair(r)}
                          className="px-3 py-1.5 bg-brand text-white font-extrabold rounded-lg text-xs cursor-pointer flex items-center gap-1"
                        >
                          <Printer className="w-3 h-3" /> Print
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState
                title="No repair invoices found"
                description="Create your first repair invoice using the button above."
                actionLabel="+ Create Repair Invoice"
                onAction={() => setCreateModalOpen(true)}
              />
            )}
          </div>

          {/* Pagination */}
          {repairsData && repairsData.total > 25 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
              <span>
                Showing {page * 25 + 1}–{Math.min((page + 1) * 25, repairsData.total)} of{" "}
                {repairsData.total} invoices
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1 bg-muted hover:bg-border rounded-lg disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={(page + 1) * 25 >= repairsData.total}
                  className="px-3 py-1 bg-muted hover:bg-border rounded-lg disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────────── */}

      {/* Create Repair Invoice */}
      <CreateRepairInvoiceModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={(repair) => {
          setCreateModalOpen(false);
          refreshAll();
          setPrintRepair(repair);
        }}
      />

      {/* A4 Invoice Print */}
      {printRepair && (
        <RepairA4InvoiceModal
          isOpen={!!printRepair}
          onClose={() => setPrintRepair(null)}
          repair={printRepair}
          onFinalized={refreshAll}
          onCustomerLinked={refreshAll}
        />
      )}

      {/* Link Customer (post-finalization) */}
      {linkCustomerRepairId && (
        <LinkCustomerModal
          repairId={linkCustomerRepairId}
          onClose={() => setLinkCustomerRepairId(null)}
          onSuccess={(customer) => handleCustomerLinked(linkCustomerRepairId, customer)}
        />
      )}

      {/* Warranty Lookup */}
      <Suspense fallback={null}>
        {claimLookupOpen && (
          <WarrantyClaimLookupModal
            isOpen={claimLookupOpen}
            onClose={() => setClaimLookupOpen(false)}
          />
        )}
      </Suspense>
    </div>
  );
}
