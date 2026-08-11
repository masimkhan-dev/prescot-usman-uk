import { createFileRoute } from "@tanstack/react-router";
import { useState, lazy, Suspense } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listRepairs, getRepairMetrics } from "@/lib/repairs.functions";
import { formatGBP } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { PageHelpButton } from "@/components/dashboard/PageHelpButton";
import { TableSkeleton } from "@/components/dashboard/TableSkeleton";
import { EmptyState } from "@/components/dashboard/EmptyState";
import {
  Plus,
  Wrench,
  ShieldCheck,
  Search,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

// Lazy load heavy modals to keep main page bundle lightweight
const RepairIntakeModal = lazy(() =>
  import("@/components/dashboard/RepairIntakeModal").then((m) => ({
    default: m.RepairIntakeModal,
  }))
);
const RepairWorkspaceModal = lazy(() =>
  import("@/components/dashboard/RepairWorkspaceModal").then((m) => ({
    default: m.RepairWorkspaceModal,
  }))
);
const WarrantyClaimLookupModal = lazy(() =>
  import("@/components/dashboard/WarrantyClaimLookupModal").then((m) => ({
    default: m.WarrantyClaimLookupModal,
  }))
);
const RepairIntakeReceipt = lazy(() =>
  import("@/components/dashboard/RepairIntakeReceipt").then((m) => ({
    default: m.RepairIntakeReceipt,
  }))
);

export const Route = createFileRoute("/_authenticated/dashboard/repairs")({
  component: RepairsPage,
});

function RepairsPage() {
  const queryClient = useQueryClient();
  const listFn = useServerFn(listRepairs);
  const metricsFn = useServerFn(getRepairMetrics);

  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const debouncedSearchQuery = useDebounce(searchQuery, 250);
  const [page, setPage] = useState(0);
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);

  // Modals
  const [intakeModalOpen, setIntakeModalOpen] = useState(false);
  const [claimLookupOpen, setClaimLookupOpen] = useState(false);
  const [workspaceRepairId, setWorkspaceRepairId] = useState<string | null>(null);
  const [intakeReceiptTicket, setIntakeReceiptTicket] = useState<any>(null);

  // Map simplified tabs to backend status filter
  let backendStatusFilter: string | null = null;
  if (activeTab === "new") backendStatusFilter = "pending";
  else if (activeTab === "working") backendStatusFilter = "in_progress";
  else if (activeTab === "ready") backendStatusFilter = "ready";
  else if (activeTab === "completed") backendStatusFilter = "completed";
  else if (activeTab === "cancelled") backendStatusFilter = "cancelled";

  // Query Repairs with debounced search
  const { data: repairsData, isLoading } = useQuery({
    queryKey: ["repairs", activeTab, debouncedSearchQuery, page],
    queryFn: () =>
      listFn({
        data: {
          status: backendStatusFilter as any,
          search: debouncedSearchQuery || null,
          page,
          limit: 25,
        },
      }),
    staleTime: 1000 * 15,
  });

  // Query KPIs
  const { data: metrics } = useQuery({
    queryKey: ["repair-metrics"],
    queryFn: () => metricsFn(),
    staleTime: 1000 * 15,
  });

  function refreshAll() {
    queryClient.invalidateQueries({ queryKey: ["repairs"] });
    queryClient.invalidateQueries({ queryKey: ["repair-metrics"] });
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; label: string }> = {
      pending: { bg: "bg-blue-50 text-blue-700 border-blue-200", label: "New" },
      assessed: { bg: "bg-blue-50 text-blue-700 border-blue-200", label: "Assessed" },
      in_progress: { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Working" },
      quality_check: { bg: "bg-purple-50 text-purple-700 border-purple-200", label: "Quality Check" },
      ready: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Ready" },
      completed: { bg: "bg-slate-900 text-white border-slate-900", label: "Completed" },
      cancelled: { bg: "bg-rose-50 text-rose-700 border-rose-200", label: "Cancelled" },
    };
    const s = map[status] || { bg: "bg-slate-100 text-slate-700", label: status };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-[11px] font-extrabold capitalize ${s.bg}`}
      >
        {s.label}
      </span>
    );
  };

  return (
    <div className="db-page space-y-6">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-brand" />
            <h1 className="db-page-title">Repair Tickets</h1>
          </div>
          <p className="db-page-subtitle">Book, track and complete repairs.</p>
        </div>

        <div className="flex items-center gap-2">
          <PageHelpButton
            pageTitle="Repair Tickets"
            pageKey="repairs"
            steps={[
              "New Repair — enter customer, device, fault and price.",
              "Add Part / Work during repair if needed.",
              "Add payments as deposit or installment.",
              "Mark Ready when repair is finished.",
              "Collect & Complete to finalize and print invoice.",
            ]}
            note="Warranty days are entered manually for each repair/part."
            firstTimeTip="Tip: Book the repair first. You can add parts and payments later."
          />

          <button
            onClick={() => setIntakeModalOpen(true)}
            className="px-5 py-2.5 bg-brand hover:bg-brand/90 text-white font-extrabold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer text-xs sm:text-sm min-h-[42px]"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> + New Repair
          </button>

          <div className="relative">
            <button
              onClick={() => setMoreActionsOpen(!moreActionsOpen)}
              className="px-3.5 py-2.5 bg-muted/60 hover:bg-muted text-foreground font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer min-h-[42px] border border-border"
            >
              More <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>

            {moreActionsOpen && (
              <div
                className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-xl z-30 py-1 text-xs font-semibold animate-in fade-in zoom-in-95 duration-100"
                onClick={() => setMoreActionsOpen(false)}
              >
                <button
                  onClick={() => setClaimLookupOpen(true)}
                  className="w-full text-left px-4 py-2 hover:bg-muted flex items-center gap-2 text-foreground"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-brand" /> Warranty Lookup
                </button>
                <button
                  onClick={() => setActiveTab("completed")}
                  className="w-full text-left px-4 py-2 hover:bg-muted flex items-center gap-2 text-foreground"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Completed Repairs
                </button>
                <button
                  onClick={() => setActiveTab("cancelled")}
                  className="w-full text-left px-4 py-2 hover:bg-muted flex items-center gap-2 text-rose-600"
                >
                  Cancelled Repairs
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. SIMPLE REPAIR KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="db-card p-4 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
            New Today
          </span>
          <div className="font-extrabold text-2xl text-foreground font-mono">
            {metrics?.todayCount ?? 0}
          </div>
        </div>

        <div className="db-card p-4 space-y-1 bg-amber-50/40 border-amber-200">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 block">
            Working
          </span>
          <div className="font-extrabold text-2xl text-amber-950 font-mono">
            {metrics?.inProgressCount ?? 0}
          </div>
        </div>

        <div className="db-card p-4 space-y-1 bg-emerald-50/40 border-emerald-200">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 block">
            Ready
          </span>
          <div className="font-extrabold text-2xl text-emerald-950 font-mono">
            {metrics?.readyCount ?? 0}
          </div>
        </div>

        <div className="db-card p-4 space-y-1 bg-rose-50/40 border-rose-200">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-900 block">
            Outstanding Due
          </span>
          <div className="font-extrabold text-2xl text-rose-950 font-mono">
            {formatGBP((metrics?.totalDuePence ?? 0) / 100)}
          </div>
        </div>
      </div>

      {/* 3. SEARCH & PROMINENT FILTERS */}
      <div className="db-card p-3.5 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search name, phone, REP #, device or IMEI..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-xl text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>

          {/* Clean Filters: All | New | Working | Ready | Completed */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: "all", label: "All" },
              { id: "new", label: "New" },
              { id: "working", label: "Working" },
              { id: "ready", label: "Ready" },
              { id: "completed", label: "Completed" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTab(t.id);
                  setPage(0);
                }}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[36px] ${activeTab === t.id
                  ? "bg-brand text-white shadow-xs"
                  : "bg-muted/40 hover:bg-muted text-muted-foreground"
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. REPAIR TICKET LIST */}
      {isLoading ? (
        <div className="db-card p-4">
          <TableSkeleton rows={6} cols={7} />
        </div>
      ) : (
        <div className="db-card !p-0 overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="db-table min-w-[700px]">
              <thead>
                <tr>
                  <th className="db-th">Repair #</th>
                  <th className="db-th">Customer / Device</th>
                  <th className="db-th">Fault</th>
                  <th className="db-th">Status</th>
                  <th className="db-th text-right">Total</th>
                  <th className="db-th text-right">Due</th>
                  <th className="db-th text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {repairsData?.rows && repairsData.rows.length > 0 ? (
                  repairsData.rows.map((r: any) => {
                    const quotePence = r.total_price_pence || 0;
                    const paidPence = r.amount_paid_pence || 0;
                    const duePence = Math.max(0, quotePence - paidPence);

                    return (
                      <tr key={r.id} className="db-tr-hover">
                        <td className="db-td font-extrabold font-mono text-brand">
                          {r.rep_number}
                        </td>
                        <td className="db-td">
                          <span className="font-bold text-foreground block">
                            {r.customers?.name || "Walk-In"}
                          </span>
                          <span className="text-xs text-muted-foreground block">{r.device}</span>
                        </td>
                        <td className="db-td max-w-xs truncate text-muted-foreground">{r.issue}</td>
                        <td className="db-td">{getStatusBadge(r.status)}</td>
                        <td className="db-td text-right font-extrabold font-mono text-foreground">
                          {formatGBP(quotePence / 100)}
                        </td>
                        <td className="db-td text-right font-bold font-mono">
                          {duePence > 0 ? (
                            <span className="text-rose-600">{formatGBP(duePence / 100)}</span>
                          ) : (
                            <span className="text-emerald-600">PAID</span>
                          )}
                        </td>
                        <td className="db-td text-right">
                          <button
                            onClick={() => setWorkspaceRepairId(r.id)}
                            className="px-3.5 py-1.5 bg-brand/10 hover:bg-brand/20 text-brand font-extrabold rounded-xl text-xs transition-colors cursor-pointer min-h-[36px] ml-auto inline-flex items-center gap-1"
                          >
                            Open <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState
                        title="No repair tickets found"
                        description="Try adjusting your search query or filter tab."
                        actionLabel="+ Book First Repair"
                        onAction={() => setIntakeModalOpen(true)}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Compact Cards View */}
          <div className="sm:hidden divide-y divide-border">
            {repairsData?.rows && repairsData.rows.length > 0 ? (
              repairsData.rows.map((r: any) => {
                const quotePence = r.total_price_pence || 0;
                const paidPence = r.amount_paid_pence || 0;
                const duePence = Math.max(0, quotePence - paidPence);

                return (
                  <div key={r.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-brand font-mono text-xs">
                        {r.rep_number}
                      </span>
                      {getStatusBadge(r.status)}
                    </div>
                    <div>
                      <span className="font-bold text-sm text-foreground block">
                        {r.customers?.name || "Walk-In"}
                      </span>
                      <span className="text-xs text-foreground/80 font-medium block">
                        {r.device} • {r.issue}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <div className="space-x-2 font-mono">
                        <span className="text-muted-foreground">Total: {formatGBP(quotePence / 100)}</span>
                        <span className={duePence > 0 ? "text-rose-600 font-bold" : "text-emerald-600 font-bold"}>
                          Due: {duePence > 0 ? formatGBP(duePence / 100) : "PAID"}
                        </span>
                      </div>
                      <button
                        onClick={() => setWorkspaceRepairId(r.id)}
                        className="px-3 py-1 bg-brand text-white font-bold rounded-lg text-xs cursor-pointer"
                      >
                        Open
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState
                title="No repair tickets found"
                description="Try adjusting your search query or filter tab."
                actionLabel="+ Book First Repair"
                onAction={() => setIntakeModalOpen(true)}
              />
            )}
          </div>

          {/* Pagination */}
          {repairsData && repairsData.total > 25 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
              <span>
                Showing {page * 25 + 1}–{Math.min((page + 1) * 25, repairsData.total)} of{" "}
                {repairsData.total} tickets
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

      {/* LAZY LOADED MODALS */}
      <Suspense fallback={null}>
        {intakeModalOpen && (
          <RepairIntakeModal
            isOpen={intakeModalOpen}
            onClose={() => setIntakeModalOpen(false)}
            onSuccess={(ticket) => {
              refreshAll();
              setIntakeReceiptTicket(ticket);
            }}
          />
        )}

        {intakeReceiptTicket && (
          <RepairIntakeReceipt
            isOpen={!!intakeReceiptTicket}
            onClose={() => setIntakeReceiptTicket(null)}
            onOpenWorkspace={(ticketId) => {
              setIntakeReceiptTicket(null);
              setWorkspaceRepairId(ticketId);
            }}
            ticket={intakeReceiptTicket}
          />
        )}

        {claimLookupOpen && (
          <WarrantyClaimLookupModal
            isOpen={claimLookupOpen}
            onClose={() => setClaimLookupOpen(false)}
          />
        )}

        {workspaceRepairId && (
          <RepairWorkspaceModal
            isOpen={!!workspaceRepairId}
            onClose={() => setWorkspaceRepairId(null)}
            repairId={workspaceRepairId}
            onUpdated={refreshAll}
          />
        )}
      </Suspense>
    </div>
  );
}
