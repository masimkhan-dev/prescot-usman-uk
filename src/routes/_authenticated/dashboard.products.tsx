import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, lazy, Suspense } from "react";
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
import { useDebounce } from "@/hooks/use-debounce";
import { toastSuccess, toastError } from "@/lib/toast";
import { PageHelpButton, ContextTip } from "@/components/dashboard/PageHelpButton";
import { TableSkeleton } from "@/components/dashboard/TableSkeleton";
import { EmptyState } from "@/components/dashboard/EmptyState";
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
  FileSpreadsheet,
  Tag,
} from "lucide-react";

// Lazy load heavy components
const OpeningStockSummary = lazy(() =>
  import("@/components/dashboard/OpeningStockSummary").then((m) => ({
    default: m.OpeningStockSummary,
  }))
);
const CSVImportModal = lazy(() =>
  import("@/components/dashboard/CSVImportModal").then((m) => ({
    default: m.CSVImportModal,
  }))
);
const ProductLabelModal = lazy(() =>
  import("@/components/dashboard/ProductLabelModal").then((m) => ({
    default: m.ProductLabelModal,
  }))
);

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
  const debouncedSearch = useDebounce(searchQuery, 250);
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
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [labelProduct, setLabelProduct] = useState<{
    id: string;
    name: string;
    category: string;
    sku: string | null;
    sale_price_pence: number;
    barcode?: string | null;
  } | null>(null);

  const { data, isLoading, error: queryError } = useQuery({
    queryKey: ["products", debouncedSearch, page],
    queryFn: async () => {
      try {
        const res = await listFn({ data: { search: debouncedSearch, page, limit: 50 } });
        return res;
      } catch (err) {
        console.error("Failed to fetch products:", err);
        throw err;
      }
    },
    staleTime: 1000 * 30, // 30s caching
  });

  const { data: movementsData } = useQuery({
    queryKey: ["stock-movements", historyFor?.id],
    queryFn: () => (historyFor ? listMovementsFn({ data: { product_id: historyFor.id } }) : null),
    enabled: !!historyFor,
    staleTime: 1000 * 30,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toastError("Item Name is required");
      return;
    }
    if (!form.category.trim()) {
      toastError("Category is required");
      return;
    }

    const costVal = parseFloat(form.cost_price_pounds);
    const saleVal = parseFloat(form.sale_price_pounds);

    if (isNaN(costVal) || costVal < 0) {
      toastError("Cost Price must be a valid non-negative number (£)");
      return;
    }
    if (isNaN(saleVal) || saleVal < 0) {
      toastError("Retail Sale Price must be a valid non-negative number (£)");
      return;
    }

    setSubmitting(true);
    const costPence = Math.round(costVal * 100);
    const salePence = Math.round(saleVal * 100);

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
      toastSuccess(editing ? "Product updated successfully!" : "Product saved successfully!");
      setForm({ ...emptyProduct });
      setEditing(false);
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({ queryKey: ["active-products"] });
      await queryClient.invalidateQueries({ queryKey: ["opening-stock-summary"] });
    } catch (err: unknown) {
      console.error("Save product error:", err);
      toastError(err, "Failed to save product");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(id: string) {
    if (!confirm("Deactivate this inventory product? (It will be hidden from POS register)"))
      return;
    try {
      await deactivateFn({ data: { id } });
      toastSuccess("Product deactivated");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (err: unknown) {
      toastError(err, "Failed to deactivate product");
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
      toastSuccess(
        `Stock adjusted! Ref #${res.adj_number} (${res.qty_before} → ${res.qty_after})`
      );
      setAdjustFor(null);
      setAdjDelta(0);
      setAdjNote("");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["active-products"] });
      queryClient.invalidateQueries({ queryKey: ["opening-stock-summary"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
    } catch (err: unknown) {
      toastError(err, "Stock adjustment failed");
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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-[#0F172A]">Products & Parts Inventory</h1>
            <PageHelpButton
              pageTitle="Inventory"
              pageKey="inventory"
              steps={[
                "Add products or repair parts using the form below.",
                "Use Opening Stock for stock already in the shop.",
                "New stock should normally come through purchases/receiving.",
                "Use Stock Adjustment only for manual corrections.",
              ]}
              firstTimeTip="Tip: Add existing stock using Opening Stock, or receive new stock via Purchase Orders."
            />
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manage store products, repair replacement parts, barcodes, stock levels & warranty terms.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setImportModalOpen(true)}
          className="btn-primary !py-2.5 !px-4 !text-xs inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4" /> Import Opening Stock
        </button>
      </div>

      {/* Opening Stock Audit Summary Widget */}
      <Suspense fallback={<TableSkeleton rows={2} cols={4} />}>
        <OpeningStockSummary />
      </Suspense>

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
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Internal SKU Code
            </label>
            <input
              type="text"
              placeholder={editing ? "e.g. ACC-000001" : "[ Auto-generated when saved ]"}
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-[#E11D48] outline-none"
            />
            <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">
              {editing ? "Unique internal product SKU." : "Leave blank to auto-generate SKU."}
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Manufacturer Barcode (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. 5012345678901"
              value={form.barcode}
              onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-[#E11D48] outline-none"
            />
            <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">
              Scan or enter barcode printed on product. Leave blank if no barcode.
            </span>
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
              {editing ? "Current Stock Qty" : "Opening Stock Quantity"}{" "}
              <ContextTip text="Stock already present inside shop before using system." />
              <span className="text-red-500">*</span>
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
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Low Stock Warning Limit
            </label>
            <input
              type="number"
              placeholder="5"
              value={form.low_stock_threshold}
              onChange={(e) => setForm({ ...form, low_stock_threshold: Number(e.target.value) })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-[#E11D48] outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Warranty (Days)
              <ContextTip text="Enter warranty offered for this specific item. Leave 0 if no warranty." />
            </label>
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
              className="btn-outline !py-2 !px-4 !text-xs cursor-pointer"
            >
              Cancel Edit
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary !py-2 !px-5 !text-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search products by name, category, SKU, or barcode..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E11D48]/30 focus:border-[#E11D48]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: "all", label: "All Items" },
            { id: "product", label: "Retail Products" },
            { id: "part", label: "Repair Parts" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTypeFilter(t.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                typeFilter === t.id
                  ? "bg-[#E11D48] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <TableSkeleton rows={6} cols={8} />
        </div>
      ) : queryError ? (
        <div className="p-4 text-red-600 bg-red-50 rounded-xl text-xs font-bold border border-red-200">
          Failed to load inventory products.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Item Details</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">SKU / Barcode</th>
                  <th className="py-3 px-4 text-right">Cost</th>
                  <th className="py-3 px-4 text-right">Retail</th>
                  <th className="py-3 px-4 text-center">Stock</th>
                  <th className="py-3 px-4 text-center">Warranty</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <EmptyState
                        title="No products found"
                        description="Try adjusting your search query or inventory type filter."
                        actionLabel="Clear Search"
                        onAction={() => setSearchQuery("")}
                      />
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => {
                    const isLow = p.stock_quantity <= (p.low_stock_threshold ?? 5);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{p.name}</div>
                          <div className="text-[10px] text-slate-400 capitalize">{p.type}</div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-600">{p.category}</td>
                        <td className="py-3 px-4 font-mono text-[11px]">
                          <span className="text-slate-900 font-bold">{p.sku || "—"}</span>
                          {p.barcode && (
                            <span className="text-slate-400 block text-[10px]">{p.barcode}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-slate-500">
                          {formatGBP(p.cost_price_pence / 100)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {formatGBP(p.sale_price_pence / 100)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold font-mono ${
                              isLow
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {p.stock_quantity}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-slate-500 font-semibold">
                          {p.warranty_days ? `${p.warranty_days}d` : "None"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setLabelProduct(p)}
                              title="Print Barcode / Price Label"
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
                            >
                              <Tag className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setAdjustFor({ id: p.id, name: p.name })}
                              title="Adjust Stock Quantity"
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
                            >
                              <PackagePlus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setHistoryFor({ id: p.id, name: p.name })}
                              title="View Stock Movement Audit History"
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditing(true);
                                setForm({
                                  id: p.id,
                                  name: p.name,
                                  category: p.category,
                                  sku: p.sku || "",
                                  barcode: p.barcode || "",
                                  type: p.type as any,
                                  cost_price_pounds: (p.cost_price_pence / 100).toString(),
                                  sale_price_pounds: (p.sale_price_pence / 100).toString(),
                                  stock_quantity: p.stock_quantity,
                                  low_stock_threshold: p.low_stock_threshold || 5,
                                  warranty_days: p.warranty_days || 0,
                                  status: p.status as any,
                                });
                              }}
                              title="Edit Item"
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeactivate(p.id)}
                              title="Deactivate Product"
                              className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && data.total > 50 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500">
              <span>
                Showing {page * 50 + 1}–{Math.min((page + 1) * 50, data.total)} of {data.total}{" "}
                items
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={(page + 1) * 50 >= data.total}
                  className="px-3 py-1 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Adjust Stock Modal */}
      {adjustFor && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleAdjustSubmit}
            className="bg-white border border-slate-200 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900">
                Adjust Stock: {adjustFor.name}
              </h3>
              <button
                type="button"
                onClick={() => setAdjustFor(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Quantity Change (+ to Add, - to Deduct)
              </label>
              <input
                type="number"
                value={adjDelta}
                onChange={(e) => setAdjDelta(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-extrabold focus:border-[#E11D48] outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Adjustment Reason
              </label>
              <select
                value={adjReason}
                onChange={(e) => setAdjReason(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-[#E11D48] outline-none bg-white"
              >
                <option value="adjustment">Manual Correction / Count</option>
                <option value="damaged">Damaged / Broken Stock</option>
                <option value="return">Customer Return</option>
                <option value="purchase">Opening Stock Addition</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Audit Note (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Stock audit variance"
                value={adjNote}
                onChange={(e) => setAdjNote(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium focus:border-[#E11D48] outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdjustFor(null)}
                className="btn-outline !py-2 !px-4 !text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={adjusting || adjDelta === 0}
                className="btn-primary !py-2 !px-4 !text-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {adjusting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Save Adjustment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Audit History Modal */}
      {historyFor && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900">
                Movement Log: {historyFor.name}
              </h3>
              <button
                type="button"
                onClick={() => setHistoryFor(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2 text-xs">
              {!movementsData ? (
                <div className="text-center py-6 text-slate-400">Loading audit history...</div>
              ) : (movementsData.rows ?? []).length === 0 ? (
                <div className="text-center py-6 text-slate-400">
                  No movement records logged for this item yet.
                </div>
              ) : (
                (movementsData.rows ?? []).map((m: any) => (
                  <div
                    key={m.id}
                    className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <div className="font-extrabold text-slate-900 capitalize">
                        {m.reason} ({m.quantity_change > 0 ? `+${m.quantity_change}` : m.quantity_change})
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(m.created_at).toLocaleString()}
                        {m.reference_number && ` • Ref #${m.reference_number}`}
                      </div>
                      {m.notes && (
                        <div className="text-[11px] text-slate-600 mt-0.5">{m.notes}</div>
                      )}
                    </div>
                    <div className="font-mono font-bold text-slate-700 text-xs">
                      {m.quantity_before} → {m.quantity_after}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* LAZY LOADED MODALS */}
      <Suspense fallback={null}>
        {importModalOpen && (
          <CSVImportModal
            onClose={() => setImportModalOpen(false)}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["products"] });
              queryClient.invalidateQueries({ queryKey: ["active-products"] });
              queryClient.invalidateQueries({ queryKey: ["opening-stock-summary"] });
            }}
          />
        )}

        {labelProduct && (
          <ProductLabelModal
            onClose={() => setLabelProduct(null)}
            product={labelProduct}
          />
        )}
      </Suspense>
    </div>
  );
}
