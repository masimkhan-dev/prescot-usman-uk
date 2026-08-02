import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  Gamepad2,
  Laptop,
  MapPin,
  MessageCircle,
  PackageCheck,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Star,
  Tablet,
  Truck,
  Wrench,
} from "lucide-react";
import { SiteLayout } from "@/components/site/Layout";
import { InstantPriceChecker } from "@/components/site/InstantPriceChecker";
import { BUSINESS } from "@/lib/business";
import { GOOGLE_PROOF, SITE_MEDIA } from "@/lib/site-content";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Prescot Mobiles & Computer Services | Device Repairs & Technology" },
      {
        name: "description",
        content:
          "Mobile, laptop, computer, tablet and gaming-console repair services in Prescot, Liverpool. Walk-in, door-to-door and mail-in enquiries, plus devices and accessories.",
      },
      { property: "og:title", content: "Prescot Mobiles & Computer Services" },
      {
        property: "og:description",
        content: "Professional device repairs, practical support and technology retail in Prescot.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
    ],
    links: [
      { rel: "canonical", href: "/" },
      { rel: "preload", as: "image", href: SITE_MEDIA.repairHero.src },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "@id": "https://prescotmobiles.co.uk/#business",
          name: BUSINESS.name,
          image: SITE_MEDIA.logo,
          telephone: BUSINESS.phone,
          email: BUSINESS.email,
          url: "/",
          address: {
            "@type": "PostalAddress",
            streetAddress: BUSINESS.addressLine,
            addressLocality: BUSINESS.city,
            postalCode: BUSINESS.postcode,
            addressCountry: "GB",
          },
          geo: {
            "@type": "GeoCoordinates",
            latitude: BUSINESS.geo.latitude,
            longitude: BUSINESS.geo.longitude,
          },
          openingHoursSpecification: BUSINESS.openingHoursSchema,
          areaServed: "Prescot, Merseyside, UK",
          priceRange: "££",
        }),
      },
    ],
  }),
  component: HomePage,
});

const services = [
  {
    icon: Smartphone,
    title: "Mobile repairs",
    text: "Support for damaged screens, battery and charging problems, software faults and more.",
    image: SITE_MEDIA.products.phone,
    link: "/mobile-phone-repair-prescot" as const,
  },
  {
    icon: Laptop,
    title: "Laptop & computer",
    text: "Hardware repairs, upgrades and practical help for home, work and study devices.",
    image: SITE_MEDIA.products.laptop,
    link: "/laptop-computer-repair-prescot" as const,
  },
  {
    icon: Gamepad2,
    title: "Gaming consoles",
    text: "PlayStation, Xbox and Nintendo repair enquiries, diagnosis and maintenance.",
    image: SITE_MEDIA.products.console,
    link: "/gaming-console-repair-prescot" as const,
  },
  {
    icon: Tablet,
    title: "Tablets & accessories",
    text: "Tablet support plus everyday charging, protection and technology essentials.",
    image: SITE_MEDIA.products.accessories,
    link: "/services" as const,
  },
];

const products = [
  { title: "Phones", text: "New, used and refurbished devices", image: SITE_MEDIA.products.phone },
  {
    title: "Laptops",
    text: "Technology for home, study and work",
    image: SITE_MEDIA.products.laptop,
  },
  {
    title: "Gaming",
    text: "Consoles, controllers and essentials",
    image: SITE_MEDIA.products.console,
  },
];

const methods = [
  {
    icon: MapPin,
    number: "01",
    title: "Walk-In",
    text: `Visit the team at ${BUSINESS.addressLine}, ${BUSINESS.city}.`,
    action: "Find the shop",
    href: BUSINESS.mapsDirections,
    external: true,
  },
  {
    icon: Truck,
    number: "02",
    title: "Door-to-Door",
    text: "Ask the team about available collection and return options.",
    action: "Ask on WhatsApp",
    href: BUSINESS.whatsappMessage(
      "Hi Prescot Mobiles, I'd like to ask about door-to-door service.",
    ),
    external: true,
  },
  {
    icon: PackageCheck,
    number: "03",
    title: "Mail-In",
    text: "Contact the team first to discuss the device and posting process.",
    action: "Start an enquiry",
    href: "/contact",
    external: false,
  },
];

function HomePage() {
  const scrollToQuote = () =>
    document.getElementById("price-checker")?.scrollIntoView({ behavior: "smooth" });

  return (
    <SiteLayout>
      <section className="section-pad bg-[#FAF7F2] py-8 lg:py-12">
        <div className="container-page">
          <div className="group relative overflow-hidden rounded-2xl border border-[#E2DAD0] bg-[#141414] shadow-xl transition duration-500">
            {/* Desktop Hero Layout */}
            <div className="relative hidden min-h-[580px] lg:flex lg:items-center">
              {/* Background Image Layer */}
              <div className="absolute inset-0 overflow-hidden">
                <img
                  src={SITE_MEDIA.repairHero.src}
                  alt={SITE_MEDIA.repairHero.alt}
                  width={SITE_MEDIA.repairHero.width}
                  height={SITE_MEDIA.repairHero.height}
                  fetchPriority="high"
                  className="h-full w-full object-cover object-right transition-transform duration-700 [@media(hover:hover)]:group-hover:scale-[1.015]"
                />
                {/* Restrained dark gradient overlay behind copy on the left */}
                <div
                  className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/90 to-transparent lg:w-[58%]"
                  aria-hidden="true"
                />
              </div>

              {/* Foreground Copy & CTAs */}
              <div className="relative z-10 max-w-2xl p-12 lg:p-16 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700">
                <p className="eyebrow !text-[#FF493D] !normal-case !tracking-[.06em]">
                  Technology support designed around care
                </p>
                <h1 className="hero-title mt-4 text-white">
                  <span className="block">Technology repaired</span>
                  <span className="block text-[#FF493D]">with precision.</span>
                </h1>
                <p className="mt-6 max-w-xl text-base leading-8 text-white/80 md:text-lg">
                  Mobile, laptop, computer, tablet and gaming repair services designed around clear
                  advice, quality and care.
                </p>
                <div className="hero-actions mt-8 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={scrollToQuote}
                    className="btn-primary min-h-12 !px-6 !text-base"
                  >
                    Get a Quote <ArrowRight className="h-4 w-4" />
                  </button>
                  <a
                    href={BUSINESS.whatsappMessage(
                      "Hi Prescot Mobiles, I'd like a device repair quote.",
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-whatsapp min-h-12 !px-6 !text-base"
                  >
                    <MessageCircle className="h-4 w-4" /> WhatsApp Us
                  </a>
                  <a
                    href={BUSINESS.phoneHref}
                    className="inline-flex min-h-12 items-center gap-2 px-3 text-base font-semibold text-white/90 underline-offset-4 hover:text-white hover:underline"
                  >
                    <Phone className="h-4 w-4" /> Call Now
                  </a>
                </div>
                <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/15 pt-6 text-xs font-semibold text-white/75">
                  <a
                    href="#visit"
                    className="group/link flex items-center gap-2 transition hover:text-white"
                  >
                    <img
                      src={SITE_MEDIA.shopfront.src}
                      alt=""
                      width={24}
                      height={24}
                      loading="lazy"
                      decoding="async"
                      className="h-6 w-6 rounded-full border border-white/20 object-cover object-center transition-transform duration-300 [@media(hover:hover)]:group-hover/link:scale-[1.1]"
                    />
                    <span>Visit us on Eccleston Street</span>
                  </a>
                  <span className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-[#FF493D]" /> Repairs & device retail
                  </span>
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#34D399]" /> Open 7 days
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile / Tablet Hero Layout */}
            <div className="flex flex-col lg:hidden">
              <div className="bg-[#141414] p-7 text-white sm:p-10">
                <p className="eyebrow !text-[#FF493D] !normal-case !tracking-[.06em]">
                  Technology support designed around care
                </p>
                <h1 className="hero-title mt-3 !text-3xl text-white sm:!text-4xl">
                  Technology repaired <span className="text-[#FF493D]">with precision.</span>
                </h1>
                <p className="mt-4 text-base leading-7 text-white/80">
                  Mobile, laptop, computer, tablet and gaming repair services designed around clear advice, quality and care.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={scrollToQuote}
                    className="btn-primary min-h-12 w-full justify-center !text-base sm:w-auto"
                  >
                    Get a Quote <ArrowRight className="h-4 w-4" />
                  </button>
                  <a
                    href={BUSINESS.whatsappMessage(
                      "Hi Prescot Mobiles, I'd like a device repair quote.",
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-whatsapp min-h-12 w-full justify-center !text-base sm:w-auto"
                  >
                    <MessageCircle className="h-4 w-4" /> WhatsApp Us
                  </a>
                  <a
                    href={BUSINESS.phoneHref}
                    className="btn-dark min-h-12 w-full justify-center !text-base sm:w-auto"
                  >
                    <Phone className="h-4 w-4" /> Call Now
                  </a>
                </div>
                <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2.5 border-t border-white/15 pt-5 text-xs font-semibold text-white/75">
                  <a href="#visit" className="flex items-center gap-2">
                    <img
                      src={SITE_MEDIA.shopfront.src}
                      alt=""
                      width={20}
                      height={20}
                      loading="lazy"
                      className="h-5 w-5 rounded-full border border-white/20 object-cover"
                    />
                    <span>Visit us on Eccleston Street</span>
                  </a>
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#34D399]" /> Open 7 days
                  </span>
                </div>
              </div>
              <div className="overflow-hidden border-t border-white/10">
                <img
                  src={SITE_MEDIA.repairHero.src}
                  alt={SITE_MEDIA.repairHero.alt}
                  width={SITE_MEDIA.repairHero.width}
                  height={SITE_MEDIA.repairHero.height}
                  fetchPriority="high"
                  className="aspect-[16/10] w-full object-cover object-[80%_center] sm:aspect-[21/9]"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-pad bg-white" id="services">
        <div className="container-page">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div className="max-w-3xl">
              <p className="eyebrow">Repair services</p>
              <h2 className="mt-4 text-4xl leading-tight md:text-6xl">
                Support for the technology you rely on.
              </h2>
            </div>
            <Link
              to="/services"
              className="flex min-h-11 items-center gap-2 text-sm font-bold text-[#D92D20]"
            >
              View all services <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {services.map((service, index) => (
              <Link
                key={service.title}
                to={service.link}
                className="group grid overflow-hidden rounded-xl border border-[#ECE8E1] bg-[#FAF7F2] transition duration-300 hover:-translate-y-1 hover:border-[#D8CEC2] hover:shadow-xl sm:grid-cols-[.8fr_1.2fr]"
              >
                <div className="overflow-hidden bg-white">
                  <img
                    src={service.image}
                    alt=""
                    width={600}
                    height={600}
                    loading="lazy"
                    sizes="(max-width: 767px) 100vw, 40vw"
                    className="h-full min-h-56 w-full object-cover mix-blend-multiply transition-transform duration-500 motion-safe:group-hover:scale-105"
                  />
                </div>
                <div className="flex min-h-72 flex-col p-7">
                  <div className="flex items-start justify-between">
                    <service.icon className="h-7 w-7 text-[#FF493D]" />
                    <span className="text-xs font-bold text-[#766D65]">0{index + 1}</span>
                  </div>
                  <h3 className="mt-10 text-3xl">{service.title}</h3>
                  <p className="mt-4 text-base leading-7 text-[#625B55]">{service.text}</p>
                  <span className="mt-auto flex items-center gap-2 pt-6 text-sm font-bold text-[#D92D20]">
                    Explore service{" "}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div id="price-checker">
        <InstantPriceChecker />
      </div>

      <section className="section-pad bg-white">
        <div className="container-page grid items-center gap-12 lg:grid-cols-[.85fr_1.15fr] lg:gap-20">
          <div>
            <p className="eyebrow">Technology retail</p>
            <h2 className="mt-4 text-4xl leading-tight md:text-5xl lg:text-6xl">
              Devices for work, play and everyday life.
            </h2>
            <p className="mt-6 text-base leading-7 text-[#625B55]">
              Explore phones, laptops, gaming technology and accessories. Contact the team to check
              current availability or request a specific device.
            </p>
            <Link
              to="/products"
              className="btn-primary mt-8 inline-flex min-h-12 items-center gap-2"
            >
              Browse All Products <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {products.map((item, index) => (
              <Link
                key={item.title}
                to="/products"
                className={`group overflow-hidden rounded-2xl border border-[#E7DED5] bg-[#FAF7F2] p-6 transition duration-300 hover:-translate-y-1 hover:shadow-xl ${index === 0 ? "sm:col-span-2" : ""}`}
              >
                <div className={`overflow-hidden rounded-xl bg-white ${index === 0 ? "h-64 sm:h-72" : "h-48"}`}>
                  <img
                    src={item.image}
                    alt=""
                    width={900}
                    height={700}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition duration-500 [@media(hover:hover)]:group-hover:scale-[1.03]"
                  />
                </div>
                <div className="mt-5 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="card-title text-2xl text-[#171717]">{item.title}</h3>
                    <p className="mt-1 text-sm text-[#625B55]">{item.text}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 shrink-0 text-[#FF493D] transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad bg-[#FAF7F2]">
        <div className="container-page">
          <p className="eyebrow">Ways to repair</p>
          <h2 className="mt-4 max-w-3xl text-4xl leading-tight md:text-6xl">
            Choose the service method that fits your day.
          </h2>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {methods.map((method) => (
              <article
                key={method.title}
                className="group flex min-h-[340px] flex-col rounded-xl border border-[#E2DAD0] bg-white p-8 transition duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="flex items-start justify-between">
                  <method.icon className="h-8 w-8 text-[#FF493D]" />
                  <span className="text-xs font-bold text-[#766D65]">{method.number}</span>
                </div>
                <h3 className="mt-14 text-4xl">{method.title}</h3>
                <p className="mt-4 text-base leading-7 text-[#625B55]">{method.text}</p>
                {method.external ? (
                  <a
                    href={method.href}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-auto flex min-h-11 items-center gap-2 pt-6 text-sm font-bold text-[#D92D20]"
                  >
                    {method.action} <ArrowRight className="h-4 w-4" />
                  </a>
                ) : (
                  <Link
                    to="/contact"
                    className="mt-auto flex min-h-11 items-center gap-2 pt-6 text-sm font-bold text-[#D92D20]"
                  >
                    {method.action} <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad bg-white">
        <div className="container-page grid gap-12 lg:grid-cols-2 lg:gap-24">
          <div className="rounded-xl bg-[#171717] p-8 text-white md:p-12">
            <p className="eyebrow !text-[#FF493D]">Professional support</p>
            <h2 className="mt-6 !text-white text-4xl leading-tight md:text-6xl">
              Clear advice before the next decision.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/70">
              Repair, replace or upgrade—start by explaining the problem. The team can help you
              understand the available route.
            </p>
            <Link
              to="/contact"
              className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#D92D20] px-5 font-bold text-white hover:bg-[#B42318]"
            >
              Start an enquiry <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="flex flex-col justify-center">
            <Feature
              icon={ShieldCheck}
              title="Clear diagnostics"
              text="Understand the reported problem and proposed next step before deciding."
            />
            <Feature
              icon={ShoppingBag}
              title="Buy, sell and exchange"
              text="Explore a different device route when repair is not the right option."
            />
            <Feature
              icon={MessageCircle}
              title="Human support"
              text="Call, WhatsApp or visit the shop to discuss what you need."
            />
          </div>
        </div>
      </section>

      <section className="section-pad bg-white" aria-labelledby="google-reviews-heading">
        <div className="container-page">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="eyebrow">Google reviews</p>
              <h2 id="google-reviews-heading" className="mt-4 text-4xl leading-tight md:text-6xl">
                Trusted by customers who needed technology working again.
              </h2>
            </div>
            <div className="shrink-0 md:text-right">
              <div className="flex gap-1 text-[#B15D00] md:justify-end" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} className="h-5 w-5 fill-current" />
                ))}
              </div>
              <strong className="mt-2 block text-lg text-[#171717]">
                Rated {GOOGLE_PROOF.rating} on Google
              </strong>
              <span className="text-sm text-[#625B55]">
                Based on {GOOGLE_PROOF.reviewCount} customer reviews
              </span>
            </div>
          </div>
          <div className="reviews-scroll mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 md:grid md:grid-cols-[1.2fr_.9fr_.9fr] md:overflow-visible md:pb-0">
            {GOOGLE_PROOF.reviews.map((review, index) => (
              <article
                key={review.name}
                className={`min-w-[86%] snap-center rounded-xl border border-[#E7DED5] p-7 sm:min-w-[70%] md:min-w-0 ${index === 0 ? "bg-[#171717] text-white md:p-10" : "bg-[#FAF7F2]"}`}
              >
                <div
                  className={`flex gap-1 ${index === 0 ? "text-[#FFB84D]" : "text-[#B15D00]"}`}
                  aria-label="5 stars"
                >
                  {Array.from({ length: 5 }).map((_, star) => (
                    <Star key={star} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <blockquote
                  className={`mt-8 font-display text-2xl leading-snug ${index === 0 ? "text-white md:text-3xl" : "text-[#171717]"}`}
                >
                  “{review.quote}”
                </blockquote>
                <p
                  className={`mt-8 text-sm font-bold ${index === 0 ? "text-white" : "text-[#403B36]"}`}
                >
                  {review.name}
                </p>
                <p className={`mt-1 text-xs ${index === 0 ? "text-white/65" : "text-[#625B55]"}`}>
                  Google review
                </p>
              </article>
            ))}
          </div>
          <a
            href={GOOGLE_PROOF.reviewsUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#D92D20]"
          >
            Read Google Reviews <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      <section className="section-pad bg-[#FAF7F2]" id="visit">
        <div className="container-page">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-6 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700">
              <figure className="group overflow-hidden rounded-2xl border border-[#E2DAD0] bg-white shadow-sm transition duration-300">
                <div className="overflow-hidden">
                  <img
                    src={SITE_MEDIA.shopfront.src}
                    alt={SITE_MEDIA.shopfront.alt}
                    width={SITE_MEDIA.shopfront.width}
                    height={SITE_MEDIA.shopfront.height}
                    loading="lazy"
                    decoding="async"
                    className="aspect-[4/3] w-full object-cover object-center transition-transform duration-500 [@media(hover:hover)]:group-hover:scale-[1.02]"
                  />
                </div>
                <figcaption className="p-4 text-center text-xs text-[#625B55]">
                  {SITE_MEDIA.shopfront.caption}
                </figcaption>
              </figure>
            </div>
            <div className="flex flex-col justify-center lg:col-span-6">
              <p className="eyebrow">Visit & contact</p>
              <h2 className="mt-4 text-4xl leading-tight md:text-5xl lg:text-6xl">Visit Our Store</h2>
              <address className="mt-5 text-base not-italic leading-7 text-[#57504A]">
                {BUSINESS.fullAddress}
              </address>
              <div className="mt-6 border-t border-[#D8D0C6]">
                {BUSINESS.hours.map((item) => (
                  <div
                    key={item.day}
                    className="flex justify-between gap-5 border-b border-[#D8D0C6] py-2.5 text-sm"
                  >
                    <span>{item.day}</span>
                    <strong className="text-[#171717]">{item.time}</strong>
                  </div>
                ))}
              </div>
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <a href={BUSINESS.phoneHref} className="btn-dark min-h-12 w-full justify-center">
                  <Phone className="h-4 w-4" /> Call
                </a>
                <a
                  href={BUSINESS.whatsappMessage("Hi Prescot Mobiles, I need help with a device.")}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-whatsapp min-h-12 w-full justify-center"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
                <a
                  href={BUSINESS.mapsDirections}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-outline min-h-12 w-full justify-center"
                >
                  <MapPin className="h-4 w-4" /> Directions
                </a>
              </div>
            </div>
          </div>
          <div className="mt-12 overflow-hidden rounded-2xl border border-[#E2DAD0] shadow-sm">
            <iframe
              title="Prescot Mobiles location map"
              src={BUSINESS.mapsEmbed}
              className="h-[320px] w-full border-0 md:h-[400px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

function Feature({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof ShieldCheck;
  title: string;
  text: string;
}) {
  return (
    <div className="grid grid-cols-[48px_1fr] gap-5 border-t border-[#E2DAD0] py-7">
      <Icon className="h-8 w-8 text-[#FF493D]" />
      <div>
        <h3 className="text-2xl">{title}</h3>
        <p className="mt-2 text-base leading-7 text-[#625B55]">{text}</p>
      </div>
    </div>
  );
}
