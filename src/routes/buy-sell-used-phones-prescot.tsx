import { createFileRoute, Link } from "@tanstack/react-router";
import { Smartphone, MessageCircle, Phone, MapPin, ArrowRight, CheckCircle2 } from "lucide-react";
import { SiteLayout } from "@/components/site/Layout";
import { BUSINESS } from "@/lib/business";
import { WhyChooseUs, FAQSection } from "@/components/site/Sections";

export const Route = createFileRoute("/buy-sell-used-phones-prescot")({
  head: () => ({
    meta: [
      { title: "Buy & Sell Used Phones in Prescot | New, Used & Refurbished" },
      { name: "description", content: "Buy new, used and refurbished mobile phones in Prescot — iPhone, Samsung, Pixel and more. We also buy your old phone. Fair prices, honest advice." },
      { property: "og:title", content: "Buy & Sell Used Phones in Prescot" },
      { property: "og:description", content: "New, used and refurbished phones for sale in Prescot. We also buy your old phone for cash." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/buy-sell-used-phones-prescot" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/buy-sell-used-phones-prescot" }],
  }),
  component: Page,
});

const buyPoints = [
  "Grade A refurbished iPhones & Samsungs",
  "Unlocked handsets — all networks",
  "Warranty on refurbished devices",
  "Trade-in against a new phone",
];

const sellPoints = [
  "Instant in-store cash offer",
  "Fair prices for working & broken phones",
  "Safe data wipe before resale",
  "No obligation — bring it in for a quote",
];

function Page() {
  return (
    <SiteLayout>
      <section className="bg-surface border-b border-border">
        <div className="container-page py-16 md:py-20">
          <span className="eyebrow">Buy & sell • Prescot</span>
          <h1 className="mt-3 text-4xl md:text-5xl font-bold text-ink max-w-3xl">
            Buy and sell mobile phones in Prescot.
          </h1>
          <p className="mt-4 text-muted-foreground max-w-2xl">
            New, used and refurbished phones at honest local prices — and cash offers if you're selling. Pop into our shop on Eccleston Street or WhatsApp us for the latest stock.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={BUSINESS.phoneHref} className="btn-primary">
              <Phone className="w-4 h-4" /> Call {BUSINESS.phone}
            </a>
            <a
              href={BUSINESS.whatsappMessage("Hi, I'd like to buy / sell a phone. Please share details.")}
              target="_blank" rel="noreferrer" className="btn-whatsapp"
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp Us
            </a>
            <Link to="/products" className="btn-outline">
              Browse stock <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 text-brand" /> {BUSINESS.fullAddress}
          </div>
        </div>
      </section>

      <section className="section-pad">
        <div className="container-page grid md:grid-cols-2 gap-6">
          <div className="card-soft">
            <div className="w-12 h-12 rounded-xl bg-brand text-white flex items-center justify-center">
              <Smartphone className="w-6 h-6" />
            </div>
            <h2 className="mt-4 text-2xl font-bold text-ink">Buying a phone</h2>
            <ul className="mt-4 space-y-2.5">
              {buyPoints.map((p) => (
                <li key={p} className="flex gap-2 text-sm text-ink/85">
                  <CheckCircle2 className="w-4 h-4 text-brand mt-0.5 shrink-0" /> {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="card-soft">
            <div className="w-12 h-12 rounded-xl bg-ink text-white flex items-center justify-center">
              <Smartphone className="w-6 h-6" />
            </div>
            <h2 className="mt-4 text-2xl font-bold text-ink">Selling your phone</h2>
            <ul className="mt-4 space-y-2.5">
              {sellPoints.map((p) => (
                <li key={p} className="flex gap-2 text-sm text-ink/85">
                  <CheckCircle2 className="w-4 h-4 text-brand mt-0.5 shrink-0" /> {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <WhyChooseUs />
      <FAQSection />
    </SiteLayout>
  );
}
