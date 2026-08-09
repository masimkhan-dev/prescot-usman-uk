import { useState } from "react";
import { finalizeRepairTicket } from "@/lib/repairs.functions";
import { Printer, X, CheckCircle2, Loader2, Lock, ExternalLink } from "lucide-react";

interface RepairA4InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  repair: any;
  onFinalized?: () => void;
}

export function RepairA4InvoiceModal({
  isOpen,
  onClose,
  repair,
  onFinalized,
}: RepairA4InvoiceModalProps) {
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !repair) return null;

  // Authoritative ticket pricing directly from repair record (no artificial overrides)
  const quotePence = repair.total_price_pence || 0;
  const paidPence = repair.amount_paid_pence || 0;
  const depositPence = repair.deposit_pence || 0;
  const duePence = Math.max(0, quotePence - paidPence);
  const isPaidFull = duePence === 0;

  async function handleFinalize() {
    if (
      !confirm(
        "Finalize and complete this repair invoice? This will lock the historical snapshot record."
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

  function handlePrint() {
    window.print();
  }

  const invoiceDateRaw = repair.finalized_at || repair.created_at || Date.now();
  const createdDate = new Date(invoiceDateRaw).toLocaleDateString("en-GB");

  function formatWarrantyText(warrantyDays: number | null | undefined): string {
    if (warrantyDays === null || warrantyDays === undefined) return "Not Specified";
    if (warrantyDays === 0) return "No Warranty";
    return `${warrantyDays} Days`;
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
          <div className="bg-white border border-slate-300 shadow-lg p-5 sm:p-6 rounded-xl max-w-3xl mx-auto space-y-3 text-slate-900 font-sans a4-sheet-page">
            
            {/* 1. SHOP HEADER & LOGO */}
            <div className="flex justify-between items-start pb-2.5 border-b-2 border-slate-900 gap-4">
              <div className="space-y-0.5">
                <h1 className="font-black text-xl sm:text-2xl tracking-tight text-slate-900">
                  PRESCOT MOBILES & COMPUTER SERVICES
                </h1>
                <p className="text-xs text-slate-700 font-medium">
                  57 Eccleston Street, Prescot L34 5QH
                </p>
                <p className="text-xs text-slate-700 font-medium">
                  Tel: 0151 426 0000 | Mob: 07479 385163
                </p>
                <p className="text-xs text-slate-600 font-mono">
                  info@prescotmobiles.co.uk | www.prescotmobiles.co.uk
                </p>
              </div>

              <div className="text-right shrink-0 flex flex-col items-end">
                <img
                  src="/site-assets/prescot-logo.png"
                  alt="Prescot Mobile Shop Logo"
                  className="h-18 sm:h-20 w-auto object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = "none";
                  }}
                />
              </div>
            </div>

            {/* 2. INVOICE / RECEIPT NUMBER & DATE BAR */}
            <div className="flex items-center justify-between gap-2 pt-0.5 font-mono text-xs border-b border-slate-300 pb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-600">INVOICE NO:</span>
                <span className="font-extrabold text-sm text-brand">{repair.rep_number}</span>
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
            <div className="border border-slate-900 rounded-lg p-3 space-y-1 text-xs bg-slate-50/50">
              <div className="font-bold text-[10px] text-slate-500 uppercase tracking-wider underline mb-0.5">
                CUSTOMER DETAILS
              </div>
              <div className="grid grid-cols-2 gap-3">
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
            <div className="border border-slate-900 rounded-lg p-3.5 space-y-2.5 text-xs">
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
                  <span className="font-bold text-slate-600 w-32 shrink-0">FULL IMEI / SERIAL:</span>
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
                  REPAIR ITEMS & WORKSHOP SUMMARY:
                </span>
                <table className="w-full text-left text-xs border border-slate-300 rounded-md overflow-hidden">
                  <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    <tr>
                      <th className="py-1.5 px-2.5">Description</th>
                      <th className="py-1.5 px-2.5 text-center">Quality</th>
                      <th className="py-1.5 px-2.5 text-center">Warranty</th>
                      <th className="py-1.5 px-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {repair.repair_items && repair.repair_items.length > 0 ? (
                      repair.repair_items.map((item: any) => (
                        <tr key={item.id}>
                          <td className="py-1.5 px-2.5 font-semibold text-slate-900">
                            {item.description}
                          </td>
                          <td className="py-1.5 px-2.5 text-center capitalize text-slate-600">
                            {item.part_quality || "Standard"}
                          </td>
                          <td className="py-1.5 px-2.5 text-center font-bold text-slate-900">
                            {formatWarrantyText(item.warranty_days)}
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-bold font-mono">
                            £
                            {(
                              ((item.customer_price_pence || 0) +
                                (item.labour_price_pence || 0)) /
                              100
                            ).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="py-1.5 px-2.5 font-semibold text-slate-900">
                          {repair.issue}
                        </td>
                        <td className="py-1.5 px-2.5 text-center capitalize text-slate-600">
                          Standard
                        </td>
                        <td className="py-1.5 px-2.5 text-center font-bold text-slate-900">
                          {formatWarrantyText(repair.warranty_days)}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-bold font-mono">
                          £{(quotePence / 100).toFixed(2)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Cost Totals & Payment Summary */}
              <div className="flex justify-between items-end pt-1.5 border-t border-slate-300">
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
                    <span className="font-extrabold text-slate-900">£{(quotePence / 100).toFixed(2)}</span>
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
              <div className="pt-1.5 border-t border-slate-300 space-y-1.5">
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
            <div className="border border-slate-300 rounded-lg p-2.5 bg-slate-50/70 text-[9px] leading-snug text-slate-700 space-y-0.5">
              <div className="font-extrabold text-slate-900 uppercase tracking-wider text-[10px] border-b border-slate-200 pb-0.5 mb-0.5">
                TERMS AND CONDITIONS
              </div>
              <p className="font-semibold text-slate-800 text-[9px] mb-0.5">
                All phones and devices to be tested and paid for at collection.
              </p>
              <ol className="list-decimal list-inside space-y-0.5 text-[9px] text-slate-600">
                <li>We are not responsible for the loss of ANY data. Please backup your device prior to repair.</li>
                <li>It is the owner's responsibility to remove SIM and memory cards. We are not responsible for loss or damage.</li>
                <li>No warranty is provided on LCDs or touch screens if the device has physical marks, scratches, or cracks after collection.</li>
                <li>We will only repair the fault booked in for. Additional faults discovered will require a separate quotation.</li>
                <li>Quoted warranty covers replacement parts and workmanship only. Water damage voids all warranties.</li>
                <li>Devices should be collected within 30 days of booking in or a storage charge may apply. Devices left longer than 60 days may be handled in accordance with our full Terms &amp; Conditions.</li>
                <li>Please ask us for our full Terms &amp; Conditions.</li>
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
              <div className="flex flex-col items-center justify-center text-center space-y-0.5 shrink-0 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                <span className="font-extrabold text-[8.5px] uppercase tracking-wider text-slate-800">
                  SHARE YOUR EXPERIENCE
                </span>
                <img
                  src="/site-assets/google-review-qr.png"
                  alt="Scan to leave Prescot Mobiles a Google review"
                  className="w-[80px] h-[80px] object-contain bg-white p-0.5 rounded border border-slate-200 aspect-square"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = "none";
                  }}
                />
                <span className="text-[8px] font-semibold text-slate-600">
                  Scan to leave us a review on Google
                </span>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* SINGLE-PAGE A4 PRINT ENGINE CSS */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }

          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
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
            height: auto !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            overflow: visible !important;
          }

          .print-modal-card {
            position: static !important;
            background: #ffffff !important;
            border: none !important;
            box-shadow: none !important;
            max-width: 100% !important;
            max-height: none !important;
            overflow: visible !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .printable-a4-area {
            position: static !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            width: 100% !important;
            display: block !important;
          }

          .a4-sheet-page {
            display: block !important;
            width: 190mm !important;
            box-sizing: border-box !important;
            margin: 0 auto !important;
            padding: 5mm 6mm !important;
            background: #ffffff !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            break-after: auto !important;
            page-break-after: auto !important;
          }
        }
      `}</style>

    </div>
  );
}
