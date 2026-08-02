import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Gamepad2,
  Laptop,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  PackageCheck,
  Phone,
  Quote,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Star,
  Tablet,
  Truck,
  Wrench,
  X,
} from "lucide-react";
import { BUSINESS } from "@/lib/business";
import "@/design-lab.css";

export const Route = createFileRoute("/design-lab")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Design Lab | Prescot Mobiles & Computer Services" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DesignLab,
});

type Direction = "motion" | "editorial" | "immersive";

const DIRECTIONS: Array<{ id: Direction; number: string; name: string; note: string }> = [
  { id: "motion", number: "01", name: "Precision Motion", note: "Bright · exact · energetic" },
  { id: "editorial", number: "02", name: "Editorial Commerce", note: "Warm · expressive · retail-led" },
  { id: "immersive", number: "03", name: "Immersive Digital", note: "Cinematic · confident · progressive" },
];

const SERVICES = [
  {
    icon: Smartphone,
    name: "Mobile repairs",
    detail: "Screens, batteries, charging ports and diagnostics for leading phone brands.",
    image: "/design-lab/product-phone.jpg",
  },
  {
    icon: Laptop,
    name: "Laptop & computer",
    detail: "Hardware repairs, upgrades and practical support for work and home devices.",
    image: "/design-lab/product-laptop.jpg",
  },
  {
    icon: Gamepad2,
    name: "Gaming consoles",
    detail: "PlayStation, Xbox and Nintendo repair enquiries, cleaning and fault diagnosis.",
    image: "/design-lab/product-console.jpg",
  },
  {
    icon: Tablet,
    name: "Tablet repairs",
    detail: "Help with damaged displays, charging faults and performance problems.",
    image: "/design-lab/product-accessories.jpg",
  },
];

const PRODUCTS = [
  { label: "Phones", image: "/design-lab/product-phone.jpg", copy: "New, used and refurbished devices" },
  { label: "Laptops", image: "/design-lab/product-laptop.jpg", copy: "Laptops for home, study and work" },
  { label: "Gaming", image: "/design-lab/product-console.jpg", copy: "Consoles, controllers and essentials" },
  { label: "Accessories", image: "/design-lab/product-accessories.jpg", copy: "Everyday charging and protection" },
];

const METHODS = [
  { icon: MapPin, index: "01", name: "Walk in", copy: "Visit us at 57 Eccleston Street, Prescot." },
  { icon: Truck, index: "02", name: "Door to door", copy: "Ask about collection and return options." },
  { icon: PackageCheck, index: "03", name: "Mail in", copy: "Contact the team before posting your device." },
];

const QUOTE_STEPS = [
  { label: "Device", title: "What needs attention?", options: ["Mobile phone", "Laptop or computer", "Tablet", "Gaming console"] },
  { label: "Issue", title: "What is happening?", options: ["Screen or display", "Battery or charging", "Performance or software", "Something else"] },
  { label: "Method", title: "How would you like service?", options: ["Walk in", "Door to door", "Mail in", "Help me choose"] },
];

function initialDirection(): Direction {
  const value = new URLSearchParams(window.location.search).get("direction");
  return value === "editorial" || value === "immersive" ? value : "motion";
}

function DesignLab() {
  const [direction, setDirection] = useState<Direction>(initialDirection);
  const [menuOpen, setMenuOpen] = useState(false);
  const [quoteStep, setQuoteStep] = useState(0);
  const [selections, setSelections] = useState<string[]>([]);
  const [product, setProduct] = useState(0);
  const currentDirection = useMemo(() => DIRECTIONS.find((item) => item.id === direction)!, [direction]);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("direction", direction);
    window.history.replaceState(null, "", url);
  }, [direction]);

  useEffect(() => {
    document.body.classList.toggle("dl-menu-lock", menuOpen);
    return () => document.body.classList.remove("dl-menu-lock");
  }, [menuOpen]);

  const chooseDirection = (next: Direction) => {
    if (next === direction) return;
    setDirection(next);
    setMenuOpen(false);
  };

  const selectQuoteOption = (value: string) => {
    setSelections((current) => {
      const next = [...current];
      next[quoteStep] = value;
      return next;
    });
    window.setTimeout(() => setQuoteStep((step) => Math.min(step + 1, QUOTE_STEPS.length - 1)), 160);
  };

  const nextProduct = () => setProduct((value) => (value + 1) % PRODUCTS.length);
  const previousProduct = () => setProduct((value) => (value - 1 + PRODUCTS.length) % PRODUCTS.length);

  return (
    <div className={`design-lab dl-${direction}`}>
      <a className="dl-skip" href="#dl-main">Skip to main content</a>

      <aside className="dl-switcher" aria-label="Design direction switcher">
        <div className="dl-switcher-copy">
          <span>Design Lab</span>
          <strong>{currentDirection.name}</strong>
        </div>
        <div className="dl-switcher-options">
          {DIRECTIONS.map((item) => (
            <button
              type="button"
              key={item.id}
              className={item.id === direction ? "is-active" : ""}
              aria-pressed={item.id === direction}
              onClick={() => chooseDirection(item.id)}
            >
              <span>{item.number}</span>
              <b>{item.name}</b>
              <small>{item.note}</small>
            </button>
          ))}
        </div>
      </aside>

      <div className="dl-site-shell">
        <div className="dl-announcement">
          <span>Mobile, laptop, tablet & gaming repairs</span>
          <a href={BUSINESS.mapsDirections} target="_blank" rel="noreferrer">
            <MapPin aria-hidden="true" /> 57 Eccleston Street, Prescot
          </a>
        </div>

        <header className="dl-header">
          <a href="#dl-main" className="dl-brand" aria-label="Prescot Mobiles & Computer Services home">
            <span className="dl-logo-wrap"><img src="/design-lab/prescot-logo.png" alt="Prescot Mobile Shop logo" /></span>
            <span className="dl-brand-name"><b>Prescot</b><small>Mobiles & Computer Services</small></span>
          </a>

          <nav className="dl-desktop-nav" aria-label="Main navigation">
            <a href="#services">Repairs</a>
            <a href="#retail">Products</a>
            <a href="#methods">Ways to repair</a>
            <a href="#visit">Visit us</a>
          </nav>

          <div className="dl-header-actions">
            <a className="dl-text-action" href={BUSINESS.phoneHref}><Phone aria-hidden="true" /> Call now</a>
            <a className="dl-button dl-button-primary" href="#quote">Get a quote <ArrowRight aria-hidden="true" /></a>
          </div>

          <button className="dl-menu-button" type="button" aria-expanded={menuOpen} aria-controls="dl-mobile-menu" onClick={() => setMenuOpen(true)}>
            <Menu aria-hidden="true" /><span className="dl-sr-only">Open menu</span>
          </button>
        </header>

        <div className={`dl-mobile-menu ${menuOpen ? "is-open" : ""}`} id="dl-mobile-menu" aria-hidden={!menuOpen}>
          <button className="dl-menu-backdrop" type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu" />
          <div className="dl-mobile-panel">
            <div className="dl-mobile-panel-head">
              <span>Menu</span>
              <button type="button" onClick={() => setMenuOpen(false)}><X aria-hidden="true" /><span className="dl-sr-only">Close menu</span></button>
            </div>
            <nav aria-label="Mobile navigation">
              <a href="#services" onClick={() => setMenuOpen(false)}>Repairs <ArrowRight /></a>
              <a href="#retail" onClick={() => setMenuOpen(false)}>Products <ArrowRight /></a>
              <a href="#methods" onClick={() => setMenuOpen(false)}>Ways to repair <ArrowRight /></a>
              <a href="#visit" onClick={() => setMenuOpen(false)}>Visit us <ArrowRight /></a>
            </nav>
            <a className="dl-button dl-button-primary" href="#quote" onClick={() => setMenuOpen(false)}>Get a quote</a>
            <a className="dl-button dl-button-secondary" href={BUSINESS.phoneHref}>Call {BUSINESS.phone}</a>
          </div>
        </div>

        <main id="dl-main">
          <section className="dl-hero dl-reveal">
            <div className="dl-hero-copy">
              <p className="dl-kicker"><span /> Device support for real life</p>
              <h1>Repair, replace or upgrade. <em>Start here.</em></h1>
              <p className="dl-lede">Clear advice for phones, laptops, computers, tablets and gaming consoles—available in store, door to door, or by mail.</p>
              <div className="dl-hero-actions">
                <a href="#quote" className="dl-button dl-button-primary">Get a quote <ArrowRight /></a>
                <a href={BUSINESS.phoneHref} className="dl-button dl-button-secondary"><Phone /> Call now</a>
              </div>
              <a className="dl-whatsapp-link" href={BUSINESS.whatsappMessage("Hi Prescot Mobiles, I'd like help with a device.")} target="_blank" rel="noreferrer">
                <MessageCircle /> Prefer WhatsApp? Message the team
              </a>
              <div className="dl-hero-proof">
                <span><MapPin /> Prescot, L34 5QH</span>
                <span><Wrench /> Repairs & device retail</span>
                <span><Clock3 /> Open 7 days</span>
              </div>
            </div>

            <div className="dl-hero-media">
              <figure>
                <img src="/design-lab/hero-workbench.jpg" alt="Phones, laptop, game controller and repair tools arranged on a workbench" />
              </figure>
              <div className="dl-media-note">
                <span><b>Not sure what failed?</b><small>Tell us what happened and we’ll guide the next step.</small></span>
                <a href="#quote" aria-label="Start a repair quote"><ArrowRight /></a>
              </div>
            </div>
          </section>

          <section className="dl-services dl-section dl-reveal" id="services">
            <div className="dl-section-heading">
              <p className="dl-kicker"><span /> Repair services</p>
              <h2>Support for the technology you rely on.</h2>
              <a href="#quote">Start with your device <ArrowRight /></a>
            </div>
            <div className="dl-service-grid">
              {SERVICES.map((service, index) => (
                <article className="dl-service-card" key={service.name}>
                  <div className="dl-service-image"><img src={service.image} alt="" /></div>
                  <div className="dl-service-copy">
                    <span className="dl-service-number">0{index + 1}</span>
                    <service.icon aria-hidden="true" />
                    <h3>{service.name}</h3>
                    <p>{service.detail}</p>
                    <a href="#quote">Get help <ArrowRight /></a>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="dl-retail dl-section dl-reveal" id="retail">
            <div className="dl-retail-copy">
              <p className="dl-kicker"><span /> Device retail</p>
              <h2>Technology for work, play and everyday life.</h2>
              <p>Explore phones, laptops, gaming and accessories. Contact the team to check current availability.</p>
              <div className="dl-product-tabs" role="tablist" aria-label="Product categories">
                {PRODUCTS.map((item, index) => (
                  <button type="button" role="tab" aria-selected={product === index} className={product === index ? "is-active" : ""} onClick={() => setProduct(index)} key={item.label}>{item.label}</button>
                ))}
              </div>
              <a className="dl-inline-arrow" href="/products">View products <ArrowRight /></a>
            </div>
            <div className="dl-product-stage">
              <div className="dl-product-image" key={PRODUCTS[product].label}>
                <img src={PRODUCTS[product].image} alt={`${PRODUCTS[product].label} product category`} />
              </div>
              <div className="dl-product-caption">
                <span><b>{PRODUCTS[product].label}</b><small>{PRODUCTS[product].copy}</small></span>
                <div>
                  <button type="button" onClick={previousProduct} aria-label="Previous product category"><ChevronLeft /></button>
                  <button type="button" onClick={nextProduct} aria-label="Next product category"><ChevronRight /></button>
                </div>
              </div>
            </div>
          </section>

          <section className="dl-quote dl-section dl-reveal" id="quote">
            <div className="dl-quote-intro">
              <p className="dl-kicker"><span /> Quick enquiry</p>
              <h2>A clearer route to the right repair.</h2>
              <p>Choose a few details. The final enquiry can continue with the existing contact and WhatsApp journey.</p>
              <div className="dl-quote-progress" aria-label={`Step ${quoteStep + 1} of ${QUOTE_STEPS.length}`}>
                {QUOTE_STEPS.map((step, index) => (
                  <button type="button" className={index === quoteStep ? "is-active" : index < quoteStep ? "is-complete" : ""} onClick={() => setQuoteStep(index)} key={step.label}>
                    <span>{index < quoteStep ? <Check /> : index + 1}</span>{step.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="dl-quote-card" key={quoteStep}>
              <span className="dl-step-count">0{quoteStep + 1} / 0{QUOTE_STEPS.length}</span>
              <h3>{QUOTE_STEPS[quoteStep].title}</h3>
              <div className="dl-quote-options">
                {QUOTE_STEPS[quoteStep].options.map((option) => (
                  <button type="button" className={selections[quoteStep] === option ? "is-selected" : ""} onClick={() => selectQuoteOption(option)} key={option}>
                    <span>{option}</span><ArrowRight />
                  </button>
                ))}
              </div>
              <p>No payment or commitment. We’ll confirm details before any work begins.</p>
            </div>
          </section>

          <section className="dl-methods dl-section dl-reveal" id="methods">
            <div className="dl-section-heading">
              <p className="dl-kicker"><span /> Ways to repair</p>
              <h2>Choose the service method that fits your day.</h2>
            </div>
            <div className="dl-method-list">
              {METHODS.map((method) => (
                <article key={method.name}>
                  <span>{method.index}</span><method.icon /><h3>{method.name}</h3><p>{method.copy}</p><a href="#quote" aria-label={`Ask about ${method.name}`}><ArrowRight /></a>
                </article>
              ))}
            </div>
          </section>

          <section className="dl-trust dl-section dl-reveal">
            <div className="dl-trust-quote">
              <Quote aria-hidden="true" />
              <blockquote>“Speak to a real person, explain the problem clearly, and choose the next step with confidence.”</blockquote>
              <p>Proposed customer-service promise — wording to be approved</p>
            </div>
            <div className="dl-trust-points">
              <h2>Designed around clarity, care and capable support.</h2>
              <div><ShieldCheck /><span><b>Clear communication</b><small>Understand the proposed work before deciding.</small></span></div>
              <div><ShoppingBag /><span><b>Repair and retail together</b><small>Explore repair, replacement and upgrade routes.</small></span></div>
              <div><Star /><span><b>Verified proof belongs here</b><small>Connect a real review source before publishing claims.</small></span></div>
            </div>
          </section>

          <section className="dl-visit dl-section dl-reveal" id="visit">
            <div className="dl-visit-map" aria-hidden="true">
              <div className="dl-map-grid" />
              <span className="dl-map-pin"><MapPin /></span>
              <span className="dl-map-label">Prescot<br /><small>L34 5QH</small></span>
            </div>
            <div className="dl-visit-copy">
              <p className="dl-kicker"><span /> Visit & contact</p>
              <h2>Find us in Prescot.</h2>
              <address>{BUSINESS.fullAddress}</address>
              <div className="dl-hours">
                {BUSINESS.hours.map((item) => <p key={item.day}><span>{item.day}</span><b>{item.time}</b></p>)}
              </div>
              <div className="dl-visit-actions">
                <a className="dl-button dl-button-primary" href={BUSINESS.mapsDirections} target="_blank" rel="noreferrer">Get directions <ArrowRight /></a>
                <a className="dl-button dl-button-secondary" href={BUSINESS.phoneHref}>Call the team</a>
              </div>
            </div>
          </section>

          <section className="dl-final-cta dl-reveal">
            <div><p className="dl-kicker"><span /> Ready when you are</p><h2>Let’s find the right next step for your device.</h2></div>
            <div><a className="dl-button dl-button-primary" href="#quote">Get a quote <ArrowRight /></a><a className="dl-button dl-button-secondary" href={BUSINESS.phoneHref}>Call now</a></div>
          </section>
        </main>

        <footer className="dl-footer">
          <div className="dl-footer-brand">
            <span className="dl-logo-wrap"><img src="/design-lab/prescot-logo.png" alt="" /></span>
            <div><b>Prescot Mobiles & Computer Services</b><p>Mobile, laptop, computer, tablet and gaming-console repairs, plus device retail and accessories.</p></div>
          </div>
          <div><b>Repairs</b><a href="#services">Mobile phones</a><a href="#services">Computers & laptops</a><a href="#services">Tablets</a><a href="#services">Gaming consoles</a></div>
          <div><b>Contact</b><a href={BUSINESS.phoneHref}>{BUSINESS.phone}</a><a href={BUSINESS.emailHref}>{BUSINESS.email}</a><a href={BUSINESS.mapsDirections}>Find the shop</a></div>
          <div><b>Service options</b><a href="#methods">Walk in</a><a href="#methods">Door to door</a><a href="#methods">Mail in</a></div>
          <p className="dl-footer-base">Concept preview · Real business details · Claims require approval before publication</p>
        </footer>

        <div className="dl-mobile-sticky" aria-label="Quick contact actions">
          <a href={BUSINESS.phoneHref}><Phone /> Call</a>
          <a href={BUSINESS.whatsappMessage("Hi Prescot Mobiles, I'd like help with a device.")} target="_blank" rel="noreferrer"><MessageCircle /> WhatsApp</a>
        </div>
      </div>
    </div>
  );
}

