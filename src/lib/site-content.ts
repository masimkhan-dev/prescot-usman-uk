export const SITE_MEDIA = {
  logo: "/site-assets/prescot-logo.png",
  hero: {
    src: "/site-assets/hero-workbench.jpg",
    alt: "Phone, laptop, game controller and precision repair tools arranged on a clean workbench",
    /** Replace with an owner-supplied shop or technician photograph when available. */
    needsAuthenticBusinessPhoto: true,
  },
  repairHero: {
    src: "/site-assets/prescot-repair-hero.webp",
    alt: "Technician carefully repairing an opened smartphone using precision tools.",
    width: 1942,
    height: 809,
  },
  productsBanner: {
    src: "/site-assets/prescot-products-banner.webp",
    alt: "Illustrative selection of smartphones, foldable phone, earbuds, headphones, smartwatch and mobile accessories.",
    width: 2172,
    height: 724,
  },
  shopfront: {
    src: "/site-assets/prescot-shopfront.webp",
    alt: "Front entrance of Prescot Mobiles & Computers Services at 57 Eccleston Street in Prescot.",
    caption: "Prescot Mobiles & Computers Services — 57 Eccleston Street, Prescot.",
    width: 1200,
    height: 900,
  },
  products: {
    phone: "/site-assets/product-phone.jpg",
    laptop: "/site-assets/product-laptop.jpg",
    console: "/site-assets/product-console.jpg",
    accessories: "/site-assets/product-accessories.jpg",
  },
} as const;

export const GOOGLE_PROOF = {
  rating: "4.8/5",
  reviewCount: 96,
  reviewsUrl:
    "https://www.google.com/search?q=Prescot+Mobiles+%26+Computer+Services+Google+reviews",
  reviews: [
    {
      name: "Lili Roberts",
      quote: "Fixed iPhone 15 Pro Max quickly, worker very informative and knowledgeable.",
    },
    {
      name: "Roy Astles",
      quote: "iPad broken, repaired no problem at a great price.",
    },
    {
      name: "Emma",
      quote: "Really nice fella, quick service, couldn’t be happier.",
    },
  ],
} as const;
