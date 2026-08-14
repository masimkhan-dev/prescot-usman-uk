import { useState } from "react";
import { finalizeRepairTicket, linkCustomerToRepair } from "@/lib/repairs.functions";
import { Printer, X, CheckCircle2, Loader2, Lock, ExternalLink, UserPlus } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

interface RepairA4InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  repair: any;
  onFinalized?: () => void;
  onCustomerLinked?: () => void;
}

export function RepairA4InvoiceModal({
  isOpen,
  onClose,
  repair: initialRepair,
  onFinalized,
  onCustomerLinked,
}: RepairA4InvoiceModalProps) {
  const linkCustomerFn = useServerFn(linkCustomerToRepair);
  const [submitting, setSubmitting] = useState(false);
  const [repairState, setRepairState] = useState(initialRepair);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerNameInput, setCustomerNameInput] = useState("");
  const [customerPhoneInput, setCustomerPhoneInput] = useState("");
  const [linkingCustomer, setLinkingCustomer] = useState(false);

  if (!isOpen || !initialRepair) return null;
  const repair = repairState || initialRepair;

  // Authoritative ticket pricing directly from repair record (no artificial overrides)
  const quotePence = repair.total_price_pence || 0;
  const paidPence = repair.amount_paid_pence || 0;
  const depositPence = repair.deposit_pence || 0;
  const duePence = Math.max(0, quotePence - paidPence);
  const isPaidFull = duePence === 0;

  async function handleFinalize() {
    if (
      !confirm(
        "Finalize and complete this repair invoice? This will lock the historical snapshot record.",
      )
    )
      return;
    setSubmitting(true);
    try {
      await finalizeRepairTicket({ data: { repair_id: repair.id } });
      if (onFinalized) onFinalized();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveCustomer() {
    if (!customerNameInput.trim()) {
      toast.error("Customer name is required");
      return;
    }
    setLinkingCustomer(true);
    try {
      const res = await linkCustomerFn({
        data: {
          repair_id: repair.id,
          customer_name: customerNameInput.trim(),
          customer_phone: customerPhoneInput.trim() || null,
        },
      });
      toast.success("Customer updated successfully!");
      setRepairState((prev: any) => ({
        ...prev,
        customer_id: res.customer.id,
        customers: res.customer,
      }));
      setShowCustomerModal(false);
      if (onCustomerLinked) onCustomerLinked();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update customer");
    } finally {
      setLinkingCustomer(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  const invoiceDateRaw = repair.finalized_at || repair.created_at || Date.now();
  const createdDate = new Date(invoiceDateRaw).toLocaleDateString("en-GB");

  function formatWarrantyText(warrantyDays: number | null | undefined): string {
    if (warrantyDays === 0) return "No Warranty";
    if (warrantyDays === null || warrantyDays === undefined) return "Not Specified";
    return `${warrantyDays} Days Warranty`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto print-modal-overlay">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[94vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150 print-modal-card">
        {/* Modal Toolbar (Screen Only) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-brand" />
            <span className="font-extrabold text-sm text-white">
              {repair.is_finalized
                ? "Finalized A4 Repair Invoice & Receipt"
                : "Draft A4 Repair Invoice Preview"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!repair.is_finalized && (
              <button
                onClick={handleFinalize}
                disabled={submitting}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                Finalize & Complete Ticket
              </button>
            )}
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-brand hover:bg-brand/90 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Printer className="w-4 h-4" /> Print A4 Invoice
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable A4 Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 print:bg-white print:p-0 print:overflow-visible printable-a4-area">
          {/* SINGLE A4 PAGE: REPAIR INVOICE & RECEIPT */}
          <div className="bg-white border-0 shadow-none p-6 sm:p-8 print:p-4 max-w-3xl mx-auto space-y-4 sm:space-y-5 print:space-y-3.5 text-slate-900 font-sans a4-sheet-page">
            {/* 1. SHOP HEADER & LOGO */}
            <div className="flex justify-between items-start pb-3.5 border-b-2 border-slate-900 gap-4">
              <div className="space-y-1">
                <h1 className="font-black text-xl sm:text-2xl tracking-tight text-slate-900">
                  PRESCOT MOBILES &amp; COMPUTER SERVICES
                </h1>
                <p className="text-xs sm:text-sm text-slate-700 font-medium">
                  57 Eccleston Street, Prescot L34 5QH
                </p>
                <p className="text-xs sm:text-sm text-slate-700 font-medium">
                  Tel: +44 7491 248770
                </p>
                <p className="text-xs sm:text-sm text-slate-600 font-mono">
                  info@prescotmobiles.co.uk | www.prescotmobiles.co.uk
                </p>
              </div>

              <div className="text-right shrink-0 flex flex-col items-end">
                <img
                  src="/site-assets/prescot-logo.png"
                  alt="Prescot Mobile Shop Logo"
                  className="h-26 sm:h-30 print:h-24 max-w-[260px] w-auto object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = "none";
                  }}
                />
              </div>
            </div>

            {/* 2. INVOICE / RECEIPT NUMBER & DATE BAR */}
            <div className="flex items-center justify-between gap-2 pt-1 font-mono text-xs sm:text-sm border-b border-slate-300 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-600">INVOICE NO:</span>
                <span className="font-extrabold text-sm sm:text-base text-brand">
                  {repair.rep_number}
                </span>
              </div>
              <div className="text-center font-black text-sm sm:text-base tracking-widest text-slate-900 uppercase">
                REPAIR INVOICE / RECEIPT
              </div>
              <div className="flex items-center gap-2 text-right">
                <span className="font-bold text-slate-600">DATE:</span>
                <span className="font-extrabold text-slate-900">{createdDate}</span>
              </div>
            </div>

            {/* 3. CUSTOMER DETAILS BOX */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-4 space-y-1.5 text-xs sm:text-sm relative group">
              <div className="flex items-center justify-between underline mb-1">
                <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">
                  CUSTOMER DETAILS
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCustomerNameInput(repair.customers?.name || "");
                    setCustomerPhoneInput(repair.customers?.phone || "");
                    setShowCustomerModal(true);
                  }}
                  className="px-2.5 py-1 bg-slate-200 hover:bg-brand hover:text-white text-slate-700 font-extrabold rounded text-[10px] transition-colors cursor-pointer print:hidden flex items-center gap-1"
                >
                  <UserPlus className="w-3 h-3" />
                  {repair.customers?.name ? "Edit Customer" : "+ Add Customer"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-bold text-slate-700">NAME: </span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {repair.customers?.name || "Walk-In Customer"}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-slate-700">CONTACT: </span>
                  <span className="font-extrabold font-mono text-slate-900">
                    {repair.customers?.phone || repair.customers?.email || "—"}
                  </span>
                </div>
              </div>
              {repair.customers?.address && (
                <div>
                  <span className="font-bold text-slate-700">ADDRESS: </span>
                  <span className="font-medium text-slate-800">{repair.customers.address}</span>
                </div>
              )}
            </div>

            {/* 4. MAIN REPAIR JOB & DEVICE BOX */}
            <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-3.5 sm:p-4 space-y-2.5 text-xs sm:text-sm">
              {/* Device Spec Rows */}
              <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 border-b border-slate-300 pb-2">
                <div className="flex items-baseline">
                  <span className="font-bold text-slate-600 w-32 shrink-0">DEVICE MAKE:</span>
                  <span className="font-extrabold text-slate-900 underline decoration-slate-400">
                    {repair.brand || "Mobile Device"}
                  </span>
                </div>
                <div className="flex items-baseline">
                  <span className="font-bold text-slate-600 w-32 shrink-0">DEVICE MODEL:</span>
                  <span className="font-extrabold text-slate-900 underline decoration-slate-400">
                    {repair.model || repair.device} {repair.color ? `(${repair.color})` : ""}
                  </span>
                </div>
                <div className="flex items-baseline col-span-2">
                  <span className="font-bold text-slate-600 w-32 shrink-0">
                    FULL IMEI / SERIAL:
                  </span>
                  <span className="font-bold font-mono text-slate-900 underline decoration-slate-400">
                    {repair.imei || "N/A"}
                  </span>
                </div>
                <div className="flex items-baseline col-span-2">
                  <span className="font-bold text-slate-600 w-32 shrink-0">PROBLEM:</span>
                  <span className="font-bold text-slate-900 underline decoration-slate-400">
                    {repair.issue || "General Repair"}
                  </span>
                </div>
              </div>

              {/* Work Completed & Cost Items Table */}
              <div className="space-y-1">
                <span className="font-extrabold text-[10px] text-slate-900 uppercase tracking-wider block">
                  REPAIR ITEMS &amp; WORKSHOP SUMMARY:
                </span>
                <table className="w-full text-left text-xs border border-slate-300 rounded-md overflow-hidden">
                  <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    <tr>
                      <th className="py-1.5 px-3">Description</th>
                      <th className="py-1.5 px-3 text-center">Quality</th>
                      <th className="py-1.5 px-3 text-center">Warranty</th>
                      <th className="py-1.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {repair.repair_items && repair.repair_items.length > 0 ? (
                      repair.repair_items.map((item: any) => (
                        <tr key={item.id}>
                          <td className="py-1.5 px-3 font-semibold text-slate-900">
                            {item.description}
                          </td>
                          <td className="py-1.5 px-3 text-center capitalize text-slate-600">
                            {item.part_quality || "Standard"}
                          </td>
                          <td className="py-1.5 px-3 text-center font-bold text-slate-900">
                            {formatWarrantyText(item.warranty_days)}
                            {item.warranty_policy_text && (
                              <p className="text-[9px] font-normal text-slate-500 italic mt-0.5 leading-tight">
                                {item.warranty_policy_text}
                              </p>
                            )}
                          </td>
                          <td className="py-1.5 px-3 text-right font-bold font-mono">
                            £
                            {(
                              ((item.customer_price_pence || 0) + (item.labour_price_pence || 0)) /
                              100
                            ).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="py-1.5 px-3 font-semibold text-slate-900">{repair.issue}</td>
                        <td className="py-1.5 px-3 text-center capitalize text-slate-600">
                          Standard
                        </td>
                        <td className="py-1.5 px-3 text-center font-bold text-slate-900">
                          {formatWarrantyText(repair.warranty_days)}
                          {repair.warranty_policy_text && (
                            <p className="text-[9px] font-normal text-slate-500 italic mt-0.5 leading-tight">
                              {repair.warranty_policy_text}
                            </p>
                          )}
                        </td>
                        <td className="py-1.5 px-3 text-right font-bold font-mono">
                          £{(quotePence / 100).toFixed(2)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Cost Totals & Payment Summary */}
              <div className="flex justify-between items-end pt-2 border-t border-slate-300">
                <div>
                  {isPaidFull ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold text-xs uppercase tracking-wider">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" /> PAID IN FULL
                    </div>
                  ) : (
                    <div className="text-xs font-semibold text-slate-600">
                      Collection PIN:{" "}
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {repair.collection_pin || "1234"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="w-56 space-y-0.5 text-xs font-mono">
                  <div className="flex justify-between text-slate-700">
                    <span>TOTAL:</span>
                    <span className="font-extrabold text-slate-900">
                      £{(quotePence / 100).toFixed(2)}
                    </span>
                  </div>

                  {depositPence > 0 && (
                    <div className="flex justify-between text-slate-700">
                      <span>DEPOSIT PAID:</span>
                      <span className="font-bold">£{(depositPence / 100).toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-700">
                    <span>PAID:</span>
                    <span className="font-bold">£{(paidPence / 100).toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between font-extrabold text-sm border-t border-slate-400 pt-0.5 text-slate-900">
                    <span>BALANCE DUE:</span>
                    <span className={duePence > 0 ? "text-brand" : "text-emerald-700"}>
                      £{(duePence / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Customer Signature & Notes Line */}
              <div className="pt-2 border-t border-slate-300 space-y-1">
                <div>
                  <span className="font-bold text-slate-800 text-[11px]">
                    Customer Signature __________________________________________________
                  </span>
                </div>
                {repair.notes && (
                  <div className="text-[11px]">
                    <span className="font-bold text-slate-700">NOTES: </span>
                    <span className="text-slate-800 italic">{repair.notes}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 5. SHORT TERMS AND CONDITIONS SECTION */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[9px] sm:text-[9.5px] leading-snug text-slate-700 space-y-1">
              <div className="font-extrabold text-slate-900 uppercase tracking-wider text-[10px] border-b border-slate-200 pb-0.5 mb-0.5">
                TERMS AND CONDITIONS (ALL PHONES/DEVICES TESTED &amp; PAID AT COLLECTION)
              </div>
              <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 list-decimal list-inside text-slate-600">
                <li>Not responsible for loss of ANY data. Please backup device prior to repair.</li>
                <li>
                  Owner's responsibility to remove SIM &amp; memory cards. Not responsible for loss.
                </li>
                <li>
                  No warranty on LCDs/touchscreens if physical marks, scratches, or cracks occur
                  after collection.
                </li>
                <li>Only repair fault booked in for. Additional faults require separate quote.</li>
                <li>
                  Warranty covers replacement parts &amp; workmanship. Water damage voids all
                  warranty.
                </li>
                <li>Collect within 30 days. Devices left &gt;60 days handled per full T&amp;Cs.</li>
                <li className="col-span-1 sm:col-span-2 text-slate-500 italic">
                  Ask staff for our full Terms &amp; Conditions.
                </li>
              </ol>
            </div>

            {/* 6. TWO-COLUMN FOOTER: WEBSITE POLICY + GOOGLE REVIEW QR */}
            <div className="pt-2 border-t border-slate-200 flex flex-row items-center justify-between gap-4">
              {/* Left Column: Website Policy Reference */}
              <div className="text-left text-[10px] text-slate-700 font-medium space-y-1">
                <p className="leading-snug">
                  For full Repair Terms, Warranty &amp; Refund Policy, kindly visit:
                </p>
                <a
                  href="https://www.prescotmobiles.co.uk"
                  target="_blank"
                  rel="noreferrer"
                  className="font-extrabold text-brand hover:underline inline-flex items-center gap-0.5 text-xs"
                >
                  www.prescotmobiles.co.uk
                  <ExternalLink className="w-3.5 h-3.5 print:hidden text-brand" />
                </a>
              </div>

              {/* Right Column: Google Review QR Code Block */}
              <div className="flex flex-row items-center gap-3 shrink-0 bg-slate-50 p-2 rounded-xl border border-slate-200">
                <img
                  src="/site-assets/google-review-qr.png"
                  alt="Scan to leave Prescot Mobiles a Google review"
                  className="w-[82px] h-[82px] object-contain bg-white p-1 rounded-lg border border-slate-200 aspect-square shadow-2xs"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = "none";
                  }}
                />
                <div className="text-left">
                  <span className="font-extrabold text-[9.5px] uppercase tracking-wider text-slate-800 block">
                    SHARE YOUR EXPERIENCE
                  </span>
                  <span className="text-[8.5px] font-semibold text-slate-600 block leading-snug mt-0.5 max-w-[120px]">
                    Scan QR code to review us on Google
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Edit Popup (Screen Only) */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs print:hidden">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-700 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-brand" />
                <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                  {repair.customers?.name ? "Edit Customer Details" : "Add Customer Details"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomerModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Updates customer contact on this finalized invoice. Financial totals remain locked.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={customerNameInput}
                  onChange={(e) => setCustomerNameInput(e.target.value)}
                  placeholder="Customer Full Name"
                  autoFocus
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-semibold text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={customerPhoneInput}
                  onChange={(e) => setCustomerPhoneInput(e.target.value)}
                  placeholder="Phone Number"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-semibold text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:border-brand"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCustomerModal(false)}
                className="flex-1 py-2 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCustomer}
                disabled={linkingCustomer}
                className="flex-1 py-2 bg-brand hover:bg-brand/90 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                {linkingCustomer ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UserPlus className="w-3.5 h-3.5" />
                )}
                Save Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE-PAGE A4 PRINT ENGINE CSS — STRICT 1-PAGE FIT */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 4mm 6mm;
          }

          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Hide header toolbar & print:hidden items */
          .print\\:hidden {
            display: none !important;
          }

          /* Fail-safe print visibility: hide body children visually without breaking DOM layout */
          body * {
            visibility: hidden;
          }

          /* Make printable A4 modal and all content inside 100% visible */
          .print-modal-overlay,
          .print-modal-overlay *,
          .print-modal-card,
          .print-modal-card *,
          .printable-a4-area,
          .printable-a4-area *,
          .a4-sheet-page,
          .a4-sheet-page * {
            visibility: visible !important;
          }

          /* Position printable overlay at top-left of page */
          .print-modal-overlay {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            overflow: hidden !important;
          }

          .print-modal-card {
            position: static !important;
            background: #ffffff !important;
            border: none !important;
            box-shadow: none !important;
            max-width: 100% !important;
            max-height: none !important;
            overflow: hidden !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .printable-a4-area {
            position: static !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: hidden !important;
            width: 100% !important;
            display: block !important;
          }

          .a4-sheet-page {
            display: block !important;
            width: 190mm !important;
            max-height: 282mm !important;
            box-sizing: border-box !important;
            margin: 0 auto !important;
            padding: 2mm 3mm !important;
            background: #ffffff !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            break-after: avoid !important;
            page-break-after: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
