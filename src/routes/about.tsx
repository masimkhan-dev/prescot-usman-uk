import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, Users, Wrench, Heart, Accessibility, MapPin, ArrowRight } from "lucide-react";
import { SiteLayout } from "@/components/site/Layout";
import { SITE_MEDIA } from "@/lib/site-content";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Prescot Mobiles & Computer Services | Local Repair Experts" },
      { name: "description", content: "A trusted, family-run mobile and computer repair shop on Eccleston Street, Prescot. Honest advice, quality parts and a warm welcome." },
      { property: "og:title", content: "About Prescot Mobiles" },
      { property: "og:description", content: "Trusted local mobile & computer repair specialists in Prescot, Merseyside." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/about" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: AboutPage,
});

const values = [
  { icon: Wrench, title: "Skilled technicians", desc: "Years of hands-on repair experience across every major brand." },
  { icon: Award, title: "Quality parts", desc: "We use tested, reliable components — with a warranty for peace of mind." },
  { icon: Heart, title: "Honest service", desc: "We only recommend repairs that make sense. No surprises, no upsell." },
  { icon: Users, title: "Local & friendly", desc: "Real people, real conversations — right on Eccleston Street." },
];

function AboutPage() {
  return (
    <SiteLayout>
      <section className="bg-surface border-b border-border">
        <div className="container-page py-16 md:py-20 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="eyebrow">Our story</span>
            <h1 className="mt-3 text-4xl md:text-5xl font-bold text-ink">
              Your friendly high-street tech shop in Prescot.
            </h1>
            <p className="mt-4 text-muted-foreground max-w-xl">
              Prescot Mobiles & Computer Services is a local independent shop repairing mobiles, laptops, computers and games consoles — and selling new, used and refurbished devices at fair prices.
            </p>
            <p className="mt-4 text-muted-foreground max-w-xl">
              We built this shop around a simple idea: give people honest advice, quick fixes and a proper local alternative to big-brand stores.
            </p>
          </div>
          <div className="rounded-3xl bg-white border border-border p-8 shadow-lg">
            <img src={SITE_MEDIA.logo} alt="Prescot Mobiles logo" className="w-full max-w-sm mx-auto" />
          </div>
        </div>
      </section>

      <section className="section-pad">
        <div className="container-page">
          <div className="max-w-2xl">
            <span className="eyebrow">What we stand for</span>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold text-ink">Values that guide every repair.</h2>
          </div>
          <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {values.map((v) => (
              <div key={v.title} className="card-soft">
                <div className="w-12 h-12 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                  <v.icon className="w-6 h-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-ink">{v.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad bg-surface">
        <div className="container-page grid lg:grid-cols-2 gap-8 items-center">
          <div className="rounded-2xl bg-ink text-white p-10">
            <Accessibility className="w-10 h-10 text-brand" />
            <h2 className="mt-4 text-2xl font-bold">Wheelchair accessible</h2>
            <p className="mt-3 text-white/70">
              Our shop entrance and service area are wheelchair accessible, so everyone can get the help they need.
            </p>
          </div>
          <div className="rounded-2xl bg-background border border-border p-10">
            <MapPin className="w-10 h-10 text-brand" />
            <h2 className="mt-4 text-2xl font-bold text-ink">Right on the high street</h2>
            <p className="mt-3 text-muted-foreground">
              Find us at 57 Eccleston Street, Prescot, L34 5QH — pop in any day of the week.
            </p>
            <Link to="/contact" className="btn-primary mt-6">
              Contact us <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
