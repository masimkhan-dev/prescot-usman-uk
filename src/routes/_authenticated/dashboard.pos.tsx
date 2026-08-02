import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listProducts } from "@/lib/products.functions";
import { listCustomers } from "@/lib/customers.functions";
import { createSale } from "@/lib/sales.functions";
import { formatGBP } from "@/lib/utils";
import { Loader2, Trash2, ShoppingCart, Search, Minus, Plus, CreditCard, Banknote, Building2 } from "lucide-react";
import { InvoiceModal, type InvoiceData } from "@/components/dashboard/Invoice";

export const Route = createFileRoute("/_authenticated/dashboard/pos")({
  component: POSPage,
});

interface CartItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  stock: number;
}

function POSPage() {
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => listProducts(),
  });
  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: () => listCustomers(),
  });

  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "bank_transfer">("cash");
  const [discount, setDiscount] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const createSaleFn = useServerFn(createSale);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const filtered = useMemo(() => {
    if (!products) return [];
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 30);
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku || "").toLowerCase().includes(q) ||
        (p.barcode || "").toLowerCase().includes(q)
    );
  }, [products, query]);

  function addToCart(product: { id: string; name: string; sale_price: number; stock_quantity: number }) {
    if (product.stock_quantity <= 0) return;
    setCart((prev) => {
      const existing = prev.find((c) => c.product_id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) return prev;
        return prev.map((c) =>
          c.product_id === product.id
            ? { ...c, quantity: c.quantity + 1, total: (c.quantity + 1) * c.unit_price }
            : c
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          unit_price: product.sale_price,
          total: product.sale_price,
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
          return { ...c, quantity: newQty, total: newQty * c.unit_price };
        })
        .filter((c) => c.quantity > 0)
    );
  }

  function removeFromCart(id: string) {
    setCart((prev) => prev.filter((c) => c.product_id !== id));
  }

  function handleSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && filtered.length > 0) {
      addToCart(filtered[0]);
      setQuery("");
    }
  }

  const subtotal = cart.reduce((acc, item) => acc + item.total, 0);
  const total = Math.max(subtotal - (discount || 0), 0);

  async function handleCheckout() {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const sale = await createSaleFn({
        data: {
          customer_id: customerId || null,
          items: cart.map(({ stock, ...rest }) => rest),
          discount: discount || 0,
          total,
          payment_method: paymentMethod,
        },
      });
      const customer = customers?.find((c) => c.id === customerId);
      setInvoice({
        kind: "sale",
        number: sale.id.slice(0, 8).toUpperCase(),
        date: new Date().toLocaleString("en-GB"),
        customer: customer ? { name: customer.name, phone: customer.phone, email: customer.email } : null,
        lines: cart.map((c) => ({ name: c.product_name, quantity: c.quantity, unit_price: c.unit_price, total: c.total })),
        discount: discount || 0,
        total,
        paid: true,
        paymentMethod: paymentMethod,
        warrantyUntil: sale.warranty_until,
      });
      setCart([]);
      setDiscount(0);
      setCustomerId("");
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

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Search & Product Selection */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
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

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[560px] overflow-y-auto pr-1">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                disabled={p.stock_quantity <= 0}
                className="text-left p-3.5 rounded-xl border border-slate-200 hover:border-[#E11D48] hover:bg-rose-50/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all bg-white flex flex-col justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-[#0F172A] line-clamp-2">{p.name}</div>
                  {p.sku && <div className="text-[10px] text-slate-400 font-mono mt-0.5">SKU: {p.sku}</div>}
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-sm font-extrabold text-[#0F172A] tabular-nums">
                    {formatGBP(p.sale_price)}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${p.stock_quantity > 5 ? "bg-slate-100 text-slate-700" : "bg-amber-100 text-amber-800"}`}>
                    {p.stock_quantity} left
                  </span>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-center text-sm text-slate-500 py-12">
                No matching products found.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Cart & Checkout */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h2 className="font-extrabold text-[#0F172A] flex items-center gap-2 text-base">
              <ShoppingCart className="w-4 h-4 text-[#E11D48]" /> Active Cart
            </h2>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
              {cart.reduce((a, c) => a + c.quantity, 0)} Items
            </span>
          </div>

          {cart.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm font-medium">
              Cart is empty. Click a product on the left to add items.
            </div>
          ) : (
            <ul className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
              {cart.map((item) => (
                <li key={item.product_id} className="flex items-center justify-between text-sm bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="font-bold text-[#0F172A] truncate text-xs">{item.product_name}</div>
                    <div className="text-[11px] text-slate-500 tabular-nums">
                      {formatGBP(item.unit_price)} each
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-1 py-0.5">
                    <button onClick={() => changeQty(item.product_id, -1)} className="p-1 hover:bg-slate-100 rounded text-slate-700">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-5 text-center font-bold text-xs tabular-nums">{item.quantity}</span>
                    <button onClick={() => changeQty(item.product_id, 1)} className="p-1 hover:bg-slate-100 rounded text-slate-700">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="font-extrabold text-[#0F172A] w-16 text-right tabular-nums text-xs ml-2">
                    {formatGBP(item.total)}
                  </span>
                  <button onClick={() => removeFromCart(item.product_id)} className="text-rose-600 p-1 hover:bg-rose-50 rounded ml-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Subtotal, Discount & Total Calculation */}
          <div className="pt-4 border-t border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
              <span>Subtotal</span>
              <span className="tabular-nums font-bold text-slate-900">{formatGBP(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <label className="text-slate-600 font-medium">Discount (£)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-xs text-right font-bold focus:border-[#E11D48] outline-none"
              />
            </div>
            <div className="flex items-center justify-between text-lg font-black text-[#0F172A] pt-2 border-t border-slate-200">
              <span>Total Payable</span>
              <span className="tabular-nums text-[#E11D48]">{formatGBP(total)}</span>
            </div>
          </div>

          {/* Customer & Payment Method Selector */}
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Customer Account (Optional)
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-[#E11D48] outline-none bg-white"
              >
                <option value="">Walk-in Customer</option>
                {customers?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.phone || "No phone"})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "cash", label: "Cash", icon: Banknote },
                  { id: "card", label: "Card", icon: CreditCard },
                  { id: "bank_transfer", label: "Bank", icon: Building2 },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as "cash" | "card" | "bank_transfer")}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-bold rounded-xl border transition-all ${
                      paymentMethod === m.id
                        ? "bg-[#0F172A] text-white border-[#0F172A]"
                        : "border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <m.icon className="w-3.5 h-3.5" />
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || submitting}
              className="w-full btn-primary !py-3.5 !text-sm font-extrabold disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>Complete Sale & Print Receipt · {formatGBP(total)}</>
              )}
            </button>
          </div>
        </div>
      </div>

      {invoice && <InvoiceModal invoice={invoice} onClose={() => setInvoice(null)} />}
    </div>
  );
}
