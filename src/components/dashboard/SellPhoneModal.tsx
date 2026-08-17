import { useState, useCallback, useEffect } from "react";
import {
  X, Smartphone, User, Loader2, CheckCircle2, AlertCircle,
  Banknote, CreditCard, Building2, Search, ShieldCheck, Tag,
  ChevronDown, ChevronUp, Plus,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { sellPhone, searchPhoneUnits } from "@/lib/phone-buy-sell.functions";
import { searchCustomers, saveCustomer } from "@/lib/customers.functions";
import { toastSuccess, toastError } from "@/lib/toast";
import { type PhoneSaleInvoiceData } from "./PhoneSaleInvoice";

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
  { value: "bank_transfer", label: "Bank Transfer", icon: Building2 },
] as const;

const POPULAR_BRANDS = ["Apple", "Samsung", "Google", "Xiaomi", "Other"] as const;
const STORAGE_OPTIONS = ["64GB", "128GB", "256GB", "512GB", "1TB", "Other"] as const;
const COLOUR_OPTIONS = ["Black", "White", "Blue", "Silver", "Gold", "Natural Titanium", "Other"] as const;
const CONDITION_GRADES = ["Excellent", "Good", "Fair", "Faulty"] as const;
const NETWORK_OPTIONS = ["Unlocked", "EE", "Vodafone", "O2", "Three", "Other"];

function inferBrand(model: string, existingBrand: string): string {
  const m = model.toLowerCase();
  if (m.includes("iphone") || m.includes("ipad") || m.includes("apple")) return "Apple";
  if (m.includes("galaxy") || m.includes("samsung") || m.startsWith("s2") || m.startsWith("a5") || m.startsWith("a1") || m.startsWith("z flip") || m.startsWith("z fold")) return "Samsung";
  if (m.includes("pixel") || m.includes("google")) return "Google";
  if (m.includes("xiaomi") || m.includes("redmi") || m.includes("poco")) return "Xiaomi";
  if (m.includes("motorola") || m.includes("moto")) return "Motorola";
  if (m.includes("oneplus") || m.includes("oppo") || m.includes("huawei") || m.includes("sony") || m.includes("nokia")) {
    const firstWord = model.trim().split(/\s+/)[0];
    return firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
  }
  return existingBrand || "Apple";
}

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
  const saveCustomerFn = useServerFn(saveCustomer);

  // --- Sale Mode ---
  const [saleMode, setSaleMode] = useState<"from_stock" | "direct_sale">(
    preselectedUnit ? "from_stock" : "from_stock",
  );

  // --- From Stock state ---
  const [unitQuery, setUnitQuery] = useState("");
  const [unitResults, setUnitResults] = useState<PhoneUnit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<PhoneUnit | null>(preselectedUnit ?? null);
  const [unitSearchLoading, setUnitSearchLoading] = useState(false);

  // --- Direct Sale: Essential Fields ---
  const [directModel, setDirectModel] = useState("");
  const [directBrand, setDirectBrand] = useState("Apple");
  const [customBrand, setCustomBrand] = useState("");
  const [directImei1, setDirectImei1] = useState("");
  const [directCondition, setDirectCondition] = useState<"Excellent" | "Good" | "Fair" | "Faulty">("Good");

  // --- Direct Sale: More Device Details (Progressive Disclosure) ---
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [selectedStorage, setSelectedStorage] = useState<string>("128GB");
  const [customStorage, setCustomStorage] = useState("");
  const [selectedColour, setSelectedColour] = useState<string>("Black");
  const [customColour, setCustomColour] = useState("");
  const [directBatteryHealth, setDirectBatteryHealth] = useState("");
  const [directNetwork, setDirectNetwork] = useState("Unlocked");
  const [directFaults, setDirectFaults] = useState("None");
  const [directCostGBP, setDirectCostGBP] = useState("");

  // --- Buyer State ---
  const [buyerQuery, setBuyerQuery] = useState("");
  const [buyerResults, setBuyerResults] = useState<{ id: string; name: string; phone?: string | null }[]>([]);
  const [selectedBuyer, setSelectedBuyer] = useState<{ id: string; name: string; phone?: string | null } | null>(null);
  const [buyerSearchLoading, setBuyerSearchLoading] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");

  // --- Price & Payment ---
  const [priceGBP, setPriceGBP] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "bank_transfer">("cash");
  const [cashReceivedGBP, setCashReceivedGBP] = useState("");

  // --- Warranty (Collapsible) ---
  const [showWarranty, setShowWarranty] = useState(false);
  const [warrantyDays, setWarrantyDays] = useState("");
  const [warrantyPolicy, setWarrantyPolicy] = useState("");

  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync preselected unit
  useEffect(() => {
    if (preselectedUnit) {
      setSelectedUnit(preselectedUnit);
      setSaleMode("from_stock");
    }
  }, [preselectedUnit]);

  // Auto-detect brand when model changes
  const handleModelChange = (val: string) => {
    setDirectModel(val);
    const inferred = inferBrand(val, directBrand);
    if (inferred) {
      if (POPULAR_BRANDS.includes(inferred as any)) {
        setDirectBrand(inferred);
      } else {
        setDirectBrand("Other");
        setCustomBrand(inferred);
      }
    }
  };

  const resetForm = useCallback(() => {
    setSaleMode(preselectedUnit ? "from_stock" : "from_stock");
    setUnitQuery(""); setUnitResults([]); setSelectedUnit(preselectedUnit ?? null);
    setDirectModel(""); setDirectBrand("Apple"); setCustomBrand("");
    setDirectImei1(""); setDirectCondition("Good");
    setShowMoreDetails(false);
    setSelectedStorage("128GB"); setCustomStorage("");
    setSelectedColour("Black"); setCustomColour("");
    setDirectBatteryHealth(""); setDirectNetwork("Unlocked"); setDirectFaults("None");
    setDirectCostGBP("");
    setBuyerQuery(""); setBuyerResults([]); setSelectedBuyer(null);
    setShowAddCustomer(false); setNewCustomerName(""); setNewCustomerPhone("");
    setPriceGBP(""); setPaymentMethod("cash"); setCashReceivedGBP("");
    setShowWarranty(false); setWarrantyDays(""); setWarrantyPolicy("");
    setNotes(""); setErrorMsg(null);
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

    // Mode-specific validation
    if (saleMode === "from_stock" && !selectedUnit) {
      setErrorMsg("Select a phone unit to sell from stock.");
      return;
    }
    if (saleMode === "direct_sale") {
      if (!directModel.trim()) { setErrorMsg("Enter Device / Model (e.g. iPhone 15 Pro Max)."); return; }
      if (!directImei1.trim() || directImei1.trim().length < 8) {
        setErrorMsg("Enter a valid IMEI (minimum 8 characters).");
        return;
      }
    }

    const pricePence = Math.round(parseFloat(priceGBP || "0") * 100);
    if (isNaN(pricePence) || pricePence <= 0) {
      setErrorMsg("Selling price must be greater than £0.00.");
      return;
    }
    if (paymentMethod === "cash" && !shiftId) {
      setErrorMsg("No open till shift. Open the till before taking a cash payment.");
      return;
    }

    const tenderedPence = paymentMethod === "cash" && cashReceivedGBP
      ? Math.round(parseFloat(cashReceivedGBP) * 100)
      : null;

    if (paymentMethod === "cash" && tenderedPence !== null && tenderedPence < pricePence) {
      setErrorMsg(`Cash received (${formatGBP(tenderedPence)}) is less than selling price (${formatGBP(pricePence)}).`);
      return;
    }

    let directCostPence: number | null = null;
    if (directCostGBP && directCostGBP.trim() !== "") {
      const parsedCost = parseFloat(directCostGBP);
      if (isNaN(parsedCost) || parsedCost < 0) {
        setErrorMsg("Cost to business cannot be negative.");
        return;
      }
      directCostPence = Math.round(parsedCost * 100);
    }

    const wDays = warrantyDays.trim() !== "" ? parseInt(warrantyDays, 10) : null;
    if (wDays !== null && (isNaN(wDays) || wDays < 0)) {
      setErrorMsg("Warranty days must be a non-negative integer (e.g. 0, 30, 90) or left blank.");
      return;
    }

    // Resolve final storage, colour, brand
    const finalBrand = directBrand === "Other" ? (customBrand.trim() || "Other") : directBrand;
    const finalStorage = selectedStorage === "Other" ? (customStorage.trim() || null) : selectedStorage;
    const finalColour = selectedColour === "Other" ? (customColour.trim() || null) : selectedColour;

    setSubmitting(true);
    try {
      // Resolve buyer (if inline new customer entered, auto-create customer)
      let resolvedBuyerId = selectedBuyer?.id ?? null;
      let resolvedBuyerObj = selectedBuyer;

      if (!resolvedBuyerId && showAddCustomer && newCustomerName.trim()) {
        try {
          const createdCust = await saveCustomerFn({
            data: {
              name: newCustomerName.trim(),
              phone: newCustomerPhone.trim() || null,
            },
          });
          if (createdCust?.id) {
            resolvedBuyerId = createdCust.id;
            resolvedBuyerObj = { id: createdCust.id, name: createdCust.name, phone: createdCust.phone };
          }
        } catch {
          resolvedBuyerObj = { id: "", name: newCustomerName.trim(), phone: newCustomerPhone.trim() || null };
        }
      }

      const result = await sellFn({
        data: {
          idempotency_key: generateIdemKey(),
          phone_unit_id: saleMode === "from_stock" ? selectedUnit?.id ?? null : null,
          buyer_customer_id: resolvedBuyerId,
          shift_id: paymentMethod === "cash" ? (shiftId ?? null) : null,
          selling_price_pence: pricePence,
          payment_method: paymentMethod,
          amount_tendered_pence: tenderedPence,
          warranty_days: wDays,
          warranty_policy_text: (wDays && wDays > 0 && warrantyPolicy.trim()) ? warrantyPolicy.trim() : null,
          notes: notes.trim() || null,

          // Direct sale parameters
          brand: saleMode === "direct_sale" ? finalBrand : null,
          model: saleMode === "direct_sale" ? directModel.trim() : null,
          storage: saleMode === "direct_sale" ? finalStorage : null,
          colour: saleMode === "direct_sale" ? finalColour : null,
          imei1: saleMode === "direct_sale" ? directImei1.trim() : null,
          condition_grade: saleMode === "direct_sale" ? directCondition : "Good",
          condition_notes: saleMode === "direct_sale" ? (directFaults.trim() || null) : null,
          battery_health: saleMode === "direct_sale" && directBatteryHealth.trim()
            ? (directBatteryHealth.includes("%") ? directBatteryHealth.trim() : `${directBatteryHealth.trim()}%`)
            : null,
          network_status: saleMode === "direct_sale" ? (directNetwork.trim() || "Unlocked") : null,
          cost_price_pence: saleMode === "direct_sale" ? directCostPence : null,
        },
      });

      const soldAtIso = new Date().toISOString();
      toastSuccess(`✅ Sold! Invoice #${result.invoice_number}`);
      queryClient.invalidateQueries({ queryKey: ["phone-units"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });

      const deviceSnapshot = saleMode === "from_stock" && selectedUnit
        ? {
            brand: selectedUnit.brand,
            model: selectedUnit.model,
            storage: selectedUnit.storage,
            colour: selectedUnit.colour,
            imei1: selectedUnit.imei1,
            condition_grade: selectedUnit.condition_grade,
            stock_number: selectedUnit.stock_number,
          }
        : {
            brand: finalBrand,
            model: directModel.trim(),
            storage: finalStorage,
            colour: finalColour,
            imei1: directImei1.trim(),
            condition_grade: directCondition,
            condition_notes: directFaults.trim() || null,
            battery_health: directBatteryHealth.trim()
              ? (directBatteryHealth.includes("%") ? directBatteryHealth.trim() : `${directBatteryHealth.trim()}%`)
              : null,
            network_status: directNetwork.trim() || "Unlocked",
            stock_number: null,
          };

      onSuccess({
        invoice_number: result.invoice_number,
        sale_id: result.sale_id,
        warranty_until: result.warranty_until,
        invoiceData: {
          invoice_number: result.invoice_number,
          sold_at: soldAtIso,
          buyer: resolvedBuyerObj?.name ? resolvedBuyerObj : null,
          device_snapshot: deviceSnapshot,
          selling_price_pence: pricePence,
          payment_method: paymentMethod,
          warranty_days: wDays,
          warranty_policy_text: (wDays && wDays > 0 && warrantyPolicy.trim()) ? warrantyPolicy.trim() : null,
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
  const cashReceivedPence = cashReceivedGBP ? Math.round(parseFloat(cashReceivedGBP) * 100) : null;
  const changeDuePence = (cashReceivedPence !== null && pricePence > 0) ? Math.max(cashReceivedPence - pricePence, 0) : null;

  // Margin calculation
  let costPence: number | null = null;
  let margin: number | null = null;

  if (saleMode === "from_stock" && selectedUnit) {
    costPence = selectedUnit.purchase_cost_pence;
    margin = pricePence > 0 ? pricePence - costPence : null;
  } else if (saleMode === "direct_sale") {
    if (directCostGBP && !isNaN(parseFloat(directCostGBP))) {
      costPence = Math.round(parseFloat(directCostGBP) * 100);
      margin = pricePence > 0 ? pricePence - costPence : null;
    }
  }

  const inputCls = "w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand placeholder:text-muted-foreground/60 transition-all";
  const labelCls = "block text-[11px] font-bold text-foreground mb-1 uppercase tracking-wide";
  const sectionHeadCls = "text-xs font-extrabold text-foreground uppercase tracking-widest mb-2.5 flex items-center gap-2 border-b border-border pb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg my-auto animate-in fade-in zoom-in-95 duration-150">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/30 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-brand" />
            <h2 className="font-bold text-sm text-foreground">Sell Phone</h2>
          </div>
          <button type="button" onClick={handleClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 max-h-[85vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {errorMsg}
            </div>
          )}

          {/* ── SALE MODE TOGGLE ── */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted/50 rounded-xl border border-border">
            <button
              type="button"
              onClick={() => setSaleMode("from_stock")}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                saleMode === "from_stock"
                  ? "bg-brand text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              Sell From Stock
            </button>
            <button
              type="button"
              onClick={() => setSaleMode("direct_sale")}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                saleMode === "direct_sale"
                  ? "bg-brand text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Direct Phone Sale
            </button>
          </div>

          {/* ── MODE 1: FROM STOCK ── */}
          {saleMode === "from_stock" && (
            <div>
              <p className={sectionHeadCls}>
                <Smartphone className="w-3.5 h-3.5 text-brand" /> Select Phone From Stock
              </p>
              {selectedUnit ? (
                <div className="p-3.5 bg-brand/5 border border-brand/20 rounded-xl space-y-2">
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
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground font-mono">
                    <span>#{selectedUnit.stock_number}</span>
                    <span>IMEI: {selectedUnit.imei1}</span>
                    <span className="capitalize font-semibold text-foreground">{selectedUnit.condition_grade}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground border-t border-brand/10 pt-1.5">
                    Purchase Cost: <strong className="font-mono text-foreground">{formatGBP(selectedUnit.purchase_cost_pence)}</strong>
                    <span className="ml-1 text-[10px] opacity-75">(Internal only)</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="text" placeholder="Search stock #, IMEI or model…"
                      value={unitQuery} onChange={(e) => handleUnitSearch(e.target.value)}
                      className={`${inputCls} !pl-9`} />
                    {unitSearchLoading && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
                    )}
                  </div>
                  {unitResults.length > 0 && (
                    <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border shadow-md max-h-48 overflow-y-auto">
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
          )}

          {/* ── MODE 2: DIRECT PHONE SALE (Clean 10-Second Primary Form) ── */}
          {saleMode === "direct_sale" && (
            <div className="space-y-3.5">
              {/* Device / Model */}
              <div>
                <label className={labelCls}>Device / Model *</label>
                <input
                  type="text"
                  placeholder="e.g. iPhone 15 Pro Max, Galaxy S24..."
                  value={directModel}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className={inputCls}
                  required
                />
              </div>

              {/* IMEI 1 */}
              <div>
                <label className={labelCls}>IMEI *</label>
                <input
                  type="text"
                  placeholder="35xxxxxxxxxxxxx"
                  value={directImei1}
                  onChange={(e) => setDirectImei1(e.target.value)}
                  className={`${inputCls} font-mono`}
                  required
                />
              </div>

              {/* Condition */}
              <div>
                <label className={labelCls}>Condition</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {CONDITION_GRADES.map((cg) => (
                    <button
                      key={cg}
                      type="button"
                      onClick={() => setDirectCondition(cg)}
                      className={`py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        directCondition === cg
                          ? "bg-brand text-white border-brand shadow-sm"
                          : "bg-muted/30 border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {cg}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── PRICE & PAYMENT ── */}
          <div className="space-y-3 pt-1">
            <p className={sectionHeadCls}>
              <Banknote className="w-3.5 h-3.5 text-brand" /> Price & Payment
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Selling Price (£) *</label>
                <input type="number" min="0" step="0.01"
                  value={priceGBP} onChange={(e) => setPriceGBP(e.target.value)}
                  placeholder="0.00" className={`${inputCls} font-mono`} required />
              </div>

              <div>
                <label className={labelCls}>Payment Method</label>
                <div className="flex gap-1">
                  {PAYMENT_METHODS.map(({ value, label, icon: Icon }) => (
                    <button key={value} type="button"
                      onClick={() => setPaymentMethod(value as any)}
                      className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                        paymentMethod === value
                          ? "bg-brand text-white border-brand shadow-sm"
                          : "border-border text-muted-foreground hover:border-brand/50 bg-muted/20"
                      }`}>
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cash Received and Change Due (ONLY for Cash payments) */}
              {paymentMethod === "cash" && (
                <>
                  <div>
                    <label className={labelCls}>Cash Received (£)</label>
                    <input type="number" min="0" step="0.01"
                      value={cashReceivedGBP} onChange={(e) => setCashReceivedGBP(e.target.value)}
                      placeholder="0.00" className={`${inputCls} font-mono`} />
                  </div>

                  <div className="flex items-end pb-1">
                    <p className="text-xs font-bold text-foreground">
                      Change Due:{" "}
                      <span className="text-brand font-mono font-extrabold text-sm">
                        {changeDuePence !== null ? formatGBP(changeDuePence) : "£0.00"}
                      </span>
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── BUYER — OPTIONAL ── */}
          <div className="pt-1">
            <p className={sectionHeadCls}>
              <User className="w-3.5 h-3.5 text-brand" /> Buyer — Optional
            </p>

            {selectedBuyer ? (
              <div className="flex items-center justify-between p-3 bg-brand/5 border border-brand/20 rounded-xl">
                <div>
                  <p className="text-xs font-extrabold text-foreground">{selectedBuyer.name}</p>
                  {selectedBuyer.phone && (
                    <p className="text-[11px] text-muted-foreground font-mono">{selectedBuyer.phone}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedBuyer(null)}
                  className="text-[11px] font-bold text-brand hover:underline cursor-pointer"
                >
                  Change
                </button>
              </div>
            ) : showAddCustomer ? (
              <div className="p-3 bg-muted/30 border border-border rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-foreground uppercase tracking-wide">New Customer Details</span>
                  <button
                    type="button"
                    onClick={() => setShowAddCustomer(false)}
                    className="text-[11px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Customer Name"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className={inputCls}
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number (optional)"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    className={`${inputCls} font-mono`}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search customer by name or phone…"
                    value={buyerQuery}
                    onChange={(e) => handleBuyerSearch(e.target.value)}
                    className={`${inputCls} !pl-9`}
                  />
                  {buyerSearchLoading && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
                  )}

                  {buyerResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-card border border-border rounded-xl overflow-hidden divide-y divide-border shadow-xl max-h-40 overflow-y-auto">
                      {buyerResults.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedBuyer(c);
                            setBuyerResults([]);
                            setBuyerQuery("");
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-muted/50 transition-colors text-xs cursor-pointer flex items-center justify-between"
                        >
                          <span className="font-bold text-foreground">{c.name}</span>
                          {c.phone && <span className="font-mono text-muted-foreground text-[11px]">{c.phone}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddCustomer(true)}
                  className="text-[11px] font-bold text-brand hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add New Customer
                </button>
              </div>
            )}
          </div>

          {/* ── PROGRESSIVE DISCLOSURE: MORE DEVICE DETAILS ── */}
          {saleMode === "direct_sale" && (
            <div className="border border-border rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowMoreDetails(!showMoreDetails)}
                className="w-full px-3.5 py-2.5 bg-muted/30 hover:bg-muted/50 flex items-center justify-between text-xs font-extrabold text-foreground transition-colors cursor-pointer"
              >
                <span>More Device Details</span>
                {showMoreDetails ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>

              {showMoreDetails && (
                <div className="p-3.5 space-y-3.5 bg-card border-t border-border">
                  {/* Brand Selection */}
                  <div>
                    <label className={labelCls}>Brand</label>
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      {POPULAR_BRANDS.map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setDirectBrand(b)}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                            directBrand === b
                              ? "bg-brand text-white border-brand shadow-sm"
                              : "bg-muted/30 border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                    {directBrand === "Other" && (
                      <input
                        type="text"
                        placeholder="Enter brand name"
                        value={customBrand}
                        onChange={(e) => setCustomBrand(e.target.value)}
                        className={inputCls}
                      />
                    )}
                  </div>

                  {/* Storage */}
                  <div>
                    <label className={labelCls}>Storage</label>
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      {STORAGE_OPTIONS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSelectedStorage(s)}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                            selectedStorage === s
                              ? "bg-brand text-white border-brand shadow-sm"
                              : "bg-muted/30 border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    {selectedStorage === "Other" && (
                      <input
                        type="text"
                        placeholder="e.g. 32GB / 2TB"
                        value={customStorage}
                        onChange={(e) => setCustomStorage(e.target.value)}
                        className={inputCls}
                      />
                    )}
                  </div>

                  {/* Colour */}
                  <div>
                    <label className={labelCls}>Colour</label>
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      {COLOUR_OPTIONS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setSelectedColour(c)}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                            selectedColour === c
                              ? "bg-brand text-white border-brand shadow-sm"
                              : "bg-muted/30 border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                    {selectedColour === "Other" && (
                      <input
                        type="text"
                        placeholder="e.g. Midnight Green"
                        value={customColour}
                        onChange={(e) => setCustomColour(e.target.value)}
                        className={inputCls}
                      />
                    )}
                  </div>

                  {/* Battery Health & Network */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Battery Health</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max="100"
                          placeholder="e.g. 92"
                          value={directBatteryHealth}
                          onChange={(e) => setDirectBatteryHealth(e.target.value)}
                          className={`${inputCls} pr-7`}
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground pointer-events-none">
                          %
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className={labelCls}>Network Status</label>
                      <select
                        value={directNetwork}
                        onChange={(e) => setDirectNetwork(e.target.value)}
                        className={inputCls}
                      >
                        {NETWORK_OPTIONS.map((net) => (
                          <option key={net} value={net}>{net}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Disclosed Faults */}
                  <div>
                    <label className={labelCls}>Disclosed Condition / Faults</label>
                    <input
                      type="text"
                      placeholder="e.g. None / Minor back glass scratch"
                      value={directFaults}
                      onChange={(e) => setDirectFaults(e.target.value)}
                      className={inputCls}
                    />
                  </div>

                  {/* Cost to Business */}
                  <div>
                    <label className={`${labelCls} flex items-center justify-between`}>
                      <span>Cost to Business (£)</span>
                      <span className="text-[9px] text-muted-foreground font-normal lowercase">(optional · internal)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={directCostGBP}
                      onChange={(e) => setDirectCostGBP(e.target.value)}
                      placeholder="e.g. 300.00"
                      className={`${inputCls} font-mono`}
                    />
                  </div>

                  {/* Internal Margin preview */}
                  {pricePence > 0 && (
                    <div>
                      {margin !== null && costPence !== null ? (
                        <div className={`px-3 py-2 rounded-lg text-[11px] font-semibold flex items-center justify-between ${
                          margin >= 0
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-destructive/10 text-destructive border border-destructive/20"
                        }`}>
                          <span>
                            Estimated Gross Margin: <strong className="font-mono">{formatGBP(margin)}</strong>
                          </span>
                          <span className="text-[9px] opacity-75 uppercase tracking-wider font-bold">Internal Only</span>
                        </div>
                      ) : (
                        <div className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-muted/40 text-muted-foreground border border-border flex items-center justify-between">
                          <span>Cost not recorded · Margin: <em>Pending</em></span>
                          <span className="text-[9px] opacity-75 uppercase tracking-wider">Internal only</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── PROGRESSIVE DISCLOSURE: WARRANTY (OPTIONAL) ── */}
          <div className="border border-border rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowWarranty(!showWarranty)}
              className="w-full px-3.5 py-2.5 bg-muted/30 hover:bg-muted/50 flex items-center justify-between text-xs font-extrabold text-foreground transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-brand" /> Warranty — Optional
              </span>
              {showWarranty ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            {showWarranty && (
              <div className="p-3.5 space-y-3 bg-card border-t border-border">
                <div>
                  <label className={labelCls}>Warranty Days</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={warrantyDays}
                    onChange={(e) => setWarrantyDays(e.target.value)}
                    placeholder="e.g. 90"
                    className={inputCls}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Leave blank if not specified. Enter 0 for no additional store warranty.
                  </p>
                </div>

                {warrantyDays.trim() !== "" && parseInt(warrantyDays, 10) > 0 && (
                  <div>
                    <label className={labelCls}>Warranty Policy (Printed on Invoice)</label>
                    <textarea
                      rows={3}
                      value={warrantyPolicy}
                      onChange={(e) => setWarrantyPolicy(e.target.value)}
                      placeholder="e.g. Covers specified internal hardware faults and identified functionality. Excludes accidental/liquid damage."
                      className={`${inputCls} resize-none`}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button type="button" onClick={handleClose} disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted rounded-xl transition-colors cursor-pointer min-h-[40px] disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={submitting || (saleMode === "from_stock" && !selectedUnit)}
              className="px-6 py-2 text-xs font-extrabold text-white bg-brand hover:bg-brand/90 rounded-xl shadow-md transition-all cursor-pointer min-h-[40px] flex items-center gap-2 disabled:opacity-50">
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              {submitting ? "Processing…" : "Sell & Print Invoice"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
