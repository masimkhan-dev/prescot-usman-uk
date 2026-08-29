import { useState, useCallback, useEffect, useRef } from "react";
import {
  X, Smartphone, User, Loader2, CheckCircle2, AlertCircle,
  Banknote, CreditCard, Building2, Search, ShieldCheck, Tag,
  Plus, AlertTriangle, ChevronDown, Check, Receipt, DollarSign
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
  imei2?: string | null;
  condition_grade: string;
  purchase_cost_pence: number;
  battery_health?: string | null;
  network_status?: string | null;
  face_id_status?: string | null;
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

const BRANDS = [
  "Apple",
  "Samsung",
  "Google",
  "Xiaomi",
  "OnePlus",
  "Motorola",
  "Huawei",
  "Honor",
  "Oppo",
  "Nothing",
  "Other",
] as const;

const BRAND_MODELS: Record<string, string[]> = {
  Apple: [
    "iPhone 16 Pro Max", "iPhone 16 Pro", "iPhone 16 Plus", "iPhone 16",
    "iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15 Plus", "iPhone 15",
    "iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 14 Plus", "iPhone 14",
    "iPhone 13 Pro Max", "iPhone 13 Pro", "iPhone 13 mini", "iPhone 13",
    "iPhone 12 Pro Max", "iPhone 12 Pro", "iPhone 12 mini", "iPhone 12",
    "iPhone 11 Pro Max", "iPhone 11 Pro", "iPhone 11",
    "iPhone XS Max", "iPhone XS", "iPhone XR", "iPhone X",
    "iPhone SE (3rd Gen)", "iPhone SE (2nd Gen)",
    "iPhone 8 Plus", "iPhone 8",
  ],
  Samsung: [
    "Galaxy S25 Ultra", "Galaxy S25+", "Galaxy S25",
    "Galaxy S24 Ultra", "Galaxy S24+", "Galaxy S24 FE", "Galaxy S24",
    "Galaxy S23 Ultra", "Galaxy S23+", "Galaxy S23 FE", "Galaxy S23",
    "Galaxy S22 Ultra", "Galaxy S22+", "Galaxy S22",
    "Galaxy S21 Ultra", "Galaxy S21+", "Galaxy S21 FE", "Galaxy S21",
    "Galaxy Z Fold 6", "Galaxy Z Fold 5", "Galaxy Z Fold 4",
    "Galaxy Z Flip 6", "Galaxy Z Flip 5", "Galaxy Z Flip 4",
    "Galaxy A55", "Galaxy A54", "Galaxy A35", "Galaxy A34", "Galaxy A25", "Galaxy A15", "Galaxy A14",
    "Galaxy Note 20 Ultra", "Galaxy Note 20",
  ],
  Google: [
    "Pixel 9 Pro XL", "Pixel 9 Pro Fold", "Pixel 9 Pro", "Pixel 9",
    "Pixel 8 Pro", "Pixel 8a", "Pixel 8",
    "Pixel 7 Pro", "Pixel 7a", "Pixel 7",
    "Pixel 6 Pro", "Pixel 6a", "Pixel 6",
  ],
  Xiaomi: [
    "Xiaomi 14 Ultra", "Xiaomi 14 Pro", "Xiaomi 14",
    "Xiaomi 13 Ultra", "Xiaomi 13 Pro", "Xiaomi 13",
    "Redmi Note 13 Pro+", "Redmi Note 13 Pro", "Redmi Note 13", "Redmi 13C",
    "POCO X6 Pro", "POCO X6", "POCO F6 Pro", "POCO F6",
  ],
  OnePlus: [
    "OnePlus 12", "OnePlus 12R", "OnePlus 11", "OnePlus 10 Pro", "OnePlus Open",
    "OnePlus Nord 4", "OnePlus Nord CE 4", "OnePlus Nord CE 3",
  ],
  Motorola: [
    "Edge 50 Ultra", "Edge 50 Pro", "Edge 40 Pro", "Edge 40 Neo",
    "Razr 50 Ultra", "Razr 40 Ultra",
    "Moto G84", "Moto G54", "Moto G24",
  ],
  Huawei: [
    "Pura 70 Ultra", "Pura 70 Pro", "Pura 70",
    "P60 Pro", "P50 Pro", "Mate 60 Pro", "Mate 50 Pro", "Nova 12",
  ],
  Honor: [
    "Magic 6 Pro", "Magic 5 Pro", "Magic V2", "Honor 200 Pro", "Honor 200", "Honor 90",
  ],
  Oppo: [
    "Find X8 Pro", "Find X7 Ultra", "Find N3 Flip",
    "Reno 12 Pro", "Reno 12", "A98", "A78",
  ],
  Nothing: [
    "Phone (2a) Plus", "Phone (2a)", "Phone (2)", "Phone (1)",
  ],
};

const STORAGE_OPTIONS = ["32GB", "64GB", "128GB", "256GB", "512GB", "1TB", "Other"] as const;

const COLOUR_OPTIONS = [
  "Black",
  "White",
  "Blue",
  "Green",
  "Red",
  "Purple",
  "Pink",
  "Silver",
  "Gold",
  "Graphite",
  "Space Grey",
  "Natural Titanium",
  "Black Titanium",
  "White Titanium",
  "Blue Titanium",
  "Other",
] as const;

const CONDITION_GRADES = ["New", "Grade A", "Grade B", "Grade C", "Faulty"] as const;
const NETWORK_OPTIONS = ["Unlocked", "EE", "Vodafone", "O2", "Three", "Other"] as const;

const FACE_ID_OPTIONS = [
  { value: "working", label: "Working" },
  { value: "not_working", label: "Not Working" },
  { value: "not_checked", label: "Not Checked" },
] as const;

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "card", label: "Card", icon: CreditCard },
  { value: "bank_transfer", label: "Bank Transfer", icon: Building2 },
] as const;

function generateIdemKey() {
  return `sell-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatGBP(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}

function computePhoneName(brand: string, customBrand: string, model: string): string {
  const actualBrand = brand === "Other" ? (customBrand.trim() || "") : brand.trim();
  const actualModel = model.trim();
  if (!actualModel) return actualBrand;
  if (!actualBrand) return actualModel;
  
  if (actualModel.toLowerCase().startsWith(actualBrand.toLowerCase())) {
    return actualModel;
  }
  return `${actualBrand} ${actualModel}`;
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

  // --- Direct Sale: Structured Device State ---
  const [directBrand, setDirectBrand] = useState<string>("Apple");
  const [customBrand, setCustomBrand] = useState("");
  const [directModel, setDirectModel] = useState("iPhone 15 Pro Max");
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [modelSearchQuery, setModelSearchQuery] = useState("");
  const [modelHighlightedIndex, setModelHighlightedIndex] = useState(0);

  const [phoneName, setPhoneName] = useState("Apple iPhone 15 Pro Max");
  const [phoneNameCustomized, setPhoneNameCustomized] = useState(false);

  const [selectedStorage, setSelectedStorage] = useState<string>("128GB");
  const [customStorage, setCustomStorage] = useState("");

  const [selectedColour, setSelectedColour] = useState<string>("Black");
  const [customColour, setCustomColour] = useState("");

  // Default is firmly Grade A (Never accidental Faulty)
  const [directCondition, setDirectCondition] = useState<typeof CONDITION_GRADES[number]>("Grade A");
  const [directImei1, setDirectImei1] = useState("");

  // Secondary Device Checks
  const [directBatteryHealth, setDirectBatteryHealth] = useState("");
  const [directNetwork, setDirectNetwork] = useState<string>("Unlocked");
  const [customNetwork, setCustomNetwork] = useState("");
  const [faceIdStatus, setFaceIdStatus] = useState<"working" | "not_working" | "not_checked">("not_checked");
  const [directFaults, setDirectFaults] = useState("");

  // --- Buyer State ---
  const [buyerQuery, setBuyerQuery] = useState("");
  const [buyerResults, setBuyerResults] = useState<{ id: string; name: string; phone?: string | null }[]>([]);
  const [selectedBuyer, setSelectedBuyer] = useState<{ id: string; name: string; phone?: string | null } | null>(null);
  const [buyerSearchLoading, setBuyerSearchLoading] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");

  // --- Warranty State ---
  const [warrantyDays, setWarrantyDays] = useState("");
  const [warrantyPolicy, setWarrantyPolicy] = useState("");

  // --- Price & Payment ---
  const [priceGBP, setPriceGBP] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "bank_transfer">("cash");
  const [cashReceivedGBP, setCashReceivedGBP] = useState("");
  const [directCostGBP, setDirectCostGBP] = useState("");

  // --- Notes & Submission Feedback ---
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const modelInputRef = useRef<HTMLInputElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  // Sync preselected unit
  useEffect(() => {
    if (preselectedUnit) {
      setSelectedUnit(preselectedUnit);
      setSaleMode("from_stock");
    }
  }, [preselectedUnit]);

  // Is device Apple/iPhone?
  const isApple = directBrand === "Apple" ||
    directModel.toLowerCase().includes("iphone") ||
    directModel.toLowerCase().includes("ipad") ||
    directModel.toLowerCase().includes("apple");

  // Keep auto-generated phone name updated unless user manually typed a custom display name
  useEffect(() => {
    if (!phoneNameCustomized) {
      setPhoneName(computePhoneName(directBrand, customBrand, directModel));
    }
  }, [directBrand, customBrand, directModel, phoneNameCustomized]);

  // Models filtered for current brand & search query
  const availableModels = BRAND_MODELS[directBrand] || [];
  const filteredModels = availableModels.filter((m) =>
    m.toLowerCase().includes((modelSearchQuery || directModel).toLowerCase().trim())
  );

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        modelDropdownRef.current &&
        !modelDropdownRef.current.contains(e.target as Node) &&
        modelInputRef.current &&
        !modelInputRef.current.contains(e.target as Node)
      ) {
        setModelDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleBrandChange = (newBrand: string) => {
    setDirectBrand(newBrand);
    if (newBrand !== "Other") {
      setCustomBrand("");
    }
    const modelsForBrand = BRAND_MODELS[newBrand];
    if (modelsForBrand && modelsForBrand.length > 0) {
      setDirectModel(modelsForBrand[0]);
      setModelSearchQuery(modelsForBrand[0]);
    } else {
      setDirectModel("");
      setModelSearchQuery("");
    }
    setPhoneNameCustomized(false);
  };

  const handleSelectModel = (model: string) => {
    setDirectModel(model);
    setModelSearchQuery(model);
    setModelDropdownOpen(false);
    setPhoneNameCustomized(false);
  };

  const resetForm = useCallback(() => {
    setSaleMode(preselectedUnit ? "from_stock" : "from_stock");
    setUnitQuery(""); setUnitResults([]); setSelectedUnit(preselectedUnit ?? null);
    setDirectBrand("Apple"); setCustomBrand("");
    setDirectModel("iPhone 15 Pro Max"); setModelSearchQuery("iPhone 15 Pro Max");
    setPhoneName("Apple iPhone 15 Pro Max"); setPhoneNameCustomized(false);
    setSelectedStorage("128GB"); setCustomStorage("");
    setSelectedColour("Black"); setCustomColour("");
    setDirectCondition("Grade A"); setDirectImei1("");
    setDirectBatteryHealth(""); setDirectNetwork("Unlocked"); setCustomNetwork("");
    setFaceIdStatus("not_checked"); setDirectFaults("");
    setBuyerQuery(""); setBuyerResults([]); setSelectedBuyer(null);
    setShowAddCustomer(false); setNewCustomerName(""); setNewCustomerPhone("");
    setWarrantyDays(""); setWarrantyPolicy("");
    setPriceGBP(""); setPaymentMethod("cash"); setCashReceivedGBP("");
    setDirectCostGBP(""); setNotes(""); setErrorMsg(null);
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
      setErrorMsg("Select a phone unit from stock before processing sale.");
      return;
    }
    if (saleMode === "direct_sale") {
      if (!directModel.trim()) {
        setErrorMsg("Please select or enter a Device Model.");
        return;
      }
      if (!directImei1.trim() || directImei1.trim().length < 8) {
        setErrorMsg("Enter a valid Primary IMEI (minimum 8 characters).");
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

    // Resolve final fields
    const finalBrand = directBrand === "Other" ? (customBrand.trim() || "Other") : directBrand;
    const finalModel = directModel.trim();
    const finalStorage = selectedStorage === "Other" ? (customStorage.trim() || null) : selectedStorage;
    const finalColour = selectedColour === "Other" ? (customColour.trim() || null) : selectedColour;
    const finalNetwork = directNetwork === "Other" ? (customNetwork.trim() || "Other") : directNetwork;

    setSubmitting(true);
    try {
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
          model: saleMode === "direct_sale" ? finalModel : null,
          storage: saleMode === "direct_sale" ? finalStorage : null,
          colour: saleMode === "direct_sale" ? finalColour : null,
          imei1: saleMode === "direct_sale" ? directImei1.trim() : null,
          condition_grade: saleMode === "direct_sale" ? directCondition : "Grade A",
          condition_notes: saleMode === "direct_sale" ? (directFaults.trim() || null) : null,
          battery_health: saleMode === "direct_sale" && directBatteryHealth.trim()
            ? (directBatteryHealth.includes("%") ? directBatteryHealth.trim() : `${directBatteryHealth.trim()}%`)
            : null,
          network_status: saleMode === "direct_sale" ? finalNetwork : null,
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
            battery_health: selectedUnit.battery_health,
            network_status: selectedUnit.network_status,
            face_id_status: selectedUnit.face_id_status ?? null,
          }
        : {
            brand: finalBrand,
            model: finalModel,
            storage: finalStorage,
            colour: finalColour,
            imei1: directImei1.trim(),
            condition_grade: directCondition,
            condition_notes: directFaults.trim() || null,
            battery_health: directBatteryHealth.trim()
              ? (directBatteryHealth.includes("%") ? directBatteryHealth.trim() : `${directBatteryHealth.trim()}%`)
              : null,
            network_status: finalNetwork,
            face_id_status: isApple ? faceIdStatus : null,
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

  // Live Sale Summary Data
  const summaryDeviceTitle = saleMode === "from_stock" && selectedUnit
    ? `${selectedUnit.brand} ${selectedUnit.model}`
    : (phoneName.trim() || `${directBrand} ${directModel}`.trim() || "Handset");

  const summarySpecs = saleMode === "from_stock" && selectedUnit
    ? [selectedUnit.storage, selectedUnit.colour, selectedUnit.condition_grade].filter(Boolean).join(" · ")
    : [selectedStorage, selectedColour, directCondition].filter(Boolean).join(" · ");

  const summaryImeiEnding = saleMode === "from_stock" && selectedUnit
    ? (selectedUnit.imei1 ? `IMEI ending ${selectedUnit.imei1.slice(-4)}` : "")
    : (directImei1.trim().length >= 4 ? `IMEI ending ${directImei1.trim().slice(-4)}` : (directImei1.trim() ? `IMEI: ${directImei1.trim()}` : "IMEI: Pending"));

  const summaryBuyerName = selectedBuyer?.name
    ? `${selectedBuyer.name}${selectedBuyer.phone ? ` · ${selectedBuyer.phone}` : ""}`
    : (showAddCustomer && newCustomerName.trim() ? `${newCustomerName.trim()} (New)` : "Walk-in Customer");

  const summaryWarrantyText = warrantyDays.trim() === ""
    ? "Not Specified"
    : (warrantyDays.trim() === "0" ? "No Additional Store Warranty" : `${warrantyDays.trim()} Days`);

  const inputCls = "w-full px-2.5 py-1 bg-background border border-border rounded-lg text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand placeholder:text-muted-foreground/60 transition-all h-[32px]";
  const labelCls = "block text-[10px] font-extrabold text-muted-foreground mb-0.5 uppercase tracking-wider";
  const sectionHeadCls = "text-[11px] font-black text-foreground uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-border/80";

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen max-h-screen bg-background flex flex-col overflow-hidden animate-in fade-in duration-150">

      {/* ── TOP HEADER (h-12 shrink-0) ── */}
      <header className="h-12 px-4 sm:px-6 border-b border-border bg-card flex items-center justify-between shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand/10 text-brand flex items-center justify-center font-bold">
              <Smartphone className="w-4 h-4" />
            </div>
            <h1 className="font-extrabold text-sm sm:text-base text-foreground tracking-tight">
              Sell Phone
            </h1>
          </div>

          <div className="h-5 w-px bg-border hidden sm:block" />

          {/* Accessible Segmented Radio Pills */}
          <div
            role="radiogroup"
            aria-label="Phone Source"
            className="inline-flex items-center p-0.5 bg-muted/60 rounded-lg border border-border text-xs"
          >
            <button
              type="button"
              role="radio"
              aria-checked={saleMode === "from_stock"}
              tabIndex={0}
              onClick={() => setSaleMode("from_stock")}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowDown") setSaleMode("direct_sale");
              }}
              className={`py-1 px-3 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1.5 text-xs ${
                saleMode === "from_stock"
                  ? "bg-brand text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Tag className="w-3.5 h-3.5 shrink-0" />
              <span>Sell From Stock</span>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={saleMode === "direct_sale"}
              tabIndex={0}
              onClick={() => {
                setSaleMode("direct_sale");
                setTimeout(() => modelInputRef.current?.focus(), 50);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft" || e.key === "ArrowUp") setSaleMode("from_stock");
              }}
              className={`py-1 px-3 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1.5 text-xs ${
                saleMode === "direct_sale"
                  ? "bg-brand text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 shrink-0" />
              <span>Direct Phone Sale</span>
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClose}
          aria-label="Close modal"
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </header>

      {/* ── 3-COLUMN WORKSPACE FORM ── */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden bg-muted/15">

        {errorMsg && (
          <div className="mx-4 sm:mx-6 mt-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="text-[11px] hover:underline cursor-pointer opacity-80"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ── BODY (Fitting strictly in available height without vertical overflow) ── */}
        <div className="flex-1 p-2.5 sm:p-3 overflow-y-auto lg:overflow-y-hidden no-scrollbar grid grid-cols-1 lg:grid-cols-3 gap-2.5 sm:gap-3 min-h-0">

          {/* ═══════════════════════════════════════════════════════════
              COLUMN 1: DEVICE INFORMATION
             ═══════════════════════════════════════════════════════════ */}
          <div className="bg-card border border-border/80 rounded-xl p-3 shadow-sm flex flex-col gap-1.5 min-h-0 overflow-y-auto no-scrollbar">
            <div className={sectionHeadCls}>
              <Smartphone className="w-3.5 h-3.5 text-brand" />
              <span>{saleMode === "from_stock" ? "Select Stock Handset" : "Device Information"}</span>
            </div>

            {/* From Stock Mode */}
            {saleMode === "from_stock" && (
              <div className="space-y-2">
                {selectedUnit ? (
                  <div className="p-2.5 bg-brand/5 border-2 border-brand/30 rounded-lg space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-extrabold text-foreground">
                          {selectedUnit.brand} {selectedUnit.model}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-medium">
                          {[selectedUnit.storage, selectedUnit.colour].filter(Boolean).join(" · ") || "Standard"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setSelectedUnit(null); setUnitQuery(""); }}
                        className="px-2 py-0.5 text-xs font-bold text-brand bg-brand/10 hover:bg-brand/20 rounded transition-colors cursor-pointer"
                      >
                        Change
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[11px] font-mono bg-card/80 p-2 rounded border border-border/80">
                      <div>
                        <span className="text-[9px] text-muted-foreground block uppercase font-sans font-bold">Stock #</span>
                        <span className="font-extrabold text-foreground">#{selectedUnit.stock_number}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-muted-foreground block uppercase font-sans font-bold">IMEI 1</span>
                        <span className="font-extrabold text-foreground truncate block">{selectedUnit.imei1}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-muted-foreground block uppercase font-sans font-bold">Condition</span>
                        <span className="font-bold text-foreground font-sans">{selectedUnit.condition_grade}</span>
                      </div>
                      {selectedUnit.network_status && (
                        <div>
                          <span className="text-[9px] text-muted-foreground block uppercase font-sans font-bold">Network</span>
                          <span className="font-bold text-foreground font-sans">{selectedUnit.network_status}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-brand/15 pt-1">
                      <span>Cost: <strong className="font-mono text-foreground">{formatGBP(selectedUnit.purchase_cost_pence)}</strong></span>
                      <span className="text-[9px] font-bold uppercase tracking-wider opacity-75">Internal only</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search stock #, IMEI, brand or model…"
                        value={unitQuery}
                        onChange={(e) => handleUnitSearch(e.target.value)}
                        className={`${inputCls} !pl-8 text-xs`}
                        autoFocus
                      />
                      {unitSearchLoading && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2" />
                      )}
                    </div>

                    {unitResults.length > 0 && (
                      <div className="bg-card border border-border rounded-lg overflow-hidden divide-y divide-border shadow-lg max-h-52 overflow-y-auto">
                        {unitResults.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => { setSelectedUnit(u); setUnitResults([]); setUnitQuery(""); }}
                            className="w-full text-left px-2.5 py-1.5 hover:bg-muted/50 transition-colors cursor-pointer flex items-center justify-between gap-2"
                          >
                            <div>
                              <span className="text-xs font-bold text-foreground block">
                                {u.brand} {u.model} {u.storage ? `· ${u.storage}` : ""}
                              </span>
                              <span className="text-[10px] font-mono text-muted-foreground">
                                #{u.stock_number} · {u.imei1}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-foreground">
                              {u.condition_grade}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {unitQuery.length >= 2 && unitResults.length === 0 && !unitSearchLoading && (
                      <div className="p-3 text-center rounded-lg bg-muted/20 border border-dashed border-border text-xs text-muted-foreground">
                        No in-stock phones found for "{unitQuery}".
                        <button
                          type="button"
                          onClick={() => setSaleMode("direct_sale")}
                          className="block mx-auto mt-1 text-xs font-bold text-brand hover:underline cursor-pointer"
                        >
                          Switch to Direct Phone Sale →
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Direct Phone Sale Mode */}
            {saleMode === "direct_sale" && (
              <div className="space-y-1.5">

                {/* 1. Brand & Model */}
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className={labelCls}>Brand *</label>
                    <select
                      value={directBrand}
                      onChange={(e) => handleBrandChange(e.target.value)}
                      className={inputCls}
                    >
                      {BRANDS.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                    {directBrand === "Other" && (
                      <input
                        type="text"
                        placeholder="Custom Brand"
                        value={customBrand}
                        onChange={(e) => {
                          setCustomBrand(e.target.value);
                          setPhoneNameCustomized(false);
                        }}
                        className={`${inputCls} mt-1`}
                      />
                    )}
                  </div>

                  <div className="relative">
                    <label className={labelCls}>Model *</label>
                    <div className="relative">
                      <input
                        ref={modelInputRef}
                        type="text"
                        placeholder={directBrand === "Other" ? "Enter model" : "Search model…"}
                        value={modelDropdownOpen ? modelSearchQuery : directModel}
                        onFocus={() => {
                          setModelSearchQuery(directModel);
                          setModelDropdownOpen(true);
                        }}
                        onChange={(e) => {
                          setModelSearchQuery(e.target.value);
                          setDirectModel(e.target.value);
                          setPhoneNameCustomized(false);
                          if (!modelDropdownOpen) setModelDropdownOpen(true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            if (!modelDropdownOpen) setModelDropdownOpen(true);
                            setModelHighlightedIndex((prev) => Math.min(prev + 1, filteredModels.length));
                          } else if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setModelHighlightedIndex((prev) => Math.max(prev - 1, 0));
                          } else if (e.key === "Enter") {
                            e.preventDefault();
                            e.stopPropagation();
                            if (modelDropdownOpen && filteredModels.length > 0 && modelHighlightedIndex < filteredModels.length) {
                              handleSelectModel(filteredModels[modelHighlightedIndex]);
                            } else {
                              setModelDropdownOpen(false);
                            }
                          } else if (e.key === "Escape") {
                            setModelDropdownOpen(false);
                          }
                        }}
                        className={`${inputCls} pr-6`}
                        required
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Model Dropdown Search */}
                    {modelDropdownOpen && (
                      <div
                        ref={modelDropdownRef}
                        className="absolute left-0 right-0 top-full mt-1 z-30 bg-card border border-border rounded-lg shadow-2xl max-h-44 overflow-y-auto divide-y divide-border/60"
                      >
                        {filteredModels.length > 0 ? (
                          filteredModels.map((m, idx) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => handleSelectModel(m)}
                              className={`w-full text-left px-2.5 py-1 text-xs transition-colors cursor-pointer flex items-center justify-between ${
                                idx === modelHighlightedIndex ? "bg-brand/10 text-brand font-bold" : "hover:bg-muted/50 text-foreground font-medium"
                              }`}
                            >
                              <span>{m}</span>
                              {directModel === m && <Check className="w-3 h-3 text-brand" />}
                            </button>
                          ))
                        ) : (
                          <div className="p-2 text-[11px] text-muted-foreground text-center">
                            No matching model.
                          </div>
                        )}

                        {modelSearchQuery.trim() !== "" && !filteredModels.includes(modelSearchQuery.trim()) && (
                          <button
                            type="button"
                            onClick={() => handleSelectModel(modelSearchQuery.trim())}
                            className="w-full text-left px-2.5 py-1 text-xs text-brand font-bold bg-brand/5 hover:bg-brand/10 transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Use: "{modelSearchQuery.trim()}"</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Phone Name */}
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className={labelCls}>Phone Name</label>
                    <span className="text-[9px] font-mono font-bold px-1 rounded bg-muted text-muted-foreground">
                      Auto
                    </span>
                  </div>
                  <input
                    type="text"
                    value={phoneName}
                    onChange={(e) => {
                      setPhoneName(e.target.value);
                      setPhoneNameCustomized(true);
                    }}
                    className={`${inputCls} bg-muted/15 text-foreground font-semibold`}
                  />
                </div>

                {/* 3. Storage & Colour */}
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className={labelCls}>Storage *</label>
                    <select
                      value={selectedStorage}
                      onChange={(e) => setSelectedStorage(e.target.value)}
                      className={inputCls}
                    >
                      {STORAGE_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    {selectedStorage === "Other" && (
                      <input
                        type="text"
                        placeholder="e.g. 16GB"
                        value={customStorage}
                        onChange={(e) => setCustomStorage(e.target.value)}
                        className={`${inputCls} mt-1`}
                      />
                    )}
                  </div>

                  <div>
                    <label className={labelCls}>Colour *</label>
                    <select
                      value={selectedColour}
                      onChange={(e) => setSelectedColour(e.target.value)}
                      className={inputCls}
                    >
                      {COLOUR_OPTIONS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    {selectedColour === "Other" && (
                      <input
                        type="text"
                        placeholder="Custom Colour"
                        value={customColour}
                        onChange={(e) => setCustomColour(e.target.value)}
                        className={`${inputCls} mt-1`}
                      />
                    )}
                  </div>
                </div>

                {/* 4. Condition Radio Group */}
                <div>
                  <label className={labelCls}>Condition *</label>
                  <div
                    role="radiogroup"
                    aria-label="Device Condition"
                    className="grid grid-cols-5 gap-1"
                  >
                    {CONDITION_GRADES.map((cg) => (
                      <button
                        key={cg}
                        type="button"
                        role="radio"
                        aria-checked={directCondition === cg}
                        tabIndex={directCondition === cg ? 0 : -1}
                        onClick={() => setDirectCondition(cg)}
                        className={`py-1 text-center text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                          directCondition === cg
                            ? "bg-brand text-white border-brand shadow-sm"
                            : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                        }`}
                      >
                        {cg}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. Primary IMEI with 15-digit Counter */}
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className={labelCls}>Primary IMEI *</label>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded transition-colors ${
                      directImei1.replace(/\s+/g, "").length === 15
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-black border border-emerald-500/30"
                        : directImei1.replace(/\s+/g, "").length > 0
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          : "text-muted-foreground bg-muted/60"
                    }`}>
                      {directImei1.replace(/\s+/g, "").length}/15
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="Scan or enter 15-digit IMEI…"
                    value={directImei1}
                    onChange={(e) => setDirectImei1(e.target.value.replace(/[^0-9A-Za-z]/g, ""))}
                    className={`${inputCls} font-mono`}
                    required
                  />
                </div>

                {/* 6. Secondary Checks in Compact Container */}
                <div className="p-2 bg-muted/20 border border-border/80 rounded-lg space-y-1">
                  <div className="grid grid-cols-2 gap-1.5">
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
                          className={`${inputCls} pr-6`}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground pointer-events-none">
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

                  {isApple && (
                    <div>
                      <label className={labelCls}>Face ID Status</label>
                      <div
                        role="radiogroup"
                        aria-label="Face ID Status"
                        className="grid grid-cols-3 gap-1"
                      >
                        {FACE_ID_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            role="radio"
                            aria-checked={faceIdStatus === opt.value}
                            tabIndex={faceIdStatus === opt.value ? 0 : -1}
                            onClick={() => setFaceIdStatus(opt.value)}
                            className={`py-0.5 text-[10px] font-bold rounded border transition-all cursor-pointer ${
                              faceIdStatus === opt.value
                                ? "bg-brand text-white border-brand"
                                : "bg-card border-border text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className={labelCls}>Disclosed Faults / Condition</label>
                    <input
                      type="text"
                      placeholder="e.g. Minor frame marks / None"
                      value={directFaults}
                      onChange={(e) => setDirectFaults(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════
              COLUMN 2: PRICE & PAYMENT + BUYER & WARRANTY
             ═══════════════════════════════════════════════════════════ */}
          <div className="bg-card border border-border/80 rounded-xl p-3 shadow-sm flex flex-col justify-between gap-2 min-h-0 overflow-y-auto no-scrollbar">
            
            {/* Price & Payment */}
            <div className="space-y-2">
              <div className={sectionHeadCls}>
                <Banknote className="w-3.5 h-3.5 text-brand" />
                <span>Price & Payment</span>
              </div>

              {/* Selling Price */}
              <div>
                <label className={labelCls}>Selling Price (£) *</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-base font-black text-foreground pointer-events-none">
                    £
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={priceGBP}
                    onChange={(e) => setPriceGBP(e.target.value)}
                    placeholder="0.00"
                    className={`${inputCls} !pl-6 font-mono font-black text-base !h-[38px]`}
                    required
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className={labelCls}>Payment Method *</label>
                <div
                  role="radiogroup"
                  aria-label="Payment Method"
                  className="grid grid-cols-3 gap-1"
                >
                  {PAYMENT_METHODS.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={paymentMethod === value}
                      tabIndex={paymentMethod === value ? 0 : -1}
                      onClick={() => setPaymentMethod(value as any)}
                      className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        paymentMethod === value
                          ? "bg-brand text-white border-brand shadow-sm"
                          : "bg-muted/20 border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 mb-0.5 shrink-0" />
                      <span className="truncate leading-tight text-center">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cash Calculations */}
              {paymentMethod === "cash" && (
                <div className="p-2 bg-muted/20 border border-border rounded-lg space-y-1">
                  <div>
                    <label className={labelCls}>Cash Received (£)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={cashReceivedGBP}
                      onChange={(e) => setCashReceivedGBP(e.target.value)}
                      placeholder="0.00"
                      className={`${inputCls} font-mono`}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-0.5 border-t border-border">
                    <span className="text-[11px] font-bold text-foreground">Change Due:</span>
                    <span className="text-xs font-mono font-black text-brand">
                      {changeDuePence !== null ? formatGBP(changeDuePence) : "£0.00"}
                    </span>
                  </div>
                </div>
              )}

              {/* Internal Cost */}
              {saleMode === "direct_sale" && (
                <div className="pt-1 border-t border-border/80">
                  <div className="flex items-center justify-between mb-0.5">
                    <label className={labelCls}>Cost to Business (£)</label>
                    <span className="text-[9px] text-muted-foreground font-mono">Internal only</span>
                  </div>
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
              )}
            </div>

            {/* Buyer & Warranty */}
            <div className="space-y-2 pt-1 border-t border-border/80">
              {/* Buyer */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <User className="w-3 h-3 text-brand" /> Buyer — Optional
                  </span>
                  {!selectedBuyer && !showAddCustomer && (
                    <button
                      type="button"
                      onClick={() => setShowAddCustomer(true)}
                      className="text-[10px] font-bold text-brand hover:underline cursor-pointer flex items-center gap-0.5"
                    >
                      <Plus className="w-2.5 h-2.5" /> New Customer
                    </button>
                  )}
                </div>

                {selectedBuyer ? (
                  <div className="flex items-center justify-between p-1.5 bg-brand/5 border border-brand/20 rounded-lg">
                    <div>
                      <p className="text-xs font-bold text-foreground leading-tight">{selectedBuyer.name}</p>
                      {selectedBuyer.phone && (
                        <p className="text-[10px] text-muted-foreground font-mono leading-tight">{selectedBuyer.phone}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedBuyer(null)}
                      className="px-1.5 py-0.5 text-[11px] font-bold text-brand hover:underline cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                ) : showAddCustomer ? (
                  <div className="p-2 bg-muted/30 border border-border rounded-lg space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-foreground uppercase">New Customer</span>
                      <button
                        type="button"
                        onClick={() => setShowAddCustomer(false)}
                        className="text-[10px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <input
                        type="text"
                        placeholder="Name"
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        className={inputCls}
                      />
                      <input
                        type="tel"
                        placeholder="Phone"
                        value={newCustomerPhone}
                        onChange={(e) => setNewCustomerPhone(e.target.value)}
                        className={`${inputCls} font-mono`}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search customer name or phone…"
                      value={buyerQuery}
                      onChange={(e) => handleBuyerSearch(e.target.value)}
                      className={`${inputCls} !pl-8 text-xs`}
                    />
                    {buyerSearchLoading && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2" />
                    )}

                    {buyerResults.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-card border border-border rounded-lg overflow-hidden divide-y divide-border shadow-xl max-h-36 overflow-y-auto">
                        {buyerResults.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSelectedBuyer(c);
                              setBuyerResults([]);
                              setBuyerQuery("");
                            }}
                            className="w-full text-left px-2.5 py-1 hover:bg-muted/50 transition-colors text-xs cursor-pointer flex items-center justify-between"
                          >
                            <span className="font-bold text-foreground">{c.name}</span>
                            {c.phone && <span className="font-mono text-muted-foreground text-[10px]">{c.phone}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Warranty */}
              <div>
                <label className={labelCls}>Warranty Days (Optional)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={warrantyDays}
                  onChange={(e) => setWarrantyDays(e.target.value)}
                  placeholder="e.g. 90 (0 for none, blank for unspecified)"
                  className={inputCls}
                />
                {warrantyDays.trim() !== "" && parseInt(warrantyDays, 10) > 0 && (
                  <div className="mt-1">
                    <label className={labelCls}>Warranty Policy (Printed on Invoice)</label>
                    <textarea
                      rows={2}
                      value={warrantyPolicy}
                      onChange={(e) => setWarrantyPolicy(e.target.value)}
                      placeholder="Covers hardware faults. Excludes accidental/liquid damage."
                      className={`${inputCls} resize-none !h-auto`}
                    />
                  </div>
                )}
              </div>

              {/* Internal Notes */}
              <div>
                <label className={labelCls}>Internal Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="Counter notes / reference…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

          </div>

          {/* ═══════════════════════════════════════════════════════════
              COLUMN 3: LIVE READ-ONLY SALE SUMMARY (RECEIPT-STYLE)
             ═══════════════════════════════════════════════════════════ */}
          <div className="bg-card border border-border/80 rounded-xl p-3.5 shadow-sm flex flex-col justify-between gap-2.5 min-h-0 overflow-y-auto no-scrollbar">
            <div className="space-y-2.5">
              <div className={sectionHeadCls}>
                <Receipt className="w-3.5 h-3.5 text-brand" />
                <span>Sale Summary</span>
              </div>

              {/* Device & Identifiers */}
              <div className="p-2.5 bg-muted/20 border border-border/70 rounded-lg space-y-1">
                <p className="font-extrabold text-xs sm:text-sm text-foreground leading-tight">
                  {summaryDeviceTitle}
                </p>
                <p className="text-xs text-muted-foreground font-medium leading-tight">
                  {summarySpecs}
                </p>
                {summaryImeiEnding && (
                  <p className="text-[11px] font-mono text-muted-foreground pt-0.5">
                    {summaryImeiEnding}
                  </p>
                )}
                {saleMode === "from_stock" && selectedUnit && (
                  <p className="text-[10px] font-mono text-muted-foreground">
                    Stock #{selectedUnit.stock_number}
                  </p>
                )}
              </div>

              {/* Transaction Attributes */}
              <div className="space-y-1 text-xs border border-border/70 rounded-lg p-2.5 bg-card">
                <div className="flex justify-between text-muted-foreground">
                  <span>Buyer:</span>
                  <span className="font-semibold text-foreground truncate max-w-[150px]">{summaryBuyerName}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Payment:</span>
                  <span className="font-semibold text-foreground capitalize">{paymentMethod.replace("_", " ")}</span>
                </div>
                {paymentMethod === "cash" && cashReceivedPence !== null && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tendered:</span>
                    <span className="font-mono text-foreground">{formatGBP(cashReceivedPence)}</span>
                  </div>
                )}
                {paymentMethod === "cash" && changeDuePence !== null && changeDuePence > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Change Due:</span>
                    <span className="font-mono font-bold text-brand">{formatGBP(changeDuePence)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>Warranty:</span>
                  <span className="font-medium text-foreground">{summaryWarrantyText}</span>
                </div>
              </div>
            </div>

            {/* Total & Internal Cost */}
            <div className="space-y-2 pt-2 border-t border-border">
              {/* Bold Total */}
              <div className="p-2.5 bg-brand/5 border border-brand/20 rounded-lg flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-foreground">TOTAL:</span>
                <span className="text-lg font-mono font-black text-brand">
                  {pricePence > 0 ? formatGBP(pricePence) : "£0.00"}
                </span>
              </div>

              {/* Internal Profit Breakdown */}
              <div className="px-2.5 py-1.5 rounded-lg text-[10px] text-muted-foreground bg-muted/30 border border-border flex items-center justify-between">
                <span>
                  Internal: {costPence !== null ? `Cost ${formatGBP(costPence)}` : "Cost pending"}
                  {margin !== null ? ` · Margin ${formatGBP(margin)}` : ""}
                </span>
                <span className="font-mono uppercase opacity-75 font-semibold text-[9px]">Internal</span>
              </div>
            </div>

          </div>

        </div>

        {/* ── FIXED FOOTER (h-14 shrink-0) ── */}
        <footer className="h-14 px-4 sm:px-6 border-t border-border bg-card flex items-center justify-between shrink-0 shadow-md z-20">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {paymentMethod === "cash" && !shiftId && (
              <span className="text-destructive font-bold flex items-center gap-1 px-2 py-0.5 bg-destructive/10 border border-destructive/20 rounded">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> No Till Shift Open
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="px-4 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer min-h-[38px] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || (saleMode === "from_stock" && !selectedUnit)}
              className="px-6 py-1.5 text-xs font-black text-white bg-brand hover:bg-brand/90 active:scale-[0.99] rounded-lg shadow-md transition-all cursor-pointer min-h-[38px] flex items-center gap-2 disabled:opacity-50 tracking-wide"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>{submitting ? "Processing…" : "SELL & PRINT INVOICE"}</span>
            </button>
          </div>
        </footer>

      </form>

    </div>
  );
}
