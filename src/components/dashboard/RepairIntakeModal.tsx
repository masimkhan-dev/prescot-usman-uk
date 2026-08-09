import { useState, useEffect } from "react";
import { saveRepairTicketV2, listWarrantyTemplates, listTechnicians, getRepairDetail } from "@/lib/repairs.functions";
import { searchCustomers } from "@/lib/customers.functions";
import { QuickAddCustomerModal } from "./QuickAddCustomerModal";
import { toast } from "sonner";
import {
  Wrench,
  User,
  Smartphone,
  Shield,
  Clock,
  Plus,
  X,
  Loader2,
  Search,
  Check,
  CheckSquare,
  Square,
  Printer,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Edit2,
  ArrowRight,
  FileText,
} from "lucide-react";

interface RepairIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (ticket: any, openWorkspace?: boolean) => void;
}

const defaultConditionOptions = [
  { id: "screen_cracked", label: "Screen Cracked" },
  { id: "back_cracked", label: "Back Glass Cracked" },
  { id: "frame_scratched", label: "Frame Scratched/Dented" },
  { id: "bent_device", label: "Device Bent" },
  { id: "liquid_evidence", label: "Liquid Evidence" },
  { id: "no_power", label: "Doesn't Power On" },
  { id: "camera_broken", label: "Camera Glass Broken" },
  { id: "buttons_faulty", label: "Buttons Faulty" },
];

const defaultAccessoryOptions = [
  { id: "case", label: "Protective Case" },
  { id: "sim", label: "SIM Card Left" },
  { id: "charger", label: "Charger / Cable" },
  { id: "sd_card", label: "MicroSD Card" },
  { id: "original_box", label: "Original Box" },
];

export function RepairIntakeModal({ isOpen, onClose, onSuccess }: RepairIntakeModalProps) {
  // Customer selection
  const [selectedCustomer, setSelectedCustomer] = useState<{
    id: string;
    name: string;
    phone?: string | null;
  } | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerSearchResults, setCustomerSearchResults] = useState<any[]>([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  // Primary Intake Fields
  const [device, setDevice] = useState("");
  const [issue, setIssue] = useState("");
  const [initialQuote, setInitialQuote] = useState<number | "">(80);
  const [deposit, setDeposit] = useState<number | "">(20);

  // Manual Warranty State (NO automatic defaults)
  const [warrantyTemplates, setWarrantyTemplates] = useState<any[]>([]);
  const [warrantyDays, setWarrantyDays] = useState<number | "">("");
  const [warrantyPolicy, setWarrantyPolicy] = useState("");
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  // Secondary "More Details ▾" Fields
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [brand, setBrand] = useState("Apple");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");
  const [imei, setImei] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [labourCharge, setLabourCharge] = useState<number | "">(20);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [technicianId, setTechnicianId] = useState("");
  const [serviceMethod, setServiceMethod] = useState("walk-in");
  const [estimatedHours, setEstimatedHours] = useState(4);
  const [notes, setNotes] = useState("");
  const [conditionChecklist, setConditionChecklist] = useState<Record<string, boolean>>({});
  const [accessoriesList, setAccessoriesList] = useState<string[]>([]);

  // Post-booking Success Screen state
  const [bookedTicket, setBookedTicket] = useState<any | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setBookedTicket(null);
      return;
    }
    loadTemplatesAndTechs();
  }, [isOpen]);

  async function loadTemplatesAndTechs() {
    try {
      const [tpls, techs] = await Promise.all([
        listWarrantyTemplates().catch(() => []),
        listTechnicians().catch(() => []),
      ]);
      setWarrantyTemplates(tpls);
      setTechnicians(techs);
      // DO NOT auto-apply any template default to warrantyDays or warrantyPolicy
    } catch (err) {
      console.error(err);
    }
  }

  // Live search customer
  useEffect(() => {
    if (!customerSearch.trim() || selectedCustomer) {
      setCustomerSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearchingCustomers(true);
      try {
        const results = await searchCustomers({ data: { q: customerSearch } });
        setCustomerSearchResults(results);
      } catch (err) {
        console.error(err);
      } finally {
        setSearchingCustomers(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [customerSearch, selectedCustomer]);

  function handleSelectTemplate(templateId: string) {
    const tpl = warrantyTemplates.find((t) => t.id === templateId);
    if (tpl) {
      setWarrantyDays(tpl.default_days);
      setWarrantyPolicy(tpl.policy_text);
    }
  }

  function toggleCondition(id: string) {
    setConditionChecklist((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleAccessory(id: string) {
    setAccessoriesList((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCustomer) {
      setErrorMsg("Please select or add a Customer before booking a repair.");
      return;
    }
    if (!device.trim() || !issue.trim()) {
      setErrorMsg("Device Name and Reported Fault are required fields.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const estCompletion = new Date();
    estCompletion.setHours(estCompletion.getHours() + (Number(estimatedHours) || 4));

    const finalWarrantyDays = warrantyDays !== "" && warrantyDays !== null ? Number(warrantyDays) : null;
    const finalWarrantyPolicy = warrantyPolicy.trim() || null;

    try {
      const result = await saveRepairTicketV2({
        data: {
          customer_id: selectedCustomer.id,
          device: device.trim(),
          brand: brand.trim() || null,
          model: model.trim() || null,
          color: color.trim() || null,
          imei: imei.trim() || null,
          serial_number: serialNumber.trim() || null,
          device_condition: conditionChecklist,
          accessories_received: accessoriesList,
          issue: issue.trim(),
          method: serviceMethod as any,
          technician_id: technicianId || null,
          estimated_completion_at: estCompletion.toISOString(),
          deposit_pence: Math.round((Number(deposit) || 0) * 100),
          initial_quote_pence: Math.round((Number(initialQuote) || 0) * 100),
          labour_price_pence: Math.round((Number(labourCharge) || 0) * 100),
          warranty_days: finalWarrantyDays,
          warranty_policy_text: finalWarrantyPolicy,
          notes: notes.trim() || null,
        },
      });

      let ticketToPass = result;
      try {
        if (result?.id) {
          const fullTicket = await getRepairDetail({ data: { id: result.id } });
          if (fullTicket) ticketToPass = fullTicket;
        }
      } catch (_) {
        ticketToPass = { ...result, customers: selectedCustomer };
      }

      toast.success(`Repair Ticket ${ticketToPass.rep_number || ""} Booked Successfully!`);
      setBookedTicket(ticketToPass);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to book repair ticket.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  const inputCls =
    "w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand";
  const labelCls = "block text-xs font-bold text-foreground mb-1 flex items-center gap-1.5";

  // POST-BOOKING SUCCESS SCREEN
  if (bookedTicket) {
    const estQuotePence = bookedTicket.total_price_pence || Math.round((Number(initialQuote) || 0) * 100);
    const depPence = bookedTicket.deposit_pence || Math.round((Number(deposit) || 0) * 100);
    const balPence = Math.max(0, estQuotePence - depPence);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-6 text-xs space-y-5">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <h2 className="font-extrabold text-base text-foreground">Repair Booked</h2>
            <p className="font-mono font-bold text-brand text-sm">{bookedTicket.rep_number || "REP-CREATED"}</p>
          </div>

          <div className="p-4 bg-muted/30 border border-border rounded-xl space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer:</span>
              <span className="font-bold text-foreground">{selectedCustomer?.name || bookedTicket.customers?.name || "Walk-In"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Device:</span>
              <span className="font-bold text-foreground">{bookedTicket.device}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fault:</span>
              <span className="font-medium text-foreground">{bookedTicket.issue}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Warranty:</span>
              <span className="font-semibold text-foreground">
                {bookedTicket.warranty_days ? `${bookedTicket.warranty_days} Days` : "Not Specified"}
              </span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between font-mono">
              <span className="text-muted-foreground">Estimated Total:</span>
              <span className="font-bold text-foreground">£{(estQuotePence / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-mono">
              <span className="text-muted-foreground">Deposit Paid:</span>
              <span className="font-bold text-emerald-600">£{(depPence / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-mono text-sm pt-1 border-t border-dashed border-border font-extrabold">
              <span>Balance Due:</span>
              <span className={balPence > 0 ? "text-rose-600" : "text-emerald-600"}>£{(balPence / 100).toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => {
                onSuccess(bookedTicket, false);
                onClose();
              }}
              className="px-4 py-2.5 bg-brand text-white font-extrabold rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px]"
            >
              <Printer className="w-4 h-4" /> Print Small Receipt
            </button>
            <button
              onClick={() => {
                onSuccess(bookedTicket, true);
                onClose();
              }}
              className="px-4 py-2.5 bg-slate-900 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px]"
            >
              Open Repair <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand/10 text-brand">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-foreground">Book New Repair</h2>
              <p className="text-xs text-muted-foreground">Fast 10-second intake booking</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-destructive/10 text-destructive font-semibold">
              {errorMsg}
            </div>
          )}

          {/* 1. CUSTOMER SELECTOR */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={labelCls}>
                <User className="w-3.5 h-3.5 text-brand" /> Customer *
              </label>
              <button
                type="button"
                onClick={() => setQuickAddOpen(true)}
                className="px-2.5 py-1 bg-brand/10 hover:bg-brand/20 text-brand font-extrabold rounded-lg transition-colors flex items-center gap-1 cursor-pointer text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Quick Add
              </button>
            </div>

            {selectedCustomer ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-brand/5 border border-brand/20">
                <div>
                  <span className="font-bold text-sm text-foreground">{selectedCustomer.name}</span>
                  {selectedCustomer.phone && (
                    <span className="text-xs text-muted-foreground block font-mono">
                      Phone: {selectedCustomer.phone}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomer(null);
                    setCustomerSearch("");
                  }}
                  className="px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search existing customer by name or phone number..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className={`${inputCls} pl-9`}
                />
                {searchingCustomers && (
                  <Loader2 className="w-4 h-4 animate-spin text-brand absolute right-3 top-2.5" />
                )}

                {customerSearchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-card border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-border">
                    {customerSearchResults.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedCustomer(c);
                          setCustomerSearchResults([]);
                        }}
                        className="p-2.5 hover:bg-muted cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <div>
                          <span className="font-bold text-foreground block">{c.name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{c.phone || "No Phone"}</span>
                        </div>
                        <span className="text-[10px] font-bold text-brand">Select</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. DEVICE & FAULT */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>
                <Smartphone className="w-3.5 h-3.5 text-brand" /> Device *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. iPhone 11"
                value={device}
                onChange={(e) => setDevice(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Reported Fault *</label>
              <input
                type="text"
                required
                placeholder="e.g. Screen blanking"
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* 3. ESTIMATED PRICE & DEPOSIT */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>
                <DollarSign className="w-3.5 h-3.5 text-brand" /> Estimated Price (£) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="200"
                value={initialQuote}
                onChange={(e) => setInitialQuote(e.target.value === "" ? "" : Number(e.target.value))}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Deposit Paid (£)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="20"
                value={deposit}
                onChange={(e) => setDeposit(e.target.value === "" ? "" : Number(e.target.value))}
                className={inputCls}
              />
            </div>
          </div>

          {/* 4. MANUAL WARRANTY INPUTS & OPTIONAL TEMPLATE BUTTON */}
          <div className="p-3.5 bg-muted/30 rounded-xl border border-border space-y-3">
            <div className="flex items-center justify-between">
              <label className={labelCls}>
                <Shield className="w-3.5 h-3.5 text-brand" /> Warranty (Manual Entry)
              </label>
              {warrantyTemplates.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowTemplatePicker(!showTemplatePicker)}
                  className="px-2 py-0.5 text-[11px] font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <FileText className="w-3 h-3" /> {showTemplatePicker ? "Hide Templates" : "Use Warranty Template"}
                </button>
              )}
            </div>

            {showTemplatePicker && (
              <div className="p-2.5 bg-card border border-border rounded-xl space-y-1 text-xs mb-2">
                <span className="text-[10px] font-bold text-muted-foreground block">
                  Select a template to copy policy text/days into the form:
                </span>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleSelectTemplate(e.target.value);
                      setShowTemplatePicker(false);
                    }
                  }}
                  className={inputCls}
                >
                  <option value="">-- Choose Warranty Template --</option>
                  {warrantyTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {t.default_days} Days
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className={labelCls}>Warranty Days</label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 90"
                  value={warrantyDays}
                  onChange={(e) => setWarrantyDays(e.target.value === "" ? "" : Number(e.target.value))}
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Warranty Policy</label>
                <input
                  type="text"
                  placeholder="e.g. Warranty covers replaced screen only. Physical or liquid damage excluded."
                  value={warrantyPolicy}
                  onChange={(e) => setWarrantyPolicy(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* 5. MORE DETAILS ▾ TOGGLE */}
          <button
            type="button"
            onClick={() => setShowMoreDetails(!showMoreDetails)}
            className="text-xs font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer pt-1"
          >
            {showMoreDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showMoreDetails ? "Fewer Details" : "More Details ▾"}
          </button>

          {showMoreDetails && (
            <div className="space-y-4 pt-2 border-t border-border animate-in fade-in duration-100">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Brand</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Model</label>
                  <input
                    type="text"
                    placeholder="A2111"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Colour</label>
                  <input
                    type="text"
                    placeholder="Black"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>IMEI / Serial Number</label>
                  <input
                    type="text"
                    placeholder="359000112233445"
                    value={imei}
                    onChange={(e) => setImei(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Assigned Technician</label>
                  <select
                    value={technicianId}
                    onChange={(e) => setTechnicianId(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Unassigned</option>
                    {technicians.map((t) => (
                      <option key={t.user_id} value={t.user_id}>
                        {t.full_name || t.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Checklists */}
              <div className="space-y-2">
                <label className={labelCls}>Device Condition Checklist</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {defaultConditionOptions.map((opt) => {
                    const isChecked = !!conditionChecklist[opt.id];
                    return (
                      <div
                        key={opt.id}
                        onClick={() => toggleCondition(opt.id)}
                        className={`p-2 rounded-lg border text-[11px] font-semibold cursor-pointer flex items-center gap-1.5 transition-colors ${
                          isChecked
                            ? "bg-brand/10 border-brand text-brand"
                            : "bg-muted/30 border-border text-muted-foreground"
                        }`}
                      >
                        {isChecked ? (
                          <CheckSquare className="w-3.5 h-3.5 text-brand shrink-0" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        )}
                        <span className="truncate">{opt.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className={labelCls}>Accessories Received</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {defaultAccessoryOptions.map((opt) => {
                    const isChecked = accessoriesList.includes(opt.id);
                    return (
                      <div
                        key={opt.id}
                        onClick={() => toggleAccessory(opt.id)}
                        className={`p-2 rounded-lg border text-[11px] font-semibold cursor-pointer flex items-center gap-1.5 transition-colors ${
                          isChecked
                            ? "bg-brand/10 border-brand text-brand"
                            : "bg-muted/30 border-border text-muted-foreground"
                        }`}
                      >
                        {isChecked ? (
                          <CheckSquare className="w-3.5 h-3.5 text-brand shrink-0" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        )}
                        <span>{opt.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className={labelCls}>Internal Technician Notes</label>
                <textarea
                  rows={2}
                  placeholder="Passcodes or diagnostic notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          )}

          {/* Footer CTA */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted rounded-xl transition-colors cursor-pointer min-h-[42px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 text-xs font-extrabold text-white bg-brand hover:bg-brand/90 rounded-xl shadow-md transition-all cursor-pointer min-h-[42px] flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4 stroke-[3]" />
              )}
              BOOK REPAIR
            </button>
          </div>
        </form>
      </div>

      <QuickAddCustomerModal
        isOpen={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onCustomerCreated={(c) => {
          setSelectedCustomer(c);
          setQuickAddOpen(false);
        }}
      />
    </div>
  );
}
