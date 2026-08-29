import { BUSINESS } from "@/lib/business";
import { Printer, X, ShieldCheck, CheckCircle2, Smartphone, FileText, ExternalLink } from "lucide-react";

interface DeviceSnapshot {
  brand: string;
  model: string;
  storage?: string | null;
  colour?: string | null;
  imei1: string;
  imei2?: string | null;
  serial_number?: string | null;
  condition_grade: string;
  condition_notes?: string | null;
  battery_health?: string | null;
  network_status?: string | null;
  face_id_status?: string | null;
  activation_lock_status?: string | null;
  accessories?: string | null;
  stock_number?: string | null;
}

export interface PhoneSaleInvoiceData {
  invoice_number: string;
  sold_at: string;
  buyer?: { name: string; phone?: string | null; address?: string | null; email?: string | null } | null;
  device_snapshot: DeviceSnapshot;
  selling_price_pence: number;
  payment_method: string;
  warranty_days?: number | null;
  warranty_policy_text?: string | null;
  warranty_start_date?: string | null;
  warranty_until?: string | null;
  notes?: string | null;
  business_name?: string;
  business_address?: string;
  business_phone?: string;
  business_email?: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }) + " · " + new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatGBP(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}

function formatDeviceName(brand: string, model: string, storage?: string | null, colour?: string | null) {
  const parts = [];
  const brandTrim = (brand || "").trim();
  const modelTrim = (model || "").trim();
  
  if (modelTrim.toLowerCase().startsWith(brandTrim.toLowerCase())) {
    parts.push(modelTrim);
  } else {
    parts.push(`${brandTrim} ${modelTrim}`.trim());
  }

  if (storage && storage.trim()) {
    const s = storage.trim();
    parts.push(s.endsWith("GB") || s.endsWith("TB") ? s : `${s}GB`);
  }
  if (colour && colour.trim()) {
    parts.push(colour.trim());
  }
  return parts.join(" · ");
}

function formatConditionLabel(conditionGrade: string) {
  const grade = (conditionGrade || "Good").trim();
  if (grade.toLowerCase() === "new") return "Brand New";
  return `Used – ${grade}`;
}

function formatBatteryHealth(val?: string | null) {
  if (!val || val.trim() === "") return null;
  const cleaned = val.trim();
  return cleaned.endsWith("%") ? cleaned : `${cleaned}%`;
}

function formatFaults(notes?: string | null) {
  if (!notes || notes.trim() === "" || notes.trim().toLowerCase() === "none" || notes.trim().toLowerCase() === "fresh") {
    return null;
  }
  return notes.trim();
}

// Authoritative UK Pre-Owned & Refurbished Phone Sales Terms (6 Clear Points)
const PHONE_SALE_TERMS = [
  {
    title: "1. Device Condition",
    text: "This device is sold as described with cosmetic grade and functionality recorded at the point of sale.",
  },
  {
    title: "2. Store Warranty",
    text: "Where a store warranty is specified, it covers internal hardware faults from the date of purchase.",
  },
  {
    title: "3. Warranty Exclusions",
    text: "Excludes accidental drops, physical damage, liquid ingress, cracked screens, or third-party repairs.",
  },
  {
    title: "4. Returns Policy",
    text: "Exchanges or refunds are accepted within 14 days if the device is materially different from description.",
  },
  {
    title: "5. IMEI & Network Compatibility",
    text: "Prescot Mobiles checks the device IMEI and network status at point of sale to ensure compatibility with the customer's specified network. Any restrictions are disclosed.",
  },
  {
    title: "6. Statutory Rights",
    text: "Nothing in these terms affects your statutory consumer rights under the UK Consumer Rights Act 2015.",
  },
];

export function PhoneSaleInvoiceModal({
  data: d,
  onClose,
}: {
  data: PhoneSaleInvoiceData;
  onClose: () => void;
}) {
  const businessName = d.business_name ?? BUSINESS.name;
  const businessAddress = d.business_address ?? BUSINESS.fullAddress;
  const businessPhone = d.business_phone ?? BUSINESS.phone;
  const businessEmail = d.business_email ?? BUSINESS.email;
  const dev = d.device_snapshot;

  const handlePrint = () => {
    window.print();
  };

  const deviceFullName = formatDeviceName(dev.brand, dev.model, dev.storage, dev.colour);
  const conditionLabel = formatConditionLabel(dev.condition_grade);
  const batteryHealth = formatBatteryHealth(dev.battery_health);
  const disclosedFaults = formatFaults(dev.condition_notes);
  const activationLock = dev.activation_lock_status && dev.activation_lock_status !== "Clean"
    ? dev.activation_lock_status
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm print-modal-overlay">
      <div className="bg-white border border-slate-300 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[96vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 print-modal-card">
        
        {/* Modal Action Bar (Hidden completely in print) */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-slate-900 text-white print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-brand" />
            <h2 className="font-extrabold text-sm text-white">
              Phone Sales Invoice — {d.invoice_number}
            </h2>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrint}
              className="min-h-[36px] inline-flex items-center justify-center gap-2 text-xs font-bold px-4 py-2 rounded-xl bg-brand text-white hover:bg-brand/90 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Print A4 Invoice
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable A4 Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 print:bg-white print:p-0 print:overflow-visible printable-a4-area">
          {/* EXACT SINGLE-PAGE A4 FIT — GENEROUS, CRISP & HIGHLY LEGIBLE */}
          <div className="bg-white border-0 shadow-none p-6 sm:p-8 print:p-0 max-w-3xl mx-auto space-y-3.5 sm:space-y-4 text-slate-900 font-sans a4-sheet-page">
            
            {/* 1. STORE HEADER & LOGO */}
            <div className="flex justify-between items-center pb-3 border-b-2 border-slate-900 gap-4">
              <div className="shrink-0">
                <img
                  src="/site-assets/prescot-logo.png"
                  alt="Prescot Mobiles & Computer Services"
                  className="h-16 sm:h-18 print:h-16 max-w-[220px] w-auto object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = "none";
                  }}
                />
              </div>

              <div className="text-right space-y-1">
                <h1 className="font-black text-lg sm:text-xl tracking-tight text-slate-900 leading-tight">
                  {businessName.toUpperCase()}
                </h1>
                <p className="text-xs sm:text-sm text-slate-700 font-medium leading-tight">{businessAddress}</p>
                <p className="text-xs sm:text-sm text-slate-600 font-mono leading-tight">
                  Tel: {businessPhone} | {businessEmail} | www.prescotmobiles.co.uk
                </p>
              </div>
            </div>

            {/* 2. INVOICE IDENTITY & METADATA BAR */}
            <div className="flex items-center justify-between gap-2 pt-1 font-mono text-xs sm:text-sm border-b border-slate-300 pb-2">
              <div>
                <span className="font-bold text-slate-600">INVOICE NO: </span>
                <span className="font-extrabold text-sm sm:text-base text-brand">{d.invoice_number}</span>
              </div>
              <div className="text-center font-black text-xs sm:text-sm tracking-widest text-slate-900 uppercase">
                MOBILE PHONE SALES INVOICE
              </div>
              <div className="text-right">
                <span className="font-bold text-slate-600">DATE: </span>
                <span className="font-extrabold text-slate-900">{formatDateTime(d.sold_at)}</span>
              </div>
            </div>

            {/* 3. SELLER & BUYER (CUSTOMER) DETAILS */}
            <div className="bg-slate-50 rounded-xl p-3 sm:p-3.5 text-xs sm:text-sm space-y-1 border border-slate-200">
              <div className="grid grid-cols-2 gap-4 divide-x divide-slate-200">
                <div>
                  <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider block mb-0.5">
                    SELLER DETAILS
                  </span>
                  <p className="font-extrabold text-slate-900 text-sm">{businessName}</p>
                  <p className="text-slate-600 text-xs">{businessAddress}</p>
                </div>
                <div className="pl-4">
                  <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider block mb-0.5">
                    CUSTOMER DETAILS
                  </span>
                  <p className="font-extrabold text-slate-900 text-sm">
                    {d.buyer?.name || "Walk-in Customer"}
                  </p>
                  {d.buyer?.phone && (
                    <p className="text-slate-700 font-mono text-xs">Phone: {d.buyer.phone}</p>
                  )}
                  {d.buyer?.address && (
                    <p className="text-slate-600 text-xs">{d.buyer.address}</p>
                  )}
                </div>
              </div>
            </div>

            {/* 4. PURCHASED DEVICE & FINANCIAL SUMMARY */}
            <div className="bg-slate-50/50 rounded-xl p-3.5 space-y-2.5 text-xs sm:text-sm border border-slate-200">
              <span className="font-extrabold text-[10px] text-slate-900 uppercase tracking-wider block border-b border-slate-200 pb-1">
                PURCHASED HANDSET SUMMARY:
              </span>
              <table className="w-full text-left text-xs sm:text-sm border border-slate-300 rounded-lg overflow-hidden bg-white">
                <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <tr>
                    <th className="py-2 px-3">Item Description</th>
                    <th className="py-2 px-3 w-40">IMEI / Identifiers</th>
                    <th className="py-2 px-3 w-32">Condition</th>
                    <th className="py-2 px-3 text-right w-24">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      <span className="font-extrabold text-sm sm:text-base block text-slate-900">
                        {deviceFullName}
                      </span>
                      {dev.network_status && (
                        <span className="block text-xs text-slate-600">
                          Network: {dev.network_status}
                        </span>
                      )}
                      {dev.accessories && (
                        <span className="block text-xs text-slate-600">
                          Accessories: {dev.accessories}
                        </span>
                      )}
                      {activationLock && (
                        <span className="block text-xs text-slate-600">
                          Activation: {activationLock}
                        </span>
                      )}
                      {dev.stock_number && (
                        <span className="block text-[10px] text-slate-400 font-mono">
                          Stock Ref: #{dev.stock_number}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-xs text-slate-700">
                      <span className="font-extrabold text-xs sm:text-sm block text-slate-900">IMEI: {dev.imei1}</span>
                      {dev.imei2 && <span className="block text-slate-600 text-xs">IMEI 2: {dev.imei2}</span>}
                      {dev.serial_number && <span className="block text-slate-600 text-xs">S/N: {dev.serial_number}</span>}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 text-xs">
                      <span className="font-extrabold text-slate-900 text-xs sm:text-sm block">
                        {conditionLabel}
                      </span>
                      {dev.face_id_status && (dev.face_id_status === "working" || dev.face_id_status === "not_working" || dev.face_id_status === "Working" || dev.face_id_status === "Not Working") && (
                        <span className="block text-xs text-slate-600 font-medium">
                          Face ID: {dev.face_id_status.toLowerCase().includes("not") ? "Not Working" : "Working"}
                        </span>
                      )}
                      {batteryHealth && (
                        <span className="block text-xs text-slate-600 font-medium">Battery: {batteryHealth}</span>
                      )}
                      {disclosedFaults && (
                        <span className="block text-[10px] text-slate-500 leading-tight mt-0.5">Note: {disclosedFaults}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-sm sm:text-base text-slate-900">
                      {formatGBP(d.selling_price_pence)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Totals & Payment Breakdown */}
              <div className="flex justify-between items-end pt-2 border-t border-slate-300">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold text-xs uppercase tracking-wider">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> PAID IN FULL
                  </div>
                </div>

                <div className="w-56 space-y-1 text-xs sm:text-sm font-mono">
                  <div className="flex justify-between text-slate-700">
                    <span>SELLING PRICE:</span>
                    <span className="font-bold">{formatGBP(d.selling_price_pence)}</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-black border-t border-slate-300 pt-1 text-sm sm:text-base">
                    <span>TOTAL:</span>
                    <span>{formatGBP(d.selling_price_pence)}</span>
                  </div>
                  <div className="flex justify-between text-slate-700 pt-0.5 text-xs">
                    <span>PAYMENT METHOD:</span>
                    <span className="font-bold uppercase">
                      {d.payment_method.replace("_", " ")}
                    </span>
                  </div>
                  <div className="flex justify-between font-extrabold text-xs sm:text-sm border-t border-slate-400 pt-1 text-slate-900">
                    <span>BALANCE DUE:</span>
                    <span className="text-emerald-700">£0.00</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. WARRANTY COVERAGE SECTION */}
            {d.warranty_days !== null && d.warranty_days !== undefined && d.warranty_days > 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs leading-relaxed text-slate-800 space-y-1">
                <div className="font-extrabold text-slate-900 uppercase tracking-wider text-xs border-b border-slate-300 pb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-brand" /> WARRANTY COVERAGE
                </div>
                <p className="font-bold text-slate-900 text-xs sm:text-sm">
                  {d.warranty_days} Days Store Guarantee — Valid until{" "}
                  {d.warranty_until ? formatDate(d.warranty_until) : "specified date"}
                </p>
                {d.warranty_policy_text && (
                  <p className="text-slate-700 text-xs leading-relaxed">
                    {d.warranty_policy_text}
                  </p>
                )}
              </div>
            ) : d.warranty_days === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-600">
                <strong>Warranty: No Additional Store Warranty.</strong> Statutory consumer rights remain unaffected under UK law.
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-600">
                <strong>Store Warranty: Not Specified.</strong> Statutory consumer rights apply under UK Consumer Rights Act 2015.
              </div>
            )}

            {/* 6. NUMBERED SALE TERMS & CONDITIONS (6 Points) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[10px] sm:text-[10.5px] leading-snug text-slate-800 space-y-1">
              <div className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px] border-b border-slate-300 pb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-700" /> TERMS &amp; CONDITIONS OF SALE
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-0.5">
                {PHONE_SALE_TERMS.map((st) => (
                  <div key={st.title} className="leading-snug">
                    <span className="font-bold text-slate-900">{st.title}: </span>
                    <span className="text-slate-700">{st.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 7. CUSTOMER ACKNOWLEDGEMENT & SIGNATURE */}
            <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs text-slate-700 font-medium">
              <div>
                Customer Signature: <span className="font-mono">___________________________________</span>
              </div>
              <div>
                Date: <span className="font-mono">_________________</span>
              </div>
            </div>

            {/* 8. FOOTER WITH LARGE GOOGLE REVIEW QR & POLICY REFERENCE */}
            <div className="pt-2.5 border-t border-slate-200 flex flex-row items-center justify-between gap-4">
              {/* Left Column: Website Policy & Thank you */}
              <div className="text-left text-[10.5px] text-slate-600 leading-snug space-y-1">
                <p className="font-black text-slate-900 text-xs sm:text-sm">
                  Thank you for choosing Prescot Mobiles!
                </p>
                <p>
                  Please keep this invoice as your official proof of purchase and warranty claim document.
                </p>
                <p className="pt-0.5 font-medium">
                  For full Terms, Warranty &amp; Return Policies:{" "}
                  <a
                    href="https://www.prescotmobiles.co.uk"
                    target="_blank"
                    rel="noreferrer"
                    className="font-extrabold text-brand hover:underline inline-flex items-center gap-0.5"
                  >
                    www.prescotmobiles.co.uk
                    <ExternalLink className="w-3 h-3 print:hidden text-brand" />
                  </a>
                </p>
              </div>

              {/* Right Column: Prominent Google Review QR Block */}
              <div className="flex flex-row items-center gap-3 shrink-0 bg-slate-50 p-2 sm:p-2.5 rounded-xl border border-slate-200">
                <img
                  src="/site-assets/google-review-qr.png"
                  alt="Scan to leave a Google review"
                  className="w-16 h-16 sm:w-18 sm:h-18 print:w-16 print:h-16 object-contain bg-white p-1 rounded-lg border border-slate-200 aspect-square shadow-2xs"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = "none";
                  }}
                />
                <div className="text-left space-y-0.5">
                  <span className="font-extrabold text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-900 block">
                    SHARE YOUR EXPERIENCE
                  </span>
                  <span className="text-[9.5px] sm:text-[10px] text-slate-600 block leading-tight">
                    Scan to leave a review on Google
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* DUAL PRINT ENGINE CSS — STRICT SINGLE-PAGE A4 FIT */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          body * {
            visibility: hidden !important;
          }
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
            width: 100% !important;
            max-width: 194mm !important;
            box-sizing: border-box !important;
            margin: 0 auto !important;
            padding: 0 !important;
            background: #ffffff !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}

export function PhoneSaleInvoice({ data }: { data: PhoneSaleInvoiceData }) {
  return null;
}
