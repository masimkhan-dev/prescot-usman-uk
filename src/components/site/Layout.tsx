import { useEffect, type ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { StickyMobileCTA } from "./StickyMobileCTA";
import { CookieConsent } from "./CookieConsent";

export function SiteLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const sections = Array.from(document.querySelectorAll<HTMLElement>(".section-pad"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.remove("section-reveal-pending");
          entry.target.classList.add("section-reveal-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.08 },
    );

    sections.forEach((section) => {
      if (section.getBoundingClientRect().top <= window.innerHeight * 0.94) return;
      section.classList.add("section-reveal-pending");
      observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pb-24 md:pb-0">{children}</main>
      <Footer />
      <StickyMobileCTA />
      <CookieConsent />
    </div>
  );
}
