import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import { BUSINESS, LEGAL_LINKS, NAV_LINKS } from "@/lib/business";
import { SITE_MEDIA } from "@/lib/site-content";

export function Footer() {
  return (
    <footer className="mt-20 bg-[#171717] pb-20 text-[#D8D0C8] md:pb-0">
      <div className="container-page grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1.2fr] lg:py-20">
        <div className="max-w-md">
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-white">
              <img src={SITE_MEDIA.logo} alt="" className="h-full w-full object-contain" />
            </span>
            <div>
              <strong className="block text-base font-bold text-white">Prescot Mobiles</strong>
              <span className="text-xs">Mobiles & Computer Services</span>
            </div>
          </div>
          <p className="mt-5 text-sm leading-7 text-[#AAA29A]">
            Mobile, laptop, computer, tablet and gaming-console repairs, alongside phones, laptops,
            consoles and accessories.
          </p>
          <Link
            to="/contact"
            className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#D92D20] px-5 text-sm font-bold text-white transition hover:bg-[#B42318]"
          >
            Get a Quote <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div>
          <h3 className="font-sans text-xs font-bold uppercase tracking-[.08em] text-white">
            Explore
          </h3>
          <div className="mt-5 grid gap-1">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex min-h-11 items-center text-sm hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h3 className="font-sans text-xs font-bold uppercase tracking-[.08em] text-white">
            Services
          </h3>
          <div className="mt-5 grid gap-1">
            <Link
              to="/mobile-phone-repair-prescot"
              className="flex min-h-11 items-center text-sm hover:text-white"
            >
              Mobile repairs
            </Link>
            <Link
              to="/laptop-computer-repair-prescot"
              className="flex min-h-11 items-center text-sm hover:text-white"
            >
              Laptop repairs
            </Link>
            <Link
              to="/gaming-console-repair-prescot"
              className="flex min-h-11 items-center text-sm hover:text-white"
            >
              Gaming repairs
            </Link>
            <Link
              to="/buy-sell-used-phones-prescot"
              className="flex min-h-11 items-center text-sm hover:text-white"
            >
              Buy & sell
            </Link>
          </div>
        </div>
        <div>
          <h3 className="font-sans text-xs font-bold uppercase tracking-[.08em] text-white">
            Contact
          </h3>
          <div className="mt-5 grid gap-4 text-sm leading-6">
            <a
              href={BUSINESS.mapsDirections}
              target="_blank"
              rel="noreferrer"
              className="flex gap-3 hover:text-white"
            >
              <MapPin className="mt-1 h-4 w-4 shrink-0 text-[#FF493D]" />
              {BUSINESS.fullAddress}
            </a>
            <a
              href={BUSINESS.phoneHref}
              className="flex min-h-11 items-center gap-3 hover:text-white"
            >
              <Phone className="h-4 w-4 text-[#FF493D]" />
              {BUSINESS.phone}
            </a>
            <a
              href={BUSINESS.emailHref}
              className="flex min-h-11 items-center gap-3 break-all hover:text-white"
            >
              <Mail className="h-4 w-4 shrink-0 text-[#FF493D]" />
              {BUSINESS.email}
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-4 py-6 text-xs leading-5 text-[#A9A19A] md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {BUSINESS.name}. All rights reserved.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {LEGAL_LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex min-h-11 items-center hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
