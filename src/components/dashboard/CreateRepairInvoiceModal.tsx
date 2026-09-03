import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createQuickRepairInvoice } from "@/lib/repairs.functions";
import {
  X,
  Plus,
  Trash2,
  Loader2,
  Banknote,
  CreditCard,
  Building2,
  CheckCircle2,
  ChevronDown,
  Search,
  Printer,
} from "lucide-react";
import { toast } from "sonner";

// ── Device models list ───────────────────────────────────────────────────────
const DEVICE_MODELS: string[] = [
  // Apple iPhone
  "iPhone 16 Pro Max", "iPhone 16 Pro", "iPhone 16 Plus", "iPhone 16",
  "iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15 Plus", "iPhone 15",
  "iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 14 Plus", "iPhone 14",
  "iPhone 13 Pro Max", "iPhone 13 Pro", "iPhone 13 Mini", "iPhone 13",
  "iPhone 12 Pro Max", "iPhone 12 Pro", "iPhone 12 Mini", "iPhone 12",
  "iPhone 11 Pro Max", "iPhone 11 Pro", "iPhone 11",
  "iPhone XS Max", "iPhone XS", "iPhone XR", "iPhone X",
  "iPhone SE (3rd Gen)", "iPhone SE (2nd Gen)",
  "iPhone 8 Plus", "iPhone 8", "iPhone 7 Plus", "iPhone 7",
  // Apple iPad
  "iPad Pro 13\" (M4)", "iPad Pro 11\" (M4)", "iPad Air 13\" (M2)", "iPad Air 11\" (M2)",
  "iPad Mini (6th Gen)", "iPad (10th Gen)", "iPad (9th Gen)",
  // Apple Mac
  "MacBook Pro 16\"", "MacBook Pro 14\"", "MacBook Air 15\"", "MacBook Air 13\"",
  // Samsung Galaxy S
  "Samsung Galaxy S25 Ultra", "Samsung Galaxy S25+", "Samsung Galaxy S25",
  "Samsung Galaxy S24 Ultra", "Samsung Galaxy S24+", "Samsung Galaxy S24 FE", "Samsung Galaxy S24",
  "Samsung Galaxy S23 Ultra", "Samsung Galaxy S23+", "Samsung Galaxy S23 FE", "Samsung Galaxy S23",
  "Samsung Galaxy S22 Ultra", "Samsung Galaxy S22+", "Samsung Galaxy S22",
  "Samsung Galaxy S21 Ultra", "Samsung Galaxy S21+", "Samsung Galaxy S21 FE", "Samsung Galaxy S21",
  // Samsung Galaxy A
  "Samsung Galaxy A55", "Samsung Galaxy A54", "Samsung Galaxy A35", "Samsung Galaxy A34",
  "Samsung Galaxy A25", "Samsung Galaxy A24", "Samsung Galaxy A15", "Samsung Galaxy A14",
  // Samsung Note / Tab
  "Samsung Galaxy Note 20 Ultra", "Samsung Galaxy Note 20",
  "Samsung Galaxy Tab S9 Ultra", "Samsung Galaxy Tab S9+", "Samsung Galaxy Tab S9",
  "Samsung Galaxy Tab S8 Ultra", "Samsung Galaxy Tab S8+", "Samsung Galaxy Tab S8",
  // Google Pixel
  "Google Pixel 9 Pro XL", "Google Pixel 9 Pro Fold", "Google Pixel 9 Pro", "Google Pixel 9",
  "Google Pixel 8 Pro", "Google Pixel 8a", "Google Pixel 8",
  "Google Pixel 7 Pro", "Google Pixel 7a", "Google Pixel 7",
  "Google Pixel 6 Pro", "Google Pixel 6a", "Google Pixel 6",
  // Huawei
  "Huawei P60 Pro", "Huawei P50 Pro", "Huawei P40 Pro", "Huawei P30 Pro",
  "Huawei Mate 60 Pro", "Huawei Mate 50 Pro", "Huawei Nova 11",
  // Xiaomi
  "Xiaomi 14 Ultra", "Xiaomi 14 Pro", "Xiaomi 14",
  "Xiaomi 13 Ultra", "Xiaomi 13 Pro", "Xiaomi 13",
  "Xiaomi Redmi Note 13 Pro", "Xiaomi Redmi Note 13", "Xiaomi Redmi 13C",
  "Xiaomi POCO X6 Pro", "Xiaomi POCO X6",
  // OnePlus
  "OnePlus 12 Pro", "OnePlus 12", "OnePlus 11", "OnePlus 10 Pro",
  "OnePlus Nord 4", "OnePlus Nord CE 4", "OnePlus Nord CE 3",
  // Oppo
  "Oppo Find X8 Pro", "Oppo Find X7 Ultra", "Oppo Reno 12 Pro", "Oppo Reno 12",
  "Oppo A98", "Oppo A78",
  // Motorola
  "Motorola Edge 50 Pro", "Motorola Edge 40 Pro", "Motorola Moto G84", "Motorola Moto G54",
  // Sony
  "Sony Xperia 1 VI", "Sony Xperia 5 V", "Sony Xperia 10 V",
  // Laptops
  "Dell XPS 15", "Dell XPS 13", "Dell Inspiron 15", "Dell Inspiron 14",
  "HP Spectre x360", "HP Envy 15", "HP Pavilion 15", "HP Laptop 15",
  "Lenovo ThinkPad X1 Carbon", "Lenovo IdeaPad 5", "Lenovo Yoga 9i",
  "Asus ROG Zephyrus", "Asus ZenBook 14", "Asus VivoBook 15",
  "Acer Swift 5", "Acer Aspire 5",
  "Microsoft Surface Pro 9", "Microsoft Surface Laptop 5",
  // Gaming Consoles
  "PlayStation 5", "PlayStation 4 Pro", "PlayStation 4",
  "Xbox Series X", "Xbox Series S", "Xbox One X", "Xbox One",
  "Nintendo Switch OLED", "Nintendo Switch", "Nintendo Switch Lite",
];

// ── Repair types list ────────────────────────────────────────────────────────
const REPAIR_TYPES: string[] = [
  "Screen Replacement",
  "Battery Replacement",
  "Charging Port Repair",
  "Back Glass Replacement",
  "Camera Repair (Rear)",
  "Camera Repair (Front)",
  "Speaker Repair",
  "Earpiece Repair",
  "Microphone Repair",
  "Water Damage Repair",
  "Power Button Repair",
  "Volume Button Repair",
  "Home Button Repair",
  "SIM Card Reader Repair",
  "Headphone Jack Repair",
  "Face ID Repair",
  "Touch ID / Fingerprint Repair",
  "HDMI Port Repair",
  "USB Port Repair",
  "Motherboard Repair",
  "Cracked Frame / Housing Repair",
  "Software / iOS Reset & Restore",
  "Software / Android Reset & Restore",
  "Network Unlock / SIM Unlock",
  "IMEI Repair",
  "Data Recovery",
  "Liquid Damage Assessment",
  "Diagnostic Check",
  "Screen Protector Fitting",
  "Console HDMI Port Repair",
  "Console Fan Replacement",
  "Console Disc Drive Repair",
  "Keyboard Replacement",
  "Trackpad Repair",
  "Laptop Screen Replacement",
  "Laptop Battery Replacement",
  "Laptop Charging Port Repair",
  "RAM Upgrade",
  "SSD Upgrade",
  "Other Repair",
];

// ── Default warranty terms text ──────────────────────────────────────────────
const DEFAULT_WARRANTY_TERMS =
  "Covers the parts fitted and workmanship for this repair during the warranty period. Physical damage, liquid damage and faults unrelated to this repair are not covered.";

// ── Types ────────────────────────────────────────────────────────────────────
interface RepairItem {
  description: string;
  price: string;           // pounds string for input
  warranty_days: string;   // blank = Not Specified; "0" = No Warranty
  warranty_policy: string; // freely editable warranty terms
}

interface CreateRepairInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (repair: any) => void;
}

// Blank by default — warranty_days empty so staff must consciously enter
const BLANK_ITEM: RepairItem = {
  description: "",
  price: "",
  warranty_days: "",
  warranty_policy: DEFAULT_WARRANTY_TERMS,
};

// ── Shared style tokens ──────────────────────────────────────────────────────
const inp =
  "w-full px-3 h-[38px] border border-slate-200 rounded-lg text-[13px] text-slate-900 bg-white " +
  "focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 placeholder:text-slate-400 " +
  "transition-colors";
const lbl = "block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1";
const sectionTitle = "text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3";

// ── SearchableCombobox ───────────────────────────────────────────────────────
interface SearchableComboboxProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  autoFocus?: boolean;
}

function SearchableCombobox({
  value,
  onChange,
  options,
  placeholder = "Type or select…",
  autoFocus = false,
}: SearchableComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        onChange(query.trim());
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [query, onChange]);

  const filtered = query.trim()
    ? options.filter((o) => o.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") { setOpen(false); onChange(query.trim()); }
            if (e.key === "Enter") setOpen(false);
          }}
          placeholder={placeholder}
          className={inp + " pl-9 pr-8 font-medium"}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => { setOpen((v) => !v); inputRef.current?.focus(); }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-52 overflow-y-auto">
          {filtered.slice(0, 60).map((option) => (
            <button
              key={option}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setQuery(option); onChange(option); setOpen(false);
                inputRef.current?.blur();
              }}
              className={`w-full text-left px-3 py-2 text-[12px] font-medium hover:bg-brand/5 hover:text-brand transition-colors border-b border-slate-50 last:border-0 ${
                option === query ? "bg-brand/5 text-brand font-semibold" : "text-slate-800"
              }`}
            >
              {option}
            </button>
          ))}
          {query.trim() && !options.some((o) => o.toLowerCase() === query.trim().toLowerCase()) && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setQuery(query.trim()); onChange(query.trim()); setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-[12px] text-slate-500 italic hover:bg-slate-50 border-t border-slate-200"
            >
              Use &ldquo;{query.trim()}&rdquo; as custom entry
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────
export function CreateRepairInvoiceModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateRepairInvoiceModalProps) {
  const createFn = useServerFn(createQuickRepairInvoice);

  // ── Form state ──────────────────────────────────────────────────────────
  const [deviceModel, setDeviceModel] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerImei, setCustomerImei] = useState("");
  const [items, setItems] = useState<RepairItem[]>([{ ...BLANK_ITEM }]);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "bank_transfer">("cash");
  const [isPaid, setIsPaid] = useState(true);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitAndPrint, setSubmitAndPrint] = useState(false);

  if (!isOpen) return null;

  // ── Derived ──────────────────────────────────────────────────────────────
  const totalPounds = items.reduce((acc, i) => acc + (parseFloat(i.price) || 0), 0);

  // ── Item helpers ─────────────────────────────────────────────────────────
  function addItem() {
    setItems((prev) => [...prev, { ...BLANK_ITEM }]);
  }
  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateItem(idx: number, patch: Partial<RepairItem>) {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  }

  // ── Reset ────────────────────────────────────────────────────────────────
  function resetForm() {
    setDeviceModel("");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerImei("");
    setItems([{ ...BLANK_ITEM }]);
    setPaymentMethod("cash");
    setIsPaid(true);
    setNotes("");
    setSubmitAndPrint(false);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent, printAfter = false) {
    e.preventDefault();

    if (!deviceModel.trim()) {
      toast.error("Device / Model is required");
      return;
    }
    const validItems = items.filter((i) => i.description.trim() && parseFloat(i.price) > 0);
    if (validItems.length === 0) {
      toast.error("At least one repair item with a price > 0 is required");
      return;
    }

    setSubmitting(true);
    setSubmitAndPrint(printAfter);
    try {
      const repair = await createFn({
        data: {
          device_model: deviceModel.trim(),
          items: validItems.map((i) => {
            const daysInt = parseInt(i.warranty_days);
            return {
              description: i.description.trim(),
              price_pence: Math.round(parseFloat(i.price) * 100),
              warranty_days: i.warranty_days.trim() === "" ? null : isNaN(daysInt) ? null : daysInt,
              warranty_policy_text: i.warranty_policy.trim() || null,
            };
          }),
          customer_name: customerName.trim() || null,
          customer_phone: customerPhone.trim() || null,
          payment_method: paymentMethod,
          is_paid: isPaid,
          notes: notes.trim() || null,
        },
      });

      toast.success(`Invoice ${repair.rep_number} created!`);
      resetForm();
      onSuccess(repair);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create invoice. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-[#f5f5f4] flex flex-col" style={{ height: "100dvh" }}>

      {/* ── TOP HEADER BAR ──────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200">
        <div>
          <h1 className="text-[15px] font-bold text-slate-900 leading-tight">Create Repair Invoice</h1>
          <p className="text-[12px] text-slate-400 mt-0.5">
            New repair · All repairs are counter-finalized on save
          </p>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── THREE-COLUMN BODY ────────────────────────────────────────────── */}
      <div
        className="flex-1 min-h-0 grid"
        style={{
          gridTemplateColumns: "minmax(240px, 0.8fr) minmax(420px, 1.8fr) minmax(280px, 1fr)",
        }}
      >
        {/* ── LEFT: CUSTOMER & DEVICE ─────────────────────────────────── */}
        <div className="border-r border-slate-200 bg-white overflow-y-auto px-4 py-5">
          <p className={sectionTitle}>Customer &amp; Device</p>

          <div className="space-y-3">
            <div>
              <label className={lbl}>Customer name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Optional"
                className={inp}
              />
            </div>
            <div>
              <label className={lbl}>Phone</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Optional"
                className={inp}
              />
            </div>

            <div className="pt-1 border-t border-slate-100" />

            <div>
              <label className={lbl}>
                Device / Model <span className="text-red-500">*</span>
              </label>
              <SearchableCombobox
                value={deviceModel}
                onChange={setDeviceModel}
                options={DEVICE_MODELS}
                placeholder="e.g. iPhone 14, Galaxy S24…"
                autoFocus
              />
            </div>

            <div>
              <label className={lbl}>IMEI / Serial <span className="text-slate-300 font-normal">(optional)</span></label>
              <input
                type="text"
                value={customerImei}
                onChange={(e) => setCustomerImei(e.target.value)}
                placeholder="15-digit IMEI or serial"
                className={inp + " font-mono"}
              />
            </div>
          </div>
        </div>

        {/* ── CENTRE: REPAIR ITEMS ─────────────────────────────────────── */}
        <div className="border-r border-slate-200 bg-[#f5f5f4] overflow-y-auto px-5 py-5 flex flex-col">
          <p className={sectionTitle}>Repair Items</p>

          <div className="space-y-3 flex-1">
            {items.map((item, idx) => (
              <RepairItemCard
                key={idx}
                item={item}
                idx={idx}
                isOnly={items.length === 1}
                onUpdate={(patch) => updateItem(idx, patch)}
                onRemove={() => removeItem(idx)}
              />
            ))}
          </div>

          {/* Add another item */}
          <button
            type="button"
            onClick={addItem}
            className="mt-3 w-full py-2.5 border border-dashed border-slate-300 rounded-lg text-[12px] font-semibold text-slate-500 hover:border-brand hover:text-brand hover:bg-brand/5 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Another Repair
          </button>
        </div>

        {/* ── RIGHT: INVOICE SUMMARY ───────────────────────────────────── */}
        <div className="bg-white overflow-y-auto flex flex-col">
          <form
            onSubmit={(e) => handleSubmit(e, false)}
            className="flex flex-col h-full px-4 py-5"
          >
            <p className={sectionTitle}>Invoice Summary</p>

            {/* Live repairs list */}
            <div className="space-y-1 mb-3">
              {items.map((item, idx) => {
                const price = parseFloat(item.price) || 0;
                return (
                  <div key={idx} className="flex items-baseline justify-between gap-2">
                    <span className="text-[12px] text-slate-600 truncate flex-1 min-w-0">
                      {item.description || `Repair ${idx + 1}`}
                    </span>
                    <span className="text-[12px] font-semibold text-slate-900 font-mono shrink-0 tabular-nums">
                      {price > 0 ? `£${price.toFixed(2)}` : "—"}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Totals */}
            <div className="border-t border-slate-200 pt-2 mb-4">
              <div className="flex justify-between items-baseline">
                <span className="text-[12px] font-semibold text-slate-500">Subtotal</span>
                <span className="text-[12px] font-semibold text-slate-900 font-mono tabular-nums">
                  £{totalPounds.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-baseline mt-1.5 pt-1.5 border-t border-slate-200">
                <span className="text-[14px] font-bold text-slate-900">Total</span>
                <span className="text-[20px] font-black text-slate-900 font-mono tabular-nums tracking-tight">
                  £{totalPounds.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment method */}
            <div className="mb-3">
              <p className={lbl}>Payment</p>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: "cash", label: "Cash", Icon: Banknote },
                    { id: "card", label: "Card", Icon: CreditCard },
                    { id: "bank_transfer", label: "Bank", Icon: Building2 },
                  ] as const
                ).map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPaymentMethod(id)}
                    className={`h-[36px] flex items-center justify-center gap-1 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer ${
                      paymentMethod === id
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-400"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Paid in Full */}
            <button
              type="button"
              onClick={() => setIsPaid((p) => !p)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border-2 transition-all cursor-pointer mb-3 ${
                isPaid
                  ? "border-emerald-400 bg-emerald-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <span className={`text-[12px] font-semibold ${isPaid ? "text-emerald-700" : "text-slate-500"}`}>
                Paid in Full
              </span>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  isPaid ? "bg-emerald-500 border-emerald-500" : "bg-white border-slate-300"
                }`}
              >
                {isPaid && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
              </div>
            </button>

            {/* Notes */}
            <div className="mb-4">
              <label className={lbl}>Notes <span className="text-slate-300 font-normal">(internal)</span></label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes for this repair…"
                rows={2}
                className={
                  "w-full px-3 py-2 border border-slate-200 rounded-lg text-[12px] text-slate-900 bg-white " +
                  "focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 resize-none placeholder:text-slate-400"
                }
              />
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Action buttons */}
            <div className="space-y-2 pt-3 border-t border-slate-100">
              {/* Save & Print — primary */}
              <button
                type="button"
                onClick={(e) => handleSubmit(e as any, true)}
                disabled={submitting}
                className="w-full h-[44px] flex items-center justify-center gap-2 bg-brand hover:bg-brand/90 disabled:opacity-60 text-white font-bold rounded-lg text-[13px] transition-all cursor-pointer"
              >
                {submitting && submitAndPrint ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Printer className="w-4 h-4" />
                )}
                {submitting && submitAndPrint ? "Saving…" : "Save & Print Invoice"}
              </button>

              {/* Save only — secondary */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-[40px] flex items-center justify-center bg-white border border-slate-200 text-slate-700 font-semibold rounded-lg text-[13px] hover:bg-slate-50 hover:border-slate-300 disabled:opacity-60 transition-colors cursor-pointer"
              >
                {submitting && !submitAndPrint ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : null}
                {submitting && !submitAndPrint ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── RESPONSIVE MOBILE FALLBACK (below lg: stacks) ───────────────── */}
      <style>{`
        @media (max-width: 900px) {
          .repair-workspace-grid {
            grid-template-columns: 1fr !important;
            height: auto !important;
          }
        }
      `}</style>
    </div>
  );
}

// ── RepairItemCard ────────────────────────────────────────────────────────────
interface RepairItemCardProps {
  item: RepairItem;
  idx: number;
  isOnly: boolean;
  onUpdate: (patch: Partial<RepairItem>) => void;
  onRemove: () => void;
}

function RepairItemCard({ item, idx, isOnly, onUpdate, onRemove }: RepairItemCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-[0_1px_2px_rgba(0,0,0,.04)]">
      {/* Card header: label + Remove */}
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Repair {idx + 1}
        </span>
        {!isOnly && (
          <button
            type="button"
            onClick={onRemove}
            className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remove
          </button>
        )}
      </div>

      {/* Repair / Work */}
      <div className="mb-2.5">
        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
          Repair / Work <span className="text-red-500">*</span>
        </label>
        <SearchableCombobox
          value={item.description}
          onChange={(val) => onUpdate({ description: val })}
          options={REPAIR_TYPES}
          placeholder={`e.g. Screen Replacement`}
        />
      </div>

      {/* Price + Warranty Days — same row */}
      <div className="grid grid-cols-2 gap-3 mb-2.5">
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Price <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[13px] font-semibold pointer-events-none">
              £
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={item.price}
              onChange={(e) => onUpdate({ price: e.target.value })}
              placeholder="0.00"
              className={
                "w-full pl-6 pr-2 h-[38px] border border-slate-200 rounded-lg text-[13px] font-bold text-slate-900 bg-white " +
                "focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 text-right"
              }
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Warranty
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min="0"
              value={item.warranty_days}
              onChange={(e) => onUpdate({ warranty_days: e.target.value })}
              placeholder="—"
              className={
                "w-20 h-[38px] px-2 border border-slate-200 rounded-lg text-[13px] font-bold text-slate-900 bg-white " +
                "focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 text-center"
              }
            />
            <span className="text-[12px] text-slate-500 font-medium whitespace-nowrap">
              {item.warranty_days === ""
                ? "days — optional"
                : item.warranty_days === "0"
                ? "days (none)"
                : "days"}
            </span>
          </div>
        </div>
      </div>

      {/* Warranty / Repair Terms */}
      <div>
        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
          Warranty / Repair Terms
        </label>
        <textarea
          value={item.warranty_policy}
          onChange={(e) => onUpdate({ warranty_policy: e.target.value })}
          placeholder="Describe warranty coverage for this repair…"
          rows={2}
          className={
            "w-full px-3 py-2 border border-slate-200 rounded-lg text-[11px] text-slate-900 bg-white " +
            "focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 resize-none placeholder:text-slate-400 leading-relaxed"
          }
        />
      </div>
    </div>
  );
}
