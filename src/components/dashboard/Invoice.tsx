import { useState } from "react";
import { BUSINESS } from "@/lib/business";
import { formatGBP } from "@/lib/utils";
import {
  Printer,
  MessageCircle,
  Download,
  X,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  FileText,
  Receipt,
  ExternalLink,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSettings } from "@/lib/settings.functions";
import { generateReceiptPDF } from "@/lib/pdfReceipt";
import { toast } from "sonner";

export interface InvoiceLine {
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
  warranty_days?: number | null;
}

export interface InvoiceData {
  kind: "sale" | "repair";
  number: string;
  date: string;
  customer?: { name?: string | null; phone?: string | null; email?: string | null } | null;
  lines: InvoiceLine[];
  labour?: number;
  subtotal?: number;
  discount?: number;
  total: number;
  paid: boolean;
  amountPaid?: number;
  balanceDue?: number;
  paymentMethod?: string;
  warrantyUntil?: string | null;
  device?: string;
  issue?: string;
}

export function InvoiceModal({
  data: invoice,
  onClose,
}: {
  data: InvoiceData;
  onClose: () => void;
}) {
  const [viewMode, setViewMode] = useState<"a4" | "thermal">("a4");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSharingWA, setIsSharingWA] = useState(false);

  const getSettingsFn = useServerFn(getSettings);
  const { data: settings } = useQuery({
    queryKey: ["store-settings"],
    queryFn: () => getSettingsFn(),
  });

  const businessName = settings?.business_name || BUSINESS.name;
  const addressLine = settings?.address_line || BUSINESS.fullAddress;
  const phone = settings?.phone || BUSINESS.phone;
  const email = settings?.email || BUSINESS.email;
  const footer =
    settings?.receipt_footer || "Thank you for choosing Prescot Mobiles & Computer Services";
  const vatRegistered = settings?.vat_registered === "true";
  const vatNumber = settings?.vat_number || "";

  const subtotal =
    invoice.subtotal ??
    invoice.lines.reduce((acc, l) => acc + (l.total || l.quantity * l.unit_price), 0) +
      (invoice.labour || 0);
  const discount = invoice.discount || 0;
  const grandTotal = invoice.total;
  const amountPaid = invoice.amountPaid ?? (invoice.paid ? grandTotal : 0);
  const balanceDue = invoice.balanceDue ?? Math.max(0, grandTotal - amountPaid);
  const isPaidInFull = balanceDue <= 0 && (invoice.paid || amountPaid >= grandTotal);

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const { file, fileName } = await generateReceiptPDF(invoice, {
        name: businessName,
        address: addressLine,
        phone,
        email,
        footer,
      });

      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);

      toast.success(`Downloaded ${fileName}`);
    } catch (err) {
      console.error("PDF download error:", err);
      toast.error("Failed to generate PDF receipt.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleWhatsApp = async () => {
    setIsSharingWA(true);
    try {
      const { file, fileName } = await generateReceiptPDF(invoice, {
        name: businessName,
        address: addressLine,
        phone,
        email,
        footer,
      });

      const rawPhone = invoice.customer?.phone?.replace(/\D/g, "") || "";
      const formattedPhone = rawPhone.startsWith("0") ? `44${rawPhone.slice(1)}` : rawPhone;
      const messageText = `Thank you for shopping with ${businessName}. Please find your receipt #${invoice.number} attached.`;

      if (
        typeof navigator !== "undefined" &&
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          title: `Receipt #${invoice.number}`,
          text: messageText,
          files: [file],
        });
        toast.success("Receipt shared via WhatsApp!");
      } else {
        const url = URL.createObjectURL(file);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);

        const waUrl = formattedPhone
          ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`
          : `https://wa.me/?text=${encodeURIComponent(messageText)}`;

        window.open(waUrl, "_blank");

        toast.info("Receipt PDF downloaded! Please attach the file in WhatsApp chat.", {
          duration: 6000,
        });
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      console.error("WhatsApp share error:", err);
      toast.error("Could not share receipt via WhatsApp.");
    } finally {
      setIsSharingWA(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 print:static print:bg-white print:p-0 print-modal-overlay">
      <div
        className={`bg-white rounded-2xl w-full max-h-[94vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col print:border-none print:shadow-none print:max-h-none print:w-full print:rounded-none print-modal-card ${
          viewMode === "a4" ? "max-w-4xl" : "max-w-md"
        }`}
      >
        {/* Header Toolbar (Screen Only) */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-slate-100 bg-slate-900 text-white print:hidden shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode("a4")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "a4"
                    ? "bg-brand text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> A4 Sales Invoice
              </button>
              <button
                type="button"
                onClick={() => setViewMode("thermal")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "thermal"
                    ? "bg-brand text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Receipt className="w-3.5 h-3.5" /> Thermal 80mm
              </button>
            </div>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[11px] font-bold border border-slate-700">
              #{invoice.number}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Buttons Toolbar (Screen Only) */}
        <div className="p-3 bg-slate-800 border-b border-slate-700 text-white flex items-center gap-2 print:hidden shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handleWhatsApp}
            disabled={isSharingWA || isGeneratingPDF}
            className="flex-1 min-h-[38px] inline-flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {isSharingWA ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <MessageCircle className="w-3.5 h-3.5" />
            )}
            Send WhatsApp
          </button>

          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF || isSharingWA}
            className="flex-1 min-h-[38px] inline-flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {isGeneratingPDF ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            Download PDF
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="min-h-[38px] inline-flex items-center justify-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl bg-brand hover:bg-brand/90 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            {viewMode === "a4" ? "Print A4 Invoice" : "Thermal Print"}
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 print:bg-white print:p-0 print:overflow-visible printable-a4-area">
          {viewMode === "a4" ? (
            /* PROFESSIONAL A4 SALES INVOICE */
            <A4SalesInvoiceBody
              invoice={invoice}
              businessName={businessName}
              addressLine={addressLine}
              phone={phone}
              email={email}
              footer={footer}
              vatRegistered={vatRegistered}
              vatNumber={vatNumber}
              subtotal={subtotal}
              discount={discount}
              grandTotal={grandTotal}
              amountPaid={amountPaid}
              balanceDue={balanceDue}
              isPaidInFull={isPaidInFull}
            />
          ) : (
            /* THERMAL 80MM RECEIPT PREVIEW */
            <div
              className="bg-white p-5 rounded-xl border border-slate-300 shadow-md max-w-sm mx-auto"
              id="thermal-receipt-area"
            >
              <InvoiceBody
                invoice={invoice}
                businessName={businessName}
                addressLine={addressLine}
                phone={phone}
                email={email}
                footer={footer}
                vatRegistered={vatRegistered}
                vatNumber={vatNumber}
                subtotal={subtotal}
                discount={discount}
                grandTotal={grandTotal}
                amountPaid={amountPaid}
                balanceDue={balanceDue}
                isPaidInFull={isPaidInFull}
              />
            </div>
          )}
        </div>
      </div>

      {/* DUAL PRINT CSS ENGINE */}
      <style>{`
        @media print {
          @page {
            size: ${viewMode === "a4" ? "A4 portrait" : "80mm auto"};
            margin: ${viewMode === "a4" ? "6mm 8mm" : "0mm"};
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
          .a4-sheet-page *,
          #thermal-receipt-area,
          #thermal-receipt-area * {
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
          }
          #thermal-receipt-area {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 78mm !important;
            max-width: 78mm !important;
            margin: 0 !important;
            padding: 3mm !important;
            background: #ffffff !important;
            box-shadow: none !important;
            border: none !important;
            font-family: 'Courier New', Courier, monospace, sans-serif !important;
            font-size: 11px !important;
            color: #000000 !important;
            line-height: 1.3 !important;
            overflow: visible !important;
          }
        }
      `}</style>
    </div>
  );
}

{
  /* PROFESSIONAL A4 SALES INVOICE COMPONENT */
}
function A4SalesInvoiceBody({
  invoice,
  businessName,
  addressLine,
  phone,
  email,
  vatRegistered,
  vatNumber,
  subtotal,
  discount,
  grandTotal,
  amountPaid,
  balanceDue,
  isPaidInFull,
}: {
  invoice: InvoiceData;
  businessName: string;
  addressLine: string;
  phone: string;
  email: string;
  footer: string;
  vatRegistered: boolean;
  vatNumber: string;
  subtotal: number;
  discount: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  isPaidInFull: boolean;
}) {
  const hasWarrantyNotes =
    invoice.warrantyUntil || invoice.lines.some((l) => l.warranty_days && l.warranty_days > 0);

  return (
    <div className="bg-white border-0 shadow-none p-6 sm:p-8 rounded-none max-w-3xl mx-auto space-y-5 sm:space-y-6 text-slate-900 font-sans a4-sheet-page">
      {/* 1. STORE HEADER & LOGO */}
      <div className="flex justify-between items-start pb-4 border-b-2 border-slate-900 gap-4">
        <div className="space-y-1">
          <h1 className="font-black text-xl sm:text-2xl tracking-tight text-slate-900">
            {businessName.toUpperCase()}
          </h1>
          <p className="text-xs text-slate-700 font-medium">{addressLine}</p>
          <p className="text-xs text-slate-700 font-medium">Tel: {phone} | Mob: +44 7491 248770</p>
          <p className="text-xs text-slate-600 font-mono">{email} | www.prescotmobiles.co.uk</p>
          {vatRegistered && vatNumber && (
            <p className="text-xs font-bold text-slate-800">VAT Reg: {vatNumber}</p>
          )}
        </div>

        <div className="text-right shrink-0 flex flex-col items-end">
          <img
            src="/site-assets/prescot-logo.png"
            alt="Prescot Mobile Shop Logo"
            className="h-28 sm:h-36 max-w-[260px] w-auto object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = "none";
            }}
          />
        </div>
      </div>

      {/* 2. DOCUMENT TITLE & INFO BAR */}
      <div className="flex items-center justify-between gap-2 pt-1 font-mono text-xs border-b border-slate-300 pb-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-600">INVOICE NO:</span>
          <span className="font-extrabold text-sm text-brand">{invoice.number}</span>
        </div>
        <div className="text-center font-black text-sm sm:text-base tracking-widest text-slate-900 uppercase">
          SALES INVOICE / RECEIPT
        </div>
        <div className="flex items-center gap-2 text-right">
          <span className="font-bold text-slate-600">DATE:</span>
          <span className="font-extrabold text-slate-900">{invoice.date}</span>
        </div>
      </div>

      {/* 3. CUSTOMER DETAILS BOX */}
      <div className="bg-slate-50 border-0 rounded-xl p-4 space-y-1.5 text-xs">
        <div className="font-bold text-[10px] text-slate-500 uppercase tracking-wider underline mb-1">
          CUSTOMER DETAILS
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="font-bold text-slate-700">CUSTOMER: </span>
            <span className="font-extrabold text-slate-900 text-sm">
              {invoice.customer?.name || "Walk-in Customer"}
            </span>
          </div>
          <div>
            <span className="font-bold text-slate-700">CONTACT: </span>
            <span className="font-extrabold font-mono text-slate-900">
              {invoice.customer?.phone || invoice.customer?.email || "—"}
            </span>
          </div>
        </div>
      </div>

      {/* 4. ITEMS TABLE */}
      <div className="bg-slate-50/50 border-0 rounded-xl p-4 space-y-3 text-xs">
        <span className="font-extrabold text-[11px] text-slate-900 uppercase tracking-wider block">
          PURCHASED ITEMS SUMMARY:
        </span>
        <table className="w-full text-left text-xs border border-slate-300 rounded-md overflow-hidden">
          <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
            <tr>
              <th className="py-2 px-3">Item / Service Description</th>
              <th className="py-2 px-3 text-center w-16">Qty</th>
              <th className="py-2 px-3 text-right w-24">Unit Price</th>
              <th className="py-2 px-3 text-right w-24">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {invoice.lines.map((l, i) => (
              <tr key={i}>
                <td className="py-2 px-3 font-semibold text-slate-900">{l.name}</td>
                <td className="py-2 px-3 text-center font-mono font-bold text-slate-700">
                  {l.quantity}
                </td>
                <td className="py-2 px-3 text-right font-mono text-slate-700">
                  {formatGBP(l.unit_price)}
                </td>
                <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                  {formatGBP(l.total)}
                </td>
              </tr>
            ))}
            {invoice.labour && invoice.labour > 0 ? (
              <tr className="font-bold text-slate-900">
                <td className="py-2 px-3" colSpan={3}>
                  Labour / Service Charge
                </td>
                <td className="py-2 px-3 text-right font-mono">{formatGBP(invoice.labour)}</td>
              </tr>
            ) : null}
          </tbody>
        </table>

        {/* Totals & Payment Breakdown */}
        <div className="flex justify-between items-end pt-2 border-t border-slate-300">
          <div>
            {isPaidInFull ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold text-xs uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" /> PAID IN FULL
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-xs uppercase tracking-wider">
                PAYMENT PENDING
              </div>
            )}
          </div>

          <div className="w-56 space-y-1 text-xs font-mono">
            <div className="flex justify-between text-slate-700">
              <span>SUBTOTAL:</span>
              <span className="font-bold">{formatGBP(subtotal)}</span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between text-rose-600 font-bold">
                <span>DISCOUNT:</span>
                <span>−{formatGBP(discount)}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-900 font-black border-t border-slate-300 pt-1 text-sm">
              <span>TOTAL:</span>
              <span>{formatGBP(grandTotal)}</span>
            </div>

            <div className="flex justify-between text-slate-700 pt-0.5">
              <span>PAYMENT METHOD:</span>
              <span className="font-bold uppercase">
                {(invoice.paymentMethod || "Cash").replace("_", " ")}
              </span>
            </div>

            <div className="flex justify-between text-slate-700">
              <span>AMOUNT PAID:</span>
              <span className="font-bold">{formatGBP(amountPaid)}</span>
            </div>

            <div className="flex justify-between font-extrabold text-sm border-t border-slate-400 pt-1 text-slate-900">
              <span>BALANCE DUE:</span>
              <span className={balanceDue > 0 ? "text-brand" : "text-emerald-700"}>
                {formatGBP(balanceDue)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. WARRANTY NOTES SECTION (IF APPLICABLE) */}
      {hasWarrantyNotes && (
        <div className="bg-slate-50 border-0 rounded-xl p-3.5 text-[9.5px] leading-relaxed text-slate-700 space-y-1">
          <div className="font-extrabold text-slate-900 uppercase tracking-wider text-[10px] border-b border-slate-200 pb-0.5 mb-1 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-brand" /> WARRANTY COVERAGE NOTES
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-[9.5px] text-slate-700">
            {invoice.lines.map((l, i) =>
              l.warranty_days && l.warranty_days > 0 ? (
                <li key={i} className="font-semibold">
                  <span className="font-extrabold text-slate-900">{l.name}:</span> {l.warranty_days}{" "}
                  Days Warranty
                </li>
              ) : null,
            )}
            {invoice.warrantyUntil && (
              <li className="font-semibold text-emerald-800">
                General Store Guarantee valid until {invoice.warrantyUntil}.
              </li>
            )}
          </ul>
        </div>
      )}

      {/* 6. TWO-COLUMN FOOTER: STORE POLICY & GOOGLE REVIEW QR */}
      <div className="pt-2 border-t border-slate-200 flex flex-row items-center justify-between gap-4">
        {/* Left Column: Store Disclaimer & Website Link */}
        <div className="text-left text-[10px] text-slate-700 font-medium space-y-0.5">
          <p className="font-bold text-slate-900 text-xs">
            Thank you for choosing Prescot Mobiles!
          </p>
          <p className="text-[10px] text-slate-600 font-semibold">
            Mobile • Laptop • Tablet • Gaming • Repairs &amp; Accessories
          </p>
          <p className="text-[9.5px] text-slate-500 italic">
            Keep this invoice as official proof of purchase.
          </p>
          <div className="pt-1">
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
  );
}

{
  /* THERMAL 80MM RECEIPT BODY */
}
function InvoiceBody({
  invoice,
  businessName,
  addressLine,
  phone,
  email,
  footer,
  vatRegistered,
  vatNumber,
  subtotal,
  discount,
  grandTotal,
  amountPaid,
  balanceDue,
  isPaidInFull,
}: {
  invoice: InvoiceData;
  businessName: string;
  addressLine: string;
  phone: string;
  email: string;
  footer: string;
  vatRegistered: boolean;
  vatNumber: string;
  subtotal: number;
  discount: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  isPaidInFull: boolean;
}) {
  return (
    <div className="text-xs text-slate-900 space-y-4 font-sans print:font-mono">
      {/* Store Branding Header */}
      <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300 print:border-black">
        <img
          src="/site-assets/prescot-logo.png"
          alt="Prescot Mobiles Logo"
          className="h-10 w-auto object-contain mx-auto mb-1"
          onError={(e) => {
            (e.currentTarget as HTMLElement).style.display = "none";
          }}
        />
        <h2 className="text-base font-black tracking-tight uppercase text-slate-950 print:text-black">
          {businessName}
        </h2>
        <p className="text-[11px] font-medium text-slate-600 print:text-black">{addressLine}</p>
        <p className="text-[11px] font-medium text-slate-600 print:text-black">Tel: {phone}</p>
        <p className="text-[11px] font-medium text-slate-600 print:text-black">{email}</p>
        {vatRegistered && vatNumber && (
          <p className="text-[10px] font-bold text-slate-700 print:text-black mt-1">
            VAT Reg: {vatNumber}
          </p>
        )}
      </div>

      {/* Document Ref & Status */}
      <div className="flex items-start justify-between text-xs pt-1">
        <div>
          <div className="font-extrabold uppercase text-slate-900 print:text-black tracking-wider">
            {invoice.kind === "sale" ? "Sales Receipt" : "Repair Invoice"}
          </div>
          <div className="font-mono text-slate-700 print:text-black font-bold text-[11px] mt-0.5">
            #{invoice.number}
          </div>
          <div className="text-[10px] text-slate-500 print:text-black mt-0.5">{invoice.date}</div>
        </div>

        <div className="text-right">
          {isPaidInFull ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold print:bg-transparent print:text-black print:border print:border-black print:p-0.5">
              <CheckCircle2 className="w-3 h-3 print:hidden" />
              PAID IN FULL
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold print:bg-transparent print:text-black print:border print:border-black">
              UNPAID
            </span>
          )}

          <div className="text-[11px] font-bold text-slate-900 print:text-black mt-1.5">
            {invoice.customer?.name || "Walk-in Customer"}
          </div>
          {invoice.customer?.phone && (
            <div className="text-[10px] text-slate-600 print:text-black font-medium">
              {invoice.customer.phone}
            </div>
          )}
        </div>
      </div>

      {/* Device Info for Repair Ticket */}
      {invoice.kind === "repair" && invoice.device && (
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] space-y-0.5 print:bg-transparent print:border-black print:rounded-none">
          <div className="font-bold text-slate-900 print:text-black">Device: {invoice.device}</div>
          {invoice.issue && (
            <div className="text-slate-600 print:text-black">Issue: {invoice.issue}</div>
          )}
        </div>
      )}

      {/* Line Items Table */}
      <div className="border-t border-b border-dashed border-slate-300 print:border-black py-2">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 print:border-black text-[10px] uppercase font-bold text-slate-500 print:text-black">
              <th className="pb-1.5">Item</th>
              <th className="pb-1.5 text-center px-1">Qty</th>
              <th className="pb-1.5 text-right px-1">Price</th>
              <th className="pb-1.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 print:divide-none">
            {invoice.lines.map((l, i) => (
              <tr key={i} className="text-[11px]">
                <td className="py-1.5 font-bold pr-1 text-slate-900 print:text-black leading-tight">
                  {l.name}
                </td>
                <td className="py-1.5 text-center font-mono text-slate-700 print:text-black px-1">
                  {l.quantity}
                </td>
                <td className="py-1.5 text-right font-mono text-slate-700 print:text-black px-1">
                  {formatGBP(l.unit_price)}
                </td>
                <td className="py-1.5 text-right font-mono font-bold text-slate-900 print:text-black">
                  {formatGBP(l.total)}
                </td>
              </tr>
            ))}
            {invoice.labour && invoice.labour > 0 ? (
              <tr className="text-[11px] font-bold text-slate-900 print:text-black">
                <td className="py-1.5" colSpan={3}>
                  Labour Charge
                </td>
                <td className="py-1.5 text-right font-mono">{formatGBP(invoice.labour)}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Financial Summary & Breakdown */}
      <div className="space-y-1 text-xs">
        <div className="flex items-center justify-between text-slate-600 print:text-black">
          <span>Subtotal</span>
          <span className="font-mono font-medium">{formatGBP(subtotal)}</span>
        </div>

        {discount > 0 && (
          <div className="flex items-center justify-between text-rose-600 print:text-black font-medium">
            <span>Discount</span>
            <span className="font-mono">−{formatGBP(discount)}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-sm font-black text-slate-950 print:text-black pt-1.5 border-t border-slate-900 print:border-black">
          <span>TOTAL</span>
          <span className="font-mono text-base">{formatGBP(grandTotal)}</span>
        </div>

        <div className="pt-2 border-t border-dashed border-slate-200 print:border-black space-y-1 text-[11px]">
          <div className="flex items-center justify-between text-slate-600 print:text-black">
            <span>Payment Method</span>
            <span className="font-bold uppercase text-slate-900 print:text-black">
              {(invoice.paymentMethod || "Cash").replace("_", " ")}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-600 print:text-black">
            <span>Amount Paid</span>
            <span className="font-mono font-bold text-slate-900 print:text-black">
              {formatGBP(amountPaid)}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-600 print:text-black">
            <span>Balance Due</span>
            <span className="font-mono font-bold text-slate-900 print:text-black">
              {formatGBP(balanceDue)}
            </span>
          </div>
        </div>

        {invoice.warrantyUntil && (
          <div className="mt-3 text-center text-[10px] font-extrabold text-emerald-900 bg-emerald-50 border border-emerald-200 py-1.5 px-2 rounded-xl print:bg-transparent print:border-black print:text-black">
            <ShieldCheck className="w-3.5 h-3.5 inline mr-1 text-emerald-700 print:hidden" />
            Warranty until {invoice.warrantyUntil}
          </div>
        )}
      </div>

      {/* Footer Branding & Disclaimer */}
      <div className="pt-3 border-t border-dashed border-slate-300 print:border-black text-center space-y-1">
        <p className="font-bold text-slate-800 print:text-black text-[11px]">{footer}</p>
        <p className="text-[10px] text-slate-500 print:text-black font-semibold">
          Mobile • Laptop • Tablet • Gaming
        </p>
        <p className="text-[10px] text-slate-500 print:text-black">Repairs &amp; Accessories</p>
        <p className="text-[9px] text-slate-400 print:text-black italic pt-1">
          Keep this receipt as proof of purchase.
        </p>
      </div>
    </div>
  );
}
