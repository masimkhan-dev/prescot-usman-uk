import { BUSINESS } from "@/lib/business";
import { Printer, X, ShieldCheck, CheckCircle2, Smartphone, FileText } from "lucide-react";

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
  const parts = [brand, model];
  if (storage) parts.push(storage.endsWith("GB") || storage.endsWith("TB") ? storage : `${storage}GB`);
  if (colour) parts.push(colour);
  return parts.join(" · ");
}

function formatBatteryHealth(val?: string | null) {
  if (!val || val.trim() === "") return null;
  const cleaned = val.trim();
  return cleaned.endsWith("%") ? cleaned : `${cleaned}%`;
}

function formatFaults(notes?: string | null) {
  if (!notes || notes.trim() === "" || notes.trim().toLowerCase() === "fresh" || notes.trim().toLowerCase() === "none") {
    return "No faults disclosed";
  }
  return notes.trim();
}

// UK Pre-Owned Sales Terms (6 Points)
const PRE_OWNED_SALE_TERMS = [
  {
    title: "1. Device Description & Condition",
    text: "This pre-owned device is sold as described above with all identified cosmetic condition and functionality notes recorded at point of sale.",
  },
  {
    title: "2. Warranty Coverage",
    text: "Where a store warranty is specified, it covers internal hardware faults and identified functionality from the date of purchase.",
  },
  {
    title: "3. Warranty Exclusions",
    text: "Excludes physical damage, drops, liquid ingress, cracked screens, software modifications, or third-party repairs.",
  },
  {
    title: "4. Returns Policy",
    text: "Returns or exchanges are accepted within 14 days if the device is materially different from the description at point of sale.",
  },
  {
    title: "5. IMEI & Network Compatibility",
    text: "Prescot Mobiles verifies clean IMEI status at point of sale. The customer is responsible for network SIM operator compatibility.",
  },
  {
    title: "6. Statutory Rights",
    text: "Nothing in these terms affects your statutory rights under the UK Consumer Rights Act 2015.",
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
  const batteryHealth = formatBatteryHealth(dev.battery_health);
  const disclosedFaults = formatFaults(dev.condition_notes);
  const activationLock = dev.activation_lock_status === "Clean" ? "Clear" : (dev.activation_lock_status || "Clear");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm print-modal-overlay">
      <div className="bg-white border border-slate-300 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[96vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 print-modal-card">
        
        {/* Modal Action Bar (Hidden on print) */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-200 bg-slate-50 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-brand" />
            <h2 className="font-extrabold text-xs text-slate-900">
              Pre-Owned Phone Sales Invoice — Invoice No: {d.invoice_number}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="min-h-[32px] inline-flex items-center justify-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-xl bg-brand text-white hover:bg-brand/90 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Invoice (A4 Single Page)
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Document Content Area — Single-Page A4 Fit */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-100 print:bg-white print:p-0 print:overflow-visible printable-a4-area">
          <div className="bg-white border-0 shadow-none p-4 rounded-none max-w-2xl mx-auto space-y-2.5 text-slate-900 font-sans a4-sheet-page">
            
            {/* 1. STORE HEADER & LOGO */}
            <div className="flex justify-between items-center pb-2 border-b-2 border-slate-900 gap-2">
              <div className="space-y-0.5">
                <h1 className="font-black text-base sm:text-lg tracking-tight text-slate-900">
                  {businessName.toUpperCase()}
                </h1>
                <p className="text-[10px] text-slate-700 font-medium leading-tight">{businessAddress}</p>
                <p className="text-[9.5px] text-slate-600 font-mono leading-tight">
                  Tel: {businessPhone} | {businessEmail} | www.prescotmobiles.co.uk
                </p>
              </div>

              <div className="text-right shrink-0 flex flex-col items-end">
                <img
                  src="/site-assets/prescot-logo.png"
                  alt="Prescot Mobile Shop Logo"
                  className="h-12 sm:h-14 max-w-[170px] w-auto object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = "none";
                  }}
                />
              </div>
            </div>

            {/* 2. DOCUMENT TITLE & INFO BAR */}
            <div className="flex items-center justify-between gap-2 pt-0.5 font-mono text-[10.5px] border-b border-slate-300 pb-1.5">
              <div>
                <span className="font-bold text-slate-600">Invoice No: </span>
                <span className="font-extrabold text-xs text-brand">{d.invoice_number}</span>
              </div>
              <div className="text-center font-black text-xs tracking-widest text-slate-900 uppercase">
                PRE-OWNED PHONE SALES INVOICE
              </div>
              <div className="text-right">
                <span className="font-bold text-slate-600">Date: </span>
                <span className="font-extrabold text-slate-900">{formatDateTime(d.sold_at)}</span>
              </div>
            </div>

            {/* 3. SELLER & BUYER DETAILS */}
            <div className="bg-slate-50 rounded-lg p-2 text-[10.5px] space-y-0.5 border border-slate-200">
              <div className="grid grid-cols-2 gap-3 divide-x divide-slate-200">
                <div>
                  <span className="font-bold text-[8.5px] text-slate-500 uppercase tracking-wider block mb-0.5">
                    SELLER
                  </span>
                  <p className="font-extrabold text-slate-900 text-xs">{businessName}</p>
                  <p className="text-slate-600 text-[9.5px]">{businessAddress}</p>
                </div>
                <div className="pl-3">
                  <span className="font-bold text-[8.5px] text-slate-500 uppercase tracking-wider block mb-0.5">
                    BUYER
                  </span>
                  <p className="font-extrabold text-slate-900 text-xs">
                    {d.buyer?.name || "Walk-in Customer"}
                  </p>
                  {d.buyer?.phone && (
                    <p className="text-slate-600 font-mono text-[9.5px]">Phone: {d.buyer.phone}</p>
                  )}
                  {d.buyer?.address && (
                    <p className="text-slate-600 text-[9.5px]">{d.buyer.address}</p>
                  )}
                </div>
              </div>
            </div>

            {/* 4. PURCHASED HANDSET & FINANCIAL SUMMARY */}
            <div className="bg-slate-50/50 rounded-lg p-2 space-y-1.5 text-[10px] border border-slate-200">
              <span className="font-extrabold text-[9.5px] text-slate-900 uppercase tracking-wider block border-b border-slate-200 pb-0.5">
                PURCHASED HANDSET SUMMARY:
              </span>
              <table className="w-full text-left text-[10px] border border-slate-300 rounded overflow-hidden bg-white">
                <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <tr>
                    <th className="py-1 px-2">Item Description</th>
                    <th className="py-1 px-2 w-36">IMEI / Identifiers</th>
                    <th className="py-1 px-2 w-24">Condition</th>
                    <th className="py-1 px-2 text-right w-20">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="py-1.5 px-2 font-semibold text-slate-900">
                      <span className="font-extrabold text-[11px] block text-slate-900">
                        {deviceFullName}
                      </span>
                      {dev.network_status && (
                        <span className="block text-[9px] text-slate-600">
                          Network: {dev.network_status}
                        </span>
                      )}
                      {dev.accessories && (
                        <span className="block text-[9px] text-slate-600">
                          Accessories: {dev.accessories}
                        </span>
                      )}
                      {dev.stock_number && (
                        <span className="block text-[8.5px] text-slate-400 font-mono">
                          Stock Ref: #{dev.stock_number}
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 px-2 font-mono text-[9.5px] text-slate-700">
                      <span className="font-extrabold block text-slate-900">IMEI 1: {dev.imei1}</span>
                      {dev.imei2 && <span className="block text-slate-600 text-[9px]">IMEI 2: {dev.imei2}</span>}
                      {dev.serial_number && <span className="block text-slate-600 text-[9px]">S/N: {dev.serial_number}</span>}
                    </td>
                    <td className="py-1.5 px-2 text-slate-700 text-[9.5px]">
                      <span className="font-extrabold text-slate-900 block">{dev.condition_grade}</span>
                      {batteryHealth && <span className="block text-[9px] text-slate-600">Battery: {batteryHealth}</span>}
                      <span className="block text-[8.5px] text-slate-500">{disclosedFaults}</span>
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono font-black text-xs text-slate-900">
                      {formatGBP(d.selling_price_pence)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Totals & Payment Breakdown */}
              <div className="flex justify-between items-end pt-1 border-t border-slate-300">
                <div>
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold text-[9.5px] uppercase tracking-wider">
                    <CheckCircle2 className="w-3 h-3 text-emerald-700" /> PAID IN FULL
                  </div>
                </div>

                <div className="w-48 space-y-0.5 text-[10px] font-mono">
                  <div className="flex justify-between text-slate-700">
                    <span>SUBTOTAL:</span>
                    <span className="font-bold">{formatGBP(d.selling_price_pence)}</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-black border-t border-slate-300 pt-0.5 text-[11px]">
                    <span>TOTAL:</span>
                    <span>{formatGBP(d.selling_price_pence)}</span>
                  </div>
                  <div className="flex justify-between text-slate-700 pt-0.5 text-[9.5px]">
                    <span>PAYMENT METHOD:</span>
                    <span className="font-bold uppercase">
                      {d.payment_method.replace("_", " ")}
                    </span>
                  </div>
                  <div className="flex justify-between font-extrabold text-[11px] border-t border-slate-400 pt-0.5 text-slate-900">
                    <span>BALANCE DUE:</span>
                    <span className="text-emerald-700">£0.00</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. WARRANTY COVERAGE SECTION */}
            {d.warranty_days && d.warranty_days > 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-[9px] leading-tight text-slate-800 space-y-0.5">
                <div className="font-extrabold text-slate-900 uppercase tracking-wider text-[9.5px] border-b border-slate-300 pb-0.5 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-brand" /> WARRANTY COVERAGE
                </div>
                <p className="font-bold text-slate-900 text-[10px]">
                  {d.warranty_days} Days Store Guarantee — Valid until{" "}
                  {d.warranty_until ? formatDate(d.warranty_until) : "specified date"}
                </p>
                {d.warranty_policy_text && (
                  <p className="text-slate-700 text-[9px] leading-tight">
                    {d.warranty_policy_text}
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-[9px] text-slate-600">
                <strong>No store warranty</strong> is provided with this device unless explicitly stated above.
              </div>
            )}

            {/* 6. NUMBERED SALE TERMS & CONDITIONS (6 Points) */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-[9px] leading-tight text-slate-800 space-y-0.5">
              <div className="font-extrabold text-slate-900 uppercase tracking-wider text-[9.5px] border-b border-slate-300 pb-0.5 flex items-center gap-1">
                <FileText className="w-3 h-3 text-slate-700" /> PRE-OWNED DEVICE SALES TERMS & CONDITIONS
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 pt-0.5">
                {PRE_OWNED_SALE_TERMS.map((st) => (
                  <div key={st.title} className="leading-tight">
                    <span className="font-bold text-slate-900">{st.title}: </span>
                    <span className="text-slate-700">{st.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 7. FOOTER */}
            <div className="pt-1 border-t border-slate-200 text-center text-[8.5px] text-slate-500 font-medium leading-tight">
              <p className="font-bold text-slate-900 text-[9.5px]">
                Thank you for choosing Prescot Mobiles!
              </p>
              <p>
                Please keep this sales invoice as your official proof of purchase and warranty claim document.
              </p>
              <p className="pt-0.5">
                {businessName} • {businessAddress} • Tel: {businessPhone} • {businessEmail}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* DUAL PRINT ENGINE CSS — STRICT SINGLE-PAGE A4 FIT */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 4mm 5mm;
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
            box-sizing: border-box !important;
            margin: 0 auto !important;
            padding: 3mm 4mm !important;
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
