import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listRepairs,
  saveRepair,
  updateRepairStatus,
  recordRepairPayment,
  getRepairDetail,
  issueRepairParts,
  returnRepairParts,
  listTechnicians,
} from "@/lib/repairs.functions";
import { listCustomers } from "@/lib/customers.functions";
import { listAllActiveProducts } from "@/lib/products.functions";
import { formatGBP } from "@/lib/utils";
import {
  Loader2,
  Plus,
  Eye,
  X,
  FileText,
  CheckCircle2,
  Clock,
  Wrench,
  Shield,
  AlertTriangle,
} from "lucide-react";
import { InvoiceModal, type InvoiceData } from "@/components/dashboard/Invoice";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/repairs")({
  component: RepairsPage,
});

type RepairStatus =
  "pending" | "assessed" | "in_progress" | "quality_check" | "ready" | "completed" | "cancelled";
type RepairMethod = "walk-in" | "door-to-door" | "mail-in";

const emptyRepair = {
  customer_id: "",
  device: "",
  brand: "",
  model: "",
  imei: "",
  serial_number: "",
  issue: "",
  method: "walk-in" as RepairMethod,
  labourPounds: "",
  totalPounds: "",
  technician_id: "",
  notes: "",
};

function RepairsPage() {
  const queryClient = useQueryClient();
  const listFn = useServerFn(listRepairs);
  const saveFn = useServerFn(saveRepair);
  const updateStatusFn = useServerFn(updateRepairStatus);
  const recordPaymentFn = useServerFn(recordRepairPayment);
  const getDetailFn = useServerFn(getRepairDetail);
  const issuePartsFn = useServerFn(issueRepairParts);
  const returnPartsFn = useServerFn(returnRepairParts);
  const listTechsFn = useServerFn(listTechnicians);
  const listCustsFn = useServerFn(listCustomers);
  const listProdsFn = useServerFn(listAllActiveProducts);

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [page, setPage] = useState(0);

  const { data: repairsData, isLoading } = useQuery({
    queryKey: ["repairs", statusFilter, searchQuery, page],
    queryFn: () =>
      listFn({
        data: { status: statusFilter || null, search: searchQuery || null, page, limit: 25 },
      }),
  });

  const { data: customersData } = useQuery({
    queryKey: ["customers-dropdown"],
    queryFn: () => listCustsFn({ data: { page: 0, limit: 100 } }),
  });

  const { data: technicians } = useQuery({
    queryKey: ["technicians"],
    queryFn: () => listTechsFn(),
  });

  const { data: partsList } = useQuery({
    queryKey: ["parts-dropdown"],
    queryFn: () => listProdsFn({ data: {} }),
  });

  const [form, setForm] = useState({ ...emptyRepair });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [invoiceModalData, setInvoiceModalData] = useState<InvoiceData | null>(null);
  const [payModal, setPayModal] = useState<{
    repairId: string;
    repNumber: string;
    totalPence: number;
    paidPence: number;
  } | null>(null);
  const [payAmountPounds, setPayAmountPounds] = useState("");
  const [payMethod, setPayMethod] = useState<"cash" | "card" | "bank_transfer">("cash");
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [issuePartId, setIssuePartId] = useState("");
  const [issuePartQty, setIssuePartQty] = useState(1);
  const [issuingPart, setIssuingPart] = useState(false);

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ["repair-detail", detailId],
    queryFn: () => (detailId ? getDetailFn({ data: { id: detailId } }) : null),
    enabled: !!detailId,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const labourPence = Math.round((parseFloat(form.labourPounds) || 0) * 100);
    const totalPence = Math.round((parseFloat(form.totalPounds) || 0) * 100);

    setFormSubmitting(true);
    try {
      const result = await saveFn({
        data: {
          customer_id: form.customer_id || null,
          device: form.device,
          brand: form.brand || null,
          model: form.model || null,
          imei: form.imei || null,
          serial_number: form.serial_number || null,
          issue: form.issue,
          method: form.method,
          labour_price_pence: labourPence,
          total_price_pence: totalPence,
          technician_id: form.technician_id || null,
          notes: form.notes || null,
        },
      });

      toast.success(`Repair ticket #${result.rep_number} created`);
      setForm({ ...emptyRepair });
      queryClient.invalidateQueries({ queryKey: ["repairs"] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create repair ticket");
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleStatusTransition(repairId: string, newStatus: RepairStatus) {
    try {
      await updateStatusFn({
        data: {
          repair_id: repairId,
          new_status: newStatus,
        },
      });
      toast.success(`Ticket status updated to ${newStatus}`);
      queryClient.invalidateQueries({ queryKey: ["repairs"] });
      if (detailId === repairId) {
        queryClient.invalidateQueries({ queryKey: ["repair-detail", detailId] });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Status update failed");
    }
  }

  async function handleRecordPayment() {
    if (!payModal) return;
    const amountPence = Math.round(parseFloat(payAmountPounds) * 100);
    if (isNaN(amountPence) || amountPence <= 0) {
      toast.error("Please enter a valid positive payment amount");
      return;
    }

    setPaySubmitting(true);
    try {
      await recordPaymentFn({
        data: {
          repair_id: payModal.repairId,
          idempotency_key: crypto.randomUUID(),
          amount_pence: amountPence,
          method: payMethod,
        },
      });
      toast.success("Payment recorded!");
      setPayModal(null);
      setPayAmountPounds("");
      queryClient.invalidateQueries({ queryKey: ["repairs"] });
      if (detailId === payModal.repairId) {
        queryClient.invalidateQueries({ queryKey: ["repair-detail", detailId] });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Payment recording failed");
    } finally {
      setPaySubmitting(false);
    }
  }

  async function handleIssuePart() {
    if (!detailId || !issuePartId || issuePartQty < 1) return;
    setIssuingPart(true);
    try {
      await issuePartsFn({
        data: {
          repair_id: detailId,
          parts: [{ product_id: issuePartId, quantity: issuePartQty }],
        },
      });
      toast.success("Part issued to repair ticket");
      setIssuePartId("");
      setIssuePartQty(1);
      queryClient.invalidateQueries({ queryKey: ["repair-detail", detailId] });
      queryClient.invalidateQueries({ queryKey: ["parts-dropdown"] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to issue part");
    } finally {
      setIssuingPart(false);
    }
  }

  const repairs = repairsData?.rows || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A]">Repair Tickets Management</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Book device repairs, track IMEI & status workflow, issue parts, and collect payments.
          </p>
        </div>
      </div>

      {/* New Repair Intake Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3"
      >
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
          Intake New Device Repair
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
          <select
            value={form.customer_id}
            onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-[#E11D48] outline-none bg-white"
          >
            <option value="">Select Existing Customer (Optional)</option>
            {customersData?.rows.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.phone ? `(${c.phone})` : ""}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Device Name (e.g. iPhone 13 Pro) *"
            required
            value={form.device}
            onChange={(e) => setForm({ ...form, device: e.target.value })}
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-[#E11D48] outline-none"
          />
          <input
            type="text"
            placeholder="Brand (e.g. Apple / Samsung)"
            value={form.brand}
            onChange={(e) => setForm({ ...form, brand: e.target.value })}
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-[#E11D48] outline-none"
          />
          <input
            type="text"
            placeholder="IMEI Number (15 digits)"
            value={form.imei}
            onChange={(e) => setForm({ ...form, imei: e.target.value })}
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-[#E11D48] outline-none"
          />

          <input
            type="text"
            placeholder="Reported Fault / Issue *"
            required
            value={form.issue}
            onChange={(e) => setForm({ ...form, issue: e.target.value })}
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-[#E11D48] outline-none sm:col-span-2"
          />

          <input
            type="number"
            step="0.01"
            placeholder="Labour Charge (£)"
            value={form.labourPounds}
            onChange={(e) => setForm({ ...form, labourPounds: e.target.value })}
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold focus:border-[#E11D48] outline-none"
          />

          <input
            type="number"
            step="0.01"
            placeholder="Estimated Total Quote (£)"
            value={form.totalPounds}
            onChange={(e) => setForm({ ...form, totalPounds: e.target.value })}
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold focus:border-[#E11D48] outline-none"
          />

          <select
            value={form.technician_id}
            onChange={(e) => setForm({ ...form, technician_id: e.target.value })}
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-[#E11D48] outline-none bg-white"
          >
            <option value="">Assign Technician (Optional)</option>
            {technicians?.map((t) => (
              <option key={t.user_id} value={t.user_id}>
                {t.full_name || t.email}
              </option>
            ))}
          </select>

          <select
            value={form.method}
            onChange={(e) => setForm({ ...form, method: e.target.value as RepairMethod })}
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-[#E11D48] outline-none bg-white"
          >
            <option value="walk-in">Walk-in Store</option>
            <option value="door-to-door">Door-to-door Collection</option>
            <option value="mail-in">Mail-in Service</option>
          </select>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={formSubmitting}
            className="btn-primary !py-2 !px-5 !text-xs flex items-center gap-1.5 disabled:opacity-60"
          >
            {formSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            Book Repair Ticket
          </button>
        </div>
      </form>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm text-xs">
        <input
          type="text"
          placeholder="Search REP #, device name, or IMEI…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-72 px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-[#E11D48]"
        />

        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
          {[
            "",
            "pending",
            "assessed",
            "in_progress",
            "quality_check",
            "ready",
            "completed",
            "cancelled",
          ].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-xl font-bold transition-all whitespace-nowrap capitalize ${
                statusFilter === st
                  ? "bg-[#0F172A] text-white"
                  : "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {st === "" ? "All Tickets" : st.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Repairs Table */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#E11D48]" />
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">REP Ticket #</th>
                  <th className="px-4 py-3">Device & Fault</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Total Quote</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {repairs.map((r) => {
                  const isFullyPaid =
                    r.amount_paid_pence >= r.total_price_pence && r.total_price_pence > 0;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {r.rep_number}
                        {r.warranty_until && (
                          <div className="text-[9px] text-emerald-700 font-sans font-semibold flex items-center gap-0.5">
                            <Shield className="w-2.5 h-2.5" /> War: {r.warranty_until}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{r.device}</div>
                        <div className="text-[10px] text-slate-500 max-w-xs truncate">
                          {r.issue}
                        </div>
                        {r.imei && (
                          <div className="text-[9px] font-mono text-slate-400">IMEI: {r.imei}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {(r.customers as { name: string } | null)?.name || "Walk-in"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold capitalize ${
                            r.status === "completed"
                              ? "bg-emerald-100 text-emerald-800"
                              : r.status === "cancelled"
                                ? "bg-rose-100 text-rose-800"
                                : r.status === "ready"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {r.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold font-mono">
                        {formatGBP((r.total_price_pence ?? 0) / 100)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        <span
                          className={
                            isFullyPaid
                              ? "font-bold text-emerald-600"
                              : "text-amber-600 font-semibold"
                          }
                        >
                          {formatGBP((r.amount_paid_pence ?? 0) / 100)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-1">
                        {!isFullyPaid && r.status !== "cancelled" && (
                          <button
                            type="button"
                            onClick={() => {
                              setPayModal({
                                repairId: r.id,
                                repNumber: r.rep_number ?? `REP-${r.id.slice(0, 8).toUpperCase()}`,
                                totalPence: r.total_price_pence,
                                paidPence: r.amount_paid_pence,
                              });
                              setPayAmountPounds(
                                ((r.total_price_pence - r.amount_paid_pence) / 100).toFixed(2),
                              );
                            }}
                            className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[10px] font-bold"
                          >
                            Pay
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setDetailId(r.id)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] font-bold text-slate-700"
                        >
                          View / Status
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {repairs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                      No repair tickets found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Repair Ticket Detail & Status Control Modal */}
      {detailId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-xl w-full max-h-[85vh] overflow-auto space-y-4 shadow-xl">
            {detailLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-7 h-7 animate-spin text-brand" />
              </div>
            ) : detailData ? (<>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Ticket #{detailData.rep_number} — {detailData.device}
                </h3>
                <p className="text-[10px] text-slate-500">
                  Status: <strong className="capitalize">{detailData.status}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailId(null)}
                className="p-1 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Controlled Status Transitions */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="text-[11px] font-bold text-slate-700">Update Ticket Status:</div>
              <div className="flex flex-wrap gap-1.5">
                {detailData.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => handleStatusTransition(detailData.id, "assessed")}
                    className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-bold"
                  >
                    Mark Assessed
                  </button>
                )}
                {detailData.status === "assessed" && (
                  <button
                    type="button"
                    onClick={() => handleStatusTransition(detailData.id, "in_progress")}
                    className="px-2.5 py-1 bg-amber-600 text-white rounded-lg text-[10px] font-bold"
                  >
                    Start Repair
                  </button>
                )}
                {detailData.status === "in_progress" && (
                  <button
                    type="button"
                    onClick={() => handleStatusTransition(detailData.id, "quality_check")}
                    className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-bold"
                  >
                    Move to Quality Check
                  </button>
                )}
                {detailData.status === "quality_check" && (
                  <button
                    type="button"
                    onClick={() => handleStatusTransition(detailData.id, "ready")}
                    className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-bold"
                  >
                    Mark Ready for Pickup
                  </button>
                )}
                {detailData.status === "ready" && (
                  <button
                    type="button"
                    onClick={() => handleStatusTransition(detailData.id, "completed")}
                    className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold"
                  >
                    Complete & Handover
                  </button>
                )}
                {detailData.status !== "completed" && detailData.status !== "cancelled" && (
                  <button
                    type="button"
                    onClick={() => handleStatusTransition(detailData.id, "cancelled")}
                    className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-bold"
                  >
                    Cancel Repair
                  </button>
                )}
              </div>
            </div>

            {/* Issued Parts List */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-800">Replacement Parts Issued:</div>
              {(detailData.repair_parts ?? []).length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">
                  No parts issued to this repair ticket yet.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 text-xs">
                  {detailData.repair_parts.map((part) => (
                    <li key={part.id} className="py-1.5 flex justify-between">
                      <span>
                        {part.product_name} × {part.quantity}
                      </span>
                      <span className="font-mono">
                        {formatGBP((part.unit_cost_pence * part.quantity) / 100)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Issue Part Form — only for active repairs */}
            {detailData.status !== "completed" && detailData.status !== "cancelled" && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                <div className="text-[11px] font-bold text-amber-900">Issue Replacement Part:</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={issuePartId}
                    onChange={(e) => setIssuePartId(e.target.value)}
                    className="flex-1 min-w-[160px] px-2.5 py-1.5 border border-amber-300 bg-white rounded-lg text-xs font-semibold outline-none focus:border-amber-500"
                  >
                    <option value="">— Select Part —</option>
                    {(partsList ?? [])
                      .filter((p) => p.type === "part")
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Stock: {p.stock_quantity})
                        </option>
                      ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={issuePartQty}
                    onChange={(e) => setIssuePartQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 px-2.5 py-1.5 border border-amber-300 bg-white rounded-lg text-xs font-bold text-center outline-none focus:border-amber-500"
                    aria-label="Part quantity"
                  />
                  <button
                    type="button"
                    onClick={handleIssuePart}
                    disabled={!issuePartId || issuingPart}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    {issuingPart ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wrench className="w-3 h-3" />}
                    Issue
                  </button>
                </div>
              </div>
            )}

            {/* Print Repair Receipt Button */}
            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setInvoiceModalData({
                    kind: "repair",
                    number:
                      detailData.rep_number ?? `REP-${detailData.id.slice(0, 8).toUpperCase()}`,
                    date: new Date(detailData.created_at).toLocaleString("en-GB"),
                    customer: detailData.customers,
                    lines: (detailData.repair_parts ?? []).map((part) => ({
                      name: part.product_name,
                      quantity: part.quantity,
                      unit_price: part.unit_cost_pence / 100,
                      total: (part.unit_cost_pence * part.quantity) / 100,
                    })),
                    labour: (detailData.labour_price_pence ?? 0) / 100,
                    total: (detailData.total_price_pence ?? 0) / 100,
                    paid: detailData.amount_paid_pence >= detailData.total_price_pence,
                    warrantyUntil: detailData.warranty_until,
                    device: detailData.device,
                    issue: detailData.issue,
                  });
                }}
                className="btn-primary !py-1.5 !px-3 !text-xs flex items-center gap-1"
              >
                <FileText className="w-3.5 h-3.5" /> Print Repair Invoice
              </button>
            </div>
          </>) : (
            <div className="py-8 text-center text-slate-400 text-sm">Could not load ticket.</div>
          )}
          <button
            type="button"
            onClick={() => setDetailId(null)}
            className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-lg"
            aria-label="Close detail panel"
          >
            <X className="w-4 h-4" />
          </button>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {payModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="font-extrabold text-slate-900 text-sm">
              Record Payment — #{payModal.repNumber}
            </h3>
            <div className="text-xs text-slate-600 space-y-1">
              <div>
                Total Quote: <strong>{formatGBP(payModal.totalPence / 100)}</strong>
              </div>
              <div>
                Already Paid: <strong>{formatGBP(payModal.paidPence / 100)}</strong>
              </div>
              <div>
                Remaining Due:{" "}
                <strong className="text-rose-600">
                  {formatGBP((payModal.totalPence - payModal.paidPence) / 100)}
                </strong>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Amount to Pay (£)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={payAmountPounds}
                onChange={(e) => setPayAmountPounds(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:border-[#E11D48]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as "cash" | "card" | "bank_transfer")}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:border-[#E11D48] bg-white"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setPayModal(null)}
                className="btn-outline !py-1.5 !px-3 !text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRecordPayment}
                disabled={paySubmitting}
                className="btn-primary !py-1.5 !px-4 !text-xs disabled:opacity-60 flex items-center gap-1.5"
              >
                {paySubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {invoiceModalData && (
        <InvoiceModal data={invoiceModalData} onClose={() => setInvoiceModalData(null)} />
      )}
    </div>
  );
}
