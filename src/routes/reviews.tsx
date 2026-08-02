import { createFileRoute, Link } from "@tanstack/react-router";
import { Star, ArrowRight } from "lucide-react";
import { SiteLayout } from "@/components/site/Layout";

export const Route = createFileRoute("/reviews")({
  head: () => ({
    meta: [
      { title: "Customer Reviews | Prescot Mobiles & Computer Services" },
      { name: "description", content: "Read what customers in Prescot and Merseyside say about our mobile, laptop and gaming repair services." },
      { property: "og:title", content: "Reviews — Prescot Mobiles" },
      { property: "og:description", content: "Real reviews from local customers of Prescot Mobiles & Computer Services." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/reviews" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/reviews" }],
  }),
  component: ReviewsPage,
});

const reviews = [
  { name: "Sarah W.", text: "Fixed my iPhone screen in under an hour. Friendly staff and fair price. Highly recommend to anyone in Prescot.", rating: 5, service: "iPhone screen replacement" },
  { name: "James P.", text: "Sorted my PS5 HDMI port when others said it wasn't worth repairing. Absolute lifesavers.", rating: 5, service: "PS5 repair" },
  { name: "Aisha K.", text: "Bought a refurbished Galaxy from them — looks and works like new. Great local shop.", rating: 5, service: "Refurbished phone" },
  { name: "Mark T.", text: "My laptop was running so slow. They upgraded the SSD and it's like a brand new machine. Cheers!", rating: 5, service: "Laptop upgrade" },
  { name: "Emma R.", text: "Mail-in repair worked perfectly. Sent my Pixel off Monday, back by Friday all fixed.", rating: 5, service: "Mail-in repair" },
  { name: "David H.", text: "Honest advice — they told me a repair wasn't worth it and helped me pick a used replacement instead. Rare these days.", rating: 5, service: "Consultation" },
];

function ReviewsPage() {
  return (
    <SiteLayout>
      <section className="bg-surface border-b border-border">
        <div className="container-page py-16 md:py-20 text-center">
          <span className="eyebrow">Customer reviews</span>
          <h1 className="mt-3 text-4xl md:text-5xl font-bold text-ink">Trusted by locals in Prescot & Merseyside.</h1>
          <div className="mt-6 flex items-center justify-center gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="w-6 h-6 text-brand fill-brand" />
            ))}
            <span className="ml-2 text-lg font-bold text-ink">5.0</span>
            <span className="text-muted-foreground">· based on real customer feedback</span>
          </div>
        </div>
      </section>

      <section className="section-pad">
        <div className="container-page grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {reviews.map((r) => (
            <div key={r.name} className="card-soft">
              <div className="flex gap-1">
                {Array.from({ length: r.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-brand fill-brand" />
                ))}
              </div>
              <p className="mt-4 text-ink/90 leading-relaxed">"{r.text}"</p>
              <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
                <div className="text-sm font-semibold text-ink">— {r.name}</div>
                <div className="text-xs text-muted-foreground">{r.service}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="container-page mt-16 text-center">
          <p className="text-muted-foreground">Had a great experience? We'd love your review on Google.</p>
          <Link to="/contact" className="btn-primary mt-4">
            Contact us <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </SiteLayout>
  );
}
