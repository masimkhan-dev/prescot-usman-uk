import { BUSINESS } from "@/lib/business";
import { formatGBP } from "@/lib/utils";
import { Printer, MessageCircle, X } from "lucide-react";

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

export function InvoiceModal({ invoice, onClose }: { invoice: InvoiceData; onClose: () => void }) {
  const waText = buildWhatsAppText(invoice);
  const waHref = BUSINESS.whatsappMessage(waText);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 print:static print:bg-white print:p-0">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl print:shadow-none print:max-h-none print:rounded-none">
        <div className="flex items-center justify-between p-4 border-b border-border print:hidden">
          <h3 className="font-semibold text-ink">
            {invoice.kind === "sale" ? "Sale Receipt" : "Repair Invoice"} · {invoice.number}
          </h3>
          <div className="flex items-center gap-2">
            <a
              href={waHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700"
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </a>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-brand text-white hover:opacity-90"
            >
              <Printer className="w-4 h-4" /> Print / PDF
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 print:p-0" id="invoice-print-area">
          <InvoiceBody invoice={invoice} />
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #invoice-print-area, #invoice-print-area * { visibility: visible; }
          #invoice-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 24px; }
        }
      `}</style>
    </div>
  );
}

function InvoiceBody({ invoice }: { invoice: InvoiceData }) {
  return (
    <div className="text-sm text-ink">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">{BUSINESS.name}</h2>
          <p className="text-muted-foreground text-xs mt-1">{BUSINESS.fullAddress}</p>
          <p className="text-muted-foreground text-xs">{BUSINESS.phone} · {BUSINESS.email}</p>
        </div>
        <div className="text-right">
          <div className="font-semibold uppercase text-xs tracking-wider">
            {invoice.kind === "sale" ? "Receipt" : "Repair Invoice"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">#{invoice.number}</div>
          <div className="text-xs text-muted-foreground">{invoice.date}</div>
        </div>
      </div>

      {invoice.customer?.name && (
        <div className="mb-4 pb-4 border-b border-border">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Bill to</div>
          <div className="font-medium">{invoice.customer.name}</div>
          {invoice.customer.phone && <div className="text-xs text-muted-foreground">{invoice.customer.phone}</div>}
          {invoice.customer.email && <div className="text-xs text-muted-foreground">{invoice.customer.email}</div>}
        </div>
      )}

      {invoice.kind === "repair" && invoice.device && (
        <div className="mb-4 pb-4 border-b border-border">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Device</div>
          <div className="font-medium">{invoice.device}</div>
          {invoice.issue && <div className="text-xs text-muted-foreground mt-1">Issue: {invoice.issue}</div>}
        </div>
      )}

      <table className="w-full mb-4">
        <thead>
          <tr className="border-b border-border text-xs uppercase text-muted-foreground">
            <th className="text-left py-2">Item</th>
            <th className="text-right py-2">Qty</th>
            <th className="text-right py-2">Price</th>
            <th className="text-right py-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((l, i) => (
            <tr key={i} className="border-b border-border/50">
              <td className="py-2">{l.name}</td>
              <td className="py-2 text-right">{l.quantity}</td>
              <td className="py-2 text-right">{formatGBP(l.unit_price)}</td>
              <td className="py-2 text-right">{formatGBP(l.total)}</td>
            </tr>
          ))}
          {invoice.labour && invoice.labour > 0 ? (
            <tr className="border-b border-border/50">
              <td className="py-2" colSpan={3}>Labour</td>
              <td className="py-2 text-right">{formatGBP(invoice.labour)}</td>
            </tr>
          ) : null}
        </tbody>
      </table>

      <div className="flex flex-col items-end gap-1">
        {invoice.discount && invoice.discount > 0 ? (
          <div className="text-sm text-muted-foreground">Discount: −{formatGBP(invoice.discount)}</div>
        ) : null}
        <div className="text-lg font-bold">Total: {formatGBP(invoice.total)}</div>
        <div className="text-xs text-muted-foreground">
          {invoice.paymentMethod && `Payment: ${invoice.paymentMethod} · `}
          {invoice.paid ? "PAID" : "UNPAID"}
        </div>
        {invoice.warrantyUntil && (
          <div className="text-xs mt-2 px-2 py-1 rounded bg-surface border border-border">
            🛡️ Warranty until {invoice.warrantyUntil}
          </div>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-border text-center text-xs text-muted-foreground">
        Thank you for choosing {BUSINESS.shortName}!
      </div>
    </div>
  );
}

function buildWhatsAppText(invoice: InvoiceData): string {
  const lines = invoice.lines
    .map((l) => `• ${l.name} × ${l.quantity} — ${formatGBP(l.total)}`)
    .join("\n");
  const labour = invoice.labour && invoice.labour > 0 ? `\nLabour: ${formatGBP(invoice.labour)}` : "";
  const warranty = invoice.warrantyUntil ? `\nWarranty until: ${invoice.warrantyUntil}` : "";
  return `*${BUSINESS.shortName}*\n${invoice.kind === "sale" ? "Receipt" : "Repair Invoice"} #${invoice.number}\n${invoice.date}\n\n${lines}${labour}\n\nTotal: ${formatGBP(invoice.total)}\n${invoice.paid ? "PAID ✅" : "UNPAID"}${warranty}\n\nThank you!`;
}
