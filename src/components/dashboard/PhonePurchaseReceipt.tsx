import { BUSINESS } from "@/lib/business";
import { Printer, X, ShieldCheck, CheckCircle2, Smartphone, FileText } from "lucide-react";

interface PhoneUnitCondition {
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
}

export interface PurchaseReceiptData {
  purchase_number: string;
  purchased_at: string;
  seller?: { name: string; phone?: string | null; address?: string | null } | null;
  condition: PhoneUnitCondition;
  purchase_price_pence: number;
  payment_method: string;
  bank_reference?: string | null;
  declaration_text?: string | null;
  staff_name?: string | null;
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

// UK Professional Trade Terms (7 Points)
const SELLER_PURCHASE_TERMS = [
  {
    title: "1. Ownership",
    text: "I confirm that I am the lawful owner of this device or am authorised by the lawful owner to sell it.",
  },
  {
    title: "2. Finance and Third-Party Claims",
    text: "To the best of my knowledge, this device is not subject to an outstanding finance agreement, hire-purchase agreement, insurance claim or other third-party ownership claim that prevents its lawful sale.",
  },
  {
    title: "3. Lost or Stolen Devices",
    text: "I confirm that, to the best of my knowledge, the device has not been reported lost or stolen and is not knowingly subject to a theft-related or insurance blacklist.",
  },
  {
    title: "4. Device Information",
    text: "I confirm that the device, IMEI and condition information recorded on this receipt is accurate to the best of my knowledge.",
  },
  {
    title: "5. Accounts and Personal Data",
    text: "I confirm that I have backed up any information I wish to keep and have removed or disclosed applicable Apple, Google, Samsung or other account/activation locks. I authorise Prescot Mobiles to test, erase and factory-reset the device where necessary.",
  },
  {
    title: "6. Age Confirmation",
    text: "I confirm that I am aged 18 or over in accordance with Prescot Mobiles' store purchasing policy.",
  },
  {
    title: "7. Transaction Confirmation",
    text: "I accept the purchase price shown above as the agreed amount for this device and confirm receipt of payment once payment has been completed.",
  },
];

export function PhonePurchaseReceiptModal({
  data: d,
  onClose,
}: {
  data: PurchaseReceiptData;
  onClose: () => void;
}) {
  const businessName = d.business_name ?? BUSINESS.name;
  const businessAddress = d.business_address ?? BUSINESS.fullAddress;
  const businessPhone = d.business_phone ?? BUSINESS.phone;
  const businessEmail = d.business_email ?? BUSINESS.email;

  const handlePrint = () => {
    window.print();
  };

  const deviceFullName = formatDeviceName(d.condition.brand, d.condition.model, d.condition.storage, d.condition.colour);
  const batteryHealth = formatBatteryHealth(d.condition.battery_health);
  const disclosedFaults = formatFaults(d.condition.condition_notes);
  const activationLock = d.condition.activation_lock_status === "Clean" ? "Clear" : (d.condition.activation_lock_status || "Clear");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm print-modal-overlay">
      <div className="bg-white border border-slate-300 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[96vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 print-modal-card">
        
        {/* Modal Action Bar (Hidden on print) */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-200 bg-slate-50 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-brand" />
            <h2 className="font-extrabold text-xs text-slate-900">
              Device Purchase Receipt — Ref: {d.purchase_number}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="min-h-[32px] inline-flex items-center justify-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-xl bg-brand text-white hover:bg-brand/90 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Receipt (A4 Single Page)
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
                <span className="font-bold text-slate-600">Purchase Ref: </span>
                <span className="font-extrabold text-xs text-brand">{d.purchase_number}</span>
              </div>
              <div className="text-center font-black text-xs tracking-widest text-slate-900 uppercase">
                DEVICE PURCHASE RECEIPT & AGREEMENT
              </div>
              <div className="text-right">
                <span className="font-bold text-slate-600">Date: </span>
                <span className="font-extrabold text-slate-900">{formatDate(d.purchased_at)}</span>
              </div>
            </div>

            {/* 3. PURCHASER & SELLER DETAILS */}
            <div className="bg-slate-50 rounded-lg p-2 text-[10.5px] space-y-0.5 border border-slate-200">
              <div className="grid grid-cols-2 gap-3 divide-x divide-slate-200">
                <div>
                  <span className="font-bold text-[8.5px] text-slate-500 uppercase tracking-wider block mb-0.5">
                    PURCHASER
                  </span>
                  <p className="font-extrabold text-slate-900 text-xs">{businessName}</p>
                  <p className="text-slate-600 text-[9.5px]">{businessAddress}</p>
                </div>
                <div className="pl-3">
                  <span className="font-bold text-[8.5px] text-slate-500 uppercase tracking-wider block mb-0.5">
                    SELLER
                  </span>
                  {d.seller ? (
                    <>
                      <p className="font-extrabold text-slate-900 text-xs">{d.seller.name}</p>
                      {d.seller.phone && (
                        <p className="text-slate-600 font-mono text-[9.5px]">Phone: {d.seller.phone}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-slate-500 italic">Walk-in Seller</p>
                  )}
                </div>
              </div>
            </div>

            {/* 4. DEVICE DETAILS & PURCHASE SUMMARY */}
            <div className="grid grid-cols-3 gap-2 text-[10px]">
              {/* Device Specs (2 cols) */}
              <div className="col-span-2 bg-slate-50/50 rounded-lg p-2 space-y-1 border border-slate-200">
                <span className="font-extrabold text-[9.5px] text-slate-900 uppercase tracking-wider block border-b border-slate-200 pb-0.5">
                  DEVICE DETAILS
                </span>
                <table className="w-full text-left text-[9.5px] border-0 bg-transparent">
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    <tr>
                      <td className="py-0.5 font-semibold text-slate-600 w-28">Device</td>
                      <td className="py-0.5 font-bold text-slate-900">{deviceFullName}</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 font-semibold text-slate-600">IMEI</td>
                      <td className="py-0.5 font-bold font-mono text-slate-900">{d.condition.imei1}</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 font-semibold text-slate-600">Condition</td>
                      <td className="py-0.5 font-bold text-slate-900">{d.condition.condition_grade}</td>
                    </tr>
                    {batteryHealth && (
                      <tr>
                        <td className="py-0.5 font-semibold text-slate-600">Battery Health</td>
                        <td className="py-0.5 font-bold text-slate-900">{batteryHealth}</td>
                      </tr>
                    )}
                    {d.condition.network_status && (
                      <tr>
                        <td className="py-0.5 font-semibold text-slate-600">Network Status</td>
                        <td className="py-0.5 font-bold text-slate-900">{d.condition.network_status}</td>
                      </tr>
                    )}
                    <tr>
                      <td className="py-0.5 font-semibold text-slate-600">Activation Lock</td>
                      <td className="py-0.5 font-bold text-slate-900">{activationLock}</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 font-semibold text-slate-600">Disclosed Condition / Faults</td>
                      <td className="py-0.5 text-slate-800 font-medium">{disclosedFaults}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Purchase Summary Box (1 col) */}
              <div className="bg-slate-50/50 rounded-lg p-2 space-y-1.5 border border-slate-200 flex flex-col justify-between">
                <div>
                  <span className="font-extrabold text-[9.5px] text-slate-900 uppercase tracking-wider block border-b border-slate-200 pb-0.5 mb-1">
                    PURCHASE SUMMARY
                  </span>
                  <div className="space-y-1 text-[10px]">
                    <div className="flex justify-between text-slate-700">
                      <span>Agreed Purchase Price:</span>
                      <span className="font-bold">{formatGBP(d.purchase_price_pence)}</span>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span>Payment Method:</span>
                      <span className="font-bold capitalize">{d.payment_method.replace("_", " ")}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-300">
                  <span className="text-[8.5px] font-bold text-slate-500 uppercase tracking-wider block">
                    PAID TO SELLER
                  </span>
                  <span className="text-base font-black text-slate-900 font-mono block">
                    {formatGBP(d.purchase_price_pence)}
                  </span>
                </div>
              </div>
            </div>

            {/* 5. SELLER DECLARATION & PURCHASE TERMS */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-[9px] leading-tight text-slate-800 space-y-0.5">
              <div className="font-extrabold text-slate-900 uppercase tracking-wider text-[9.5px] border-b border-slate-300 pb-0.5 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-brand" /> SELLER DECLARATION & PURCHASE TERMS
              </div>
              <div className="grid grid-cols-1 gap-0.5 pt-0.5">
                {SELLER_PURCHASE_TERMS.map((pt) => (
                  <div key={pt.title} className="leading-tight">
                    <span className="font-bold text-slate-900">{pt.title}: </span>
                    <span className="text-slate-700">{pt.text}</span>
                  </div>
                ))}
              </div>
              <p className="text-[8.5px] text-slate-600 pt-1 leading-tight border-t border-slate-200 mt-1">
                <strong>Privacy Notice:</strong> Seller information collected for this transaction will be processed in accordance with Prescot Mobiles' Privacy Policy. Relevant information may be disclosed to law-enforcement or other authorities where there is an appropriate lawful basis or legal requirement.
              </p>
            </div>

            {/* 6. SIGNATURE SECTION */}
            <div className="grid grid-cols-2 gap-4 pt-1.5 border-t border-slate-300 text-[9.5px]">
              <div>
                <p className="font-bold text-slate-900 uppercase tracking-wider text-[9px] mb-0.5">
                  SELLER CONFIRMATION
                </p>
                <p className="text-[8.5px] text-slate-600 mb-3">
                  I confirm that I have read and agree to the Seller Declaration and Purchase Terms above.
                </p>
                <div className="space-y-1">
                  <div className="flex justify-between border-b border-slate-400 pb-0.5">
                    <span className="text-slate-600 font-medium">Seller Signature:</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-400 pb-0.5">
                    <span className="text-slate-600 font-medium">Seller Name: {d.seller?.name || ""}</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="font-bold text-slate-900 uppercase tracking-wider text-[9px] mb-0.5">
                  FOR PRESCOT MOBILES
                </p>
                <p className="text-[8.5px] text-slate-600 mb-3">
                  Authorised transaction confirmation on behalf of Prescot Mobiles.
                </p>
                <div className="space-y-1">
                  <div className="flex justify-between border-b border-slate-400 pb-0.5">
                    <span className="text-slate-600 font-medium">Staff Name: {d.staff_name || ""}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-400 pb-0.5">
                    <span className="text-slate-600 font-medium">Signature:</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 7. STORE COPY ID BLOCK (Store Record Only) */}
            <div className="border border-dashed border-slate-300 rounded p-1.5 text-[8.5px] text-slate-600 bg-slate-50/50">
              <p className="font-bold text-slate-800 uppercase tracking-wider text-[8.5px] mb-0.5">
                STORE RECORD — ID CHECK
              </p>
              <div className="grid grid-cols-3 gap-2 font-mono text-[8.5px]">
                <div>Type: __________________</div>
                <div>Reference (masked): __________________</div>
                <div>Checked by: __________________</div>
              </div>
            </div>

            {/* 8. FOOTER */}
            <div className="pt-1 border-t border-slate-200 text-center text-[8.5px] text-slate-500 font-medium leading-tight">
              <p>
                This receipt records the purchase of the device described above by {businessName} from the seller named on this document. Please retain your copy for your records.
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

export function PhonePurchaseReceipt({ data }: { data: PurchaseReceiptData }) {
  return null;
}
