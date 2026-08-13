import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAllActiveProducts } from "@/lib/products.functions";
import { searchCustomers } from "@/lib/customers.functions";
import { completeSale } from "@/lib/sales.functions";
import { getOpenShift } from "@/lib/shifts.functions";
import { formatGBP } from "@/lib/utils";
import {
  Loader2,
  Trash2,
  ShoppingCart,
  Search,
  Minus,
  Plus,
  CreditCard,
  Banknote,
  Building2,
  AlertTriangle,
  Barcode,
  X,
  User,
  UserCheck,
  Tag,
  History,
  Lock,
  Unlock,
  Zap,
} from "lucide-react";
import { lazy, Suspense } from "react";
import { toast } from "sonner";
import { toastSuccess, toastError, toastWarning } from "@/lib/toast";
import { PageHelpButton } from "@/components/dashboard/PageHelpButton";
import { TableSkeleton } from "@/components/dashboard/TableSkeleton";
import type { InvoiceData } from "@/components/dashboard/Invoice";
import type { ReconciliationData } from "@/components/dashboard/ShiftModals";

import { InvoiceModal } from "@/components/dashboard/Invoice";
import { RepairA4InvoiceModal } from "@/components/dashboard/RepairA4InvoiceModal";
import { CreateRepairInvoiceModal } from "@/components/dashboard/CreateRepairInvoiceModal";
const OpenShiftModal = lazy(() =>
  import("@/components/dashboard/ShiftModals").then((m) => ({ default: m.OpenShiftModal })),
);
const CloseShiftModal = lazy(() =>
  import("@/components/dashboard/ShiftModals").then((m) => ({ default: m.CloseShiftModal })),
);
const ShiftReconciliationResultModal = lazy(() =>
  import("@/components/dashboard/ShiftModals").then((m) => ({
    default: m.ShiftReconciliationResultModal,
  })),
);
const ShiftHistoryModal = lazy(() =>
  import("@/components/dashboard/ShiftModals").then((m) => ({ default: m.ShiftHistoryModal })),
);

export const Route = createFileRoute("/_authenticated/dashboard/pos")({
  component: POSPage,
});

interface CartItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price_pence: number;
  original_price_pence: number;
  discount_pence: number;
  line_total_pence: number;
  stock: number;
}

function POSPage() {
  const queryClient = useQueryClient();
  const listProductsFn = useServerFn(listAllActiveProducts);
  const searchCustomersFn = useServerFn(searchCustomers);
  const completeSaleFn = useServerFn(completeSale);
  const getOpenShiftFn = useServerFn(getOpenShift);

  // Active products query
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["active-products"],
    queryFn: () => listProductsFn(),
  });

  // Open shift query
  const { data: openShift } = useQuery({
    queryKey: ["open-shift"],
    queryFn: () => getOpenShiftFn(),
  });

  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<{
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
  } | null>(null);
  const [customerSearchResults, setCustomerSearchResults] = useState<
    Array<{ id: string; name: string; phone?: string | null; email?: string | null }>
  >([]);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "bank_transfer">("cash");
  const [discountPounds, setDiscountPounds] = useState<number>(0);
  const [amountTenderedPounds, setAmountTenderedPounds] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);

  // Quick Repair Invoice Modal state
  const [showCreateRepairModal, setShowCreateRepairModal] = useState(false);
  const [quickRepairInvoice, setQuickRepairInvoice] = useState<any | null>(null);

  // Shift Modal states
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [showShiftHistoryModal, setShowShiftHistoryModal] = useState(false);
  const [reconciliationResult, setReconciliationResult] = useState<ReconciliationData | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  // Customer search debounced
  useEffect(() => {
    if (!customerSearch.trim() || customerSearch.length < 2) {
      setCustomerSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await searchCustomersFn({ data: { q: customerSearch.trim() } });
        setCustomerSearchResults(results);
      } catch (err) {
        console.error(err);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [customerSearch, searchCustomersFn]);

  // Derived category list
  const categories = useMemo(() => {
    if (!products) return ["All"];
    const cats = new Set<string>();
    products.forEach((p) => {
      if (p.category?.trim()) cats.add(p.category.trim());
    });
    return ["All", ...Array.from(cats).sort()];
  }, [products]);

  // Filtered products based on search & category
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    const q = query.trim().toLowerCase();

    return products.filter((p) => {
      const matchesCategory =
        selectedCategory === "All" || p.category?.toLowerCase() === selectedCategory.toLowerCase();

      if (!q) return matchesCategory;

      const matchesSearch =
        p.name.toLowerCase().includes(q) ||
        (p.sku || "").toLowerCase().includes(q) ||
        (p.barcode || "").toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [products, query, selectedCategory]);

  function addToCart(product: {
    id: string;
    name: string;
    sale_price_pence: number;
    stock_quantity: number;
    type?: string;
  }) {
    const isService = product.type === "service";

    if (!isService && product.stock_quantity <= 0) {
      toast.error(`"${product.name}" is out of stock`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((c) => c.product_id === product.id);
      if (existing) {
        if (!isService && existing.quantity >= product.stock_quantity) {
          toast.error(`Cannot add more than ${product.stock_quantity} available units`);
          return prev;
        }
        return prev.map((c) =>
          c.product_id === product.id
            ? {
                ...c,
                quantity: c.quantity + 1,
                line_total_pence: (c.quantity + 1) * c.unit_price_pence - c.discount_pence,
              }
            : c,
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          unit_price_pence: product.sale_price_pence,
          original_price_pence: product.sale_price_pence,
          discount_pence: 0,
          line_total_pence: product.sale_price_pence,
          stock: product.stock_quantity,
        },
      ];
    });
  }

  function changeQty(id: string, delta: number) {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.product_id !== id) return c;
          const newQty = Math.min(Math.max(c.quantity + delta, 0), c.stock);
          const lineTotal = newQty * c.unit_price_pence - c.discount_pence;
          return { ...c, quantity: newQty, line_total_pence: Math.max(lineTotal, 0) };
        })
        .filter((c) => c.quantity > 0),
    );
  }

  function updateQty(id: string, targetQty: number) {
    setCart((prev) =>
      prev.map((c) => {
        if (c.product_id !== id) return c;
        if (targetQty > c.stock) {
          toast.error(`Only ${c.stock} units available in stock`);
        }
        const validQty = Math.min(Math.max(targetQty, 0), c.stock);
        const lineTotal = validQty * c.unit_price_pence - c.discount_pence;
        return { ...c, quantity: validQty, line_total_pence: Math.max(lineTotal, 0) };
      }),
    );
  }

  function updateUnitPrice(id: string, newUnitPricePounds: number) {
    setCart((prev) =>
      prev.map((c) => {
        if (c.product_id !== id) return c;
        const validPounds = Math.max(newUnitPricePounds, 0);
        const newPence = Math.round(validPounds * 100);
        const lineTotal = c.quantity * newPence - c.discount_pence;
        return {
          ...c,
          unit_price_pence: newPence,
          line_total_pence: Math.max(lineTotal, 0),
        };
      }),
    );
  }

  function resetUnitPrice(id: string) {
    setCart((prev) =>
      prev.map((c) => {
        if (c.product_id !== id) return c;
        const lineTotal = c.quantity * c.original_price_pence - c.discount_pence;
        return {
          ...c,
          unit_price_pence: c.original_price_pence,
          line_total_pence: Math.max(lineTotal, 0),
        };
      }),
    );
  }

  function removeFromCart(id: string) {
    setCart((prev) => prev.filter((c) => c.product_id !== id));
  }

  function handleSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      const rawQuery = query.trim();
      if (!rawQuery) return;

      const normQuery = rawQuery.toLowerCase();
      const allProds = products || [];

      // 1. Exact Manufacturer Barcode match
      let matched = allProds.find((p) => p.barcode && p.barcode.trim().toLowerCase() === normQuery);

      // 2. Exact Internal SKU match
      if (!matched) {
        matched = allProds.find((p) => p.sku && p.sku.trim().toLowerCase() === normQuery);
      }

      // 3. Fallback search: single candidate in filtered list
      if (!matched && filteredProducts.length === 1) {
        matched = filteredProducts[0];
      }

      if (matched) {
        addToCart(matched);
        setQuery("");
        setTimeout(() => searchRef.current?.focus(), 10);
      } else if (filteredProducts.length === 0) {
        toast.error(`No product found for barcode/SKU "${rawQuery}"`);
      }
    }
  }

  // All financial arithmetic in integer pence
  const subtotalPence = cart.reduce((acc, item) => acc + item.line_total_pence, 0);
  const discountPence = Math.round(discountPounds * 100);
  const totalPence = Math.max(subtotalPence - discountPence, 0);

  const amountTenderedPence = amountTenderedPounds
    ? Math.round(parseFloat(amountTenderedPounds) * 100)
    : null;
  const changePence =
    paymentMethod === "cash" && amountTenderedPence !== null
      ? Math.max(amountTenderedPence - totalPence, 0)
      : 0;

  const isCashSaleWithoutShift = paymentMethod === "cash" && !openShift;

  async function handleCheckout() {
    if (cart.length === 0) return;
    if (isCashSaleWithoutShift) {
      toast.error("Please Open Till before completing a cash sale");
      setShowOpenShiftModal(true);
      return;
    }
    if (
      paymentMethod === "cash" &&
      amountTenderedPence !== null &&
      amountTenderedPence < totalPence
    ) {
      toast.error(
        `Tendered amount (${formatGBP(amountTenderedPence / 100)}) is less than total (${formatGBP(totalPence / 100)})`,
      );
      return;
    }

    setSubmitting(true);
    // UUID v4 per checkout session prevents double-submission
    const idempotencyKey = crypto.randomUUID();

    try {
      const sale = await completeSaleFn({
        data: {
          idempotency_key: idempotencyKey,
          customer_id: selectedCustomer?.id || null,
          shift_id: openShift?.id || null,
          discount_pence: discountPence,
          payment_method: paymentMethod,
          amount_tendered_pence: paymentMethod === "cash" ? amountTenderedPence : null,
          items: cart.map((c) => ({
            product_id: c.product_id,
            quantity: c.quantity,
            unit_price_pence: c.unit_price_pence,
            discount_pence: c.discount_pence,
          })),
        },
      });

      toast.success(`Sale completed! Invoice #${sale.invoice_number}`);

      setInvoice({
        kind: "sale",
        number: sale.invoice_number,
        date: new Date().toLocaleString("en-GB"),
        customer: selectedCustomer
          ? {
              name: selectedCustomer.name,
              phone: selectedCustomer.phone,
              email: selectedCustomer.email,
            }
          : customerSearch.trim()
            ? { name: customerSearch.trim(), phone: null, email: null }
            : null,
        lines: cart.map((c) => ({
          name: c.product_name,
          quantity: c.quantity,
          unit_price: c.unit_price_pence / 100,
          total: c.line_total_pence / 100,
        })),
        subtotal: subtotalPence / 100,
        discount: discountPence / 100,
        total: totalPence / 100,
        paid: true,
        amountPaid:
          (paymentMethod === "cash" && amountTenderedPence
            ? Math.max(amountTenderedPence, totalPence)
            : totalPence) / 100,
        balanceDue: 0,
        paymentMethod: paymentMethod,
      });

      queryClient.invalidateQueries({ queryKey: ["active-products"] });
      queryClient.refetchQueries({ queryKey: ["active-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["open-shift"] });

      setCart([]);
      setDiscountPounds(0);
      setAmountTenderedPounds("");
      setSelectedCustomer(null);
      setCustomerSearch("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sale failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (productsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#E11D48]" />
      </div>
    );
  }

  const cartTotalItems = cart.reduce((a, c) => a + c.quantity, 0);

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-10">
      {/* Operational POS Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-[#0F172A] tracking-tight">POS Register</h1>
            <span className="bg-slate-100 text-slate-700 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border border-slate-200">
              Till #1
            </span>
            <PageHelpButton
              pageTitle="POS Register"
              pageKey="pos"
              steps={[
                "Search or scan an item to add it to the cart.",
                "Select customer if requested (or leave as Walk-in).",
                "Choose payment method (Cash, Card, Bank Transfer).",
                "Click Complete Sale to finalize and print receipt.",
              ]}
              note="Open Till before taking cash payments."
              firstTimeTip="Tip: Search products by text or scan barcode directly. Ensure till is open for cash transactions."
            />
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Sell products quickly by name, SKU or barcode scan
          </p>
        </div>

        {/* Till & Shift Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {openShift ? (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-xl text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div>
                <div className="font-extrabold text-emerald-950 text-[11px] leading-tight flex items-center gap-1">
                  Till Open
                </div>
                <div className="text-[10px] text-emerald-700 font-bold font-mono">
                  Float: {formatGBP(openShift.opening_float_pence / 100)}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-xl text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <div className="font-bold text-[11px]">Till Closed (Open till to start sales)</div>
            </div>
          )}

          {openShift ? (
            <button
              type="button"
              onClick={() => setShowCloseShiftModal(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100 text-xs font-extrabold flex items-center gap-1.5 transition-all"
            >
              <Lock className="w-3.5 h-3.5 text-amber-700" /> Close Till
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowOpenShiftModal(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Unlock className="w-3.5 h-3.5" /> Open Till
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowShiftHistoryModal(true)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 transition-all"
            title="View Shift History"
          >
            <History className="w-3.5 h-3.5 text-slate-500" /> History
          </button>

          <button
            type="button"
            onClick={() => setShowCreateRepairModal(true)}
            className="px-3.5 py-2 rounded-xl bg-brand hover:bg-brand/90 text-white text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" /> Quick Repair Invoice
          </button>
        </div>
      </div>

      {/* Main 2-Column POS Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
        {/* Left Column: Product Browser & Filters */}
        <div className="lg:col-span-7 2xl:col-span-8 space-y-3.5 min-w-0">
          {/* Prominent Search & Barcode Area */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleSearchKey}
                placeholder="Search products, SKU or scan barcode…"
                className="w-full rounded-xl border border-slate-300 pl-10 pr-20 py-2.5 text-xs font-semibold focus:border-[#E11D48] focus:ring-1 focus:ring-[#E11D48] outline-none transition-all min-h-[44px]"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      searchRef.current?.focus();
                    }}
                    className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <span
                  className="p-1.5 text-slate-400 bg-slate-100 rounded-md"
                  title="Barcode scanner active"
                >
                  <Barcode className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none text-xs">
              {categories.map((cat) => {
                const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-2 rounded-xl font-extrabold whitespace-nowrap transition-all text-xs min-h-[40px] cursor-pointer ${
                      isSelected
                        ? "bg-[#0F172A] text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredProducts.map((p) => {
              const isService = p.type === "service";
              const isOutOfStock = !isService && p.stock_quantity <= 0;
              const isLowStock = !isService && p.stock_quantity > 0 && p.stock_quantity <= 3;

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addToCart(p)}
                  disabled={isOutOfStock}
                  className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between min-h-[120px] group ${
                    isOutOfStock
                      ? "bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed"
                      : "bg-white border-slate-200 hover:border-[#E11D48] hover:shadow-md cursor-pointer active:scale-98"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-xs font-bold text-slate-900 line-clamp-2 leading-tight group-hover:text-[#E11D48] transition-colors">
                        {p.name}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1 truncate">
                      {p.sku ? `SKU: ${p.sku}` : p.category}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between mt-auto gap-1">
                    <span className="text-xs font-black text-slate-950 tabular-nums">
                      {formatGBP(p.sale_price_pence / 100)}
                    </span>
                    <span
                      className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md shrink-0 ${
                        isService
                          ? "bg-blue-100 text-blue-800"
                          : isOutOfStock
                            ? "bg-rose-100 text-rose-800"
                            : isLowStock
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {isService
                        ? "Service"
                        : isOutOfStock
                          ? "Out of stock"
                          : `Stock ${p.stock_quantity}`}
                    </span>
                  </div>
                </button>
              );
            })}

            {filteredProducts.length === 0 && (
              <div className="col-span-full py-16 text-center bg-white border border-slate-200 rounded-2xl p-6 space-y-2">
                <Search className="w-8 h-8 text-slate-300 mx-auto" />
                <div className="text-xs font-bold text-slate-800">No products found</div>
                <div className="text-[11px] text-slate-400">
                  No active products match "{query}" in {selectedCategory} category.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Sticky Cart & Checkout Panel */}
        <div className="lg:col-span-5 2xl:col-span-4 space-y-4 lg:sticky lg:top-4 min-w-0">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
            {/* Cart Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-[#E11D48]" />
                <h2 className="font-extrabold text-slate-900 text-sm">Current Sale</h2>
                <span className="bg-[#E11D48] text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                  {cartTotalItems} {cartTotalItems === 1 ? "item" : "items"}
                </span>
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-[11px] text-slate-400 hover:text-rose-600 font-bold transition-colors"
                >
                  Clear Basket
                </button>
              )}
            </div>

            {/* Customer Selector */}
            <div className="relative">
              <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center justify-between">
                <span>Customer</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  {selectedCustomer ? "Selected" : "Default: Walk-in"}
                </span>
              </label>

              {selectedCustomer ? (
                <div className="flex items-center justify-between p-2.5 bg-rose-50/50 border border-rose-200 rounded-xl text-xs">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#E11D48] shrink-0" />
                    <div>
                      <div className="font-bold text-slate-900">{selectedCustomer.name}</div>
                      {selectedCustomer.phone && (
                        <div className="text-[10px] text-slate-500">{selectedCustomer.phone}</div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCustomer(null)}
                    className="text-[11px] text-rose-600 font-bold hover:underline"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Walk-in Customer (type name or phone to search)…"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-[#E11D48] transition-all"
                  />
                </div>
              )}

              {customerSearchResults.length > 0 && !selectedCustomer && (
                <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                  {customerSearchResults.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(c);
                        setCustomerSearchResults([]);
                        setCustomerSearch("");
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 border-b border-slate-100 last:border-0 text-xs"
                    >
                      <div className="font-bold text-slate-900">{c.name}</div>
                      {c.phone && <div className="text-[10px] text-slate-500">{c.phone}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Items List */}
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {cart.map((item) => (
                <div
                  key={item.product_id}
                  className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="font-bold text-slate-900 truncate">{item.product_name}</div>
                    <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-500 font-mono">
                      <span>£</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={
                          item.unit_price_pence === 0
                            ? ""
                            : (item.unit_price_pence / 100).toString()
                        }
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          updateUnitPrice(item.product_id, isNaN(val) ? 0 : val);
                        }}
                        onBlur={(e) => {
                          if (!e.target.value || parseFloat(e.target.value) < 0) {
                            updateUnitPrice(item.product_id, item.original_price_pence / 100);
                          }
                        }}
                        className="w-16 px-1 py-0.5 font-mono text-xs border border-slate-300 rounded bg-white text-slate-900 font-semibold focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                        title="Click to edit unit price manually"
                      />
                      <span>each</span>
                      {item.original_price_pence !== item.unit_price_pence && (
                        <button
                          type="button"
                          onClick={() => resetUnitPrice(item.product_id)}
                          className="text-[9px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 px-1 py-0.5 rounded border border-amber-200 transition-colors ml-1"
                          title={`Reset to default price (${formatGBP(item.original_price_pence / 100)})`}
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center border border-slate-300 rounded-xl bg-white overflow-hidden shadow-xs">
                      <button
                        type="button"
                        onClick={() => changeQty(item.product_id, -1)}
                        className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 text-slate-700 border-r border-slate-200 transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={item.stock}
                        value={item.quantity === 0 ? "" : item.quantity}
                        onChange={(e) => {
                          const q = parseInt(e.target.value, 10);
                          updateQty(item.product_id, isNaN(q) ? 0 : q);
                        }}
                        onBlur={(e) => {
                          if (!e.target.value || parseInt(e.target.value, 10) <= 0) {
                            updateQty(item.product_id, 1);
                          }
                        }}
                        className="w-10 text-center font-black text-slate-900 outline-none text-xs bg-transparent py-0.5"
                      />
                      <button
                        type="button"
                        onClick={() => changeQty(item.product_id, 1)}
                        className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 text-slate-700 border-l border-slate-200 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="font-black text-slate-950 w-16 text-right font-mono">
                      {formatGBP(item.line_total_pence / 100)}
                    </span>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item.product_id)}
                      className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Empty Basket State */}
              {cart.length === 0 && (
                <div className="py-12 text-center space-y-2 border-2 border-dashed border-slate-200 rounded-2xl p-4 bg-slate-50/50">
                  <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto" />
                  <div className="text-xs font-extrabold text-slate-700">No items in this sale</div>
                  <div className="text-[11px] text-slate-400">
                    Scan a barcode or click a product from the left grid to begin.
                  </div>
                </div>
              )}
            </div>

            {/* Totals & Checkout Actions */}
            {cart.length > 0 && (
              <div className="border-t border-slate-100 pt-3.5 space-y-3.5">
                {/* Discount Input */}
                <div className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-[#E11D48]" /> Discount (£):
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discountPounds || ""}
                    onChange={(e) => setDiscountPounds(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-24 px-2 py-1 bg-white border border-slate-300 rounded-lg text-right font-bold text-slate-900 outline-none focus:border-[#E11D48]"
                  />
                </div>

                {/* Payment Method Toggle */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-600">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("cash")}
                      className={`p-2.5 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                        paymentMethod === "cash"
                          ? "bg-[#0F172A] text-white border-[#0F172A] shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <Banknote className="w-3.5 h-3.5 text-emerald-400" /> Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("card")}
                      className={`p-2.5 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                        paymentMethod === "card"
                          ? "bg-[#0F172A] text-white border-[#0F172A] shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5 text-sky-400" /> Card
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("bank_transfer")}
                      className={`p-2.5 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                        paymentMethod === "bank_transfer"
                          ? "bg-[#0F172A] text-white border-[#0F172A] shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5 text-amber-400" /> Bank
                    </button>
                  </div>
                </div>

                {/* Cash Tendered & Quick Shortcuts */}
                {paymentMethod === "cash" && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs">
                    {/* Quick Tender Shortcuts */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Quick Tender
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {["Exact", "5", "10", "20", "50", "100"].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => {
                              if (val === "Exact") {
                                setAmountTenderedPounds((totalPence / 100).toFixed(2));
                              } else {
                                setAmountTenderedPounds(val);
                              }
                            }}
                            className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 font-bold hover:bg-slate-200 text-[10px] transition-all"
                          >
                            {val === "Exact" ? "Exact" : `£${val}`}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                      <span className="font-bold text-slate-700">Amount Tendered (£):</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={amountTenderedPounds}
                        onChange={(e) => setAmountTenderedPounds(e.target.value)}
                        placeholder={(totalPence / 100).toFixed(2)}
                        className="w-24 px-2 py-1 bg-white border border-slate-300 rounded-lg text-right font-bold text-slate-900 outline-none focus:border-[#E11D48]"
                      />
                    </div>

                    {amountTenderedPence !== null && (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950 font-black">
                        <span>CHANGE DUE:</span>
                        <span className="text-sm font-mono">{formatGBP(changePence / 100)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Financial Summary */}
                <div className="pt-2 border-t border-slate-200 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal</span>
                    <span className="font-mono">{formatGBP(subtotalPence / 100)}</span>
                  </div>
                  {discountPence > 0 && (
                    <div className="flex justify-between text-rose-600 font-bold">
                      <span>Discount</span>
                      <span className="font-mono">-{formatGBP(discountPence / 100)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-black text-slate-950 pt-2 border-t border-slate-900">
                    <span>TOTAL</span>
                    <span className="text-[#E11D48] font-mono">{formatGBP(totalPence / 100)}</span>
                  </div>
                </div>

                {/* Till Closed Warning for Cash Sale */}
                {isCashSaleWithoutShift && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-bold flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[11px]">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      Open till required for cash sale
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowOpenShiftModal(true)}
                      className="px-2 py-1 bg-amber-600 text-white rounded-lg text-[10px] font-black hover:bg-amber-700"
                    >
                      Open Till
                    </button>
                  </div>
                )}

                {/* Complete Sale Action */}
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={submitting || cart.length === 0}
                  className="w-full btn-primary !py-3.5 !text-sm flex items-center justify-center gap-2 font-black tracking-wide shadow-md disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShoppingCart className="w-4 h-4" />
                  )}
                  {isCashSaleWithoutShift
                    ? "Open Till to Complete Sale"
                    : `Complete Sale — ${formatGBP(totalPence / 100)}`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Shift Modals */}
      <Suspense fallback={null}>
        {showOpenShiftModal && (
          <OpenShiftModal
            onClose={() => setShowOpenShiftModal(false)}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["open-shift"] });
            }}
          />
        )}

        {showCloseShiftModal && openShift && (
          <CloseShiftModal
            shiftId={openShift.id}
            onClose={() => setShowCloseShiftModal(false)}
            onSuccess={(result) => {
              setReconciliationResult(result);
              queryClient.invalidateQueries({ queryKey: ["open-shift"] });
            }}
          />
        )}

        {reconciliationResult && (
          <ShiftReconciliationResultModal
            data={reconciliationResult}
            onClose={() => setReconciliationResult(null)}
          />
        )}

        {showShiftHistoryModal && (
          <ShiftHistoryModal onClose={() => setShowShiftHistoryModal(false)} />
        )}

        {/* Invoice / Receipt Modal */}
        {invoice && <InvoiceModal data={invoice} onClose={() => setInvoice(null)} />}

        {/* Quick Repair A4 Invoice (after creation) */}
        {quickRepairInvoice && (
          <RepairA4InvoiceModal
            isOpen={!!quickRepairInvoice}
            onClose={() => setQuickRepairInvoice(null)}
            repair={quickRepairInvoice}
          />
        )}
      </Suspense>

      {/* Quick Repair Invoice Create Modal (outside Suspense — eagerly imported) */}
      <CreateRepairInvoiceModal
        isOpen={showCreateRepairModal}
        onClose={() => setShowCreateRepairModal(false)}
        onSuccess={(repair) => {
          setShowCreateRepairModal(false);
          setQuickRepairInvoice(repair);
        }}
      />
    </div>
  );
}
