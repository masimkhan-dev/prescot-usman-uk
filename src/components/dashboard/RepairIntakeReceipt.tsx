import { Printer, X, ShieldCheck } from "lucide-react";

interface RepairIntakeReceiptProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenWorkspace?: (ticketId: string) => void;
  ticket: any;
}

export function RepairIntakeReceipt({ isOpen, onClose, onOpenWorkspace, ticket }: RepairIntakeReceiptProps) {
  if (!isOpen || !ticket) return null;

  const quotePence = ticket.total_price_pence || 0;
  const depositPence = ticket.deposit_pence || 0;
  const balancePence = Math.max(0, quotePence - depositPence);

  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 text-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Actions header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white shrink-0 print:hidden">
          <span className="font-bold text-xs flex items-center gap-1.5">
            <Printer className="w-4 h-4 text-brand" /> 80mm Drop-Off Receipt
          </span>
          <div className="flex items-center gap-1.5">
            {onOpenWorkspace && (
              <button
                onClick={() => onOpenWorkspace(ticket.id)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
              >
                Open
              </button>
            )}
            <button
              onClick={handlePrint}
              className="px-3 py-1 bg-brand hover:bg-brand/90 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Thermal Receipt Printable Area */}
        <div className="p-6 font-mono text-[11px] leading-tight space-y-3 print:p-0 print:m-0 print:w-[80mm] print:text-black">
          {/* Header */}
          <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-400">
            <img
              src="/site-assets/prescot-logo.png"
              alt="Prescot Mobiles Logo"
              className="h-10 w-auto object-contain mx-auto mb-1"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = "none";
              }}
            />
            <h1 className="font-extrabold text-sm tracking-wider uppercase font-sans">
              PRESCOT MOBILES
            </h1>
            <p className="text-[10px] text-slate-600">57 Eccleston Street, Prescot L34 5QH</p>
            <p className="text-[10px] text-slate-600">Tel: 0151 426 0000</p>
            <div className="pt-1 font-bold text-xs uppercase tracking-widest text-slate-900">
              REPAIR INTAKE RECEIPT
            </div>
          </div>

          {/* Ticket Info */}
          <div className="space-y-1 pt-1">
            <div className="flex justify-between font-bold text-xs">
              <span>TICKET:</span>
              <span>{ticket.rep_number || "REP-000000"}</span>
            </div>
            <div className="flex justify-between text-[10px] text-slate-600">
              <span>DATE:</span>
              <span>{new Date(ticket.created_at || Date.now()).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Customer & Device */}
          <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-1">
            <div>
              <span className="text-slate-500">Customer: </span>
              <span className="font-bold">{ticket.customers?.name || "Walk-In Customer"}</span>
            </div>
            {ticket.customers?.phone && (
              <div>
                <span className="text-slate-500">Phone: </span>
                <span>{ticket.customers.phone}</span>
              </div>
            )}
            <div className="pt-1">
              <span className="text-slate-500">Device: </span>
              <span className="font-bold">{ticket.device}</span> {ticket.brand ? `(${ticket.brand})` : ""}
            </div>
            {ticket.imei && (
              <div>
                <span className="text-slate-500">IMEI: </span>
                <span>{ticket.imei}</span>
              </div>
            )}
            <div>
              <span className="text-slate-500">Fault: </span>
              <span className="font-bold">{ticket.issue}</span>
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="space-y-1 py-1">
            <div className="flex justify-between">
              <span>ESTIMATED QUOTE:</span>
              <span className="font-bold">£{(quotePence / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>DEPOSIT PAID:</span>
              <span className="font-bold">£{(depositPence / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs font-bold pt-1 border-t border-slate-300">
              <span>ESTIMATED BALANCE:</span>
              <span>£{(balancePence / 100).toFixed(2)}</span>
            </div>
          </div>

          {/* Warranty & PIN Box */}
          <div className="p-2.5 bg-slate-100 border border-slate-300 rounded-lg text-center space-y-1">
            <div className="flex items-center justify-center gap-1 font-bold text-[10px] text-slate-700">
              <ShieldCheck className="w-3.5 h-3.5 text-brand" /> QUOTED WARRANTY:{" "}
              {ticket.warranty_days ? `${ticket.warranty_days} DAYS` : "NOT SPECIFIED"}
            </div>
            <div className="text-[10px] text-slate-500">
              COLLECTION PIN: <span className="font-extrabold text-xs text-slate-900 font-sans tracking-widest">{ticket.collection_pin || "1234"}</span>
            </div>
          </div>

          {/* Footer Warning */}
          <div className="text-center text-[9px] text-slate-500 pt-2 space-y-1 border-t border-dashed border-slate-400">
            <p className="font-bold text-slate-700">Please keep this receipt for device collection.</p>
            <p>Devices uncollected after 60 days may be subject to recycling fees.</p>
            <p className="pt-1">Thank you for choosing Prescot Mobiles!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
