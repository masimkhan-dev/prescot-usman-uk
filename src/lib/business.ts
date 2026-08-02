export const BUSINESS = {
  name: "Prescot Mobiles & Computer Services",
  shortName: "Prescot Mobiles",
  tagline: "Sales • Accessories • Repairs",
  addressLine: "57 Eccleston Street",
  city: "Prescot",
  postcode: "L34 5QH",
  country: "United Kingdom",
  fullAddress: "57 Eccleston Street, Prescot, L34 5QH, United Kingdom",
  phone: "+44 7479 385163",
  phoneHref: "tel:+447479385163",
  whatsapp: "+44 7479 385163",
  whatsappHref: "https://wa.me/447479385163",
  whatsappMessage: (msg: string) =>
    `https://wa.me/447479385163?text=${encodeURIComponent(msg)}`,
  email: "precotmobiles2026@gmail.com",
  emailHref: "mailto:precotmobiles2026@gmail.com",
  mapsEmbed:
    "https://www.google.com/maps?q=57+Eccleston+Street,+Prescot,+L34+5QH,+UK&output=embed",
  mapsDirections:
    "https://www.google.com/maps/dir/?api=1&destination=57+Eccleston+Street,+Prescot,+L34+5QH,+UK",
  // Geo coordinates for LocalBusiness schema (approx — 57 Eccleston Street, Prescot)
  geo: { latitude: 53.4275, longitude: -2.8047 },
  hours: [
    { day: "Monday – Friday", time: "9:30 am – 6:00 pm" },
    { day: "Saturday", time: "9:00 am – 6:00 pm" },
    { day: "Sunday", time: "9:30 am – 5:00 pm" },
  ],
  // OpeningHoursSpecification (schema.org)
  openingHoursSchema: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:30",
      closes: "18:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Saturday",
      opens: "09:00",
      closes: "18:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Sunday",
      opens: "09:30",
      closes: "17:00",
    },
  ],
};

export function getOpenStatus(now = new Date()): { isOpen: boolean; message: string } {
  try {
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      weekday: "long",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    let weekday = "";
    let hour = 0;
    let minute = 0;

    for (const part of parts) {
      if (part.type === "weekday") weekday = part.value;
      if (part.type === "hour") hour = parseInt(part.value, 10);
      if (part.type === "minute") minute = parseInt(part.value, 10);
    }

    const currentMinutes = hour * 60 + minute;

    let openTime = 9 * 60 + 30; // 9:30 AM
    let closeTime = 18 * 60; // 6:00 PM

    if (weekday === "Saturday") {
      openTime = 9 * 60; // 9:00 AM
      closeTime = 18 * 60; // 6:00 PM
    } else if (weekday === "Sunday") {
      openTime = 9 * 60 + 30; // 9:30 AM
      closeTime = 17 * 60; // 5:00 PM
    }

    const isOpen = currentMinutes >= openTime && currentMinutes < closeTime;
    const statusText = isOpen ? "Open today" : "Closed now";

    return { isOpen, message: statusText };
  } catch {
    return { isOpen: true, message: "Open today" };
  }
}

export const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/services", label: "Services" },
  { to: "/products", label: "Products" },
  { to: "/about", label: "About" },
  { to: "/reviews", label: "Reviews" },
  { to: "/contact", label: "Contact" },
] as const;

export const BRANDS_WE_REPAIR = [
  "Apple", "Samsung", "Google", "Huawei", "Xiaomi", "Oppo", "OnePlus",
  "Lenovo", "HP", "Dell", "PlayStation", "Xbox", "Nintendo",
];

export const WHY_CHOOSE_US = [
  "Professional Repairs",
  "Quality Parts",
  "Competitive Prices",
  "Fast Service",
  "Walk-in Service",
  "Door-to-Door Service",
  "Mail-in Service",
  "Wheelchair Accessible",
];

export const REPAIR_PROCESS = [
  { n: "01", t: "Contact Us", d: "Call, WhatsApp or fill in the enquiry form." },
  { n: "02", t: "Choose Your Repair", d: "Tell us the device, brand and issue." },
  { n: "03", t: "Walk-In, Door-to-Door or Mail-In", d: "Pick the option that suits your day." },
  { n: "04", t: "We Repair Your Device", d: "Diagnosed and fixed by trained technicians." },
  { n: "05", t: "Get Your Device Back", d: "Collect, delivered or shipped — tested and ready." },
];

export const FAQS = [
  { q: "How long does a repair take?", a: "Most common repairs like screens and batteries are done the same day. Complex jobs may take 2–3 working days." },
  { q: "Do I need an appointment?", a: "No — walk in during opening hours. For door-to-door or mail-in, message us to arrange a slot." },
  { q: "Do you offer mail-in repairs?", a: "Yes. We accept mail-in repairs from across the UK and return your device fully insured." },
  { q: "Do you offer door-to-door repairs?", a: "Yes — we collect and return your device across Prescot and nearby areas." },
  { q: "Do you buy used phones?", a: "Yes, bring your device in and we'll assess it and make you a fair cash offer." },
  { q: "Do you sell refurbished phones?", a: "Yes — we stock new, used and Grade A refurbished phones, laptops and consoles." },
  { q: "Do you repair gaming consoles?", a: "Yes — PlayStation, Xbox and Nintendo. HDMI ports, controllers, fans and more." },
  { q: "Do repairs come with a warranty?", a: "Eligible repairs come with a warranty on parts and workmanship. Ask us for exact terms before booking." },
];

export const LEGAL_LINKS = [
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms & Conditions" },
  { to: "/repair-terms", label: "Repair Terms" },
  { to: "/warranty", label: "Warranty Policy" },
  { to: "/refunds", label: "Returns & Refund Policy" },
] as const;

