import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSettings, saveSettings } from "@/lib/settings.functions";
import { toastSuccess, toastError } from "@/lib/toast";
import { PageHelpButton, isTrainingModeEnabled, setTrainingModeEnabled } from "@/components/dashboard/PageHelpButton";
import { Settings, Save, Store, Receipt, ShieldAlert, Shield, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  component: DashboardSettingsPage,
});

function DashboardSettingsPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const getSettingsFn = useServerFn(getSettings);
  const saveSettingsFn = useServerFn(saveSettings);

  const [trainingMode, setTrainingMode] = useState<boolean>(isTrainingModeEnabled());

  const { data: settings, isLoading } = useQuery({
    queryKey: ["store-settings"],
    queryFn: () => getSettingsFn(),
    staleTime: 1000 * 60 * 10, // 10 mins cache
  });

  const [formData, setFormData] = useState({
    business_name: "",
    address_line: "",
    email: "",
    phone: "",
    whatsapp: "",
    vat_registered: "false",
    vat_number: "",
    vat_rate_percent: "",
    company_number: "",
    default_warranty_days: "",
    allow_negative_stock: "false",
    require_adj_approval: "true",
    door_to_door_charge_pence: "0",
    receipt_footer: "",
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        business_name: settings.business_name || "Prescot Mobiles & Computers Services",
        address_line: settings.address_line || "57 Eccleston Street, Prescot L34 5QH",
        email: settings.email || "precotmobiles2026@gmail.com",
        phone: settings.phone || "+44 7479 385163",
        whatsapp: settings.whatsapp || "+44 7479 385163",
        vat_registered: settings.vat_registered || "false",
        vat_number: settings.vat_number || "",
        vat_rate_percent: settings.vat_rate_percent || "",
        company_number: settings.company_number || "",
        default_warranty_days: settings.default_warranty_days || "",
        allow_negative_stock: settings.allow_negative_stock || "false",
        require_adj_approval: settings.require_adj_approval || "true",
        door_to_door_charge_pence: settings.door_to_door_charge_pence || "0",
        receipt_footer: settings.receipt_footer || "Thank you for choosing Prescot Mobiles!",
      });
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: (patch: typeof formData) => saveSettingsFn({ data: patch }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-settings"] });
      toastSuccess("Store settings updated successfully.");
    },
    onError: (err: Error) => {
      toastError(err, "Failed to save settings");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const handleChange = (key: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  function handleToggleTrainingMode() {
    const next = !trainingMode;
    setTrainingMode(next);
    setTrainingModeEnabled(next);
    toastSuccess(`Automatic page training hints turned ${next ? "ON" : "OFF"}.`);
  }

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-destructive mx-auto" />
        <h2 className="text-xl font-bold text-ink">Access Restricted</h2>
        <p className="text-sm text-muted-foreground">
          Only store administrators can modify store settings.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-7 h-7 animate-spin text-brand" />
      </div>
    );
  }

  const inputCls =
    "w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-xs font-semibold text-foreground focus:bg-card focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none transition-all";
  const labelCls = "block text-xs font-bold text-foreground mb-1";

  return (
    <div className="db-page max-w-4xl space-y-6">
      <div className="db-page-header">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-brand" />
          <h1 className="db-page-title">Retail Store Settings</h1>
          <PageHelpButton
            pageTitle="Settings"
            pageKey="settings"
            steps={[
              "Use this page for business-level defaults and configuration.",
              "Toggle automatic page training tips ON/OFF.",
              "Changes affect future records; finalized historical records remain intact.",
            ]}
            firstTimeTip="Tip: Use Settings to configure store information and training tip preferences."
          />
        </div>
        <p className="db-page-subtitle">
          Manage store details, tax configuration, receipt preferences, and operational rules.
        </p>
      </div>

      {/* Training Tips Preferences Card */}
      <div className="db-card p-4 flex items-center justify-between gap-4 bg-brand/5 border-brand/20">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-brand shrink-0" />
          <div>
            <h3 className="font-bold text-xs text-foreground">Interactive Training & Help Hints</h3>
            <p className="text-[11px] text-muted-foreground">
              Show one-time introductory hints when visiting major ERP pages.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleToggleTrainingMode}
          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
            trainingMode
              ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
              : "bg-muted text-muted-foreground border-border"
          }`}
        >
          {trainingMode ? "Training Mode: ON" : "Training Mode: OFF"}
        </button>
      </div>

      {/* Notice Banner */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-1">
        <div className="font-bold flex items-center gap-1.5 text-amber-950">
          ⚠️ Owner Confirmation Items Required
        </div>
        <p>
          VAT status, default warranty period, and door-to-door collection charges are marked as
          unconfirmed until set below. Please configure these before printing live invoices.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Business Details */}
        <div className="db-card space-y-4">
          <h2 className="db-card-title flex items-center gap-2">
            <Store className="w-3.5 h-3.5 text-brand" /> Store & Business Information
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelCls}>Trading Name</label>
              <input
                type="text"
                value={formData.business_name}
                onChange={(e) => handleChange("business_name", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Store Address</label>
              <input
                type="text"
                value={formData.address_line}
                onChange={(e) => handleChange("address_line", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Contact Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>WhatsApp Number</label>
              <input
                type="text"
                value={formData.whatsapp}
                onChange={(e) => handleChange("whatsapp", e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* VAT */}
        <div className="db-card space-y-4">
          <h2 className="db-card-title flex items-center gap-2">
            <Receipt className="w-3.5 h-3.5 text-brand" /> VAT & Registration
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelCls}>VAT Registered?</label>
              <select
                value={formData.vat_registered}
                onChange={(e) => handleChange("vat_registered", e.target.value)}
                className={inputCls}
              >
                <option value="false">No (Not Registered)</option>
                <option value="true">Yes (VAT Registered)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>VAT Number</label>
              <input
                type="text"
                placeholder="GB 123 4567 89"
                value={formData.vat_number}
                onChange={(e) => handleChange("vat_number", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>VAT Rate (%)</label>
              <input
                type="number"
                placeholder="20"
                value={formData.vat_rate_percent}
                onChange={(e) => handleChange("vat_rate_percent", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Companies House Number</label>
              <input
                type="text"
                placeholder="UK 12345678"
                value={formData.company_number}
                onChange={(e) => handleChange("company_number", e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* Operational Controls */}
        <div className="db-card space-y-4">
          <h2 className="db-card-title flex items-center gap-2">
            <Settings className="w-3.5 h-3.5 text-brand" /> ERP Operational Controls
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelCls}>Default Warranty Days</label>
              <input
                type="number"
                placeholder="e.g. 90 or 365"
                value={formData.default_warranty_days}
                onChange={(e) => handleChange("default_warranty_days", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Door-to-Door Charge in Pence</label>
              <input
                type="number"
                placeholder="0"
                value={formData.door_to_door_charge_pence}
                onChange={(e) => handleChange("door_to_door_charge_pence", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Require Manager Approval for Stock Adjustments?</label>
              <select
                value={formData.require_adj_approval}
                onChange={(e) => handleChange("require_adj_approval", e.target.value)}
                className={inputCls}
              >
                <option value="true">Yes (Admin approval required)</option>
                <option value="false">No (Staff can adjust)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Allow Negative Stock?</label>
              <select
                value={formData.allow_negative_stock}
                onChange={(e) => handleChange("allow_negative_stock", e.target.value)}
                disabled
                className={`${inputCls} opacity-50 cursor-not-allowed`}
              >
                <option value="false">No (Strict database CHECK enforcement active)</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Receipt Footer Notice</label>
            <textarea
              rows={3}
              value={formData.receipt_footer}
              onChange={(e) => handleChange("receipt_footer", e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        {/* Repair & Warranty Templates */}
        <div className="db-card space-y-4">
          <h2 className="db-card-title flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-brand" /> Repair Warranty Templates & Defaults
          </h2>
          <p className="text-xs text-muted-foreground">
            Centralized warranty templates for screens, batteries, small parts, and liquid damage treatment. Templates supply default days and policy text; individual repair tickets maintain independent snapshots.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { title: "Standard Screen", days: "90 Days", cat: "Display" },
              { title: "Premium Screen", days: "180 Days", cat: "OLED / High Quality" },
              { title: "Original / Genuine Screen", days: "365 Days", cat: "Genuine Service Pack" },
              { title: "Battery Replacement", days: "90 Days", cat: "Capacity & Power" },
              { title: "Charging Port Repair", days: "90 Days", cat: "Soldering & Flex" },
              { title: "Camera Replacement", days: "90 Days", cat: "Lens & Sensor" },
              { title: "Logic Board Repair", days: "30 Days", cat: "Microsoldering" },
              { title: "Liquid Damage Treatment", days: "0 Days", cat: "Diagnostic Only" },
              { title: "Customer Supplied Part", days: "90 Days", cat: "Workmanship Only" },
            ].map((t) => (
              <div key={t.title} className="p-3 bg-muted/30 border border-border rounded-xl space-y-1 text-xs">
                <div className="font-bold text-foreground flex items-center justify-between">
                  <span>{t.title}</span>
                  <span className="px-2 py-0.5 rounded-full bg-brand/10 text-brand text-[10px]">{t.days}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">{t.cat}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="btn-primary !py-2.5 !px-6 !text-xs flex items-center gap-2 cursor-pointer"
          >
            {mutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Store Settings
          </button>
        </div>
      </form>
    </div>
  );
}
