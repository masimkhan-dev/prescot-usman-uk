import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Settings, Save, Store, Shield, Receipt, CheckCircle2 } from "lucide-react";
import { BUSINESS } from "@/lib/business";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  component: DashboardSettingsPage,
});

function DashboardSettingsPage() {
  const [storeName, setStoreName] = useState(BUSINESS.name);
  const [address, setAddress] = useState(BUSINESS.fullAddress);
  const [phone, setPhone] = useState(BUSINESS.phone);
  const [email, setEmail] = useState(BUSINESS.email);
  const [receiptFooter, setReceiptFooter] = useState("Thank you for choosing Prescot Mobiles & Computer Services! 12-Month Warranty on eligible repairs.");
  const [vatNumber, setVatNumber] = useState("");
  const [companyNumber, setCompanyNumber] = useState("");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Store settings updated successfully.");
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#0F172A] flex items-center gap-2">
          <Settings className="w-6 h-6 text-[#E11D48]" /> Retail Store Settings
        </h1>
        <p className="text-xs text-[#64748B] mt-1">
          Manage store business information, receipt headers, and default retail preferences.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="card-flat space-y-4">
          <h2 className="text-base font-extrabold text-[#0F172A] flex items-center gap-2 border-b border-slate-100 pb-3">
            <Store className="w-4 h-4 text-[#E11D48]" /> Business Details & Location
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Trading Name</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#E11D48] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#E11D48] outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Store Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#E11D48] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Contact Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#E11D48] outline-none"
              />
            </div>
          </div>
        </div>

        <div className="card-flat space-y-4">
          <h2 className="text-base font-extrabold text-[#0F172A] flex items-center gap-2 border-b border-slate-100 pb-3">
            <Receipt className="w-4 h-4 text-[#E11D48]" /> POS Receipt Preferences
          </h2>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Receipt Footer Notice</label>
            <textarea
              rows={3}
              value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#E11D48] outline-none"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">VAT Reg. Number (if applicable)</label>
              <input
                type="text"
                placeholder="GB 123 4567 89"
                value={vatNumber}
                onChange={(e) => setVatNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#E11D48] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Company Reg. Number (if applicable)</label>
              <input
                type="text"
                placeholder="UK 12345678"
                value={companyNumber}
                onChange={(e) => setCompanyNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#E11D48] outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary !py-2.5 !px-6 !text-xs">
            <Save className="w-4 h-4" /> Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}
