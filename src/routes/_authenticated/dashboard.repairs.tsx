import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listRepairs,
  saveRepair,
  deleteRepair,
  getRepairDetail,
  markRepairPaid,
  listTechnicians,
} from "@/lib/repairs.functions";
import { listCustomers } from "@/lib/customers.functions";
import { listProducts } from "@/lib/products.functions";
import { formatGBP } from "@/lib/utils";
import { Loader2, Plus, Trash2, Eye, X, FileText, CheckCircle2, Clock, Wrench } from "lucide-react";
import { InvoiceModal, type InvoiceData } from "@/components/dashboard/Invoice";

export const Route = createFileRoute("/_authenticated/dashboard/repairs")({
  component: RepairsPage,
});

type Status = "pending" | "in-progress" | "ready" | "completed" | "cancelled";
type Method = "walk-in" | "door-to-door" | "mail-in";

const emptyRepair = {
  customer_id: "",
  device: "",
  brand: "",
  issue: "",
  status: "pending" as Status,
  method: "walk-in" as Method,
  price: 0,
  labour_cost: 0,
  technician_id: "",
  notes: "",
};

function RepairsPage() {
  const queryClient = useQueryClient();
  const { data: repairs, isLoading } = useQuery({ queryKey: ["repairs"], queryFn: () => listRepairs() });
  const { data: customers } = useQuery({ queryKey: ["customers"], queryFn: () => listCustomers() });
  const { data: technicians } = useQuery({ queryKey: ["technicians"], queryFn: () => listTechnicians() });
  const saveFn = useServerFn(saveRepair);
  const deleteFn = useServerFn(deleteRepair);

  const [form, setForm] = useState({ ...emptyRepair });
  const [detailId, setDetailId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"table" | "kanban">("table");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await saveFn({
      data: {
        ...form,
        customer_id: form.customer_id || null,
        brand: form.brand || null,
        notes: form.notes || null,
        technician_id: form.technician_id || null,
        parts: [],
        paid: false,
      },
    });
    setForm({ ...emptyRepair });
    queryClient.invalidateQueries({ queryKey: ["repairs"] });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this repair ticket?")) return;
    await deleteFn({ data: { id } });
    queryClient.invalidateQueries({ queryKey: ["repairs"] });
  }

  async function handleQuickStatusChange(repair: any, newStatus: Status) {
    await saveFn({
      data: {
        id: repair.id,
        customer_id: repair.customer_id,
        device: repair.device,
        brand: repair.brand,
        issue: repair.issue,
        status: newStatus,
        method: repair.method,
        price: repair.price || 0,
        labour_cost: repair.labour_cost || 0,
        paid: repair.paid,
        technician_id: repair.technician_id,
        notes: repair.notes,
        parts: [],
      },
    });
    queryClient.invalidateQueries({ queryKey: ["repairs"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A]">Repair Tickets Management</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Log walk-in tickets, assign technicians, track repair lifecycle, and issue invoices.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("table")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "table" ? "bg-white text-[#0F172A] shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Table View
          </button>
          <button
            onClick={() => setActiveTab("kanban")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "kanban" ? "bg-white text-[#0F172A] shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Kanban Board
          </button>
        </div>
      </div>

      {/* Ticket Logging Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1.5">
          <Wrench className="w-3.5 h-3.5 text-[#E11D48]" /> Log New Repair Ticket
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
          <select
            value={form.customer_id}
            onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-[#E11D48] outline-none bg-white"
          >
            <option value="">Walk-in / No customer account</option>
            {customers?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Device (e.g. iPhone 14 Pro)"
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
          <select
            value={form.method}
            onChange={(e) => setForm({ ...form, method: e.target.value as Method })}
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-[#E11D48] outline-none bg-white"
          >
            <option value="walk-in">Walk-in Service</option>
            <option value="door-to-door">Door-to-door Collection</option>
            <option value="mail-in">Mail-in Delivery</option>
          </select>

          <input
            type="text"
            placeholder="Reported issue / Fault description"
            required
            value={form.issue}
            onChange={(e) => setForm({ ...form, issue: e.target.value })}
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-[#E11D48] outline-none sm:col-span-2"
          />
          <select
            value={form.technician_id}
            onChange={(e) => setForm({ ...form, technician_id: e.target.value })}
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-[#E11D48] outline-none bg-white"
          >
            <option value="">Assign Technician…</option>
            {technicians?.map((t) => (
              <option key={t.user_id} value={t.user_id}>{t.full_name || t.email}</option>
            ))}
          </select>
          <input
            type="number"
            step="0.01"
            placeholder="Estimated Quote (£)"
            value={form.price || ""}
            onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold focus:border-[#E11D48] outline-none"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" className="btn-primary !py-2 !px-4 !text-xs">
            <Plus className="w-3.5 h-3.5" /> Create Ticket
          </button>
        </div>
      </form>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#E11D48]" />
        </div>
      ) : activeTab === "table" ? (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-extrabold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Device & Issue</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {repairs?.map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-[#0F172A]">
                      <div>{r.device} {r.brand && <span className="text-slate-400 font-normal">({r.brand})</span>}</div>
                      <div className="text-[11px] text-slate-500 font-normal truncate max-w-xs">{r.issue}</div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 font-semibold">
                      {r.customers?.name || "Walk-in Customer"}
                    </td>
                    <td className="px-4 py-3.5">
                      <select
                        value={r.status}
                        onChange={(e) => handleQuickStatusChange(r, e.target.value as Status)}
                        className="text-xs font-bold rounded-lg border border-slate-200 px-2 py-1 bg-white outline-none cursor-pointer"
                      >
                        <option value="pending">Pending</option>
                        <option value="in-progress">In Progress</option>
                        <option value="ready">Ready for Pickup</option>
                        <option value="completed">Completed / Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${r.paid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                        {r.paid ? "PAID" : "UNPAID"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-extrabold text-[#0F172A] tabular-nums">
                      {formatGBP(r.price || 0)}
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => setDetailId(r.id)}
                        className="text-[#0F172A] hover:text-[#E11D48] mr-3 font-bold text-xs inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Details
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="text-rose-600 hover:text-rose-800 font-bold text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Kanban View */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { id: "pending", label: "Pending", bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-200 text-amber-900" },
            { id: "in-progress", label: "In Progress", bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-200 text-blue-900" },
            { id: "ready", label: "Ready for Pickup", bg: "bg-emerald-50", border: "border-emerald-200", badge: "bg-emerald-200 text-emerald-900" },
            { id: "completed", label: "Completed", bg: "bg-slate-100", border: "border-slate-300", badge: "bg-slate-200 text-slate-900" },
          ].map((col) => {
            const colRepairs = repairs?.filter((r: any) => r.status === col.id) || [];
            return (
              <div key={col.id} className={`rounded-2xl border ${col.border} ${col.bg} p-4 flex flex-col`}>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 mb-3">
                  <h3 className="font-extrabold text-xs uppercase tracking-wider text-[#0F172A]">{col.label}</h3>
                  <span className={`text-xs font-black px-2 py-0.5 rounded-full ${col.badge}`}>
                    {colRepairs.length}
                  </span>
                </div>
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px]">
                  {colRepairs.map((r: any) => (
                    <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:border-[#E11D48] transition-colors">
                      <div className="font-bold text-xs text-[#0F172A]">{r.device}</div>
                      <div className="text-[11px] text-slate-600 mt-1 line-clamp-2">{r.issue}</div>
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="font-bold text-[#0F172A] tabular-nums">{formatGBP(r.price || 0)}</span>
                        <button
                          onClick={() => setDetailId(r.id)}
                          className="text-[#E11D48] font-bold hover:underline"
                        >
                          Manage →
                        </button>
                      </div>
                    </div>
                  ))}
                  {colRepairs.length === 0 && (
                    <div className="text-center text-xs text-slate-400 py-8 italic">No tickets</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {detailId && <RepairDetail id={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-900 border-amber-300",
    "in-progress": "bg-blue-100 text-blue-900 border-blue-300",
    ready: "bg-emerald-100 text-emerald-900 border-emerald-300",
    completed: "bg-slate-200 text-slate-900 border-slate-300",
    cancelled: "bg-rose-100 text-rose-900 border-rose-300",
  };
  return (
    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${colors[status] || "bg-slate-100 text-slate-700"}`}>
      {status.toUpperCase()}
    </span>
  );
}

function RepairDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: repair, isLoading, refetch } = useQuery({
    queryKey: ["repair", id],
    queryFn: () => getRepairDetail({ data: { id } }),
  });
  const { data: products } = useQuery({ queryKey: ["products"], queryFn: () => listProducts() });
  const saveFn = useServerFn(saveRepair);
  const paidFn = useServerFn(markRepairPaid);

  const [selectedPartId, setSelectedPartId] = useState("");
  const [partQty, setPartQty] = useState(1);
  const [saving, setSaving] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);

  const parts = (products || []).filter((p) => (p.type || "product") === "part" && p.stock_quantity > 0);

  async function addPart() {
    const prod = parts.find((p) => p.id === selectedPartId);
    if (!prod || !repair) return;
    setSaving(true);
    await saveFn({
      data: {
        id: repair.id,
        customer_id: repair.customer_id,
        device: repair.device,
        brand: repair.brand,
        issue: repair.issue,
        status: repair.status as Status,
        method: repair.method as Method,
        price: repair.price || 0,
        labour_cost: repair.labour_cost || 0,
        paid: repair.paid,
        technician_id: repair.technician_id,
        notes: repair.notes,
        parts: [{ product_id: prod.id, product_name: prod.name, quantity: partQty, unit_price: prod.sale_price }],
      },
    });
    setSelectedPartId("");
    setPartQty(1);
    await refetch();
    queryClient.invalidateQueries({ queryKey: ["products"] });
    setSaving(false);
  }

  async function togglePaid() {
    if (!repair) return;
    await paidFn({ data: { id: repair.id, paid: !repair.paid } });
    await refetch();
    queryClient.invalidateQueries({ queryKey: ["repairs"] });
  }

  function openInvoice() {
    if (!repair) return;
    const lines = (repair.repair_parts || []).map((p: any) => ({
      name: p.product_name,
      quantity: p.quantity,
      unit_price: p.unit_price,
      total: p.quantity * p.unit_price,
    }));
    setInvoice({
      kind: "repair",
      number: repair.id.slice(0, 8).toUpperCase(),
      date: new Date(repair.created_at).toLocaleString("en-GB"),
      customer: repair.customers,
      device: `${repair.device}${repair.brand ? ` (${repair.brand})` : ""}`,
      issue: repair.issue,
      lines,
      labour: repair.labour_cost || 0,
      total: repair.price || 0,
      paid: repair.paid,
      paymentMethod: "cash",
      warrantyUntil: repair.warranty_until,
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h3 className="font-extrabold text-[#0F172A] text-base">Repair Ticket Details</h3>
          <button onClick={onClose} className="p-1 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading || !repair ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#E11D48]" />
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Device</div>
                <div className="font-extrabold text-sm text-[#0F172A]">{repair.device} {repair.brand && `(${repair.brand})`}</div>
              </div>
              <div>
                <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Customer</div>
                <div className="font-bold text-slate-800">{repair.customers?.name || "Walk-in Customer"}</div>
              </div>
              <div className="col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Reported Issue</div>
                <div className="text-slate-800 font-medium mt-0.5">{repair.issue}</div>
              </div>
              <div>
                <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Status</div>
                <div className="mt-1"><StatusBadge status={repair.status} /></div>
              </div>
              <div>
                <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Warranty Until</div>
                <div className="font-bold text-slate-800 mt-1">{repair.warranty_until || "12 Months on Parts"}</div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <h4 className="font-extrabold text-[#0F172A] text-xs uppercase tracking-wider mb-3">Parts Used</h4>
              {(repair.repair_parts || []).length === 0 ? (
                <p className="text-xs text-slate-500 italic">No parts attached to ticket.</p>
              ) : (
                <ul className="space-y-2 text-xs mb-4">
                  {repair.repair_parts.map((p: any) => (
                    <li key={p.id} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <span className="font-semibold text-slate-800">{p.product_name} × {p.quantity}</span>
                      <span className="font-bold text-[#0F172A] tabular-nums">{formatGBP(p.quantity * p.unit_price)}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex gap-2 items-end mt-2">
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Attach Replacement Part
                  </label>
                  <select
                    value={selectedPartId}
                    onChange={(e) => setSelectedPartId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-[#E11D48] outline-none bg-white"
                  >
                    <option value="">Select inventory part…</option>
                    {parts.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} · {p.stock_quantity} left · {formatGBP(p.sale_price)}</option>
                    ))}
                  </select>
                </div>
                <input
                  type="number"
                  min="1"
                  value={partQty}
                  onChange={(e) => setPartQty(Math.max(1, Number(e.target.value)))}
                  className="w-16 rounded-xl border border-slate-300 px-2 py-2 text-xs font-bold text-center"
                />
                <button onClick={addPart} disabled={!selectedPartId || saving} className="btn-primary !py-2 !px-3 !text-xs disabled:opacity-50">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Add Part
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Total Ticket Price (Parts + Labour {formatGBP(repair.labour_cost || 0)})
                </div>
                <div className="text-xl font-black text-[#0F172A] tabular-nums">{formatGBP(repair.price || 0)}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={togglePaid}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    repair.paid ? "bg-amber-100 text-amber-900 border border-amber-300" : "bg-[#16A34A] text-white"
                  }`}
                >
                  {repair.paid ? "Mark Unpaid" : "Mark Paid"}
                </button>
                <button onClick={openInvoice} className="btn-primary !py-2 !px-4 !text-xs">
                  <FileText className="w-4 h-4" /> Issue Invoice
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {invoice && <InvoiceModal invoice={invoice} onClose={() => setInvoice(null)} />}
    </div>
  );
}
