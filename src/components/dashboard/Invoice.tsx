import { useState } from "react";
import { BUSINESS } from "@/lib/business";
import { formatGBP } from "@/lib/utils";
import { Printer, MessageCircle, Download, X, Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
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
  const footer = settings?.receipt_footer || "Thank you for choosing Prescot Mobiles & Computer Services";
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
        // Fallback for desktop browsers: Download PDF & open WhatsApp Web with message
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
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 print:static print:bg-white print:p-0">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[92vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col print:border-none print:shadow-none print:max-h-none print:w-full print:rounded-none">
        
        {/* Header Toolbar (Screen Only) */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/80 print:hidden shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">
                {invoice.kind === "sale" ? "Sales Receipt" : "Repair Invoice"}
              </h3>
              <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-mono text-[11px] font-bold">
                #{invoice.number}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">{invoice.date}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Buttons Toolbar (Screen Only) */}
        <div className="p-3 bg-slate-900 text-white flex items-center gap-2 print:hidden shrink-0 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={handleWhatsApp}
            disabled={isSharingWA || isGeneratingPDF}
            className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50"
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
            className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50"
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
            className="inline-flex items-center justify-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.98] transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            Thermal Print
          </button>
        </div>

        {/* Receipt Content Body */}
        <div className="p-6 overflow-y-auto print:p-0 print:overflow-visible" id="invoice-print-area">
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
      </div>

      {/* High Precision 80mm Print CSS */}
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0mm;
          }
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 80mm !important;
          }
          body * {
            visibility: hidden !important;
          }
          #invoice-print-area, #invoice-print-area * {
            visibility: visible !important;
          }
          #invoice-print-area {
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
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
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
        <h2 className="text-base font-black tracking-tight uppercase text-slate-950 print:text-black">
          {businessName}
        </h2>
        <p className="text-[11px] font-medium text-slate-600 print:text-black">{addressLine}</p>
        <p className="text-[11px] font-medium text-slate-600 print:text-black">
          Tel: {phone}
        </p>
        <p className="text-[11px] font-medium text-slate-600 print:text-black">{email}</p>
        {vatRegistered && vatNumber && (
          <p className="text-[10px] font-bold text-slate-700 print:text-black mt-1">VAT Reg: {vatNumber}</p>
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
          {invoice.issue && <div className="text-slate-600 print:text-black">Issue: {invoice.issue}</div>}
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
        <p className="font-bold text-slate-800 print:text-black text-[11px]">
          {footer}
        </p>
        <p className="text-[10px] text-slate-500 print:text-black font-semibold">
          Mobile • Laptop • Tablet • Gaming
        </p>
        <p className="text-[10px] text-slate-500 print:text-black">Repairs & Accessories</p>
        <p className="text-[9px] text-slate-400 print:text-black italic pt-1">
          Keep this receipt as proof of purchase.
        </p>
      </div>

    </div>
  );
}
