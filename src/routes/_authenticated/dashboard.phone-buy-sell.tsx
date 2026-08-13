import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Smartphone, Plus, Search, Filter, Tag, Eye, Printer,
  ChevronLeft, ChevronRight, TrendingUp, Package, DollarSign, AlertCircle,
  RefreshCw,
} from "lucide-react";
import { listPhoneUnits, getPhoneUnitDetail } from "@/lib/phone-buy-sell.functions";
import { getOpenShift } from "@/lib/shifts.functions";
import { toastError } from "@/lib/toast";
import { PageHelpButton } from "@/components/dashboard/PageHelpButton";
import { TableSkeleton } from "@/components/dashboard/TableSkeleton";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { BuyPhoneModal } from "@/components/dashboard/BuyPhoneModal";
import { SellPhoneModal } from "@/components/dashboard/SellPhoneModal";
import { PhoneUnitDetailModal } from "@/components/dashboard/PhoneUnitDetailModal";
import { PhonePurchaseReceiptModal, type PurchaseReceiptData } from "@/components/dashboard/PhonePurchaseReceipt";
import { PhoneSaleInvoiceModal, type PhoneSaleInvoiceData } from "@/components/dashboard/PhoneSaleInvoice";
import { useDebounce } from "@/hooks/use-debounce";

export const Route = createFileRoute("/_authenticated/dashboard/phone-buy-sell")({
  component: PhoneBuySellPage,
});

type StatusFilter = "in_stock" | "sold" | "all";

function formatGBP(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}
function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function PhoneBuySellPage() {
  const queryClient = useQueryClient();
  const listFn = useServerFn(listPhoneUnits);
  const detailFn = useServerFn(getPhoneUnitDetail);
  const getShiftFn = useServerFn(getOpenShift);

  // --- Filters ---
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 250);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(0);

  // --- Modals ---
  const [buyOpen, setBuyOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailUnit, setDetailUnit] = useState<any | null>(null);
  const [sellPreselected, setSellPreselected] = useState<any | null>(null);

  // --- Print state ---
  const [printPurchaseData, setPrintPurchaseData] = useState<PurchaseReceiptData | null>(null);
  const [printSaleData, setPrintSaleData] = useState<PhoneSaleInvoiceData | null>(null);

  // --- Queries ---
  const { data: shift } = useQuery({
    queryKey: ["open-shift"],
    queryFn: () => getShiftFn(),
    staleTime: 1000 * 60,
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["phone-units", debouncedSearch, statusFilter, page],
    queryFn: () =>
      listFn({ data: { search: debouncedSearch, status: statusFilter, page, limit: 25 } }),
    staleTime: 1000 * 60,
  });

  async function openDetail(id: string) {
    try {
      const unit = await detailFn({ data: { id } });
      setDetailUnit(unit);
      setDetailOpen(true);
    } catch (err) {
      toastError(err, "Failed to load phone details");
    }
  }

  function handleBuySuccess(result: {
    stock_number: string;
    phone_unit_id: string;
    transaction_id: string;
    receiptData: PurchaseReceiptData;
  }) {
    setBuyOpen(false);
    queryClient.invalidateQueries({ queryKey: ["phone-units"] });
    setPrintPurchaseData(result.receiptData);
  }

  function handleSellSuccess(result: {
    invoice_number: string;
    sale_id: string;
    warranty_until: string | null;
    invoiceData: PhoneSaleInvoiceData;
  }) {
    setSellOpen(false);
    setSellPreselected(null);
    setDetailOpen(false);
    queryClient.invalidateQueries({ queryKey: ["phone-units"] });
    queryClient.invalidateQueries({ queryKey: ["sales"] });
    setPrintSaleData(result.invoiceData);
  }

  function triggerPrintPurchase(unit: any) {
    const purchase = Array.isArray(unit.phone_purchase_transactions)
      ? unit.phone_purchase_transactions[0]
      : null;
    if (!purchase) return;
    setPrintPurchaseData({
      purchase_number: purchase.purchase_number || unit.stock_number,
      purchased_at: unit.purchased_at,
      seller: purchase.customers ?? null,
      condition: purchase.condition_snapshot ?? unit,
      purchase_price_pence: purchase.purchase_price_pence ?? unit.purchase_cost_pence ?? 0,
      payment_method: purchase.payment_method ?? "cash",
      bank_reference: purchase.bank_reference ?? null,
      declaration_text: purchase.seller_declaration_text,
      staff_name: null,
    });
  }

  function triggerPrintSale(unit: any) {
    const saleItem = Array.isArray(unit.sale_items) ? unit.sale_items[0] : null;
    if (!saleItem) return;
    const sale = saleItem.sales;
    const snapshot = saleItem.device_snapshot ?? unit;
    setPrintSaleData({
      invoice_number: sale?.invoice_number ?? "—",
      sold_at: unit.sold_at ?? sale?.created_at ?? new Date().toISOString(),
      buyer: sale?.customers ?? null,
      device_snapshot: snapshot,
      selling_price_pence: saleItem.line_total_pence,
      payment_method: "cash",
      warranty_days: saleItem.warranty_days ?? null,
      warranty_policy_text: saleItem.warranty_policy_text ?? null,
      warranty_start_date: saleItem.warranty_start_date ?? null,
      warranty_until: saleItem.warranty_until ?? null,
    });
  }

  const STATUS_FILTERS: { label: string; value: StatusFilter; color: string }[] = [
    { label: "All Stock", value: "all", color: "bg-muted text-foreground" },
    { label: "In Stock", value: "in_stock", color: "bg-green-100 text-green-700" },
    { label: "Sold", value: "sold", color: "bg-muted text-muted-foreground" },
  ];

  const conditionColors: Record<string, string> = {
    Excellent: "bg-blue-100 text-blue-700",
    Good: "bg-green-100 text-green-700",
    Fair: "bg-yellow-100 text-yellow-700",
    Faulty: "bg-destructive/10 text-destructive",
  };

  return (
    <div className="db-page space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="db-page-header">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-brand" />
            <h1 className="db-page-title">Phone Buy & Sell</h1>
            <PageHelpButton
              pageTitle="Phone Buy & Sell"
              pageKey="phone-buy-sell"
              steps={[
                "Use 'Buy Phone' to record a handset purchased from a customer — capture IMEI, condition, and price.",
                "Use 'Sell Phone' to sell an in-stock handset to a buyer — price, warranty, and payment are recorded.",
                "Each buy and sell generates a professional printable document.",
                "Gross margin is calculated automatically from purchase cost vs selling price.",
              ]}
              firstTimeTip="Tip: Always verify IMEI before recording a purchase. Each IMEI is uniquely tracked."
            />
          </div>
          <p className="db-page-subtitle">
            Track individual pre-owned handsets — buy, sell, IMEI, condition, warranty & receipts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSellOpen(true)}
            className="btn-outline !py-2 !px-4 !text-xs min-h-[40px] cursor-pointer flex items-center gap-1.5"
          >
            <Tag className="w-3.5 h-3.5" /> Sell Phone
          </button>
          <button
            type="button"
            onClick={() => setBuyOpen(true)}
            className="btn-primary !py-2 !px-4 !text-xs min-h-[40px] cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Buy Phone
          </button>
        </div>
      </div>

      {/* Till warning */}
      {!shift && (
        <div className="p-3 rounded-xl bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          No open till shift. Cash buy-ins and sales require an open shift. Open the till from the POS page.
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Stock #, IMEI, brand, model…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="db-input !pl-9"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => { setStatusFilter(f.value); setPage(0); }}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                statusFilter === f.value
                  ? "border-brand bg-brand text-white"
                  : "border-border text-muted-foreground hover:border-brand/50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer ml-auto"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="db-card p-4">
          <TableSkeleton rows={6} cols={7} />
        </div>
      ) : data ? (
        <div className="db-card !p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="db-table min-w-[860px]">
              <thead>
                <tr>
                  <th className="db-th">Stock #</th>
                  <th className="db-th">Device</th>
                  <th className="db-th">IMEI 1</th>
                  <th className="db-th">Condition</th>
                  <th className="db-th text-right">Cost</th>
                  <th className="db-th">Status</th>
                  <th className="db-th">Date</th>
                  <th className="db-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((u: any) => {
                  const isSold = u.status === "sold";
                  return (
                    <tr key={u.id} className="db-tr-hover">
                      <td className="db-td font-mono text-xs text-muted-foreground font-bold">
                        {u.stock_number}
                      </td>
                      <td className="db-td">
                        <span className="font-bold text-ink text-xs">
                          {u.brand} {u.model}
                        </span>
                        {(u.storage || u.colour) && (
                          <span className="block text-[11px] text-muted-foreground">
                            {[u.storage, u.colour].filter(Boolean).join(" · ")}
                          </span>
                        )}
                      </td>
                      <td className="db-td font-mono text-[11px] text-muted-foreground">
                        {u.imei1}
                      </td>
                      <td className="db-td">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          conditionColors[u.condition_grade] ?? "bg-muted text-muted-foreground"
                        }`}>
                          {u.condition_grade}
                        </span>
                      </td>
                      <td className="db-td text-right font-mono text-xs font-bold text-foreground">
                        {formatGBP(u.purchase_cost_pence)}
                      </td>
                      <td className="db-td">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isSold
                            ? "bg-muted text-muted-foreground"
                            : "bg-green-100 text-green-700"
                        }`}>
                          {isSold ? "Sold" : "In Stock"}
                        </span>
                      </td>
                      <td className="db-td text-[11px] text-muted-foreground">
                        {isSold ? formatDate(u.sold_at) : formatDate(u.purchased_at)}
                      </td>
                      <td className="db-td text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openDetail(u.id)}
                            className="p-1.5 text-muted-foreground hover:text-ink rounded hover:bg-muted transition-colors min-h-[36px] min-w-[36px] cursor-pointer"
                            title="View details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => isSold ? triggerPrintSale(u) : triggerPrintPurchase(u)}
                            className="p-1.5 text-muted-foreground hover:text-ink rounded hover:bg-muted transition-colors min-h-[36px] min-w-[36px] cursor-pointer"
                            title={isSold ? "Print Sales Invoice" : "Print Purchase Receipt"}
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {!isSold && (
                            <button
                              type="button"
                              onClick={() => {
                                setSellPreselected(u);
                                setSellOpen(true);
                              }}
                              className="px-2.5 py-1.5 text-[11px] font-bold text-brand border border-brand/30 rounded-lg hover:bg-brand/10 transition-colors cursor-pointer whitespace-nowrap"
                            >
                              Sell
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {data.rows.length === 0 && (
                  <tr>
                    <td colSpan={8}>
                      <EmptyState
                        title="No phones found"
                        description={
                          statusFilter === "in_stock"
                            ? "No phones in stock. Use 'Buy Phone' to record a new purchase."
                            : "No records match your search."
                        }
                        actionLabel="Clear filters"
                        onAction={() => { setSearch(""); setStatusFilter("all"); setPage(0); }}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.total > 25 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30 text-xs text-muted-foreground">
              <span>
                Showing {page * 25 + 1}–{Math.min((page + 1) * 25, data.total)} of {data.total} phones
              </span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-1.5 rounded-lg hover:bg-border disabled:opacity-40 transition-colors cursor-pointer">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 font-bold">{page + 1}</span>
                <button type="button" onClick={() => setPage((p) => p + 1)}
                  disabled={(page + 1) * 25 >= data.total}
                  className="p-1.5 rounded-lg hover:bg-border disabled:opacity-40 transition-colors cursor-pointer">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* ── MODALS ── */}
      <BuyPhoneModal
        isOpen={buyOpen}
        shiftId={shift?.id ?? null}
        onClose={() => setBuyOpen(false)}
        onSuccess={handleBuySuccess}
      />

      <SellPhoneModal
        isOpen={sellOpen}
        shiftId={shift?.id ?? null}
        preselectedUnit={sellPreselected}
        onClose={() => { setSellOpen(false); setSellPreselected(null); }}
        onSuccess={handleSellSuccess}
      />

      {detailUnit && (
        <PhoneUnitDetailModal
          isOpen={detailOpen}
          unit={detailUnit}
          onClose={() => { setDetailOpen(false); setDetailUnit(null); }}
          onSell={() => {
            setSellPreselected(detailUnit);
            setSellOpen(true);
            setDetailOpen(false);
          }}
          onPrintPurchase={() => triggerPrintPurchase(detailUnit)}
          onPrintSale={() => triggerPrintSale(detailUnit)}
        />
      )}

      {/* ── PRINT MODAL PREVIEWS ── */}
      {printPurchaseData && (
        <PhonePurchaseReceiptModal
          data={printPurchaseData}
          onClose={() => setPrintPurchaseData(null)}
        />
      )}

      {printSaleData && (
        <PhoneSaleInvoiceModal
          data={printSaleData}
          onClose={() => setPrintSaleData(null)}
        />
      )}
    </div>
  );
}
