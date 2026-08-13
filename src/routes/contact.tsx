import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Phone, Mail, MapPin, MessageCircle, Clock, Send, CheckCircle2 } from "lucide-react";
import { SiteLayout } from "@/components/site/Layout";
import { BUSINESS, SITE_URL } from "@/lib/business";
import { SITE_MEDIA } from "@/lib/site-content";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact & Get a Quote | Prescot Mobiles & Computer Services" },
      {
        name: "description",
        content:
          "Get in touch with Prescot Mobiles by phone, WhatsApp, email or online form. Walk-in, door-to-door and mail-in repair quotes.",
      },
      { property: "og:title", content: "Contact Prescot Mobiles | Prescot, Merseyside" },
      {
        property: "og:description",
        content: "Call, WhatsApp or send us an enquiry — we'll respond quickly with a fair quote.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/contact` },
      { property: "og:image", content: `${SITE_URL}/site-assets/prescot-shopfront.webp` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `${SITE_URL}/site-assets/prescot-shopfront.webp` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/contact` }],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    device: "",
    brand: "",
    service: "Mobile Repair",
    method: "Walk-In",
    message: "",
  });
  const [sent, setSent] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const msg = `New enquiry from ${form.name}%0A%0APhone: ${form.phone}%0ADevice: ${form.device}%0ABrand/Model: ${form.brand}%0AService: ${form.service}%0AMethod: ${form.method}%0A%0AIssue: ${form.message}`;
    window.open(`${BUSINESS.whatsappHref}?text=${msg}`, "_blank");
    setSent(true);
  }

  return (
    <SiteLayout>
      <section className="bg-surface border-b border-border">
        <div className="container-page py-16 md:py-20">
          <span className="eyebrow">Get in touch</span>
          <h1 className="mt-3 text-4xl md:text-5xl font-bold text-ink max-w-3xl">
            Get a quote in minutes — however suits you best.
          </h1>
          <p className="mt-4 text-muted-foreground max-w-2xl">
            Call us, WhatsApp us, drop us an email — or fill in the short enquiry form and we'll
            come back to you fast.
          </p>
        </div>
      </section>

      <section className="section-pad">
        <div className="container-page grid lg:grid-cols-5 gap-10">
          <div className="lg:col-span-2 space-y-4">
            <a
              href={BUSINESS.phoneHref}
              className="card-soft flex items-center gap-4 hover:!border-brand"
            >
              <div className="w-12 h-12 rounded-xl bg-brand text-white flex items-center justify-center">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Call us
                </div>
                <div className="text-ink font-semibold">{BUSINESS.phone}</div>
              </div>
            </a>
            <a
              href={BUSINESS.whatsappMessage("Hi Prescot Mobiles, I'd like a quote.")}
              target="_blank"
              rel="noreferrer"
              className="card-soft flex items-center gap-4 hover:!border-brand"
            >
              <div className="w-12 h-12 rounded-xl bg-[#087A3E] text-white flex items-center justify-center">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  WhatsApp
                </div>
                <div className="text-ink font-semibold">{BUSINESS.whatsapp}</div>
              </div>
            </a>
            <a
              href={BUSINESS.emailHref}
              className="card-soft flex items-center gap-4 hover:!border-brand"
            >
              <div className="w-12 h-12 rounded-xl bg-ink text-white flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Email</div>
                <div className="text-ink font-semibold">{BUSINESS.email}</div>
              </div>
            </a>
            <div className="card-soft overflow-hidden !p-0">
              <div className="overflow-hidden">
                <img
                  src={SITE_MEDIA.shopfront.src}
                  alt={SITE_MEDIA.shopfront.alt}
                  width={SITE_MEDIA.shopfront.width}
                  height={SITE_MEDIA.shopfront.height}
                  loading="lazy"
                  decoding="async"
                  className="aspect-[16/10] w-full object-cover object-center transition-transform duration-500 hover:scale-[1.02]"
                />
              </div>
              <div className="p-6">
                <figcaption className="mb-4 text-xs text-muted-foreground border-b border-border pb-3">
                  {SITE_MEDIA.shopfront.caption}
                </figcaption>
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-brand shrink-0" />
                  <div className="font-semibold text-ink">{BUSINESS.fullAddress}</div>
                </div>
                <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                  {BUSINESS.hours.map((h) => (
                    <div key={h.day} className="flex justify-between">
                      <span className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-brand" />
                        {h.day}
                      </span>
                      <span>{h.time}</span>
                    </div>
                  ))}
                </div>
                <a
                  href={BUSINESS.mapsDirections}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-outline mt-5 w-full justify-center"
                >
                  <MapPin className="w-4 h-4" /> Get Directions
                </a>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            {sent ? (
              <div className="card-soft text-center py-16">
                <CheckCircle2 className="w-14 h-14 text-brand mx-auto" />
                <h2 className="mt-4 text-2xl font-bold text-ink">
                  Thanks — your message is ready!
                </h2>
                <p className="mt-2 text-muted-foreground">
                  We've opened WhatsApp with your enquiry pre-filled. Just tap send and we'll reply
                  shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={submit} className="card-soft space-y-4">
                <h2 className="text-2xl font-bold text-ink">Quick enquiry form</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field
                    label="Your name"
                    value={form.name}
                    onChange={(v) => setForm({ ...form, name: v })}
                    required
                  />
                  <Field
                    label="Phone number"
                    value={form.phone}
                    onChange={(v) => setForm({ ...form, phone: v })}
                    required
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field
                    label="Device (e.g. iPhone, Laptop)"
                    value={form.device}
                    onChange={(v) => setForm({ ...form, device: v })}
                  />
                  <Field
                    label="Brand / Model"
                    value={form.brand}
                    onChange={(v) => setForm({ ...form, brand: v })}
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Select
                    label="Service"
                    value={form.service}
                    onChange={(v) => setForm({ ...form, service: v })}
                    options={[
                      "Mobile Repair",
                      "Laptop / Computer Repair",
                      "Gaming Repair",
                      "Buy a Product",
                      "Sell my Device",
                      "Other",
                    ]}
                  />
                  <Select
                    label="Preferred method"
                    value={form.method}
                    onChange={(v) => setForm({ ...form, method: v })}
                    options={["Walk-In", "Door-to-Door", "Mail-In"]}
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-ink">Describe the issue</label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    rows={4}
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-base focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    placeholder="Tell us what happened..."
                  />
                </div>
                <button type="submit" className="btn-primary w-full">
                  <Send className="w-4 h-4" /> Send Enquiry via WhatsApp
                </button>
                <p className="text-xs text-muted-foreground text-center">
                  We'll open WhatsApp with your details pre-filled. You can also call or email us
                  directly.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="container-page">
          <div className="rounded-3xl overflow-hidden border border-border shadow-xl">
            <iframe
              title="Map to Prescot Mobiles"
              src={BUSINESS.mapsEmbed}
              className="w-full h-[420px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-ink">
        {label}
        {required && " *"}
      </label>
      <input
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-base focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-ink">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 text-base focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
