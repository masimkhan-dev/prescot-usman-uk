import { useState } from "react";
import { saveCustomer } from "@/lib/customers.functions";
import { Loader2, Plus, X, User, Phone, Mail, MapPin, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

interface QuickAddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerCreated: (customer: { id: string; name: string; phone?: string | null }) => void;
}

export function QuickAddCustomerModal({
  isOpen,
  onClose,
  onCustomerCreated,
}: QuickAddCustomerModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [postcode, setPostcode] = useState("");
  const [consentWhatsapp, setConsentWhatsapp] = useState(true);
  const [consentSms, setConsentSms] = useState(false);
  const [consentEmail, setConsentEmail] = useState(true);
  const [showMore, setShowMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setErrorMsg("Customer name and phone number are required.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const result = await saveCustomer({
        data: {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          postcode: postcode.trim() || null,
          marketing_consent_whatsapp: consentWhatsapp,
          marketing_consent_sms: consentSms,
          marketing_consent_email: consentEmail,
        },
      });

      onCustomerCreated({
        id: result.id,
        name: result.name,
        phone: result.phone,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create customer.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand";
  const labelCls = "block text-xs font-bold text-foreground mb-1 flex items-center gap-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-brand" />
            <h3 className="font-bold text-sm text-foreground">Quick Add Customer</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          <div>
            <label className={labelCls}>
              <User className="w-3.5 h-3.5 text-muted-foreground" /> Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. John Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>
              <Phone className="w-3.5 h-3.5 text-muted-foreground" /> Phone *
            </label>
            <input
              type="tel"
              required
              placeholder="e.g. 07700 900000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>
              <Mail className="w-3.5 h-3.5 text-muted-foreground" /> Email (Optional)
            </label>
            <input
              type="email"
              placeholder="john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Primary Marketing Toggle */}
          <div className="p-3 bg-muted/30 rounded-xl border border-border">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
              <input
                type="checkbox"
                checked={consentWhatsapp}
                onChange={(e) => setConsentWhatsapp(e.target.checked)}
                className="rounded border-border text-brand focus:ring-brand w-4 h-4"
              />
              <span>WhatsApp updates & offers</span>
            </label>
          </div>

          {/* More Collapsible Toggle */}
          <button
            type="button"
            onClick={() => setShowMore(!showMore)}
            className="text-xs font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer pt-1"
          >
            {showMore ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showMore ? "Fewer details" : "More details..."}
          </button>

          {showMore && (
            <div className="space-y-4 pt-1 border-t border-border animate-in fade-in duration-100">
              <div>
                <label className={labelCls}>
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" /> Postcode
                </label>
                <input
                  type="text"
                  placeholder="L34 5QH"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div className="p-3 bg-muted/20 rounded-xl space-y-2 border border-border">
                <span className="font-bold text-[11px] text-foreground block">
                  Additional Communication Consents
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={consentSms}
                      onChange={(e) => setConsentSms(e.target.checked)}
                      className="rounded border-border text-brand focus:ring-brand"
                    />
                    SMS Marketing
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={consentEmail}
                      onChange={(e) => setConsentEmail(e.target.checked)}
                      className="rounded border-border text-brand focus:ring-brand"
                    />
                    Email Marketing
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted rounded-xl transition-colors cursor-pointer min-h-[38px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-extrabold text-white bg-brand hover:bg-brand/90 rounded-xl shadow-md transition-all cursor-pointer min-h-[38px] flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              Add Customer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
