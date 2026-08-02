import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listSales, getSaleDetail } from "@/lib/sales.functions";
import { CreditCard, Search, FileText } from "lucide-react";
import { InvoiceModal, type InvoiceData } from "@/components/dashboard/Invoice";

export const Route = createFileRoute("/_authenticated/dashboard/sales")({
  component: DashboardSalesPage,
});

function DashboardSalesPage() {
  const [search, setSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["sales", search],
    queryFn: () => listSales({ data: { search } }),
  });

  const handleOpenInvoice = async (saleId: string) => {
    try {
      const detail = await getSaleDetail({ data: { id: saleId } });
      const inv: InvoiceData = {
        kind: "sale",
        number: `INV-${detail.id.slice(0, 8).toUpperCase()}`,
        date: detail.created_at,
        customer: detail.customers,
        lines: (detail.sale_items || []).map((i: any) => ({
          name: i.product_name,
          quantity: i.quantity,
          unit_price: i.unit_price,
          total: i.total,
        })),
        discount: detail.discount || 0,
        total: detail.total,
        paid: true,
        paymentMethod: detail.payment_method,
        warrantyUntil: detail.warranty_until,
      };
      setSelectedInvoice(inv);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-[#E11D48]" /> Sales Transaction History
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete retail checkout receipts, payment methods, and transaction breakdown.
          </p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search Sale ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#E11D48] outline-none"
          />
        </div>
      </div>

      <div className="card-flat !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider">
                <th className="py-3 px-4">Sale ID</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4 text-right">Total (£)</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Loading sales records...
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No sales recorded matching criteria.
                  </td>
                </tr>
              ) : (
                sales.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#0F172A]">
                      #{s.id.slice(0, 8)}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(s.created_at).toLocaleString("en-GB", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {s.customers?.name || "Walk-in Retail Customer"}
                    </td>
                    <td className="py-3 px-4">
                      <span className="capitalize px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-700 text-[10px]">
                        {s.payment_method?.replace("_", " ") || "Cash"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-[#0F172A] tabular-nums">
                      £{Number(s.total || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenInvoice(s.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" /> Receipt
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedInvoice && (
        <InvoiceModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
}

