import { createFileRoute } from "@tanstack/react-router";
import { Laptop } from "lucide-react";
import { SeoLanding } from "@/components/site/SeoLanding";

export const Route = createFileRoute("/laptop-computer-repair-prescot")({
  head: () => ({
    meta: [
      { title: "Laptop & Computer Repair in Prescot | Windows, Mac & PC" },
      { name: "description", content: "Laptop and computer repairs in Prescot, L34. Screens, keyboards, batteries, SSD/RAM upgrades, Windows & macOS software issues. Free diagnostics." },
      { property: "og:title", content: "Laptop & Computer Repair in Prescot" },
      { property: "og:description", content: "Trusted laptop, desktop and Mac repairs in Prescot — hardware, software and upgrades." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/laptop-computer-repair-prescot" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/laptop-computer-repair-prescot" }],
  }),
  component: Page,
});

function Page() {
  return (
    <SeoLanding
      Icon={Laptop}
      eyebrow="Laptop & computer repair • Prescot"
      h1="Laptop, PC & Mac repairs in Prescot."
      intro="Whether it's a slow Windows laptop, a broken MacBook screen or a full desktop rebuild — we diagnose, repair and upgrade in-store on Eccleston Street."
      services={[
        "Laptop screen replacement",
        "Keyboard replacement",
        "Battery replacement",
        "Charging port & DC jack repair",
        "SSD & RAM upgrades",
        "Windows installation & repair",
        "macOS software issues",
        "Virus & malware removal",
        "Data recovery & backup",
        "Desktop PC diagnostics & builds",
      ]}
      whatsappMessage="Hi Prescot Mobiles, I need a laptop / computer repair quote."
    />
  );
}
