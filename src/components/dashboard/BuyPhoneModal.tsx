import { useState, useCallback } from "react";
import {
  X, Smartphone, User, Phone, AlertCircle, CheckCircle2,
  Loader2, Banknote, CreditCard, Building2, ChevronDown, ChevronUp,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { buyPhone } from "@/lib/phone-buy-sell.functions";
import { searchCustomers } from "@/lib/customers.functions";
import { toastSuccess, toastError } from "@/lib/toast";
import { QuickAddCustomerModal } from "./QuickAddCustomerModal";

import { PhonePurchaseReceiptModal, type PurchaseReceiptData } from "./PhonePurchaseReceipt";

interface BuyPhoneModalProps {
  isOpen: boolean;
  shiftId?: string | null;
  onClose: () => void;
  onSuccess: (result: {
    stock_number: string;
    phone_unit_id: string;
    transaction_id: string;
    receiptData: PurchaseReceiptData;
  }) => void;
}

// Default UK seller declaration
const DEFAULT_DECLARATION = `I confirm that I am the legal owner of this device, or am authorised to sell it on behalf of the legal owner. I declare that to the best of my knowledge this device is not subject to any active finance agreement, has not been reported lost or stolen, and I have full rights to sell it. I understand Prescot Mobiles will retain my details and may report this transaction to relevant authorities if required by law. I confirm I am aged 18 or over.`;

const CONDITION_GRADES = ["Excellent", "Good", "Fair", "Faulty"] as const;
const PAYMENT_METHODS = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "bank_transfer", label: "Bank Transfer", icon: Building2 },
  { value: "other", label: "Other", icon: CreditCard },
] as const;

function generateIdemKey() {
  return `buy-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function BuyPhoneModal({ isOpen, shiftId, onClose, onSuccess }: BuyPhoneModalProps) {
  const queryClient = useQueryClient();
  const buyFn = useServerFn(buyPhone);
  const searchFn = useServerFn(searchCustomers);

  // --- Seller ---
  const [sellerQuery, setSellerQuery] = useState("");
  const [sellerResults, setSellerResults] = useState<{ id: string; name: string; phone?: string | null }[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<{ id: string; name: string; phone?: string | null } | null>(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [sellerSearchLoading, setSellerSearchLoading] = useState(false);

  // --- Device ---
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [storage, setStorage] = useState("");
  const [colour, setColour] = useState("");
  const [imei1, setImei1] = useState("");
  const [imei2, setImei2] = useState("");
  const [serialNumber, setSerialNumber] = useState("");

  // --- Condition ---
  const [conditionGrade, setConditionGrade] = useState<typeof CONDITION_GRADES[number]>("Good");
  const [conditionNotes, setConditionNotes] = useState("");
  const [batteryHealth, setBatteryHealth] = useState("");
  const [networkStatus, setNetworkStatus] = useState("Unlocked");
  const [activationLockStatus, setActivationLockStatus] = useState("Clean");
  const [accessories, setAccessories] = useState("");

  // --- Price & Payment ---
  const [priceGBP, setPriceGBP] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank_transfer" | "other">("cash");
  const [bankReference, setBankReference] = useState("");

  // --- Declaration ---
  const [declarationText] = useState(DEFAULT_DECLARATION);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [sellerConfirmed, setSellerConfirmed] = useState(false);

  // --- Optional fields (collapsible) ---
  const [showMore, setShowMore] = useState(false);
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setSellerQuery(""); setSellerResults([]); setSelectedSeller(null);
    setBrand(""); setModel(""); setStorage(""); setColour("");
    setImei1(""); setImei2(""); setSerialNumber("");
    setConditionGrade("Good"); setConditionNotes(""); setBatteryHealth("");
    setNetworkStatus("Unlocked"); setActivationLockStatus("Clean"); setAccessories("");
    setPriceGBP(""); setPaymentMethod("cash"); setBankReference("");
    setAgeConfirmed(false); setSellerConfirmed(false);
    setShowMore(false); setNotes("");
    setErrorMsg(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  // Seller search
  async function handleSellerSearch(q: string) {
    setSellerQuery(q);
    setSelectedSeller(null);
    if (q.trim().length < 2) { setSellerResults([]); return; }
    setSellerSearchLoading(true);
    try {
      const results = await searchFn({ data: { q } });
      setSellerResults(results as any[]);
    } catch { setSellerResults([]); }
    finally { setSellerSearchLoading(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    // Validation
    if (!selectedSeller) { setErrorMsg("Please search & select or add a seller customer record."); return; }
    if (!brand.trim() || !model.trim()) { setErrorMsg("Brand and model are required."); return; }
    if (!imei1.trim()) { setErrorMsg("IMEI 1 is required."); return; }
    const pricePence = Math.round(parseFloat(priceGBP || "0") * 100);
    if (isNaN(pricePence) || pricePence < 0) { setErrorMsg("Enter a valid purchase price (£0 or more)."); return; }
    if (!sellerConfirmed) { setErrorMsg("Seller must confirm the declaration to proceed."); return; }
    if (!ageConfirmed) { setErrorMsg("Please confirm the seller is aged 18 or over."); return; }
    if (paymentMethod === "cash" && !shiftId) {
      setErrorMsg("No open till shift. Open the till before recording a cash buy-in.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await buyFn({
        data: {
          idempotency_key: generateIdemKey(),
          seller_customer_id: selectedSeller.id,
          shift_id: paymentMethod === "cash" ? (shiftId ?? null) : null,
          brand: brand.trim(),
          model: model.trim(),
          storage: storage.trim() || null,
          colour: colour.trim() || null,
          imei1: imei1.trim(),
          imei2: imei2.trim() || null,
          serial_number: serialNumber.trim() || null,
          condition_grade: conditionGrade,
          condition_notes: conditionNotes.trim() || null,
          battery_health: batteryHealth.trim() || null,
          network_status: networkStatus.trim() || null,
          activation_lock_status: activationLockStatus.trim() || null,
          accessories: accessories.trim() || null,
          purchase_price_pence: pricePence,
          payment_method: paymentMethod,
          bank_reference: bankReference.trim() || null,
          seller_declaration_text: declarationText,
          seller_confirmed_at: new Date().toISOString(),
          seller_age_confirmed: ageConfirmed,
          notes: notes.trim() || null,
        },
      });

      const purchasedAtIso = new Date().toISOString();
      toastSuccess(`✅ Phone bought! Stock #: ${result.stock_number}`);
      queryClient.invalidateQueries({ queryKey: ["phone-units"] });
      onSuccess({
        stock_number: result.stock_number,
        phone_unit_id: result.phone_unit_id,
        transaction_id: result.transaction_id,
        receiptData: {
          purchase_number: result.stock_number,
          purchased_at: purchasedAtIso,
          seller: selectedSeller,
          condition: {
            brand: brand.trim(),
            model: model.trim(),
            storage: storage.trim() || null,
            colour: colour.trim() || null,
            imei1: imei1.trim(),
            imei2: imei2.trim() || null,
            serial_number: serialNumber.trim() || null,
            condition_grade: conditionGrade,
            condition_notes: conditionNotes.trim() || null,
            battery_health: batteryHealth.trim() || null,
            network_status: networkStatus.trim() || null,
            activation_lock_status: activationLockStatus.trim() || null,
            accessories: accessories.trim() || null,
          },
          purchase_price_pence: pricePence,
          payment_method: paymentMethod,
          bank_reference: bankReference.trim() || null,
          declaration_text: declarationText,
        },
      });
      resetForm();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to record purchase. Please try again.");
      toastError(err, "Failed to record phone purchase");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  const inputCls = "w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand placeholder:text-muted-foreground/60";
  const labelCls = "block text-[11px] font-bold text-foreground mb-1 uppercase tracking-wide";
  const sectionHeadCls = "text-xs font-extrabold text-foreground uppercase tracking-widest mb-3 flex items-center gap-2 border-b border-border pb-2";

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl my-auto animate-in fade-in zoom-in-95 duration-150">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30 rounded-t-2xl sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-brand" />
              <h2 className="font-bold text-sm text-foreground">Buy Phone from Customer</h2>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-6">
            {/* Error */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                {errorMsg}
              </div>
            )}

            {/* ── SECTION: SELLER ─────────────────────────────────── */}
            <div>
              <p className={sectionHeadCls}>
                <User className="w-3.5 h-3.5 text-brand" /> Seller
              </p>
              {selectedSeller ? (
                <div className="flex items-center gap-3 p-3 bg-muted/40 border border-border rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground">{selectedSeller.name}</p>
                    {selectedSeller.phone && (
                      <p className="text-[11px] text-muted-foreground font-mono">{selectedSeller.phone}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedSeller(null); setSellerQuery(""); }}
                    className="text-[11px] font-bold text-brand hover:underline cursor-pointer"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search name or phone…"
                      value={sellerQuery}
                      onChange={(e) => handleSellerSearch(e.target.value)}
                      className={inputCls}
                    />
                    {sellerSearchLoading && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
                    )}
                  </div>
                  {sellerResults.length > 0 && (
                    <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border shadow-md">
                      {sellerResults.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => { setSelectedSeller(c); setSellerResults([]); setSellerQuery(""); }}
                          className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors text-xs cursor-pointer"
                        >
                          <span className="font-bold text-foreground">{c.name}</span>
                          {c.phone && <span className="ml-2 font-mono text-muted-foreground">{c.phone}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowAddCustomer(true)}
                    className="text-[11px] font-bold text-brand hover:underline cursor-pointer flex items-center gap-1"
                  >
                    + Add new customer record
                  </button>
                </div>
              )}
            </div>

            {/* ── SECTION: DEVICE ─────────────────────────────────── */}
            <div>
              <p className={sectionHeadCls}>
                <Smartphone className="w-3.5 h-3.5 text-brand" /> Device Details
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Brand *</label>
                  <input type="text" required value={brand} onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. Apple" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Model *</label>
                  <input type="text" required value={model} onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. iPhone 14 Pro" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Storage</label>
                  <input type="text" value={storage} onChange={(e) => setStorage(e.target.value)}
                    placeholder="e.g. 128GB" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Colour</label>
                  <input type="text" value={colour} onChange={(e) => setColour(e.target.value)}
                    placeholder="e.g. Space Grey" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>IMEI 1 *</label>
                  <input type="text" required value={imei1} onChange={(e) => setImei1(e.target.value)}
                    placeholder="15-digit IMEI" className={`${inputCls} font-mono`} />
                </div>
                <div>
                  <label className={labelCls}>IMEI 2 (dual-SIM)</label>
                  <input type="text" value={imei2} onChange={(e) => setImei2(e.target.value)}
                    placeholder="Optional" className={`${inputCls} font-mono`} />
                </div>
              </div>
            </div>

            {/* ── SECTION: CONDITION ─────────────────────────────── */}
            <div>
              <p className={sectionHeadCls}>Condition</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                {CONDITION_GRADES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setConditionGrade(g)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      conditionGrade === g
                        ? "bg-brand text-white border-brand shadow-sm"
                        : "border-border text-muted-foreground hover:border-brand/50 hover:text-foreground"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Battery Health</label>
                  <input type="text" value={batteryHealth} onChange={(e) => setBatteryHealth(e.target.value)}
                    placeholder="e.g. 85%" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Network</label>
                  <input type="text" value={networkStatus} onChange={(e) => setNetworkStatus(e.target.value)}
                    placeholder="e.g. Unlocked" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Activation Lock</label>
                  <input type="text" value={activationLockStatus} onChange={(e) => setActivationLockStatus(e.target.value)}
                    placeholder="Clean / iCloud" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Accessories</label>
                  <input type="text" value={accessories} onChange={(e) => setAccessories(e.target.value)}
                    placeholder="Box, charger, case…" className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Condition Notes / Faults</label>
                  <textarea
                    rows={2}
                    value={conditionNotes} onChange={(e) => setConditionNotes(e.target.value)}
                    placeholder="Scratches, cracked screen, disclosed faults…"
                    className={`${inputCls} resize-none`}
                  />
                </div>
              </div>
            </div>

            {/* ── SECTION: PRICE & PAYMENT ─────────────────────── */}
            <div>
              <p className={sectionHeadCls}>
                <Banknote className="w-3.5 h-3.5 text-brand" /> Purchase Price & Payment
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Purchase Price (£)</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={priceGBP} onChange={(e) => setPriceGBP(e.target.value)}
                    placeholder="0.00" className={`${inputCls} font-mono`}
                  />
                </div>
                <div>
                  <label className={labelCls}>Payment Method</label>
                  <div className="flex gap-2">
                    {PAYMENT_METHODS.map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setPaymentMethod(value as any)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                          paymentMethod === value
                            ? "bg-brand text-white border-brand"
                            : "border-border text-muted-foreground hover:border-brand/50"
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {paymentMethod === "bank_transfer" && (
                  <div className="col-span-2">
                    <label className={labelCls}>Bank Reference (Optional)</label>
                    <input type="text" value={bankReference} onChange={(e) => setBankReference(e.target.value)}
                      placeholder="Transfer ref / last 4 digits" className={inputCls} />
                  </div>
                )}
              </div>
            </div>

            {/* ── SECTION: DECLARATION ─────────────────────────── */}
            <div>
              <p className={sectionHeadCls}>Seller Declaration</p>
              <div className="p-3 bg-muted/30 border border-border rounded-xl text-[11px] text-muted-foreground leading-relaxed mb-3">
                {declarationText}
              </div>
              <div className="space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ageConfirmed}
                    onChange={(e) => setAgeConfirmed(e.target.checked)}
                    className="mt-0.5 rounded border-border text-brand focus:ring-brand w-4 h-4"
                  />
                  <span className="text-xs font-semibold text-foreground">
                    I confirm the seller is aged 18 or over *
                  </span>
                </label>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sellerConfirmed}
                    onChange={(e) => setSellerConfirmed(e.target.checked)}
                    className="mt-0.5 rounded border-border text-brand focus:ring-brand w-4 h-4"
                  />
                  <span className="text-xs font-semibold text-foreground">
                    Seller has read, agreed to, and confirmed the above declaration *
                  </span>
                </label>
              </div>
            </div>

            {/* ── MORE DETAILS (collapsible) ────────────────────── */}
            <div>
              <button
                type="button"
                onClick={() => setShowMore(!showMore)}
                className="text-xs font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer"
              >
                {showMore ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {showMore ? "Fewer details" : "More details (serial number, notes)"}
              </button>
              {showMore && (
                <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-border animate-in fade-in duration-100">
                  <div>
                    <label className={labelCls}>Serial Number</label>
                    <input type="text" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)}
                      placeholder="Optional" className={inputCls} />
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>Staff Notes (Internal)</label>
                    <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any additional internal notes…"
                      className={`${inputCls} resize-none`} />
                  </div>
                </div>
              )}
            </div>

            {/* ── FOOTER ───────────────────────────────────────── */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted rounded-xl transition-colors cursor-pointer min-h-[40px] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 text-xs font-extrabold text-white bg-brand hover:bg-brand/90 rounded-xl shadow-md transition-all cursor-pointer min-h-[40px] flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                {submitting ? "Recording…" : "Buy & Print Receipt"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Quick-add customer for seller */}
      <QuickAddCustomerModal
        isOpen={showAddCustomer}
        onClose={() => setShowAddCustomer(false)}
        onCustomerCreated={(c) => {
          setSelectedSeller(c);
          setShowAddCustomer(false);
        }}
      />
    </>
  );
}
