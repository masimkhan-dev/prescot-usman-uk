import { X, Smartphone, User, Calendar, Banknote, ShieldCheck, Tag, CheckCircle2, Clock } from "lucide-react";

interface PhoneUnitDetailModalProps {
  unit: any; // full detail from getPhoneUnitDetail
  isOpen: boolean;
  onClose: () => void;
  onSell?: () => void;
  onPrintPurchase?: () => void;
  onPrintSale?: () => void;
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
function formatGBP(pence?: number | null) {
  if (pence == null) return "—";
  return `£${(pence / 100).toFixed(2)}`;
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 py-1.5 border-b border-border/60 last:border-0">
      <span className="text-[11px] font-semibold text-muted-foreground w-36 shrink-0">{label}</span>
      <span className="text-[11px] font-bold text-foreground break-all">{value}</span>
    </div>
  );
}

export function PhoneUnitDetailModal({
  unit, isOpen, onClose, onSell, onPrintPurchase, onPrintSale,
}: PhoneUnitDetailModalProps) {
  if (!isOpen || !unit) return null;

  const purchase = Array.isArray(unit.phone_purchase_transactions)
    ? unit.phone_purchase_transactions[0]
    : null;
  const saleItem = Array.isArray(unit.sale_items) ? unit.sale_items[0] : null;
  const sale = saleItem?.sales;

  const isSold = unit.status === "sold";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-xl my-auto animate-in fade-in zoom-in-95 duration-150">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-brand" />
            <div>
              <h2 className="font-bold text-sm text-foreground">
                {unit.brand} {unit.model}{unit.storage ? ` ${unit.storage}` : ""}
              </h2>
              <p className="text-[11px] text-muted-foreground font-mono">#{unit.stock_number}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
              isSold
                ? "bg-muted text-muted-foreground"
                : "bg-green-100 text-green-700"
            }`}>
              {isSold ? <Clock className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
              {isSold ? "Sold" : "In Stock"}
            </span>
            <button type="button" onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto max-h-[75vh]">

          {/* Device */}
          <section>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground mb-2">
              Device Details
            </p>
            <div className="bg-muted/30 border border-border rounded-xl px-3 py-1">
              <Row label="Brand / Model" value={`${unit.brand} ${unit.model}${unit.storage ? ` ${unit.storage}` : ""}${unit.colour ? ` (${unit.colour})` : ""}`} />
              <Row label="IMEI 1" value={unit.imei1} />
              <Row label="IMEI 2" value={unit.imei2} />
              <Row label="Serial Number" value={unit.serial_number} />
              <Row label="Condition Grade" value={unit.condition_grade} />
              <Row label="Battery Health" value={unit.battery_health} />
              <Row label="Network" value={unit.network_status} />
              <Row label="Activation Lock" value={unit.activation_lock_status} />
              <Row label="Accessories" value={unit.accessories} />
              <Row label="Faults / Notes" value={unit.condition_notes} />
            </div>
          </section>

          {/* Purchase info */}
          {purchase && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Banknote className="w-3 h-3 text-brand" /> Purchase from Seller
                </p>
                {onPrintPurchase && (
                  <button type="button" onClick={onPrintPurchase}
                    className="text-[11px] font-bold text-brand hover:underline cursor-pointer">
                    Reprint Receipt
                  </button>
                )}
              </div>
              <div className="bg-muted/30 border border-border rounded-xl px-3 py-1">
                <Row label="Purchase Ref" value={purchase.purchase_number} />
                <Row label="Date" value={formatDate(unit.purchased_at)} />
                <Row
                  label="Seller"
                  value={purchase.customers?.name
                    ? `${purchase.customers.name}${purchase.customers.phone ? ` · ${purchase.customers.phone}` : ""}`
                    : "Walk-in"}
                />
                <Row label="Purchase Price" value={formatGBP(purchase.purchase_price_pence)} />
                <Row label="Payment Method" value={purchase.payment_method?.replace("_", " ")} />
                {purchase.bank_reference && <Row label="Bank Ref" value={purchase.bank_reference} />}
              </div>
            </section>
          )}

          {/* Sale info */}
          {isSold && sale && saleItem && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Tag className="w-3 h-3 text-brand" /> Sold to Customer
                </p>
                {onPrintSale && (
                  <button type="button" onClick={onPrintSale}
                    className="text-[11px] font-bold text-brand hover:underline cursor-pointer">
                    Reprint Invoice
                  </button>
                )}
              </div>
              <div className="bg-muted/30 border border-border rounded-xl px-3 py-1">
                <Row label="Invoice #" value={sale.invoice_number} />
                <Row label="Date" value={formatDate(sale.created_at)} />
                <Row
                  label="Buyer"
                  value={sale.customers?.name
                    ? `${sale.customers.name}${sale.customers.phone ? ` · ${sale.customers.phone}` : ""}`
                    : "Walk-in"}
                />
                <Row label="Selling Price" value={formatGBP(saleItem.line_total_pence)} />
                {saleItem.warranty_days && saleItem.warranty_days > 0 ? (
                  <>
                    <Row label="Warranty" value={`${saleItem.warranty_days} days`} />
                    <Row label="Warranty Until" value={saleItem.warranty_until ? formatDate(saleItem.warranty_until + "T00:00:00Z") : undefined} />
                  </>
                ) : (
                  <Row label="Warranty" value="None" />
                )}
              </div>
            </section>
          )}

          {/* Margin (internal) */}
          {purchase && (
            <div className="p-3 bg-muted/20 border border-border rounded-xl">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground mb-1">
                Internal — Financials
              </p>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: "Cost", value: formatGBP(unit.purchase_cost_pence) },
                  {
                    label: isSold ? "Revenue" : "—",
                    value: isSold && saleItem ? formatGBP(saleItem.line_total_pence) : "—",
                  },
                  {
                    label: isSold ? "Margin" : "—",
                    value: isSold && saleItem
                      ? formatGBP(saleItem.line_total_pence - unit.purchase_cost_pence)
                      : "—",
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-card border border-border rounded-lg p-2">
                    <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-bold">{label}</p>
                    <p className="text-xs font-extrabold text-foreground font-mono">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 py-3 border-t border-border bg-muted/20 rounded-b-2xl flex items-center justify-end gap-2">
          {!isSold && onSell && (
            <button type="button" onClick={onSell}
              className="px-5 py-2.5 text-xs font-extrabold text-white bg-brand hover:bg-brand/90 rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-2 min-h-[40px]">
              <Tag className="w-3.5 h-3.5" /> Sell This Phone
            </button>
          )}
          <button type="button" onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted rounded-xl transition-colors cursor-pointer min-h-[40px]">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
