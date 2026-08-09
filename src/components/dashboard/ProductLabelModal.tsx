import { useState } from "react";
import { generateCode128B } from "@/lib/code128";
import { formatGBP } from "@/lib/utils";
import { X, Printer, Tag, Sparkles } from "lucide-react";

interface ProductLabelModalProps {
  product: {
    id: string;
    name: string;
    category: string;
    sku: string | null;
    sale_price_pence: number;
    barcode?: string | null;
  };
  onClose: () => void;
}

export function ProductLabelModal({ product, onClose }: ProductLabelModalProps) {
  const [labelQty, setLabelQty] = useState(1);
  const skuText = product.sku || "NO-SKU";

  const { rects, totalWidth } = generateCode128B(skuText);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 print:static print:bg-white print:p-0">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col print:border-none print:shadow-none print:max-h-none print:w-full print:rounded-none">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/80 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-[#E11D48]" />
            <div>
              <h2 className="font-extrabold text-slate-900 text-sm">Print Internal Product Label</h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Generate Code 128 barcode sticker for loose stock or shelf bins
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar Controls */}
        <div className="p-3 bg-slate-900 text-white flex items-center justify-between gap-3 print:hidden shrink-0 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-300">Label Quantity:</span>
            <select
              value={labelQty}
              onChange={(e) => setLabelQty(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 text-white font-bold px-2.5 py-1 rounded-lg outline-none text-xs"
            >
              <option value={1}>1 Label</option>
              <option value={2}>2 Labels</option>
              <option value={5}>5 Labels</option>
              <option value={10}>10 Labels</option>
              <option value={20}>20 Labels</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="btn-primary !py-1.5 !px-4 !text-xs inline-flex items-center gap-1.5 shrink-0"
          >
            <Printer className="w-3.5 h-3.5" /> Print Label
          </button>
        </div>

        {/* Print Content Area */}
        <div className="p-6 overflow-y-auto print:p-0 print:overflow-visible space-y-4" id="label-print-area">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:grid-cols-1 print:gap-2">
            {Array.from({ length: labelQty }).map((_, idx) => (
              <div
                key={idx}
                className="border-2 border-dashed border-slate-300 p-3.5 rounded-xl text-center bg-white space-y-1.5 print:border-solid print:border-black print:rounded-none print:p-3 print:break-inside-avoid"
              >
                {/* Store Header */}
                <div className="text-[11px] font-black uppercase tracking-widest text-slate-800 print:text-black">
                  Prescot Mobiles
                </div>

                {/* Product Name */}
                <div className="text-xs font-extrabold text-slate-900 line-clamp-2 leading-tight print:text-black">
                  {product.name}
                </div>

                {/* Price */}
                <div className="text-sm font-black text-[#E11D48] print:text-black">
                  {formatGBP(product.sale_price_pence / 100)}
                </div>

                {/* Code 128 Barcode */}
                <div className="flex justify-center my-1">
                  <svg
                    viewBox={`0 0 ${totalWidth} 50`}
                    className="w-full max-w-[220px] h-12 print:h-14"
                    preserveAspectRatio="none"
                  >
                    {rects.map((r, i) => (
                      <rect key={i} x={r.x} y={0} width={r.width} height={50} fill="black" />
                    ))}
                  </svg>
                </div>

                {/* Readable SKU Text */}
                <div className="text-xs font-mono font-bold tracking-wider text-slate-900 print:text-black">
                  {skuText}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end print:hidden shrink-0">
          <button type="button" onClick={onClose} className="btn-outline !py-1.5 !px-4 !text-xs">
            Close
          </button>
        </div>

        {/* Thermal Print CSS Styles */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #label-print-area, #label-print-area * {
              visibility: visible;
            }
            #label-print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .print\\:hidden {
              display: none !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
