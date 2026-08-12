import { useState, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { importOpeningStock } from "@/lib/products.functions";
import { formatGBP } from "@/lib/utils";
import {
  Upload,
  Download,
  FileSpreadsheet,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

interface ParsedProduct {
  name: string;
  category: string;
  sku: string | null;
  barcode: string | null;
  type: "product" | "part" | "service";
  cost_price_pounds: number;
  sale_price_pounds: number;
  cost_price_pence: number;
  sale_price_pence: number;
  stock_quantity: number;
  low_stock_threshold: number;
  warranty_days: number;
  isValid: boolean;
  errors: string[];
  lineNumber: number;
}

export function CSVImportModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const importFn = useServerFn(importOpeningStock);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"upload" | "preview" | "submitting">("upload");
  const [fileName, setFileName] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedProduct[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sample CSV generator & downloader
  const downloadSampleCSV = () => {
    const csvContent =
      "Product Name,Category,SKU,Barcode,Type,Cost Price (£),Sale Price (£),Opening Stock Qty,Low Stock Alert,Warranty Days\n" +
      "iPhone 13 Silicone Case,Accessories,,5012345678901,product,3.50,15.00,25,5,0\n" +
      "USB-C Fast Charger Cable 2m,Accessories,,,product,2.00,10.00,40,5,30\n" +
      "iPhone 13 OLED Display Screen,Repair Parts,PART-IP13-SCR,,part,25.00,65.00,8,2,90\n" +
      "Screen Fitting Labour Service,Services,,,service,0.00,20.00,0,0,30\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Prescot_Opening_Stock_Template.csv";
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Sample template downloaded!");
  };

  // CSV Parser implementation
  const parseCSVText = (text: string) => {
    const lines = text
      .split(/\r\n|\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length <= 1) {
      toast.error("CSV file is empty or missing data rows");
      return;
    }

    // Header parsing
    const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim());
    const dataLines = lines.slice(1);

    const rows: ParsedProduct[] = [];
    const seenSKUs = new Set<string>();
    const seenBarcodes = new Set<string>();

    dataLines.forEach((lineText, idx) => {
      const lineNum = idx + 2; // header is line 1
      const cols = parseCSVLine(lineText);

      // Map columns by header position
      const getVal = (possibleHeaders: string[]) => {
        for (const ph of possibleHeaders) {
          const colIdx = headers.findIndex((h) => h.includes(ph));
          if (colIdx !== -1 && cols[colIdx] !== undefined) {
            return cols[colIdx].trim();
          }
        }
        return "";
      };

      const name = getVal(["product name", "product", "item name", "name"]);
      const category = getVal(["category"]);
      const sku = getVal(["sku"]) || null;
      const barcode = getVal(["barcode", "ean"]) || null;
      const typeRaw = getVal(["type"]).toLowerCase();
      const costStr = getVal(["cost price", "cost"]);
      const saleStr = getVal(["sale price", "sale", "price"]);
      const stockStr = getVal(["opening stock", "stock qty", "opening qty", "stock"]);
      const lowStockStr = getVal(["low stock", "alert"]);
      const warrantyStr = getVal(["warranty"]);

      const errors: string[] = [];

      if (!name) errors.push("Product Name is required");
      if (!category) errors.push("Category is required");

      const costPrice = parseFloat(costStr);
      if (isNaN(costPrice) || costPrice < 0) errors.push("Invalid Cost Price");

      const salePrice = parseFloat(saleStr);
      if (isNaN(salePrice) || salePrice < 0) errors.push("Invalid Sale Price");

      const stockQty = parseInt(stockStr, 10);
      if (isNaN(stockQty) || stockQty < 0) errors.push("Invalid Opening Stock Qty");

      const lowStock = parseInt(lowStockStr, 10);
      const lowStockThreshold = isNaN(lowStock) ? 5 : lowStock;

      const warranty = parseInt(warrantyStr, 10);
      const warrantyDays = isNaN(warranty) ? 0 : warranty;

      let itemType: "product" | "part" | "service" = "product";
      if (typeRaw.includes("part")) itemType = "part";
      if (typeRaw.includes("service") || typeRaw.includes("labour")) itemType = "service";

      // Duplicate checks within file
      if (sku) {
        if (seenSKUs.has(sku.toLowerCase())) {
          errors.push(`Duplicate SKU '${sku}' in CSV`);
        } else {
          seenSKUs.add(sku.toLowerCase());
        }
      }

      if (barcode) {
        if (seenBarcodes.has(barcode.toLowerCase())) {
          errors.push(`Duplicate Barcode '${barcode}' in CSV`);
        } else {
          seenBarcodes.add(barcode.toLowerCase());
        }
      }

      rows.push({
        name,
        category,
        sku,
        barcode,
        type: itemType,
        cost_price_pounds: isNaN(costPrice) ? 0 : costPrice,
        sale_price_pounds: isNaN(salePrice) ? 0 : salePrice,
        cost_price_pence: isNaN(costPrice) ? 0 : Math.round(costPrice * 100),
        sale_price_pence: isNaN(salePrice) ? 0 : Math.round(salePrice * 100),
        stock_quantity: isNaN(stockQty) ? 0 : stockQty,
        low_stock_threshold: lowStockThreshold,
        warranty_days: warrantyDays,
        isValid: errors.length === 0,
        errors,
        lineNumber: lineNum,
      });
    });

    setParsedRows(rows);
    setStep("preview");
  };

  const parseCSVLine = (text: string): string[] => {
    const result: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === "," && !inQuotes) {
        result.push(cur);
        cur = "";
      } else {
        cur += c;
      }
    }
    result.push(cur);
    return result;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) parseCSVText(content);
    };
    reader.readAsText(file);
  };

  const validRows = parsedRows.filter((r) => r.isValid);
  const invalidRows = parsedRows.filter((r) => !r.isValid);

  const totalUnits = validRows.reduce((sum, r) => sum + r.stock_quantity, 0);
  const totalCostPence = validRows.reduce(
    (sum, r) => sum + r.stock_quantity * r.cost_price_pence,
    0,
  );
  const totalRetailPence = validRows.reduce(
    (sum, r) => sum + r.stock_quantity * r.sale_price_pence,
    0,
  );

  const handleConfirmImport = async () => {
    if (validRows.length === 0) {
      toast.error("No valid product rows to import");
      return;
    }

    setIsSubmitting(true);
    setStep("submitting");

    try {
      const payload = validRows.map((r) => ({
        name: r.name,
        category: r.category,
        sku: r.sku,
        barcode: r.barcode,
        type: r.type,
        cost_price_pence: r.cost_price_pence,
        sale_price_pence: r.sale_price_pence,
        stock_quantity: r.stock_quantity,
        low_stock_threshold: r.low_stock_threshold,
        warranty_days: r.warranty_days,
      }));

      const res = await importFn({ data: payload });
      toast.success(`Successfully imported ${res.imported_count} opening stock products!`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to import opening stock");
      setStep("preview");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#E11D48]" />
            <div>
              <h2 className="font-extrabold text-slate-900 text-sm">Bulk Opening Stock Import</h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Import initial shop inventory via CSV spreadsheet with verified accounting logs
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 min-h-0">
          {step === "upload" && (
            <div className="space-y-5 py-4">
              {/* Instructions */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1.5 text-amber-900">
                <div className="font-bold text-amber-950 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                  Opening Stock Accounting Rule
                </div>
                <p>
                  Bulk opening stock is recorded under movement type{" "}
                  <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[11px]">
                    opening_count
                  </code>
                  . This initializes physical stock counts without generating false supplier
                  payables or purchase orders.
                </p>
              </div>

              {/* Upload Drop Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-[#E11D48] bg-slate-50/50 hover:bg-rose-50/30 rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all space-y-3"
              >
                <Upload className="w-10 h-10 text-slate-400 mx-auto" />
                <div>
                  <div className="text-sm font-extrabold text-slate-900">
                    Click to select CSV File
                  </div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">
                    Supports .csv files with header row
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Sample Template Download */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-100 rounded-xl text-xs">
                <div>
                  <div className="font-bold text-slate-900">Need a CSV format template?</div>
                  <div className="text-[11px] text-slate-500">
                    Download pre-formatted template with example rows
                  </div>
                </div>
                <button
                  type="button"
                  onClick={downloadSampleCSV}
                  className="btn-outline !py-2 !px-3.5 !text-xs inline-flex items-center gap-1.5 bg-white shadow-sm shrink-0 min-h-[40px]"
                >
                  <Download className="w-3.5 h-3.5" /> Sample CSV
                </button>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              {/* Summary Toolbar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900 text-white p-3.5 rounded-xl text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">
                    Valid Items
                  </span>
                  <span className="font-black text-emerald-400 text-sm">
                    {validRows.length} / {parsedRows.length}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">
                    Total Units
                  </span>
                  <span className="font-black text-white text-sm">
                    {totalUnits.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">
                    Opening Cost Value
                  </span>
                  <span className="font-black text-amber-400 text-sm">
                    {formatGBP(totalCostPence / 100)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">
                    Opening Retail Value
                  </span>
                  <span className="font-black text-emerald-300 text-sm">
                    {formatGBP(totalRetailPence / 100)}
                  </span>
                </div>
              </div>

              {/* Error Callout if invalid rows exist */}
              {invalidRows.length > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-rose-950">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    {invalidRows.length} invalid row(s) detected and will be skipped
                  </div>
                  <ul className="list-disc list-inside text-[11px] space-y-0.5 text-rose-700 max-h-20 overflow-y-auto">
                    {invalidRows.map((r) => (
                      <li key={r.lineNumber}>
                        Line {r.lineNumber} ({r.name || "Unnamed"}): {r.errors.join(", ")}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Data Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-x-auto overflow-y-auto max-h-[45vh] w-full">
                <table className="w-full text-xs text-left min-w-[650px]">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200 text-[10px] sticky top-0 bg-slate-50 z-10">
                    <tr>
                      <th className="px-3 py-2">Line</th>
                      <th className="px-3 py-2">Product Name</th>
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2">SKU</th>
                      <th className="px-3 py-2 text-right">Cost</th>
                      <th className="px-3 py-2 text-right">Sale</th>
                      <th className="px-3 py-2 text-right">Opening Qty</th>
                      <th className="px-3 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.map((r) => (
                      <tr
                        key={r.lineNumber}
                        className={!r.isValid ? "bg-rose-50/50" : "hover:bg-slate-50"}
                      >
                        <td className="px-3 py-2 font-mono text-slate-400">#{r.lineNumber}</td>
                        <td className="px-3 py-2 font-bold text-slate-900">{r.name || "—"}</td>
                        <td className="px-3 py-2 text-slate-600">{r.category || "—"}</td>
                        <td className="px-3 py-2 font-mono text-slate-500">{r.sku || "—"}</td>
                        <td className="px-3 py-2 text-right font-mono">
                          {formatGBP(r.cost_price_pounds)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                          {formatGBP(r.sale_price_pounds)}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-[#E11D48]">
                          {r.stock_quantity}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {r.isValid ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold inline-flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3" /> Valid
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-extrabold">
                              Invalid
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === "submitting" && (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-10 h-10 animate-spin text-[#E11D48] mx-auto" />
              <div className="text-sm font-extrabold text-slate-900">
                Importing Opening Stock Records…
              </div>
              <div className="text-xs text-slate-500">
                Executing atomic database transaction and creating movement audit logs
              </div>
            </div>
          )}
        </div>

        {/* Footer Toolbar */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          {step === "preview" ? (
            <button
              type="button"
              onClick={() => setStep("upload")}
              disabled={isSubmitting}
              className="btn-outline !py-2 !px-3.5 !text-xs inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Re-upload File
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-outline !py-2 !px-4 !text-xs"
            >
              Cancel
            </button>

            {step === "preview" && (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isSubmitting || validRows.length === 0}
                className="btn-primary !py-2 !px-5 !text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
                Import {validRows.length} Valid Products
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
