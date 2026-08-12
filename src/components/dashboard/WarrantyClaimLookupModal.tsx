import { useState } from "react";
import { lookupRepairWarranty, submitWarrantyClaim } from "@/lib/repairs.functions";
import { Search, ShieldCheck, ShieldAlert, CheckCircle2, X, Loader2, Wrench } from "lucide-react";

interface WarrantyClaimLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WarrantyClaimLookupModal({ isOpen, onClose }: WarrantyClaimLookupModalProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);

  const [selectedRepair, setSelectedRepair] = useState<any>(null);
  const [claimDesc, setClaimDesc] = useState("");
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [claimSuccessMsg, setClaimSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    setClaimSuccessMsg(null);
    try {
      const data = await lookupRepairWarranty({ data: { query: query.trim() } });
      setResults(data);
      setSearched(true);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to lookup repair warranty.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateClaim(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRepair || !claimDesc.trim()) return;
    setSubmittingClaim(true);
    setErrorMsg(null);
    try {
      await submitWarrantyClaim({
        data: {
          repair_id: selectedRepair.id,
          description: claimDesc.trim(),
        },
      });
      setClaimSuccessMsg(
        "Warranty claim filed successfully! Ticket flagged for technician inspection.",
      );
      setClaimDesc("");
      setSelectedRepair(null);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit warranty claim.");
    } finally {
      setSubmittingClaim(false);
    }
  }

  const inputCls =
    "w-full px-3 py-2 bg-background border border-border rounded-lg text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand" />
            <div>
              <h3 className="font-extrabold text-sm text-white">Warranty Claim Lookup Tool</h3>
              <p className="text-xs text-slate-300">
                Search by REP Ticket #, Customer Phone, or Device IMEI
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive font-bold">
              ⚠️ {errorMsg}
            </div>
          )}
          {claimSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> {claimSuccessMsg}
            </div>
          )}

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Enter REP-2026-000145, customer phone, or IMEI..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={`${inputCls} pl-9`}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-brand hover:bg-brand/90 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Lookup
            </button>
          </form>

          {/* Search Results */}
          {searched && (
            <div className="space-y-3">
              <h4 className="font-bold text-xs text-foreground">
                Lookup Results ({results.length})
              </h4>
              {results.length > 0 ? (
                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {results.map((r) => {
                    const warrantyUntil = r.warranty_until ? new Date(r.warranty_until) : null;
                    const isValid = warrantyUntil && warrantyUntil >= new Date();

                    return (
                      <div
                        key={r.id}
                        className={`p-4 rounded-2xl border text-xs space-y-2 transition-all ${
                          isValid
                            ? "bg-emerald-50/60 border-emerald-300 text-emerald-950"
                            : "bg-rose-50/60 border-rose-200 text-rose-950"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-extrabold text-sm font-mono">{r.rep_number}</span>
                            <span className="text-muted-foreground block text-[11px]">
                              {r.device} • {r.customers?.name}
                            </span>
                          </div>
                          <div>
                            {isValid ? (
                              <span className="px-3 py-1 rounded-full bg-emerald-600 text-white font-extrabold text-[11px] flex items-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5" /> IN WARRANTY ✅
                              </span>
                            ) : (
                              <span className="px-3 py-1 rounded-full bg-rose-600 text-white font-extrabold text-[11px] flex items-center gap-1">
                                <ShieldAlert className="w-3.5 h-3.5" /> WARRANTY EXPIRED ❌
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-[11px] space-y-1 border-t border-current/10 pt-2">
                          <div>
                            <span className="font-semibold">Repair Fault: </span>
                            <span>{r.issue}</span>
                          </div>
                          <div>
                            <span className="font-semibold">Warranty Expiration: </span>
                            <span className="font-bold">
                              {warrantyUntil ? warrantyUntil.toLocaleDateString() : "Not specified"}
                            </span>
                          </div>
                        </div>

                        {isValid && (
                          <div className="pt-2">
                            {selectedRepair?.id === r.id ? (
                              <form
                                onSubmit={handleCreateClaim}
                                className="p-3 bg-white rounded-xl border border-emerald-300 space-y-2"
                              >
                                <span className="font-bold text-emerald-900 block">
                                  File Warranty Claim
                                </span>
                                <textarea
                                  rows={2}
                                  required
                                  placeholder="Describe warranty defect reported by customer..."
                                  value={claimDesc}
                                  onChange={(e) => setClaimDesc(e.target.value)}
                                  className={inputCls}
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedRepair(null)}
                                    className="px-3 py-1 text-muted-foreground"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="submit"
                                    disabled={submittingClaim}
                                    className="px-4 py-1 bg-emerald-600 text-white font-bold rounded-lg"
                                  >
                                    Submit Claim
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <button
                                onClick={() => setSelectedRepair(r)}
                                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer text-xs"
                              >
                                <Wrench className="w-3.5 h-3.5" /> Create Warranty Claim
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center py-6 text-muted-foreground text-xs italic">
                  No matching repair records found for "{query}".
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
