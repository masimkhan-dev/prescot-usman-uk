import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
  UserPlus,
  AlertTriangle,
} from "lucide-react";
import { InvoiceModal, type InvoiceData } from "@/components/dashboard/Invoice";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/pos")({
  component: POSPage,
});

interface CartItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price_pence: number;
  discount_pence: number;
  line_total_pence: number;
  stock: number;
}

function POSPage() {
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

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 30);
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku || "").toLowerCase().includes(q) ||
        (p.barcode || "").toLowerCase().includes(q),
    );
  }, [products, query]);

  function addToCart(product: {
    id: string;
    name: string;
    sale_price_pence: number;
    stock_quantity: number;
  }) {
    if (product.stock_quantity <= 0) {
      toast.error(`"${product.name}" is out of stock`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((c) => c.product_id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) {
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

  function removeFromCart(id: string) {
    setCart((prev) => prev.filter((c) => c.product_id !== id));
  }

  function handleSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && filteredProducts.length > 0) {
      addToCart(filteredProducts[0]);
      setQuery("");
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

  async function handleCheckout() {
    if (cart.length === 0) return;
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
          : null,
        lines: cart.map((c) => ({
          name: c.product_name,
          quantity: c.quantity,
          unit_price: c.unit_price_pence / 100,
          total: c.line_total_pence / 100,
        })),
        discount: discountPence / 100,
        total: totalPence / 100,
        paid: true,
        paymentMethod: paymentMethod,
      });

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#0F172A]">Point of Sale Register</h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Scan barcode or search product name / SKU. Press Enter to add top result to cart.
        </p>
      </div>

      {!openShift && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          No open shift detected. Sale will complete without a shift link. You can open a shift in
          Overview.
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Search & Product Selection */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKey}
              placeholder="Search product name, SKU or scan barcode…"
              className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-3 text-sm focus:border-[#E11D48] focus:ring-1 focus:ring-[#E11D48] outline-none font-medium"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[560px] overflow-y-auto pr-1">
            {filteredProducts.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addToCart(p)}
                disabled={p.stock_quantity <= 0}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between h-28 ${
                  p.stock_quantity <= 0
                    ? "bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed"
                    : "bg-white border-slate-200 hover:border-[#E11D48] hover:shadow-sm"
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 line-clamp-2">{p.name}</div>
                  <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                    {p.sku ? `SKU: ${p.sku}` : p.category}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                  <span className="text-xs font-extrabold text-[#E11D48]">
                    {formatGBP(p.sale_price_pence / 100)}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                      p.stock_quantity <= 3
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    Stock: {p.stock_quantity}
                  </span>
                </div>
              </button>
            ))}

            {filteredProducts.length === 0 && (
              <div className="col-span-full py-12 text-center text-xs text-slate-400 font-medium">
                No active products match "{query}"
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Cart & Checkout */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-extrabold text-slate-900 flex items-center gap-2 text-sm">
                <ShoppingCart className="w-4 h-4 text-[#E11D48]" /> Current Basket (
                {cart.reduce((a, c) => a + c.quantity, 0)})
              </h2>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-xs text-slate-400 hover:text-rose-600 font-bold"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Customer Search Typeahead */}
            <div className="relative">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Customer (Optional)
              </label>
              {selectedCustomer ? (
                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{selectedCustomer.name}</div>
                    {selectedCustomer.phone && (
                      <div className="text-[10px] text-slate-500">{selectedCustomer.phone}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCustomer(null)}
                    className="text-xs text-rose-600 font-bold hover:underline"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <input
                  type="text"
                  placeholder="Type name or phone to search customer…"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:ring-1 focus:ring-[#E11D48]"
                />
              )}

              {customerSearchResults.length > 0 && !selectedCustomer && (
                <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
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
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {cart.map((item) => (
                <div
                  key={item.product_id}
                  className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="font-bold text-slate-900 truncate">{item.product_name}</div>
                    <div className="text-[10px] text-slate-500">
                      {formatGBP(item.unit_price_pence / 100)} each
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center border border-slate-200 rounded-lg bg-white">
                      <button
                        type="button"
                        onClick={() => changeQty(item.product_id, -1)}
                        className="p-1 hover:bg-slate-100 text-slate-600 rounded-l-lg"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 font-bold text-slate-900">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => changeQty(item.product_id, 1)}
                        className="p-1 hover:bg-slate-100 text-slate-600 rounded-r-lg"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="font-extrabold text-slate-900 w-16 text-right">
                      {formatGBP(item.line_total_pence / 100)}
                    </span>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item.product_id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {cart.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400 font-medium">
                  Basket is empty. Select products from the left.
                </div>
              )}
            </div>

            {/* Payment Method & Calculations */}
            {cart.length > 0 && (
              <div className="border-t border-slate-100 pt-4 space-y-3">
                {/* Discount input */}
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-600">Discount (£):</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discountPounds || ""}
                    onChange={(e) => setDiscountPounds(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-24 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-right font-bold text-slate-900 outline-none focus:bg-white focus:ring-1 focus:ring-[#E11D48]"
                  />
                </div>

                {/* Payment Method Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("cash")}
                      className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 ${
                        paymentMethod === "cash"
                          ? "bg-[#E11D48] text-white border-[#E11D48]"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <Banknote className="w-3.5 h-3.5" /> Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("card")}
                      className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 ${
                        paymentMethod === "card"
                          ? "bg-[#E11D48] text-white border-[#E11D48]"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" /> Card
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("bank_transfer")}
                      className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 ${
                        paymentMethod === "bank_transfer"
                          ? "bg-[#E11D48] text-white border-[#E11D48]"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" /> Bank
                    </button>
                  </div>
                </div>

                {/* Cash Tendered & Change */}
                {paymentMethod === "cash" && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">Amount Tendered (£):</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={amountTenderedPounds}
                        onChange={(e) => setAmountTenderedPounds(e.target.value)}
                        placeholder={(totalPence / 100).toFixed(2)}
                        className="w-24 px-2 py-1 bg-white border border-slate-300 rounded-lg text-right font-bold text-slate-900 outline-none focus:ring-1 focus:ring-[#E11D48]"
                      />
                    </div>
                    {amountTenderedPence !== null && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200 font-extrabold text-[#E11D48]">
                        <span>Change Due:</span>
                        <span>{formatGBP(changePence / 100)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Totals Summary */}
                <div className="pt-2 border-t border-slate-200 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal</span>
                    <span>{formatGBP(subtotalPence / 100)}</span>
                  </div>
                  {discountPence > 0 && (
                    <div className="flex justify-between text-rose-600 font-medium">
                      <span>Discount</span>
                      <span>-{formatGBP(discountPence / 100)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-extrabold text-slate-900 pt-1 border-t border-slate-200">
                    <span>Total</span>
                    <span className="text-[#E11D48]">{formatGBP(totalPence / 100)}</span>
                  </div>
                </div>

                {/* Checkout Button */}
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={submitting || cart.length === 0}
                  className="w-full btn-primary !py-3 !text-sm flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShoppingCart className="w-4 h-4" />
                  )}
                  Complete Sale ({formatGBP(totalPence / 100)})
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invoice / Receipt Modal */}
      {invoice && <InvoiceModal data={invoice} onClose={() => setInvoice(null)} />}
    </div>
  );
}
