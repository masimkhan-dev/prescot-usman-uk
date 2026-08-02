import { createFileRoute } from "@tanstack/react-router";
import { Smartphone } from "lucide-react";
import { SeoLanding } from "@/components/site/SeoLanding";

export const Route = createFileRoute("/mobile-phone-repair-prescot")({
  head: () => ({
    meta: [
      { title: "Mobile Phone Repair in Prescot | Screen, Battery & More" },
      { name: "description", content: "Fast, affordable mobile phone repairs in Prescot, L34. Screen replacement, battery, charging port, camera and water damage. Walk-in, door-to-door & mail-in." },
      { property: "og:title", content: "Mobile Phone Repair in Prescot" },
      { property: "og:description", content: "Expert mobile phone repairs on Eccleston Street, Prescot — screens, batteries, ports and more." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/mobile-phone-repair-prescot" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/mobile-phone-repair-prescot" }],
  }),
  component: Page,
});

function Page() {
  return (
    <SeoLanding
      Icon={Smartphone}
      eyebrow="Mobile phone repair • Prescot"
      h1="Mobile phone repair in Prescot — done right, first time."
      intro="Cracked screens, dead batteries, dodgy charging ports — our Prescot technicians fix mobile phones from every major brand. Most repairs completed the same day, with a warranty."
      services={[
        "iPhone & Android screen replacement",
        "Battery replacement",
        "Charging port repair",
        "Rear & front camera repair",
        "Speaker & microphone repair",
        "Water damage assistance",
        "Back glass replacement",
        "Software & iCloud/Google issues",
        "Unlocking & SIM issues",
      ]}
      whatsappMessage="Hi Prescot Mobiles, I need a mobile phone repair quote."
    />
  );
}
