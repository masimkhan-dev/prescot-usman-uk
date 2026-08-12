import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Menu, Phone, X } from "lucide-react";
import { BUSINESS } from "@/lib/business";
import { SITE_MEDIA } from "@/lib/site-content";

import { AnnouncementTicker } from "./AnnouncementTicker";

const NAV_ITEMS = [
  { to: "/services", label: "Repairs" },
  { to: "/products", label: "Products" },
  { to: "/buy-sell-used-phones-prescot", label: "Buy & Sell" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Visit & Contact" },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const { location } = useRouterState();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    if (!open)
      return () => {
        document.body.style.overflow = "";
      };

    const drawer = drawerRef.current;
    const focusable = drawer?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    focusable?.[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        requestAnimationFrame(() => menuButtonRef.current?.focus());
        return;
      }
      if (event.key !== "Tab" || !focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <header
        className={`sticky top-0 z-40 border-b transition-all duration-200 ${
          scrolled
            ? "border-[#DDD5CB] bg-[#FAF7F2]/95 shadow-sm backdrop-blur-xl"
            : "border-[#ECE8E1] bg-[#FAF7F2]"
        }`}
      >
        <AnnouncementTicker />

        <div className="container-page flex min-h-[72px] items-center justify-between gap-5 py-2">
          <Link to="/" className="flex items-center gap-3" aria-label="Prescot Mobiles home">
            <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-[#E6DED5] bg-white">
              <img src={SITE_MEDIA.logo} alt="" className="h-full w-full object-contain" />
            </span>
            <span className="leading-tight">
              <strong className="block font-sans text-[15px] font-bold tracking-tight text-[#171717]">
                Prescot Mobiles
              </strong>
              <small className="block text-xs font-medium text-[#625B55]">
                Mobiles & Computer Services
              </small>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-[#403B36] transition-colors hover:bg-white hover:text-[#D92D20]"
                activeProps={{ className: "!text-[#D92D20] !bg-white" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <a
              href={BUSINESS.phoneHref}
              className="flex min-h-11 items-center gap-2 px-2 text-sm font-semibold text-[#171717]"
            >
              <Phone className="h-4 w-4" /> Call now
            </a>
            <Link to="/contact" className="btn-primary !min-h-11 !rounded-lg !px-5 !py-2 !text-sm">
              Get a Quote <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <a
              href={BUSINESS.phoneHref}
              className="grid h-11 w-11 place-items-center rounded-lg text-[#171717]"
              aria-label="Call now"
            >
              <Phone className="h-5 w-5" />
            </a>
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setOpen(true)}
              className="grid h-11 w-11 place-items-center rounded-lg border border-[#D8D0C6] bg-white text-[#171717]"
              aria-label="Open menu"
              aria-expanded={open}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div
        inert={!open ? true : undefined}
        className={`fixed inset-0 z-50 transition md:hidden ${open ? "visible" : "invisible"}`}
        aria-hidden={!open}
      >
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/50 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        />
        <div
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Main menu"
          className={`absolute right-0 top-0 flex h-full w-[min(90vw,390px)] flex-col bg-[#FAF7F2] p-5 transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
        >
          <div className="flex items-center justify-between border-b border-[#D8D0C6] pb-4">
            <strong className="font-sans text-sm">Menu</strong>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-11 w-11 place-items-center rounded-lg border border-[#D8D0C6] bg-white"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="mt-4 flex flex-col" aria-label="Mobile navigation">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex min-h-14 items-center justify-between border-b border-[#E2DBD2] font-display text-xl font-semibold text-[#171717]"
              >
                {item.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ))}
          </nav>
          <div className="mt-auto grid gap-2 pt-6">
            <Link to="/contact" className="btn-primary min-h-12">
              Get a Quote
            </Link>
            <a href={BUSINESS.phoneHref} className="btn-outline min-h-12">
              <Phone className="h-4 w-4" /> Call {BUSINESS.phone}
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
