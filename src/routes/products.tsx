import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Smartphone,
  Laptop,
  Gamepad2,
  Headphones,
  Cpu,
  MessageCircle,
  ShieldCheck,
  HardDrive,
  BatteryCharging,
} from "lucide-react";
import { SiteLayout } from "@/components/site/Layout";
import { BUSINESS } from "@/lib/business";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "Phones, Laptops & Consoles for Sale in Prescot | Prescot Mobiles" },
      {
        name: "description",
        content:
          "Browse new, used and refurbished mobile phones, laptops, computers, gaming consoles and accessories at Prescot Mobiles. Ask the team about live availability and purchase terms.",
      },
      { property: "og:title", content: "Products — Prescot Mobiles" },
      {
        property: "og:description",
        content:
          "Buy new, used and refurbished phones, laptops, consoles and accessories in Prescot.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/products" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/products" }],
  }),
  component: ProductsPage,
});

type Cat = "All" | "Mobile Phones" | "Laptops & Computers" | "Gaming Consoles" | "Accessories";

const categoryImage: Record<Exclude<Cat, "All">, { url: string; alt: string }> = {
  "Mobile Phones": { url: "/site-assets/product-phone.jpg", alt: "Premium smartphone" },
  "Laptops & Computers": { url: "/site-assets/product-laptop.jpg", alt: "Modern laptop" },
  "Gaming Consoles": { url: "/site-assets/product-console.jpg", alt: "Gaming console" },
  Accessories: { url: "/site-assets/product-accessories.jpg", alt: "Tech accessories" },
};

const catalog: {
  name: string;
  category: Exclude<Cat, "All">;
  status: "Brand New" | "Grade A Refurbished" | "Certified Pre-Owned";
  storage: string;
  battery: string;
  price: string;
}[] = [
  {
    name: "iPhone 15 Pro",
    category: "Mobile Phones",
    status: "Grade A Refurbished",
    storage: "256GB Storage",
    battery: "100% Battery Health",
    price: "£699",
  },
  {
    name: "iPhone 13",
    category: "Mobile Phones",
    status: "Certified Pre-Owned",
    storage: "128GB Storage",
    battery: "92%+ Battery Health",
    price: "£429",
  },
  {
    name: "Samsung Galaxy S24",
    category: "Mobile Phones",
    status: "Brand New",
    storage: "256GB Storage",
    battery: "Battery condition checked",
    price: "£649",
  },
  {
    name: "Google Pixel 8",
    category: "Mobile Phones",
    status: "Certified Pre-Owned",
    storage: "128GB Storage",
    battery: "95%+ Battery Health",
    price: "£399",
  },
  {
    name: "MacBook Air M2",
    category: "Laptops & Computers",
    status: "Grade A Refurbished",
    storage: "256GB SSD · 8GB RAM",
    battery: "Grade A Battery Health",
    price: "£799",
  },
  {
    name: "Dell XPS 13",
    category: "Laptops & Computers",
    status: "Certified Pre-Owned",
    storage: "512GB SSD · 16GB RAM",
    battery: "Original Battery",
    price: "£599",
  },
  {
    name: "PlayStation 5 Slim",
    category: "Gaming Consoles",
    status: "Brand New",
    storage: "1TB Ultra-SSD",
    battery: "UK Disc Edition",
    price: "£429",
  },
  {
    name: "Xbox Series X",
    category: "Gaming Consoles",
    status: "Certified Pre-Owned",
    storage: "1TB SSD Storage",
    battery: "Includes Wireless Controller",
    price: "£349",
  },
  {
    name: "Nintendo Switch OLED",
    category: "Gaming Consoles",
    status: "Grade A Refurbished",
    storage: "64GB + SD Slot",
    battery: "Tested & Certified",
    price: "£249",
  },
  {
    name: "Fast Charger 65W Duo",
    category: "Accessories",
    status: "Brand New",
    storage: "Dual USB-C Ports",
    battery: "Safety Certified",
    price: "£25",
  },
];

const cats: Cat[] = [
  "All",
  "Mobile Phones",
  "Laptops & Computers",
  "Gaming Consoles",
  "Accessories",
];

function ProductsPage() {
  const [active, setActive] = useState<Cat>("All");
  const filtered = active === "All" ? catalog : catalog.filter((p) => p.category === active);

  return (
    <SiteLayout>
      <section className="border-b border-[#E7DED5] bg-[#FAF7F2]">
        <div className="container-page py-16 md:py-20">
          <span className="eyebrow">Buy, Sell & Trade-in</span>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight text-[#171717] md:text-6xl">
            Phones, laptops & consoles — tested & certified in Prescot.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#625B55]">
            Visit our 57 Eccleston Street shop or message us on WhatsApp for live stock
            availability, condition details and current warranty terms.
          </p>
        </div>
      </section>

      <section className="section-pad bg-white">
        <div className="container-page">
          <div className="flex flex-wrap gap-2 border-b border-[#E7DED5] pb-6">
            {cats.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setActive(c)}
                aria-pressed={active === c}
                className={`min-h-11 rounded-lg px-4 py-2.5 text-sm font-bold transition-all ${
                  active === c
                    ? "bg-[#171717] text-white shadow-sm"
                    : "border border-[#E7DED5] bg-[#FAF7F2] text-[#403B36] hover:bg-white"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((p) => {
              const img = categoryImage[p.category];
              return (
                <div key={p.name} className="card-flat group flex flex-col justify-between !p-5">
                  <div>
                    <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg border border-[#E7DED5] bg-[#FAF7F2]">
                      <img
                        src={img.url}
                        alt={img.alt}
                        width={600}
                        height={450}
                        loading="lazy"
                        sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
                        className="h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.025]"
                      />
                      <div className="absolute left-2.5 top-2.5 rounded-md bg-[#171717] px-2.5 py-1 text-xs font-bold text-white">
                        {p.status}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                      <span className="flex items-center gap-1 rounded-md border border-[#F0C7C1] bg-[#FFF0ED] px-2.5 py-1 text-[#8F241A]">
                        <ShieldCheck className="h-3.5 w-3.5" /> Ask about warranty terms
                      </span>
                      <span className="flex items-center gap-1 rounded-md bg-[#F1EAE2] px-2.5 py-1 text-[#403B36]">
                        <HardDrive className="h-3.5 w-3.5 text-[#625B55]" /> {p.storage}
                      </span>
                      <span className="flex items-center gap-1 rounded-md border border-[#E7DED5] bg-white px-2.5 py-1 text-[#403B36]">
                        <BatteryCharging className="h-3.5 w-3.5 text-[#625B55]" /> {p.battery}
                      </span>
                    </div>

                    <h3 className="mt-4 text-2xl font-semibold text-[#171717]">{p.name}</h3>
                    <div className="mt-1 text-sm font-medium text-[#625B55]">{p.category}</div>
                  </div>

                  <div className="mt-6 flex items-center justify-between gap-3 border-t border-[#E7DED5] pt-4">
                    <div>
                      <div className="text-xs font-bold text-[#625B55]">Price</div>
                      <div className="tabular-nums text-2xl font-bold text-[#171717]">
                        {p.price}
                      </div>
                    </div>
                    <a
                      href={BUSINESS.whatsappMessage(
                        `Hi Prescot Mobiles, is ${p.name} (${p.price}) available at 57 Eccleston Street?`,
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-whatsapp min-h-11 !px-4 !py-2.5 !text-sm"
                    >
                      <MessageCircle className="w-4 h-4" /> Enquire on WhatsApp
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-12 rounded-xl border border-[#E7DED5] bg-[#FAF7F2] p-6 text-center text-base font-semibold leading-7 text-[#625B55]">
            Looking to sell or trade-in your phone? Walk into our Prescot shop at 57 Eccleston
            Street for an instant cash valuation on the spot.
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
