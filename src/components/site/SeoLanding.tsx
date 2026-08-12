import { Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  MapPin,
  MessageCircle,
  Phone,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { SiteLayout } from "@/components/site/Layout";
import { BUSINESS } from "@/lib/business";
import {
  WhyChooseUs,
  BrandsWeRepair,
  RepairProcess,
  WarrantyBanner,
  FAQSection,
} from "@/components/site/Sections";

export interface SeoLandingProps {
  Icon: LucideIcon;
  eyebrow: string;
  h1: string;
  intro: string;
  services: string[];
  whatsappMessage: string;
  showBrands?: boolean;
}

export function SeoLanding({
  Icon,
  eyebrow,
  h1,
  intro,
  services,
  whatsappMessage,
  showBrands = true,
}: SeoLandingProps) {
  return (
    <SiteLayout>
      <section className="bg-surface border-b border-border">
        <div className="container-page py-16 md:py-20 grid lg:grid-cols-[1fr_auto] gap-8 items-center">
          <div>
            <span className="eyebrow">{eyebrow}</span>
            <h1 className="mt-3 text-4xl md:text-5xl font-bold text-ink max-w-3xl">{h1}</h1>
            <p className="mt-4 text-muted-foreground max-w-2xl">{intro}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={BUSINESS.phoneHref} className="btn-primary">
                <Phone className="w-4 h-4" /> Call {BUSINESS.phone}
              </a>
              <a
                href={BUSINESS.whatsappMessage(whatsappMessage)}
                target="_blank"
                rel="noreferrer"
                className="btn-whatsapp"
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp Us
              </a>
              <Link to="/contact" className="btn-outline">
                Get a Quote <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 text-brand" /> {BUSINESS.fullAddress}
            </div>
          </div>
          <div className="hidden lg:flex w-56 h-56 rounded-3xl bg-brand/10 border border-border items-center justify-center">
            <Icon className="w-24 h-24 text-brand" />
          </div>
        </div>
      </section>

      <section className="section-pad">
        <div className="container-page">
          <div className="max-w-2xl">
            <span className="eyebrow">What we fix</span>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold text-ink">
              Common repairs & services
            </h2>
          </div>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {services.map((s) => (
              <div
                key={s}
                className="flex items-start gap-3 rounded-xl bg-background border border-border p-4"
              >
                <CheckCircle2 className="w-5 h-5 text-brand mt-0.5 shrink-0" />
                <span className="text-sm font-medium text-ink">{s}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <RepairProcess />
      <WarrantyBanner />
      <WhyChooseUs />
      {showBrands && <BrandsWeRepair />}
      <FAQSection />
    </SiteLayout>
  );
}
