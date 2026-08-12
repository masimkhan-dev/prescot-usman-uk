import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Smartphone,
  Laptop,
  Gamepad2,
  MessageCircle,
  Phone,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { SiteLayout } from "@/components/site/Layout";
import { BUSINESS } from "@/lib/business";
import {
  WhyChooseUs,
  BrandsWeRepair,
  WarrantyBanner,
  FAQSection,
  RepairProcess,
} from "@/components/site/Sections";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Repair Services — Mobile, Laptop & Gaming | Prescot Mobiles" },
      {
        name: "description",
        content:
          "Expert mobile, laptop, computer and gaming console repairs in Prescot. Screens, batteries, ports, water damage and more. Warranty on repairs.",
      },
      { property: "og:title", content: "Repair Services | Prescot Mobiles" },
      {
        property: "og:description",
        content:
          "Mobile, laptop and gaming repairs in Prescot — walk-in, door-to-door and mail-in.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/services" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/services" }],
  }),
  component: ServicesPage,
});

const categories = [
  {
    icon: Smartphone,
    title: "Mobile Phone Repairs",
    id: "mobile",
    items: [
      "Screen Replacement",
      "Battery Replacement",
      "Charging Port Repair",
      "Camera Repair",
      "Speaker & Microphone Repair",
      "Water Damage Assistance",
      "Software & iCloud/Google issues",
    ],
  },
  {
    icon: Laptop,
    title: "Laptop & Computer Repairs",
    id: "computer",
    items: [
      "Laptop & Desktop Repairs",
      "Screen Replacement",
      "Keyboard Replacement",
      "Battery Replacement",
      "Windows / macOS Software Issues",
      "Hardware Troubleshooting",
      "SSD & RAM Upgrades",
    ],
  },
  {
    icon: Gamepad2,
    title: "Gaming Repairs",
    id: "gaming",
    items: [
      "PlayStation Repairs (PS4 / PS5)",
      "Xbox Repairs (One / Series X|S)",
      "Nintendo Switch Repairs",
      "HDMI / Port Repairs",
      "Controller Repairs",
      "Overheating & Fan Cleaning",
    ],
  },
];

function ServicesPage() {
  return (
    <SiteLayout>
      <section className="bg-surface border-b border-border">
        <div className="container-page py-16 md:py-20">
          <span className="eyebrow">Our services</span>
          <h1 className="mt-3 text-4xl md:text-5xl font-bold text-ink max-w-3xl">
            Fast, honest repairs on the devices you use every day.
          </h1>
          <p className="mt-4 text-muted-foreground max-w-2xl">
            From cracked screens to console HDMI ports, our technicians in Prescot handle it all.
            Walk-in, door-to-door or mail-in — you choose.
          </p>
        </div>
      </section>

      <section className="section-pad">
        <div className="container-page grid gap-8 lg:grid-cols-3">
          {categories.map((c) => (
            <div key={c.id} id={c.id} className="card-soft flex flex-col">
              <div className="w-14 h-14 rounded-2xl bg-brand text-white flex items-center justify-center">
                <c.icon className="w-7 h-7" />
              </div>
              <h2 className="mt-5 text-2xl font-bold text-ink">{c.title}</h2>
              <ul className="mt-4 space-y-2.5 flex-1">
                {c.items.map((i) => (
                  <li key={i} className="flex gap-2 text-sm text-ink/85">
                    <CheckCircle2 className="w-4 h-4 text-brand mt-0.5 shrink-0" />
                    {i}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-col gap-2">
                <a
                  href={BUSINESS.whatsappMessage(`Hi, I'd like a quote for ${c.title}.`)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-whatsapp"
                >
                  <MessageCircle className="w-4 h-4" /> Enquire on WhatsApp
                </a>
                <Link to="/contact" className="btn-outline">
                  Get a Quote <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <RepairProcess />
      <WarrantyBanner />
      <WhyChooseUs />
      <BrandsWeRepair />
      <FAQSection />

      <section className="section-pad">
        <div className="container-page rounded-3xl bg-ink text-white p-10 md:p-14 flex flex-wrap items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">
              Not sure what's wrong with your device?
            </h2>
            <p className="mt-2 text-white/70">
              Send us a message — we'll diagnose and give you a fair quote.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href={BUSINESS.phoneHref} className="btn-primary">
              <Phone className="w-4 h-4" /> Call Now
            </a>
            <a
              href={BUSINESS.whatsappMessage("Hi, I need help diagnosing my device.")}
              target="_blank"
              rel="noreferrer"
              className="btn-whatsapp"
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </a>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
