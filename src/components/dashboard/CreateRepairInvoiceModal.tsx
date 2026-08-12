import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { createQuickRepairInvoice, listWarrantyTemplates } from "@/lib/repairs.functions";
import {
  X,
  Plus,
  Trash2,
  Loader2,
  Zap,
  Banknote,
  CreditCard,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ───────────────────────────────────────────────────────────────────
interface RepairItem {
  description: string;
  price: string; // pounds string for input
  warranty_days: string; // blank = not specified
  warranty_policy: string; // editable policy text
  template_id: string; // "" = none/manual
}

interface CreateRepairInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (repair: any) => void;
}

// Blank by default — no hidden 90-day assumption
const BLANK_ITEM: RepairItem = {
  description: "",
  price: "",
  warranty_days: "",
  warranty_policy: "",
  template_id: "",
};

// ── Component ───────────────────────────────────────────────────────────────
export function CreateRepairInvoiceModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateRepairInvoiceModalProps) {
  const createFn = useServerFn(createQuickRepairInvoice);
  const templatesFn = useServerFn(listWarrantyTemplates);

  // Fetch warranty templates (cached)
  const { data: templates = [] } = useQuery({
    queryKey: ["warranty-templates"],
    queryFn: () => templatesFn(),
    staleTime: 1000 * 60 * 5,
    enabled: isOpen,
  });

  // ── Form state ─────────────────────────────────────────────────────────
  const [deviceModel, setDeviceModel] = useState("");
  const [items, setItems] = useState<RepairItem[]>([{ ...BLANK_ITEM }]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "bank_transfer">("cash");
  const [isPaid, setIsPaid] = useState(true);
  const [notes, setNotes] = useState("");
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  // ── Derived ─────────────────────────────────────────────────────────────
  const totalPounds = items.reduce((acc, i) => acc + (parseFloat(i.price) || 0), 0);

  // ── Item helpers ────────────────────────────────────────────────────────
  function addItem() {
    setItems((prev) => [...prev, { ...BLANK_ITEM }]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, patch: Partial<RepairItem>) {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  }

  // When a template is selected → copy days + policy into the item.
  // The template itself is NOT mutated — just a starting point.
  function applyTemplate(idx: number, templateId: string) {
    const tmpl = (templates as any[]).find((t) => t.id === templateId);
    if (!tmpl) {
      // "None" selected — clear template fields but keep manual values
      updateItem(idx, { template_id: "" });
      return;
    }
    updateItem(idx, {
      template_id: templateId,
      warranty_days: String(tmpl.default_days ?? ""),
      warranty_policy: tmpl.policy_text ?? "",
    });
  }

  // ── Reset ────────────────────────────────────────────────────────────────
  function resetForm() {
    setDeviceModel("");
    setItems([{ ...BLANK_ITEM }]);
    setCustomerName("");
    setCustomerPhone("");
    setPaymentMethod("cash");
    setIsPaid(true);
    setNotes("");
    setShowMoreDetails(false);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
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
    try {
      const repair = await createFn({
        data: {
          device_model: deviceModel.trim(),
          items: validItems.map((i) => {
            const daysInt = parseInt(i.warranty_days);
            return {
              description: i.description.trim(),
              price_pence: Math.round(parseFloat(i.price) * 100),
              // NULL = not specified; 0 = no warranty; N = N days
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
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg my-3 sm:my-auto border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span className="font-extrabold text-sm tracking-tight">Create Repair Invoice</span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* ── Device / Model ── */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Device / Model <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={deviceModel}
              onChange={(e) => setDeviceModel(e.target.value)}
              placeholder="e.g. iPhone 13 Pro, Samsung S24 Ultra..."
              autoFocus
              className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-semibold text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 transition-all placeholder:text-slate-400 placeholder:font-normal"
            />
          </div>

          {/* ── Repair Items ── */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Repair / Work <span className="text-rose-500">*</span>
            </label>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <RepairItemRow
                  key={idx}
                  item={item}
                  idx={idx}
                  templates={templates as any[]}
                  canRemove={items.length > 1}
                  onUpdate={(patch) => updateItem(idx, patch)}
                  onApplyTemplate={(tid) => applyTemplate(idx, tid)}
                  onRemove={() => removeItem(idx)}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={addItem}
              className="mt-2.5 w-full py-2 border border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-500 hover:border-brand hover:text-brand hover:bg-brand/5 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add Another Item
            </button>
          </div>

          {/* ── Customer (Optional) ── */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                Customer — Optional
              </span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Name"
                className="px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-semibold text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 placeholder:text-slate-400 placeholder:font-normal"
              />
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Phone"
                className="px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-semibold text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 placeholder:text-slate-400 placeholder:font-normal"
              />
            </div>
          </div>

          {/* ── Payment ── */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                Payment
              </span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            </div>

            {/* Method buttons */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {(
                [
                  { id: "cash", label: "Cash", Icon: Banknote, color: "text-emerald-500" },
                  { id: "card", label: "Card", Icon: CreditCard, color: "text-sky-500" },
                  { id: "bank_transfer", label: "Bank", Icon: Building2, color: "text-amber-500" },
                ] as const
              ).map(({ id, label, Icon, color }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPaymentMethod(id)}
                  className={`py-2 px-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    paymentMethod === id
                      ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${paymentMethod === id ? "text-white" : color}`} />
                  {label}
                </button>
              ))}
            </div>

            {/* Paid in Full toggle — default ON */}
            <button
              type="button"
              onClick={() => setIsPaid((p) => !p)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border-2 transition-all cursor-pointer ${
                isPaid
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                  : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
              }`}
            >
              <span
                className={`text-xs font-extrabold ${isPaid ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}
              >
                Paid in Full
              </span>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  isPaid
                    ? "bg-emerald-600 border-emerald-600"
                    : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                }`}
              >
                {isPaid && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
              </div>
            </button>
          </div>

          {/* ── More Details (collapsible) ── */}
          <div>
            <button
              type="button"
              onClick={() => setShowMoreDetails((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer py-1"
            >
              {showMoreDetails ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
              More Details
            </button>

            {showMoreDetails && (
              <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-150">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Internal notes for this repair..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 resize-none placeholder:text-slate-400"
                />
              </div>
            )}
          </div>

          {/* ── Total + Submit ── */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Total</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                £{totalPounds.toFixed(2)}
              </span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-brand hover:bg-brand/90 active:scale-[0.99] disabled:opacity-60 text-white font-extrabold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving & Printing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                  Save & Print Invoice
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── RepairItemRow sub-component ──────────────────────────────────────────────
interface RepairItemRowProps {
  item: RepairItem;
  idx: number;
  templates: any[];
  canRemove: boolean;
  onUpdate: (patch: Partial<RepairItem>) => void;
  onApplyTemplate: (templateId: string) => void;
  onRemove: () => void;
}

function RepairItemRow({
  item,
  idx,
  templates,
  canRemove,
  onUpdate,
  onApplyTemplate,
  onRemove,
}: RepairItemRowProps) {
  const [showWarranty, setShowWarranty] = useState(false);
  const hasWarranty = item.warranty_days.trim() !== "" || item.warranty_policy.trim() !== "";

  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 space-y-2.5">
      {/* Row 1: Description */}
      <input
        type="text"
        value={item.description}
        onChange={(e) => onUpdate({ description: e.target.value })}
        placeholder={`Repair item ${idx + 1} — e.g. Screen Replacement`}
        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-semibold text-slate-900 dark:text-white bg-white dark:bg-slate-900 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 placeholder:text-slate-400 placeholder:font-normal"
      />

      {/* Row 2: Price + Warranty toggle + Remove */}
      <div className="flex items-center gap-2">
        {/* Price */}
        <div className="relative flex-1">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold pointer-events-none">
            £
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={item.price}
            onChange={(e) => onUpdate({ price: e.target.value })}
            placeholder="0.00"
            className="w-full pl-6 pr-2 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-900 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 text-right"
          />
        </div>

        {/* Warranty expand toggle */}
        <button
          type="button"
          onClick={() => setShowWarranty((v) => !v)}
          title="Warranty options"
          className={`flex items-center gap-1 px-2.5 py-2 rounded-lg border text-[10px] font-bold transition-all cursor-pointer shrink-0 ${
            hasWarranty
              ? "border-sky-400 bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400"
              : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-400 hover:border-slate-400"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          {hasWarranty ? (item.warranty_days ? `${item.warranty_days}d` : "Policy") : "Warranty"}
          {showWarranty ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {/* Remove item */}
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer shrink-0"
            title="Remove item"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Row 3: Warranty panel (expandable) */}
      {showWarranty && (
        <div className="pt-1 space-y-2 border-t border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-top-1 duration-100">
          {/* Template selector */}
          {templates.length > 0 && (
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">
                Warranty Template <span className="font-normal">(optional starting point)</span>
              </label>
              <select
                value={item.template_id}
                onChange={(e) => onApplyTemplate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-semibold text-slate-900 dark:text-white bg-white dark:bg-slate-900 focus:outline-none focus:border-brand cursor-pointer"
              >
                <option value="">— None / Manual entry —</option>
                {templates.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.default_days} days)
                  </option>
                ))}
              </select>
              {item.template_id && (
                <p className="text-[10px] text-slate-400 mt-0.5 ml-1">
                  Template copied — edit freely. Original template is unchanged.
                </p>
              )}
            </div>
          )}

          {/* Warranty Days — blank = Not Specified */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-500 mb-1">
                Warranty Days
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  value={item.warranty_days}
                  onChange={(e) => onUpdate({ warranty_days: e.target.value, template_id: "" })}
                  placeholder="—"
                  className="w-20 px-2 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-900 focus:outline-none focus:border-brand text-center"
                />
                <span className="text-xs text-slate-500 font-medium">days</span>
                {!item.warranty_days && (
                  <span className="text-[10px] text-slate-400 italic">
                    optional — leave blank for Not Specified
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Warranty Policy Text */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">
              Warranty Policy <span className="font-normal">(optional)</span>
            </label>
            <textarea
              value={item.warranty_policy}
              onChange={(e) => onUpdate({ warranty_policy: e.target.value, template_id: "" })}
              placeholder="e.g. Covers replacement screen. Physical damage excluded."
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-[11px] text-slate-900 dark:text-white bg-white dark:bg-slate-900 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 resize-none placeholder:text-slate-400 leading-relaxed"
            />
          </div>
        </div>
      )}
    </div>
  );
}
