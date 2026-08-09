import { useState, useEffect, lazy, Suspense } from "react";
import {
  getRepairDetail,
  addRepairItem,
  updateRepairItem,
  deleteRepairItem,
  approveRepairQuote,
  recordRepairPayment,
  updateRepairStatus,
  finalizeRepairTicket,
  listWarrantyTemplates,
} from "@/lib/repairs.functions";
import { listProducts } from "@/lib/products.functions";
import { formatGBP } from "@/lib/utils";
import { useServerFn } from "@tanstack/react-start";
import { RepairA4InvoiceModal } from "./RepairA4InvoiceModal";
import { toastSuccess, toastError, toastWarning } from "@/lib/toast";
import { ContextTip } from "@/components/dashboard/PageHelpButton";
import {
  Wrench,
  User,
  Smartphone,
  Shield,
  Clock,
  Plus,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Printer,
  DollarSign,
  ChevronDown,
  ChevronUp,
  FileText,
  Phone,
  MessageSquare,
  Lock,
  Trash2,
  Edit2,
  ArrowRight,
  ShieldCheck,
  Search,
  Package,
} from "lucide-react";

interface RepairWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  repairId: string;
  onUpdated: () => void;
}

export function RepairWorkspaceModal({
  isOpen,
  onClose,
  repairId,
  onUpdated,
}: RepairWorkspaceModalProps) {
  const listProductsFn = useServerFn(listProducts);

  const [repair, setRepair] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [warrantyTemplates, setWarrantyTemplates] = useState<any[]>([]);

  // Sub-Modals & Collapsible Sections
  const [showPartModal, setShowPartModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showCollectCompleteModal, setShowCollectCompleteModal] = useState(false);
  const [showMarkReadyModal, setShowMarkReadyModal] = useState(false);
  const [showA4InvoiceModal, setShowA4InvoiceModal] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);

  // Add / Edit Part Form State
  const [partDesc, setPartDesc] = useState("");
  const [partQuantity, setPartQuantity] = useState(1);
  const [partQuality, setPartQuality] = useState("premium");
  const [partCustomerPrice, setPartCustomerPrice] = useState<number | "">(80);
  const [partWarrantyDays, setPartWarrantyDays] = useState<number | "">("");
  const [partWarrantyPolicy, setPartWarrantyPolicy] = useState("");
  const [showPartMore, setShowPartMore] = useState(false);
  const [partCostPrice, setPartCostPrice] = useState<number | "">(0);
  const [partLabourPrice, setPartLabourPrice] = useState<number | "">(0);
  const [submittingPart, setSubmittingPart] = useState(false);

  // Optional Inventory Search State
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [productSearchResults, setProductSearchResults] = useState<any[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);

  // Add Payment Form State
  const [payAmount, setPayAmount] = useState<number | "">(0);
  const [payMethod, setPayMethod] = useState<"cash" | "card" | "bank_transfer">("cash");
  const [payNotes, setPayNotes] = useState("");
  const [submittingPay, setSubmittingPay] = useState(false);

  // Collect & Complete Form State
  const [collectionPinInput, setCollectionPinInput] = useState("");
  const [collectPayMethod, setCollectPayMethod] = useState<"cash" | "card" | "bank_transfer">("cash");
  const [collectPayAmount, setCollectPayAmount] = useState<number | "">(0);
  const [submittingComplete, setSubmittingComplete] = useState(false);
  const [overrideBalanceWarning, setOverrideBalanceWarning] = useState(false);

  // Quote Approval Form State
  const [approvalMethod, setApprovalMethod] = useState<"phone" | "whatsapp" | "in_store" | "sms">("whatsapp");
  const [approvalPrice, setApprovalPrice] = useState<number | "">(0);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [submittingApproval, setSubmittingApproval] = useState(false);

  useEffect(() => {
    if (!isOpen || !repairId) return;
    loadDetail();
    listWarrantyTemplates().then(setWarrantyTemplates).catch(() => []);
  }, [isOpen, repairId]);

  async function loadDetail() {
    setLoading(true);
    try {
      const data = await getRepairDetail({ data: { id: repairId } });
      setRepair(data);
      if (data) {
        const qPence = data.total_price_pence || 0;
        const pPence = data.amount_paid_pence || 0;
        const duePence = Math.max(0, qPence - pPence);
        setApprovalPrice(qPence / 100);
        setPayAmount(duePence / 100);
        setCollectPayAmount(duePence / 100);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Live Inventory Product Search
  useEffect(() => {
    if (!productSearch.trim() || selectedProduct) {
      setProductSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearchingProducts(true);
      try {
        const res = await listProductsFn({ data: { search: productSearch, limit: 10 } });
        setProductSearchResults(res.rows || []);
      } catch (err) {
        console.error(err);
      } finally {
        setSearchingProducts(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [productSearch, selectedProduct]);

  function handleSelectInventoryProduct(prod: any) {
    setSelectedProduct(prod);
    setProductSearch(prod.name);
    setProductSearchResults([]);
    if (!partDesc) setPartDesc(prod.name);
    if (prod.sale_price_pence) setPartCustomerPrice(prod.sale_price_pence / 100);
    if (prod.cost_price_pence) setPartCostPrice(prod.cost_price_pence / 100);
    if (prod.warranty_days && prod.warranty_days > 0) setPartWarrantyDays(prod.warranty_days);
  }

  function openAddPartModal() {
    setEditingItem(null);
    setPartDesc("");
    setPartQuantity(1);
    setPartQuality("premium");
    setPartCustomerPrice(80);
    setPartWarrantyDays("");
    setPartWarrantyPolicy("");
    setPartCostPrice(0);
    setPartLabourPrice(0);
    setSelectedProduct(null);
    setProductSearch("");
    setShowPartModal(true);
  }

  function openEditPartModal(item: any) {
    setEditingItem(item);
    setPartDesc(item.description);
    setPartQuantity(item.quantity || 1);
    setPartQuality(item.part_quality || "standard");
    setPartCustomerPrice((item.customer_price_pence || 0) / 100);
    setPartWarrantyDays(item.warranty_days !== null && item.warranty_days !== undefined ? item.warranty_days : "");
    setPartWarrantyPolicy(item.warranty_policy_text || "");
    setPartCostPrice((item.cost_price_pence || 0) / 100);
    setPartLabourPrice((item.labour_price_pence || 0) / 100);
    setSelectedProduct(item.product_id ? { id: item.product_id } : null);
    setProductSearch("");
    setShowPartModal(true);
  }

  // 1. SAVE PART / WORK HANDLER (Add or Edit)
  async function handleSavePart(e: React.FormEvent) {
    e.preventDefault();
    if (!partDesc.trim()) return;
    if (repair?.is_finalized) {
      toastWarning("This repair ticket has been finalized & locked. Line items cannot be modified.");
      return;
    }

    setSubmittingPart(true);
    const finalWarrantyDays = partWarrantyDays !== "" && partWarrantyDays !== null ? Number(partWarrantyDays) : null;
    const finalWarrantyPolicy = partWarrantyPolicy.trim() || null;

    try {
      if (editingItem) {
        // Edit existing line item
        await updateRepairItem({
          data: {
            id: editingItem.id,
            repair_id: repairId,
            description: partDesc.trim(),
            part_quality: partQuality as any,
            cost_price_pence: Math.round((Number(partCostPrice) || 0) * 100),
            customer_price_pence: Math.round((Number(partCustomerPrice) || 0) * 100),
            labour_price_pence: Math.round((Number(partLabourPrice) || 0) * 100),
            warranty_days: finalWarrantyDays,
            warranty_policy_text: finalWarrantyPolicy,
          },
        });
        toastSuccess("Repair item updated");
      } else {
        // Add new line item
        await addRepairItem({
          data: {
            repair_id: repairId,
            description: partDesc.trim(),
            product_id: selectedProduct?.id ?? null,
            part_quality: partQuality as any,
            cost_price_pence: Math.round((Number(partCostPrice) || 0) * 100),
            customer_price_pence: Math.round((Number(partCustomerPrice) || 0) * 100),
            labour_price_pence: Math.round((Number(partLabourPrice) || 0) * 100),
            warranty_days: finalWarrantyDays,
            warranty_policy_text: finalWarrantyPolicy,
          },
        });
        toastSuccess("Part / Work added to repair");
      }

      setShowPartModal(false);
      setEditingItem(null);
      await loadDetail();
      onUpdated();
    } catch (err: any) {
      toastError(err, "Failed to save repair item.");
    } finally {
      setSubmittingPart(false);
    }
  }

  // 2. DELETE PART HANDLER
  async function handleDeletePart(id: string) {
    if (repair?.is_finalized) {
      toastWarning("This repair ticket is finalized & locked.");
      return;
    }
    if (!confirm("Are you sure you want to remove this line item?")) return;
    try {
      await deleteRepairItem({ data: { id, repair_id: repairId } });
      await loadDetail();
      onUpdated();
      toastSuccess("Line item removed");
    } catch (err: any) {
      toastError(err, "Failed to delete item.");
    }
  }

  // 3. ADD PAYMENT HANDLER
  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(payAmount) || 0;
    if (amt <= 0) return;
    setSubmittingPay(true);
    try {
      await recordRepairPayment({
        data: {
          repair_id: repairId,
          idempotency_key: `pay-${repairId}-${Date.now()}`,
          amount_pence: Math.round(amt * 100),
          method: payMethod,
          is_deposit: false,
          notes: payNotes.trim() || null,
        },
      });
      setShowAddPaymentModal(false);
      setPayNotes("");
      await loadDetail();
      onUpdated();
      toastSuccess("Payment logged successfully");
    } catch (err: any) {
      toastError(err, "Failed to record payment.");
    } finally {
      setSubmittingPay(false);
    }
  }

  // 4. STATUS CHANGE HANDLER (START REPAIR / MARK READY)
  async function handleStatusChange(newStatus: string) {
    try {
      await updateRepairStatus({
        data: {
          repair_id: repairId,
          new_status: newStatus as any,
          note: `Status updated to ${newStatus}`,
        },
      });
      await loadDetail();
      onUpdated();
      toastSuccess(`Status updated to ${newStatus}`);
    } catch (err: any) {
      toastError(err, "Failed to update status.");
    }
  }

  // 5. COMPLETE & PRINT AUTOMATION HANDLER
  async function handleCompleteAndPrint(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingComplete(true);

    const qPence = repair?.total_price_pence || 0;
    const pPence = repair?.amount_paid_pence || 0;
    const duePence = Math.max(0, qPence - pPence);

    const extraPayAmt = Number(collectPayAmount) || 0;
    const extraPayPence = Math.round(extraPayAmt * 100);
    const finalDuePence = Math.max(0, duePence - extraPayPence);

    // Validate PIN if collection_pin exists
    if (repair?.collection_pin && collectionPinInput.trim()) {
      if (collectionPinInput.trim() !== repair.collection_pin) {
        toastError("Collection PIN incorrect. Please try again.");
        setSubmittingComplete(false);
        return;
      }
    }

    // Safety check for unpaid balance
    if (finalDuePence > 0 && !overrideBalanceWarning) {
      setOverrideBalanceWarning(true);
      setSubmittingComplete(false);
      return;
    }

    try {
      // 1. Record final payment if entered
      if (extraPayAmt > 0) {
        await recordRepairPayment({
          data: {
            repair_id: repairId,
            idempotency_key: `final-pay-${repairId}-${Date.now()}`,
            amount_pence: extraPayPence,
            method: collectPayMethod,
            is_deposit: false,
          },
        });
      }

      // 2. Finalize & complete repair
      await finalizeRepairTicket({ data: { repair_id: repairId } });

      setShowCollectCompleteModal(false);
      await loadDetail();
      onUpdated();

      // 3. Automatically open A4 printable invoice
      setShowA4InvoiceModal(true);
      toastSuccess("Repair completed and warranty started!");
    } catch (err: any) {
      toastError(err, "Failed to complete repair.");
    } finally {
      setSubmittingComplete(false);
    }
  }

  // 6. RECORD QUOTE APPROVAL HANDLER
  async function handleRecordApproval(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingApproval(true);
    try {
      await approveRepairQuote({
        data: {
          repair_id: repairId,
          approved_via: approvalMethod,
          total_pence: Math.round((Number(approvalPrice) || 0) * 100),
          notes: approvalNotes.trim() || null,
        },
      });
      await loadDetail();
      onUpdated();
      toastSuccess("Customer quote approval logged.");
    } catch (err: any) {
      toastError(err, "Failed to record quote approval.");
    } finally {
      setSubmittingApproval(false);
    }
  }

  if (!isOpen) return null;

  const quotePence = repair?.total_price_pence || 0;
  const paidPence = repair?.amount_paid_pence || 0;
  const duePence = Math.max(0, quotePence - paidPence);

  const inputCls =
    "w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand";
  const labelCls = "block text-xs font-bold text-foreground mb-1";

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; label: string }> = {
      pending: { bg: "bg-blue-50 text-blue-700 border-blue-200", label: "New Ticket" },
      assessed: { bg: "bg-blue-50 text-blue-700 border-blue-200", label: "Assessed" },
      in_progress: { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Working" },
      quality_check: { bg: "bg-purple-50 text-purple-700 border-purple-200", label: "Quality Check" },
      ready: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Ready" },
      completed: { bg: "bg-slate-900 text-white border-slate-900", label: "Completed" },
      cancelled: { bg: "bg-rose-50 text-rose-700 border-rose-200", label: "Cancelled" },
    };
    const s = map[status] || { bg: "bg-slate-100 text-slate-700", label: status };
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-extrabold capitalize ${s.bg}`}>
        {s.label}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30 shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-brand font-mono text-base">{repair?.rep_number || "REP-..."}</span>
            {repair && getStatusBadge(repair.status)}
            {repair?.is_finalized && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                <Lock className="w-3 h-3" /> Finalized
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-brand" />
          </div>
        ) : !repair ? (
          <div className="p-12 text-center text-xs text-muted-foreground">Repair ticket not found.</div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
            {/* 1. OVERVIEW BANNER */}
            <div className="p-4 bg-muted/30 border border-border rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                <div>
                  <h2 className="font-extrabold text-base text-foreground">{repair.customers?.name || "Walk-In Customer"}</h2>
                  <p className="text-xs text-muted-foreground font-medium">
                    {repair.device} {repair.brand ? `(${repair.brand})` : ""} • <span className="text-foreground font-semibold">{repair.issue}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowA4InvoiceModal(true)}
                    className="px-3 py-1.5 bg-muted/60 hover:bg-muted text-foreground font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-border"
                  >
                    <Printer className="w-3.5 h-3.5" /> A4 Invoice
                  </button>
                </div>
              </div>

              {/* Financial Box */}
              <div className="grid grid-cols-3 gap-3 text-center font-mono">
                <div className="p-2.5 bg-card border border-border rounded-xl">
                  <span className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wider">TOTAL</span>
                  <span className="font-extrabold text-sm text-foreground">{formatGBP(quotePence / 100)}</span>
                </div>
                <div className="p-2.5 bg-card border border-border rounded-xl">
                  <span className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wider">PAID</span>
                  <span className="font-extrabold text-sm text-emerald-600">{formatGBP(paidPence / 100)}</span>
                </div>
                <div className="p-2.5 bg-card border border-border rounded-xl">
                  <span className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wider">DUE</span>
                  <span className={`font-extrabold text-sm ${duePence > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                    {duePence > 0 ? formatGBP(duePence / 100) : "PAID"}
                  </span>
                </div>
              </div>

              {/* Header Warranty & PIN */}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                <span>
                  Ticket Warranty:{" "}
                  <strong className="text-foreground font-semibold">
                    {repair.warranty_days ? `${repair.warranty_days} Days` : "Not Specified"}
                  </strong>
                </span>
                {repair.collection_pin && (
                  <span className="font-mono bg-brand/10 text-brand px-2 py-0.5 rounded-md font-extrabold">
                    PIN: {repair.collection_pin}
                  </span>
                )}
              </div>
            </div>

            {/* 2. REPAIR PARTS / WORK SECTION */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-brand" /> REPAIR PARTS / WORK
                </h3>
                {!repair.is_finalized && (
                  <button
                    type="button"
                    onClick={openAddPartModal}
                    className="px-3.5 py-1.5 bg-brand hover:bg-brand/90 text-white font-extrabold rounded-xl shadow-sm transition-all flex items-center gap-1 cursor-pointer text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Add Part / Work
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {repair.repair_items && repair.repair_items.length > 0 ? (
                  repair.repair_items.map((item: any) => (
                    <div
                      key={item.id}
                      className="p-3 bg-card border border-border rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-foreground flex items-center gap-2">
                          <span>{item.description}</span>
                          {item.part_quality && (
                            <span className="px-2 py-0.5 rounded-full bg-brand/10 text-brand text-[10px] uppercase font-mono font-bold">
                              {item.part_quality}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Warranty:{" "}
                          <strong className="text-foreground">
                            {item.warranty_days ? `${item.warranty_days} Days` : "Not Specified"}
                          </strong>
                          {item.warranty_policy_text ? ` — ${item.warranty_policy_text}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 font-mono">
                        <span className="font-extrabold text-foreground text-sm">
                          {formatGBP(((item.customer_price_pence || 0) + (item.labour_price_pence || 0)) / 100)}
                        </span>
                        {!repair.is_finalized && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditPartModal(item)}
                              className="px-2 py-1 text-[11px] font-bold text-brand hover:bg-brand/10 rounded-lg transition-colors cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeletePart(item.id)}
                              className="p-1 text-muted-foreground hover:text-rose-600 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 bg-muted/20 border border-border rounded-xl text-center text-muted-foreground text-xs">
                    No custom line items added yet. Initial quote: {formatGBP(quotePence / 100)}
                  </div>
                )}
              </div>
            </div>

            {/* 3. PRIMARY STATUS ACTIONS BAR */}
            <div className="p-4 bg-muted/30 border border-border rounded-2xl space-y-3">
              <span className="font-extrabold text-xs text-foreground uppercase tracking-wider block">
                Primary Actions
              </span>
              <div className="flex flex-wrap items-center gap-3">
                {/* Add Payment Button */}
                <button
                  type="button"
                  onClick={() => setShowAddPaymentModal(true)}
                  className="px-4 py-2.5 bg-muted hover:bg-border text-foreground font-extrabold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer min-h-[42px]"
                >
                  <DollarSign className="w-4 h-4 text-emerald-600" /> Add Payment
                </button>

                {/* Dynamic Status Button */}
                {repair.status === "pending" || repair.status === "assessed" ? (
                  <button
                    type="button"
                    onClick={() => handleStatusChange("in_progress")}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer min-h-[42px]"
                  >
                    <Wrench className="w-4 h-4" /> START REPAIR
                  </button>
                ) : repair.status === "in_progress" || repair.status === "quality_check" ? (
                  <button
                    type="button"
                    onClick={() => setShowMarkReadyModal(true)}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer min-h-[42px]"
                  >
                    <CheckCircle2 className="w-4 h-4" /> MARK READY
                  </button>
                ) : repair.status === "ready" ? (
                  <button
                    type="button"
                    onClick={() => setShowCollectCompleteModal(true)}
                    className="px-5 py-2.5 bg-brand hover:bg-brand/90 text-white font-extrabold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer min-h-[42px]"
                  >
                    <CheckCircle2 className="w-4 h-4 stroke-[3]" /> COLLECT & COMPLETE
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCollectCompleteModal(true)}
                    className="px-5 py-2.5 bg-slate-900 text-white font-extrabold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer min-h-[42px]"
                  >
                    <Printer className="w-4 h-4" /> RE-PRINT INVOICE
                  </button>
                )}
              </div>
            </div>

            {/* 4. MORE DETAILS ▾ TOGGLE */}
            <button
              type="button"
              onClick={() => setShowMoreDetails(!showMoreDetails)}
              className="text-xs font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer pt-2"
            >
              {showMoreDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showMoreDetails ? "Fewer Details" : "More Details ▾"}
            </button>

            {showMoreDetails && (
              <div className="space-y-5 pt-3 border-t border-border animate-in fade-in duration-100">
                {/* Secondary Info Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-muted/20 p-3 rounded-xl border border-border">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">IMEI / Serial</span>
                    <span className="font-bold font-mono text-foreground">{repair.imei || repair.serial_number || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Method</span>
                    <span className="font-bold capitalize text-foreground">{repair.method || "walk-in"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Technician</span>
                    <span className="font-bold text-foreground">{repair.technician_id ? "Assigned" : "Unassigned"}</span>
                  </div>
                </div>

                {/* Quote Approval Record Form */}
                <div className="p-4 bg-muted/20 rounded-xl border border-border space-y-3">
                  <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-brand" /> Customer Quote Approval Tracking
                  </h4>
                  <form onSubmit={handleRecordApproval} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className={labelCls}>Approval Method</label>
                      <select
                        value={approvalMethod}
                        onChange={(e) => setApprovalMethod(e.target.value as any)}
                        className={inputCls}
                      >
                        <option value="whatsapp">WhatsApp</option>
                        <option value="phone">Phone Call</option>
                        <option value="in_store">In Store</option>
                        <option value="sms">SMS</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Approved Price (£)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={approvalPrice}
                        onChange={(e) => setApprovalPrice(e.target.value === "" ? "" : Number(e.target.value))}
                        className={inputCls}
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="submit"
                        disabled={submittingApproval}
                        className="w-full px-4 py-2 bg-brand text-white font-bold rounded-xl text-xs cursor-pointer min-h-[38px]"
                      >
                        Log Approval
                      </button>
                    </div>
                  </form>
                </div>

                {/* Status History Timeline */}
                <div className="space-y-2">
                  <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-brand" /> Workflow & Status History
                  </h4>
                  <div className="space-y-1.5">
                    {repair.repair_status_history && repair.repair_status_history.length > 0 ? (
                      repair.repair_status_history.map((h: any, idx: number) => (
                        <div key={idx} className="p-2.5 bg-card border border-border rounded-lg text-[11px] flex items-center justify-between">
                          <span>
                            <strong className="text-foreground capitalize">{h.to_status}</strong> {h.note ? `— ${h.note}` : ""}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {new Date(h.changed_at).toLocaleString()}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-[11px]">No status history recorded.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* SUB-MODAL 1: ADD / EDIT PART / WORK MODAL */}
      {/* ------------------------------------------------------------------ */}
      {showPartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-5 text-xs space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-brand" /> {editingItem ? "Edit Repair Line Item" : "Add Part / Work"}
              </h3>
              <button onClick={() => setShowPartModal(false)} className="p-1 rounded-lg text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePart} className="space-y-3">
              {/* Optional Inventory Part Search */}
              {!editingItem && (
                <div className="p-3 bg-muted/30 rounded-xl border border-border space-y-2">
                  <label className={labelCls}>
                    <Package className="w-3.5 h-3.5 text-brand" /> Inventory Part (Optional Link)
                  </label>
                  {selectedProduct ? (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-brand/10 border border-brand/20">
                      <div>
                        <span className="font-bold text-foreground block">{selectedProduct.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">SKU: {selectedProduct.sku || "N/A"}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProduct(null);
                          setProductSearch("");
                        }}
                        className="text-[10px] font-bold text-destructive hover:underline"
                      >
                        Clear Link
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search inventory product or part..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className={`${inputCls} pl-8`}
                      />
                      {searchingProducts && <Loader2 className="w-3.5 h-3.5 animate-spin text-brand absolute right-3 top-2.5" />}

                      {productSearchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-card border border-border rounded-xl shadow-lg max-h-40 overflow-y-auto divide-y divide-border">
                          {productSearchResults.map((p) => (
                            <div
                              key={p.id}
                              onClick={() => handleSelectInventoryProduct(p)}
                              className="p-2 hover:bg-muted cursor-pointer flex items-center justify-between text-[11px]"
                            >
                              <div>
                                <span className="font-bold text-foreground block">{p.name}</span>
                                <span className="text-[9px] text-muted-foreground font-mono">SKU: {p.sku || "N/A"}</span>
                              </div>
                              <span className="font-bold text-brand font-mono">£{(p.sale_price_pence / 100).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Primary Fields */}
              <div>
                <label className={labelCls}>Part / Work Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. iPhone 11 Screen Replacement"
                  value={partDesc}
                  onChange={(e) => setPartDesc(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={partQuantity}
                    onChange={(e) => setPartQuantity(Number(e.target.value) || 1)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Customer Price (£) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="80.00"
                    value={partCustomerPrice}
                    onChange={(e) => setPartCustomerPrice(e.target.value === "" ? "" : Number(e.target.value))}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Warranty Days</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 90"
                    value={partWarrantyDays}
                    onChange={(e) => setPartWarrantyDays(e.target.value === "" ? "" : Number(e.target.value))}
                    className={inputCls}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Warranty Policy Text</label>
                  <input
                    type="text"
                    placeholder="Optional manual warranty policy..."
                    value={partWarrantyPolicy}
                    onChange={(e) => setPartWarrantyPolicy(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPartMore(!showPartMore)}
                className="text-[11px] font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer pt-1"
              >
                {showPartMore ? "Fewer options" : "More options ▾ (Quality, internal cost)"}
              </button>

              {showPartMore && (
                <div className="space-y-3 pt-2 border-t border-border animate-in fade-in duration-100">
                  <div>
                    <label className={labelCls}>Part Quality</label>
                    <select
                      value={partQuality}
                      onChange={(e) => setPartQuality(e.target.value)}
                      className={inputCls}
                    >
                      <option value="standard">Standard</option>
                      <option value="premium">Premium</option>
                      <option value="original">Original / Genuine</option>
                      <option value="refurbished">Refurbished</option>
                      <option value="customer_supplied">Customer Supplied</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Internal Wholesale Cost (£)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0"
                        value={partCostPrice}
                        onChange={(e) => setPartCostPrice(e.target.value === "" ? "" : Number(e.target.value))}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Labour Charge (£)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0"
                        value={partLabourPrice}
                        onChange={(e) => setPartLabourPrice(e.target.value === "" ? "" : Number(e.target.value))}
                        className={inputCls}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowPartModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPart}
                  className="px-5 py-2 text-xs font-extrabold text-white bg-brand hover:bg-brand/90 rounded-xl shadow-md"
                >
                  {submittingPart ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : editingItem ? "SAVE CHANGES" : "ADD WORK"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* SUB-MODAL 2: ADD PAYMENT MODAL */}
      {/* ------------------------------------------------------------------ */}
      {showAddPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-5 text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" /> Log Repair Payment
              </h3>
              <button onClick={() => setShowAddPaymentModal(false)} className="p-1 rounded-lg text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl flex items-center justify-between font-mono">
              <span className="text-emerald-900 font-bold">Balance Outstanding:</span>
              <span className="font-extrabold text-emerald-950 text-base">{formatGBP(duePence / 100)}</span>
            </div>

            <form onSubmit={handleAddPayment} className="space-y-3">
              <div>
                <label className={labelCls}>Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "cash", label: "Cash" },
                    { id: "card", label: "Card" },
                    { id: "bank_transfer", label: "Bank" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPayMethod(m.id as any)}
                      className={`p-2 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all ${
                        payMethod === m.id
                          ? "bg-brand text-white border-brand shadow-xs"
                          : "bg-muted/40 hover:bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls}>Payment Amount (£) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  className={inputCls}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddPaymentModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPay}
                  className="px-5 py-2 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md"
                >
                  {submittingPay ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "SAVE PAYMENT"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* SUB-MODAL 3: MARK READY CONFIRMATION MODAL */}
      {/* ------------------------------------------------------------------ */}
      {showMarkReadyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-5 text-xs space-y-4 text-center">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-foreground">Mark Repair Ready?</h3>
              <p className="text-muted-foreground mt-1">
                {repair.customers?.name || "Customer"} • {repair.device}
              </p>
              <p className="font-mono font-bold text-rose-600 mt-1">Balance Due: {formatGBP(duePence / 100)}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowMarkReadyModal(false)}
                className="px-4 py-2 bg-muted text-muted-foreground font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowMarkReadyModal(false);
                  await handleStatusChange("ready");
                }}
                className="px-4 py-2 bg-emerald-600 text-white font-extrabold rounded-xl shadow-md"
              >
                MARK READY
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* SUB-MODAL 4: COLLECT & COMPLETE DIALOG */}
      {/* ------------------------------------------------------------------ */}
      {showCollectCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-6 text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-brand" /> Collect & Complete
              </h3>
              <button onClick={() => setShowCollectCompleteModal(false)} className="p-1 rounded-lg text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Customer & Financial Summary */}
            <div className="p-3.5 bg-muted/30 border border-border rounded-xl space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer:</span>
                <span className="font-bold text-foreground">{repair.customers?.name || "Walk-In"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Device:</span>
                <span className="font-bold text-foreground">{repair.device}</span>
              </div>
              <div className="flex justify-between font-mono pt-1 border-t border-border">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-bold text-foreground">{formatGBP(quotePence / 100)}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-muted-foreground">Paid:</span>
                <span className="font-bold text-emerald-600">{formatGBP(paidPence / 100)}</span>
              </div>
              <div className="flex justify-between font-mono text-sm pt-1 border-t border-dashed border-border font-extrabold">
                <span>Balance Due:</span>
                <span className={duePence > 0 ? "text-rose-600" : "text-emerald-600"}>{formatGBP(duePence / 100)}</span>
              </div>
            </div>

            {/* Outstanding Balance Warning if applicable */}
            {overrideBalanceWarning && (
              <div className="p-3 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 space-y-2">
                <div className="font-extrabold flex items-center gap-1.5 text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-700" /> Outstanding Balance: {formatGBP(duePence / 100)}
                </div>
                <p className="text-[11px]">This repair still has money due. Do you want to complete with unpaid balance?</p>
              </div>
            )}

            <form onSubmit={handleCompleteAndPrint} className="space-y-4">
              {/* Collection PIN Verification */}
              {repair.collection_pin && (
                <div>
                  <label className={labelCls}>
                    Collection PIN Verification (PIN: {repair.collection_pin})
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="Enter 4-digit PIN..."
                    value={collectionPinInput}
                    onChange={(e) => setCollectionPinInput(e.target.value)}
                    className={`${inputCls} font-mono tracking-widest font-bold text-center text-sm`}
                  />
                </div>
              )}

              {/* Payment Section if Balance Exists */}
              {duePence > 0 && (
                <div className="space-y-2 pt-1 border-t border-border">
                  <label className={labelCls}>Final Payment Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "cash", label: "Cash" },
                      { id: "card", label: "Card" },
                      { id: "bank_transfer", label: "Bank" },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setCollectPayMethod(m.id as any)}
                        className={`p-2 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all ${
                          collectPayMethod === m.id
                            ? "bg-brand text-white border-brand shadow-xs"
                            : "bg-muted/40 hover:bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className={labelCls}>Amount to Pay (£)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={collectPayAmount}
                      onChange={(e) => setCollectPayAmount(e.target.value === "" ? "" : Number(e.target.value))}
                      className={inputCls}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setShowCollectCompleteModal(false);
                    setOverrideBalanceWarning(false);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground"
                >
                  Cancel
                </button>
                {overrideBalanceWarning ? (
                  <button
                    type="submit"
                    disabled={submittingComplete}
                    className="px-5 py-2.5 text-xs font-extrabold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md"
                  >
                    Complete With Balance
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submittingComplete}
                    className="px-6 py-2.5 text-xs font-extrabold text-white bg-brand hover:bg-brand/90 rounded-xl shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    {submittingComplete ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                    COMPLETE & PRINT
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* SUB-MODAL 5: A4 CUSTOMER INVOICE MODAL */}
      {/* ------------------------------------------------------------------ */}
      {showA4InvoiceModal && repair && (
        <RepairA4InvoiceModal
          isOpen={showA4InvoiceModal}
          onClose={() => setShowA4InvoiceModal(false)}
          repair={repair}
          onFinalized={async () => {
            await loadDetail();
            onUpdated();
          }}
        />
      )}
    </div>
  );
}
