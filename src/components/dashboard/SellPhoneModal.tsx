import { useState, useCallback, useRef, useEffect } from "react";
import {
  X, Smartphone, User, Loader2, CheckCircle2, AlertCircle,
  Banknote, CreditCard, Building2, Search, ShieldCheck,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { sellPhone, searchPhoneUnits } from "@/lib/phone-buy-sell.functions";
import { searchCustomers } from "@/lib/customers.functions";
import { toastSuccess, toastError } from "@/lib/toast";
import { PhoneSaleInvoiceModal, type PhoneSaleInvoiceData } from "./PhoneSaleInvoice";
import { QuickAddCustomerModal } from "./QuickAddCustomerModal";

interface PhoneUnit {
  id: string;
  stock_number: string;
  brand: string;
  model: string;
  storage?: string | null;
  colour?: string | null;
  imei1: string;
  condition_grade: string;
  purchase_cost_pence: number;
}

interface SellPhoneModalProps {
  isOpen: boolean;
  shiftId?: string | null;
  preselectedUnit?: PhoneUnit | null;
  onClose: () => void;
  onSuccess: (result: {
    invoice_number: string;
    sale_id: string;
    warranty_until: string | null;
    invoiceData: PhoneSaleInvoiceData;
  }) => void;
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "card", label: "Card", icon: CreditCard },
  { value: "bank_transfer", label: "Bank", icon: Building2 },
] as const;

function generateIdemKey() {
  return `sell-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatGBP(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}

export function SellPhoneModal({
  isOpen, shiftId, preselectedUnit, onClose, onSuccess,
}: SellPhoneModalProps) {
  const queryClient = useQueryClient();
  const sellFn = useServerFn(sellPhone);
  const searchUnitsFn = useServerFn(searchPhoneUnits);
  const searchCustomersFn = useServerFn(searchCustomers);

  // --- Unit search ---
  const [unitQuery, setUnitQuery] = useState("");
  const [unitResults, setUnitResults] = useState<PhoneUnit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<PhoneUnit | null>(preselectedUnit ?? null);
  const [unitSearchLoading, setUnitSearchLoading] = useState(false);

  // --- Buyer ---
  const [buyerQuery, setBuyerQuery] = useState("");
  const [buyerResults, setBuyerResults] = useState<{ id: string; name: string; phone?: string | null }[]>([]);
  const [selectedBuyer, setSelectedBuyer] = useState<{ id: string; name: string; phone?: string | null } | null>(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [buyerSearchLoading, setBuyerSearchLoading] = useState(false);

  // --- Price & Payment ---
  const [priceGBP, setPriceGBP] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "bank_transfer">("cash");
  const [tenderedGBP, setTenderedGBP] = useState("");

  // --- Warranty ---
  const [warrantyDays, setWarrantyDays] = useState("");
  const [warrantyPolicy, setWarrantyPolicy] = useState(
    "This used/refurbished device is sold with a warranty on workmanship and identified functionality as described. The warranty does not cover physical damage, liquid ingress, or software issues. Return within the warranty period for assessment.",
  );

  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync preselected unit
  useEffect(() => {
    if (preselectedUnit) setSelectedUnit(preselectedUnit);
  }, [preselectedUnit]);

  const resetForm = useCallback(() => {
    setUnitQuery(""); setUnitResults([]); setSelectedUnit(preselectedUnit ?? null);
    setBuyerQuery(""); setBuyerResults([]); setSelectedBuyer(null);
    setPriceGBP(""); setPaymentMethod("cash"); setTenderedGBP("");
    setWarrantyDays(""); setNotes(""); setErrorMsg(null);
  }, [preselectedUnit]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  // Unit search
  async function handleUnitSearch(q: string) {
    setUnitQuery(q);
    setSelectedUnit(null);
    if (q.trim().length < 2) { setUnitResults([]); return; }
    setUnitSearchLoading(true);
    try {
      const r = await searchUnitsFn({ data: { q } });
      setUnitResults(r as PhoneUnit[]);
    } catch { setUnitResults([]); }
    finally { setUnitSearchLoading(false); }
  }

  // Buyer search
  async function handleBuyerSearch(q: string) {
    setBuyerQuery(q);
    setSelectedBuyer(null);
    if (q.trim().length < 2) { setBuyerResults([]); return; }
    setBuyerSearchLoading(true);
    try {
      const r = await searchCustomersFn({ data: { q } });
      setBuyerResults(r as any[]);
    } catch { setBuyerResults([]); }
    finally { setBuyerSearchLoading(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedUnit) { setErrorMsg("Select a phone unit to sell."); return; }
    const pricePence = Math.round(parseFloat(priceGBP || "0") * 100);
    if (isNaN(pricePence) || pricePence < 0) { setErrorMsg("Enter a valid selling price."); return; }
    if (paymentMethod === "cash" && !shiftId) {
      setErrorMsg("No open till shift. Open the till before taking a cash payment.");
      return;
    }

    const tenderedPence = tenderedGBP
      ? Math.round(parseFloat(tenderedGBP) * 100)
      : null;

    if (paymentMethod === "cash" && tenderedPence !== null && tenderedPence < pricePence) {
      setErrorMsg(`Amount tendered (£${(tenderedPence / 100).toFixed(2)}) is less than selling price.`);
      return;
    }

    const wDays = warrantyDays ? parseInt(warrantyDays, 10) : null;

    setSubmitting(true);
    try {
      const result = await sellFn({
        data: {
          idempotency_key: generateIdemKey(),
          phone_unit_id: selectedUnit.id,
          buyer_customer_id: selectedBuyer?.id ?? null,
          shift_id: paymentMethod === "cash" ? (shiftId ?? null) : null,
          selling_price_pence: pricePence,
          payment_method: paymentMethod,
          amount_tendered_pence: tenderedPence,
          warranty_days: wDays,
          warranty_policy_text: wDays && wDays > 0 ? warrantyPolicy : null,
          notes: notes.trim() || null,
        },
      });

      const soldAtIso = new Date().toISOString();
      toastSuccess(`✅ Sold! Invoice #${result.invoice_number}`);
      queryClient.invalidateQueries({ queryKey: ["phone-units"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      onSuccess({
        invoice_number: result.invoice_number,
        sale_id: result.sale_id,
        warranty_until: result.warranty_until,
        invoiceData: {
          invoice_number: result.invoice_number,
          sold_at: soldAtIso,
          buyer: selectedBuyer,
          device_snapshot: {
            brand: selectedUnit.brand,
            model: selectedUnit.model,
            storage: selectedUnit.storage,
            colour: selectedUnit.colour,
            imei1: selectedUnit.imei1,
            condition_grade: selectedUnit.condition_grade,
            stock_number: selectedUnit.stock_number,
          },
          selling_price_pence: pricePence,
          payment_method: paymentMethod,
          warranty_days: wDays,
          warranty_policy_text: wDays && wDays > 0 ? warrantyPolicy : null,
          warranty_until: result.warranty_until,
          notes: notes.trim() || null,
        },
      });
      resetForm();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to process sale. Please try again.");
      toastError(err, "Failed to process phone sale");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  const pricePence = Math.round(parseFloat(priceGBP || "0") * 100);
  const tenderedPence = tenderedGBP ? Math.round(parseFloat(tenderedGBP) * 100) : null;
  const changePence = (tenderedPence !== null && pricePence > 0) ? Math.max(tenderedPence - pricePence, 0) : null;
  const margin = selectedUnit ? pricePence - selectedUnit.purchase_cost_pence : null;

  const inputCls = "w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand placeholder:text-muted-foreground/60";
  const labelCls = "block text-[11px] font-bold text-foreground mb-1 uppercase tracking-wide";
  const sectionHeadCls = "text-xs font-extrabold text-foreground uppercase tracking-widest mb-3 flex items-center gap-2 border-b border-border pb-2";

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-xl my-auto animate-in fade-in zoom-in-95 duration-150">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-brand" />
              <h2 className="font-bold text-sm text-foreground">Sell Pre-Owned Phone</h2>
            </div>
            <button type="button" onClick={handleClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                {errorMsg}
              </div>
            )}

            {/* ── PHONE UNIT ── */}
            <div>
              <p className={sectionHeadCls}>
                <Smartphone className="w-3.5 h-3.5 text-brand" /> Phone Unit
              </p>
              {selectedUnit ? (
                <div className="p-3 bg-brand/5 border border-brand/20 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-foreground">
                      {selectedUnit.brand} {selectedUnit.model}
                      {selectedUnit.storage ? ` ${selectedUnit.storage}` : ""}
                      {selectedUnit.colour ? ` (${selectedUnit.colour})` : ""}
                    </span>
                    <button type="button" onClick={() => { setSelectedUnit(null); setUnitQuery(""); }}
                      className="text-[11px] font-bold text-brand hover:underline cursor-pointer">
                      Change
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
                    <span>#{selectedUnit.stock_number}</span>
                    <span>IMEI: {selectedUnit.imei1}</span>
                    <span className="capitalize">{selectedUnit.condition_grade}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="text" placeholder="Search stock # or IMEI or model…"
                      value={unitQuery} onChange={(e) => handleUnitSearch(e.target.value)}
                      className={`${inputCls} !pl-9`} />
                    {unitSearchLoading && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
                    )}
                  </div>
                  {unitResults.length > 0 && (
                    <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border shadow-md">
                      {unitResults.map((u) => (
                        <button key={u.id} type="button"
                          onClick={() => { setSelectedUnit(u); setUnitResults([]); setUnitQuery(""); }}
                          className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors cursor-pointer">
                          <span className="text-xs font-bold text-foreground">
                            {u.brand} {u.model}{u.storage ? ` ${u.storage}` : ""}
                          </span>
                          <span className="ml-2 text-[11px] font-mono text-muted-foreground">
                            #{u.stock_number} · {u.imei1}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {unitQuery.length >= 2 && unitResults.length === 0 && !unitSearchLoading && (
                    <p className="text-[11px] text-muted-foreground px-1">No in-stock phones found for "{unitQuery}"</p>
                  )}
                </div>
              )}
            </div>

            {/* ── BUYER ── */}
            <div>
              <p className={sectionHeadCls}>
                <User className="w-3.5 h-3.5 text-brand" /> Buyer (Optional)
              </p>
              {selectedBuyer ? (
                <div className="flex items-center gap-3 p-3 bg-muted/40 border border-border rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground">{selectedBuyer.name}</p>
                    {selectedBuyer.phone && (
                      <p className="text-[11px] text-muted-foreground font-mono">{selectedBuyer.phone}</p>
                    )}
                  </div>
                  <button type="button"
                    onClick={() => { setSelectedBuyer(null); setBuyerQuery(""); }}
                    className="text-[11px] font-bold text-brand hover:underline cursor-pointer">
                    Change
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <input type="text" placeholder="Search buyer name or phone (optional)…"
                      value={buyerQuery} onChange={(e) => handleBuyerSearch(e.target.value)}
                      className={inputCls} />
                    {buyerSearchLoading && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
                    )}
                  </div>
                  {buyerResults.length > 0 && (
                    <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border shadow-md">
                      {buyerResults.map((c) => (
                        <button key={c.id} type="button"
                          onClick={() => { setSelectedBuyer(c); setBuyerResults([]); setBuyerQuery(""); }}
                          className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors text-xs cursor-pointer">
                          <span className="font-bold text-foreground">{c.name}</span>
                          {c.phone && <span className="ml-2 font-mono text-muted-foreground">{c.phone}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  <button type="button" onClick={() => setShowAddCustomer(true)}
                    className="text-[11px] font-bold text-brand hover:underline cursor-pointer flex items-center gap-1">
                    + Add new customer
                  </button>
                </div>
              )}
            </div>

            {/* ── PRICE & PAYMENT ── */}
            <div>
              <p className={sectionHeadCls}>
                <Banknote className="w-3.5 h-3.5 text-brand" /> Price & Payment
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Selling Price (£)</label>
                  <input type="number" min="0" step="0.01"
                    value={priceGBP} onChange={(e) => setPriceGBP(e.target.value)}
                    placeholder="0.00" className={`${inputCls} font-mono`} />
                </div>
                <div>
                  <label className={labelCls}>Payment Method</label>
                  <div className="flex gap-1.5">
                    {PAYMENT_METHODS.map(({ value, label, icon: Icon }) => (
                      <button key={value} type="button"
                        onClick={() => setPaymentMethod(value as any)}
                        className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                          paymentMethod === value
                            ? "bg-brand text-white border-brand"
                            : "border-border text-muted-foreground hover:border-brand/50"
                        }`}>
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {paymentMethod === "cash" && (
                  <div>
                    <label className={labelCls}>Amount Tendered (£)</label>
                    <input type="number" min="0" step="0.01"
                      value={tenderedGBP} onChange={(e) => setTenderedGBP(e.target.value)}
                      placeholder="0.00" className={`${inputCls} font-mono`} />
                  </div>
                )}
                {changePence !== null && changePence >= 0 && paymentMethod === "cash" && (
                  <div className="flex items-end pb-1">
                    <p className="text-xs font-bold text-foreground">
                      Change: <span className="text-brand font-mono">{formatGBP(changePence)}</span>
                    </p>
                  </div>
                )}
              </div>
              {/* Margin indicator (internal — not shown on receipt) */}
              {selectedUnit && pricePence > 0 && margin !== null && (
                <div className={`mt-2 px-3 py-2 rounded-lg text-[11px] font-semibold ${
                  margin >= 0 ? "bg-green-50 text-green-700 border border-green-200" : "bg-destructive/10 text-destructive border border-destructive/20"
                }`}>
                  Gross margin: {formatGBP(margin)} (cost {formatGBP(selectedUnit.purchase_cost_pence)} · sell {formatGBP(pricePence)})
                  <span className="ml-1 opacity-60">— internal only</span>
                </div>
              )}
            </div>

            {/* ── WARRANTY ── */}
            <div>
              <p className={sectionHeadCls}>
                <ShieldCheck className="w-3.5 h-3.5 text-brand" /> Warranty
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Warranty Days (0 = no warranty)</label>
                  <input type="number" min="0" step="1"
                    value={warrantyDays} onChange={(e) => setWarrantyDays(e.target.value)}
                    placeholder="e.g. 30, 60, 90" className={inputCls} />
                </div>
                {warrantyDays && parseInt(warrantyDays, 10) > 0 && (
                  <div className="col-span-2">
                    <label className={labelCls}>Warranty Terms (printed on invoice)</label>
                    <textarea rows={3} value={warrantyPolicy} onChange={(e) => setWarrantyPolicy(e.target.value)}
                      className={`${inputCls} resize-none`} />
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button type="button" onClick={handleClose} disabled={submitting}
                className="px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted rounded-xl transition-colors cursor-pointer min-h-[40px] disabled:opacity-50">
                Cancel
              </button>
              <button type="submit" disabled={submitting || !selectedUnit}
                className="px-6 py-2.5 text-xs font-extrabold text-white bg-brand hover:bg-brand/90 rounded-xl shadow-md transition-all cursor-pointer min-h-[40px] flex items-center gap-2 disabled:opacity-50">
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                {submitting ? "Processing…" : "Sell & Print Invoice"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <QuickAddCustomerModal
        isOpen={showAddCustomer}
        onClose={() => setShowAddCustomer(false)}
        onCustomerCreated={(c: any) => { setSelectedBuyer(c); setShowAddCustomer(false); }}
      />
    </>
  );
}
