import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listProducts,
  saveProduct,
  deactivateProduct,
  adjustStock,
  listStockMovements,
} from "@/lib/products.functions";
import { formatGBP } from "@/lib/utils";
import {
  Loader2,
  Plus,
  Trash2,
  Edit2,
  History,
  PackagePlus,
  X,
  Search,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/products")({
  component: ProductsPage,
});

const emptyProduct = {
  id: "",
  name: "",
  category: "Accessories",
  sku: "",
  barcode: "",
  type: "product" as "product" | "part" | "service",
  cost_price_pounds: "",
  sale_price_pounds: "",
  stock_quantity: 0,
  low_stock_threshold: 5,
  warranty_days: 0,
  status: "active" as "active" | "inactive",
};

function ProductsPage() {
  const queryClient = useQueryClient();
  const listFn = useServerFn(listProducts);
  const saveFn = useServerFn(saveProduct);
  const deactivateFn = useServerFn(deactivateProduct);
  const adjustFn = useServerFn(adjustStock);
  const listMovementsFn = useServerFn(listStockMovements);

  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [form, setForm] = useState({ ...emptyProduct });
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | "product" | "part">("all");
  const [adjustFor, setAdjustFor] = useState<{ id: string; name: string } | null>(null);
  const [adjDelta, setAdjDelta] = useState(0);
  const [adjReason, setAdjReason] = useState("adjustment");
  const [adjNote, setAdjNote] = useState("");
  const [historyFor, setHistoryFor] = useState<{ id: string; name: string } | null>(null);
  const [adjusting, setAdjusting] = useState(false);

  const { data, isLoading, error: queryError } = useQuery({
    queryKey: ["products", searchQuery, page],
    queryFn: async () => {
      try {
        const res = await listFn({ data: { search: searchQuery, page, limit: 50 } });
        return res;
      } catch (err) {
        console.error("Failed to fetch products:", err);
        throw err;
      }
    },
  });

  const { data: movementsData } = useQuery({
    queryKey: ["stock-movements", historyFor?.id],
    queryFn: () => (historyFor ? listMovementsFn({ data: { product_id: historyFor.id } }) : null),
    enabled: !!historyFor,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Item Name is required");
      return;
    }
    if (!form.category.trim()) {
      toast.error("Category is required");
      return;
    }
    
    setSubmitting(true);
    const costPence = Math.round((parseFloat(form.cost_price_pounds) || 0) * 100);
    const salePence = Math.round((parseFloat(form.sale_price_pounds) || 0) * 100);

    const payload = {
      id: form.id ? form.id : undefined,
      name: form.name.trim(),
      category: form.category.trim(),
      sku: form.sku?.trim() || null,
      barcode: form.barcode?.trim() || null,
      type: form.type,
      cost_price_pence: costPence,
      sale_price_pence: salePence,
      stock_quantity: Number(form.stock_quantity) || 0,
      low_stock_threshold: Number(form.low_stock_threshold) || 0,
      warranty_days: Number(form.warranty_days) || 0,
      status: form.status,
    };

    try {
      await saveFn({ data: payload });
      toast.success(editing ? "Product updated successfully!" : "Product saved successfully!");
      setForm({ ...emptyProduct });
      setEditing(false);
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.refetchQueries({ queryKey: ["products"] });
    } catch (err: unknown) {
      console.error("Save product error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to save product");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(id: string) {
    if (!confirm("Deactivate this inventory product? (It will be hidden from POS register)"))
      return;
    try {
      await deactivateFn({ data: { id } });
      toast.success("Product deactivated");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to deactivate product");
    }
  }

  async function handleAdjustSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!adjustFor || adjDelta === 0) return;
    setAdjusting(true);
    try {
      const res = await adjustFn({
        data: {
          product_id: adjustFor.id,
          qty_change: adjDelta,
          reason: adjReason,
          note: adjNote || null,
        },
      });
      toast.success(
        `Stock adjusted! Ref #${res.adj_number} (${res.qty_before} → ${res.qty_after})`,
      );
      setAdjustFor(null);
      setAdjDelta(0);
      setAdjNote("");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Adjustment failed");
    } finally {
      setAdjusting(false);
    }
  }

  const filtered = useMemo(() => {
    return (data?.rows ?? []).filter((p) => {
      const matchesType = typeFilter === "all" || p.type === typeFilter;
      return matchesType;
    });
  }, [data?.rows, typeFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A]">Products & Parts Inventory</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manage store products, repair replacement parts, barcodes, stock levels & warranty
            terms.
          </p>
        </div>
      </div>

      {/* Add / Edit Product Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3"
      >
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
          {editing ? "Edit Inventory Item" : "Add New Inventory Item"}
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Item Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. iPhone 14 Screen Replacement"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-[#E11D48] outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Screens / Accessories"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-[#E11D48] outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Inventory Type <span className="text-red-500">*</span>
            </label>
            <select
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value as "product" | "part" | "service" })
              }
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-[#E11D48] outline-none bg-white"
            >
              <option value="product">Retail Product (For Sale)</option>
              <option value="part">Repair Component Part</option>
              <option value="service">Service / Labour Item</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">SKU Code</label>
            <input
              type="text"
              placeholder="SKU-12345"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-[#E11D48] outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Barcode / EAN</label>
            <input
              type="text"
              placeholder="7388494995"
              value={form.barcode}
              onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-[#E11D48] outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Cost Price (£) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={form.cost_price_pounds}
              onChange={(e) => setForm({ ...form, cost_price_pounds: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold focus:border-[#E11D48] outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Retail Sale Price (£) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={form.sale_price_pounds}
              onChange={(e) => setForm({ ...form, sale_price_pounds: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold focus:border-[#E11D48] outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Current Stock Qty <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              placeholder="0"
              value={form.stock_quantity}
              onChange={(e) => setForm({ ...form, stock_quantity: Number(e.target.value) })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold focus:border-[#E11D48] outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Low Stock Warning Limit</label>
            <input
              type="number"
              placeholder="5"
              value={form.low_stock_threshold}
              onChange={(e) => setForm({ ...form, low_stock_threshold: Number(e.target.value) })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-[#E11D48] outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Warranty (Days)</label>
            <input
              type="number"
              placeholder="0"
              value={form.warranty_days}
              onChange={(e) => setForm({ ...form, warranty_days: Number(e.target.value) })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-[#E11D48] outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          {editing && (
            <button
              type="button"
              onClick={() => {
                setForm({ ...emptyProduct });
                setEditing(false);
              }}
              className="btn-outline !py-2 !px-4 !text-xs"
            >
              Cancel Edit
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary !py-2 !px-5 !text-xs disabled:opacity-50 flex items-center gap-1.5"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            {editing ? "Update Product Item" : "Save New Product"}
          </button>
        </div>
      </form>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by name, SKU or barcode…"
            className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs font-semibold focus:border-[#E11D48] outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {(["all", "product", "part"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                typeFilter === t
                  ? "bg-[#0F172A] text-white border-[#0F172A]"
                  : "border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {t === "all" ? "All Items" : t === "product" ? "Products Only" : "Repair Parts Only"}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#E11D48]" />
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-extrabold uppercase tracking-wider border-b border-slate-200 text-[10px]">
                <tr>
                  <th className="px-4 py-3">Item Name & SKU</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Barcode</th>
                  <th className="px-4 py-3">Cost / Retail</th>
                  <th className="px-4 py-3">Stock Level</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => {
                  const isLow = p.stock_quantity <= p.low_stock_threshold;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-bold text-[#0F172A]">
                        <div>{p.name}</div>
                        {p.sku && (
                          <div className="text-[10px] text-slate-400 font-mono font-normal">
                            SKU: {p.sku}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            p.type === "part"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {p.type === "part" ? "Part" : "Product"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">{p.barcode || "—"}</td>
                      <td className="px-4 py-3 font-mono">
                        <div className="text-slate-500 text-[10px]">
                          Cost: {formatGBP(p.cost_price_pence / 100)}
                        </div>
                        <div className="font-extrabold text-slate-900">
                          Sale: {formatGBP(p.sale_price_pence / 100)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-lg font-bold text-xs inline-flex items-center gap-1 ${
                            isLow ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {isLow && <AlertTriangle className="w-3 h-3" />}
                          {p.stock_quantity} units
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => setAdjustFor({ id: p.id, name: p.name })}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] font-bold text-slate-700 inline-flex items-center gap-1"
                        >
                          <PackagePlus className="w-3 h-3" /> Adjust
                        </button>
                        <button
                          type="button"
                          onClick={() => setHistoryFor({ id: p.id, name: p.name })}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] font-bold text-slate-700 inline-flex items-center gap-1"
                        >
                          <History className="w-3 h-3" /> Logs
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setForm({
                              id: p.id,
                              name: p.name,
                              category: p.category,
                              sku: p.sku || "",
                              barcode: p.barcode || "",
                              type: p.type as "product" | "part" | "service",
                              cost_price_pounds: (p.cost_price_pence / 100).toString(),
                              sale_price_pounds: (p.sale_price_pence / 100).toString(),
                              stock_quantity: p.stock_quantity,
                              low_stock_threshold: p.low_stock_threshold,
                              warranty_days: p.warranty_days,
                              status: p.status as "active" | "inactive",
                            });
                            setEditing(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-900"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeactivate(p.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {adjustFor && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <form
            onSubmit={handleAdjustSubmit}
            className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-xl"
          >
            <h3 className="font-extrabold text-slate-900 text-sm">
              Stock Adjustment — {adjustFor.name}
            </h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Quantity Change (+ or -)
              </label>
              <input
                type="number"
                required
                value={adjDelta}
                onChange={(e) => setAdjDelta(Number(e.target.value))}
                placeholder="e.g. +5 or -2"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:border-[#E11D48]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Adjustment Reason
              </label>
              <select
                value={adjReason}
                onChange={(e) => setAdjReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:border-[#E11D48] bg-white"
              >
                <option value="adjustment">Stock Count Adjustment</option>
                <option value="damage">Damaged / Broken Stock</option>
                <option value="opening_count">Opening Inventory Count</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Audit Note</label>
              <input
                type="text"
                placeholder="Note / reference"
                value={adjNote}
                onChange={(e) => setAdjNote(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs outline-none focus:border-[#E11D48]"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setAdjustFor(null)}
                className="btn-outline !py-1.5 !px-3 !text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={adjusting || adjDelta === 0}
                className="btn-primary !py-1.5 !px-4 !text-xs disabled:opacity-60 flex items-center gap-1.5"
              >
                {adjusting && <Loader2 className="w-3 h-3 animate-spin" />}
                Confirm Adjustment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Movement Audit Log Modal */}
      {historyFor && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-lg w-full max-h-[80vh] overflow-auto space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm">
                Stock Audit History — {historyFor.name}
              </h3>
              <button
                type="button"
                onClick={() => setHistoryFor(null)}
                className="p-1 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-extrabold">
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Type</th>
                  <th className="text-right py-2">Change</th>
                  <th className="text-right py-2">Before → After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movementsData?.rows.map((m) => (
                  <tr key={m.id}>
                    <td className="py-2 text-slate-500 font-mono">
                      {new Date(m.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2 font-bold text-slate-900">{m.movement_type}</td>
                    <td
                      className={`py-2 text-right font-extrabold font-mono ${m.qty_change > 0 ? "text-emerald-600" : "text-rose-600"}`}
                    >
                      {m.qty_change > 0 ? `+${m.qty_change}` : m.qty_change}
                    </td>
                    <td className="py-2 text-right font-mono text-slate-600">
                      {m.qty_before} → {m.qty_after}
                    </td>
                  </tr>
                ))}
                {movementsData?.rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400 font-medium">
                      No stock movements recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
