import { BUSINESS } from "@/lib/business";
import { formatGBP } from "@/lib/utils";
import { Printer, MessageCircle, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSettings } from "@/lib/settings.functions";

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
  discount?: number;
  total: number;
  paid: boolean;
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
  const getSettingsFn = useServerFn(getSettings);
  const { data: settings } = useQuery({
    queryKey: ["store-settings"],
    queryFn: () => getSettingsFn(),
  });

  const businessName = settings?.business_name || BUSINESS.name;
  const addressLine = settings?.address_line || BUSINESS.fullAddress;
  const phone = settings?.phone || BUSINESS.phone;
  const email = settings?.email || BUSINESS.email;
  const footer = settings?.receipt_footer || "Thank you for choosing Prescot Mobiles!";
  const vatRegistered = settings?.vat_registered === "true";
  const vatNumber = settings?.vat_number || "";

  const waText = buildWhatsAppText(invoice, businessName);
  const waHref = BUSINESS.whatsappMessage(waText);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 print:static print:bg-white print:p-0">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-auto shadow-2xl print:shadow-none print:max-h-none print:rounded-none print:w-[80mm] print:max-w-none">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 print:hidden">
          <h3 className="font-extrabold text-slate-900 text-sm">
            {invoice.kind === "sale" ? "Sale Receipt" : "Repair Invoice"} · #{invoice.number}
          </h3>
          <div className="flex items-center gap-2">
            <a
              href={waHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </a>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-[#E11D48] text-white hover:opacity-90"
            >
              <Printer className="w-3.5 h-3.5" /> Thermal Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 print:p-2" id="invoice-print-area">
          <InvoiceBody
            invoice={invoice}
            businessName={businessName}
            addressLine={addressLine}
            phone={phone}
            email={email}
            footer={footer}
            vatRegistered={vatRegistered}
            vatNumber={vatNumber}
          />
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body * { visibility: hidden; }
          #invoice-print-area, #invoice-print-area * { visibility: visible; }
          #invoice-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            padding: 4mm;
            font-family: monospace;
            font-size: 11px;
            color: #000;
          }
          .print\\:hidden { display: none !important; }
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
}: {
  invoice: InvoiceData;
  businessName: string;
  addressLine: string;
  phone: string;
  email: string;
  footer: string;
  vatRegistered: boolean;
  vatNumber: string;
}) {
  return (
    <div className="text-xs text-slate-900 space-y-4">
      {/* Header */}
      <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
        <h2 className="text-base font-extrabold tracking-tight uppercase">{businessName}</h2>
        <p className="text-[10px] text-slate-600">{addressLine}</p>
        <p className="text-[10px] text-slate-600">
          {phone} · {email}
        </p>
        {vatRegistered && vatNumber && (
          <p className="text-[9px] font-bold text-slate-700">VAT Reg: {vatNumber}</p>
        )}
      </div>

      {/* Doc Ref & Customer */}
      <div className="flex items-start justify-between text-[11px]">
        <div>
          <div className="font-extrabold uppercase">
            {invoice.kind === "sale" ? "Receipt" : "Repair Ticket"}
          </div>
          <div className="font-mono text-slate-700 font-bold">#{invoice.number}</div>
        </div>
        <div className="text-right text-slate-500">
          <div>{invoice.date}</div>
          {invoice.customer?.name && (
            <div className="font-bold text-slate-900 mt-0.5">{invoice.customer.name}</div>
          )}
        </div>
      </div>

      {/* Device info if repair */}
      {invoice.kind === "repair" && invoice.device && (
        <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] space-y-0.5">
          <div className="font-bold text-slate-900">Device: {invoice.device}</div>
          {invoice.issue && <div className="text-slate-600">Issue: {invoice.issue}</div>}
        </div>
      )}

      {/* Items table */}
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-300 text-[9px] uppercase font-bold text-slate-500">
            <th className="py-1">Item</th>
            <th className="py-1 text-center">Qty</th>
            <th className="py-1 text-right">Price</th>
            <th className="py-1 text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {invoice.lines.map((l, i) => (
            <tr key={i} className="text-[11px]">
              <td className="py-1.5 font-medium pr-1">{l.name}</td>
              <td className="py-1.5 text-center font-mono">{l.quantity}</td>
              <td className="py-1.5 text-right font-mono">{formatGBP(l.unit_price)}</td>
              <td className="py-1.5 text-right font-bold font-mono">{formatGBP(l.total)}</td>
            </tr>
          ))}
          {invoice.labour && invoice.labour > 0 ? (
            <tr className="text-[11px] font-medium">
              <td className="py-1.5" colSpan={3}>
                Labour Charge
              </td>
              <td className="py-1.5 text-right font-bold font-mono">{formatGBP(invoice.labour)}</td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {/* Summary / Totals */}
      <div className="pt-2 border-t border-dashed border-slate-300 space-y-1 text-right text-[11px]">
        {invoice.discount && invoice.discount > 0 ? (
          <div className="text-rose-600 font-medium">Discount: −{formatGBP(invoice.discount)}</div>
        ) : null}
        <div className="text-sm font-extrabold text-slate-900">
          Total: {formatGBP(invoice.total)}
        </div>
        <div className="text-[10px] text-slate-500 font-medium">
          {invoice.paymentMethod && `Paid via ${invoice.paymentMethod.toUpperCase()} · `}
          {invoice.paid ? "PAID IN FULL" : "UNPAID"}
        </div>
        {invoice.warrantyUntil && (
          <div className="mt-2 text-center text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 py-1 px-2 rounded-lg">
            🛡️ Warranty until {invoice.warrantyUntil}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-slate-200 text-center text-[10px] text-slate-500 font-medium">
        {footer}
      </div>
    </div>
  );
}

function buildWhatsAppText(invoice: InvoiceData, businessName: string): string {
  const lines = invoice.lines
    .map((l) => `• ${l.name} × ${l.quantity} — ${formatGBP(l.total)}`)
    .join("\n");
  const labour =
    invoice.labour && invoice.labour > 0 ? `\nLabour: ${formatGBP(invoice.labour)}` : "";
  const warranty = invoice.warrantyUntil ? `\nWarranty until: ${invoice.warrantyUntil}` : "";
  return `*${businessName}*\n${invoice.kind === "sale" ? "Receipt" : "Repair Invoice"} #${invoice.number}\n${invoice.date}\n\n${lines}${labour}\n\nTotal: ${formatGBP(invoice.total)}\n${invoice.paid ? "PAID ✅" : "UNPAID"}${warranty}\n\nThank you!`;
}
