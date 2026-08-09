import { createFileRoute } from "@tanstack/react-router";
import { useState, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSales, getSaleDetail } from "@/lib/sales.functions";
import { formatGBP } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { toastError } from "@/lib/toast";
import { PageHelpButton } from "@/components/dashboard/PageHelpButton";
import { TableSkeleton } from "@/components/dashboard/TableSkeleton";
import { EmptyState } from "@/components/dashboard/EmptyState";
import type { InvoiceData } from "@/components/dashboard/Invoice";
import { CreditCard, Search, FileText, Loader2 } from "lucide-react";

import { InvoiceModal } from "@/components/dashboard/Invoice";

export const Route = createFileRoute("/_authenticated/dashboard/sales")({
  component: DashboardSalesPage,
});

function DashboardSalesPage() {
  const listSalesFn = useServerFn(listSales);
  const getSaleDetailFn = useServerFn(getSaleDetail);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 250);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [loadingInvoiceId, setLoadingInvoiceId] = useState<string | null>(null);

  const { data: salesData, isLoading } = useQuery({
    queryKey: ["sales", debouncedSearch],
    queryFn: () => listSalesFn({ data: { search: debouncedSearch } }),
    staleTime: 1000 * 30, // 30s cache
  });
  const sales = salesData?.rows ?? [];

  const handleOpenInvoice = async (saleId: string) => {
    setLoadingInvoiceId(saleId);
    try {
      const detail = await getSaleDetailFn({ data: { id: saleId } });
      const inv: InvoiceData = {
        kind: "sale",
        number: detail.invoice_number ?? `INV-${detail.id.slice(0, 8).toUpperCase()}`,
        date: new Date(detail.created_at).toLocaleString("en-GB"),
        customer: detail.customers,
        lines: (detail.sale_items || []).map((item) => ({
          name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price_pence / 100,
          total: item.line_total_pence / 100,
        })),
        discount: detail.discount_pence / 100,
        total: detail.total_pence / 100,
        paid: true,
        paymentMethod: detail.payments[0]?.method,
        warrantyUntil: detail.warranty_until,
      };
      setSelectedInvoice(inv);
    } catch (err: unknown) {
      toastError(err, "Failed to load sale receipt");
    } finally {
      setLoadingInvoiceId(null);
    }
  };

  return (
    <div className="db-page space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="db-page-header">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-brand" />
            <h1 className="db-page-title">Sales Transaction History</h1>
            <PageHelpButton
              pageTitle="Sales Log"
              pageKey="sales"
              steps={[
                "Use this page to review completed sales, payments and receipts.",
                "Search by invoice number or customer name.",
                "Click Receipt on any transaction to view or reprint invoice.",
              ]}
              firstTimeTip="Tip: Click Receipt next to any transaction to open and reprint the invoice."
            />
          </div>
          <p className="db-page-subtitle">
            Complete retail checkout receipts, payment methods, and transaction breakdown.
          </p>
        </div>

        <div className="relative w-full sm:w-72 shrink-0">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search invoice number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="db-input !pl-9"
          />
        </div>
      </div>

      <div className="db-card !p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={6} cols={6} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="db-table min-w-[650px]">
              <thead>
                <tr>
                  <th className="db-th">Sale ID</th>
                  <th className="db-th">Date</th>
                  <th className="db-th">Customer</th>
                  <th className="db-th">Payment</th>
                  <th className="db-th text-right">Total (£)</th>
                  <th className="db-th text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState
                        title="No sales matching criteria"
                        description="Try adjusting your invoice search query."
                        actionLabel="Clear Search"
                        onAction={() => setSearch("")}
                      />
                    </td>
                  </tr>
                ) : (
                  sales.map((sale) => (
                    <tr key={sale.id} className="db-tr-hover">
                      <td className="db-td font-mono font-bold text-ink">
                        {sale.invoice_number ?? `#${sale.id.slice(0, 8)}`}
                      </td>
                      <td className="db-td text-muted-foreground">
                        {new Date(sale.created_at).toLocaleString("en-GB", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="db-td font-medium text-foreground">
                        {(sale.customers as { name: string } | null)?.name || "Walk-in Customer"}
                      </td>
                      <td className="db-td">
                        <span className="db-badge bg-muted text-muted-foreground capitalize">
                          {sale.payment_method?.replace("_", " ") || "Cash"}
                        </span>
                      </td>
                      <td className="db-td text-right font-extrabold text-ink tabular-nums">
                        {formatGBP(sale.total_pence / 100)}
                      </td>
                      <td className="db-td text-right">
                        <button
                          onClick={() => handleOpenInvoice(sale.id)}
                          disabled={loadingInvoiceId === sale.id}
                          aria-label={`View receipt for sale ${sale.invoice_number}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted hover:bg-border text-foreground font-bold text-[11px] transition-colors disabled:opacity-60 cursor-pointer"
                        >
                          {loadingInvoiceId === sale.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <FileText className="w-3 h-3" />
                          )}
                          Receipt
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Suspense fallback={null}>
        {selectedInvoice && (
          <InvoiceModal data={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
        )}
      </Suspense>
    </div>
  );
}
