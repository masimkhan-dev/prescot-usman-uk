import { createFileRoute } from "@tanstack/react-router";
import { Gamepad2 } from "lucide-react";
import { SeoLanding } from "@/components/site/SeoLanding";

export const Route = createFileRoute("/gaming-console-repair-prescot")({
  head: () => ({
    meta: [
      { title: "Gaming Console Repair in Prescot | PS5, Xbox & Nintendo" },
      { name: "description", content: "PlayStation, Xbox and Nintendo Switch repairs in Prescot. HDMI ports, controllers, fans, disc drives and overheating fixed by our local technicians." },
      { property: "og:title", content: "Gaming Console Repair in Prescot" },
      { property: "og:description", content: "PS5, Xbox and Nintendo Switch repairs in Prescot — HDMI ports, controllers, disc drives and more." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/gaming-console-repair-prescot" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/gaming-console-repair-prescot" }],
  }),
  component: Page,
});

function Page() {
  return (
    <SeoLanding
      Icon={Gamepad2}
      eyebrow="Console repair • Prescot"
      h1="PS5, Xbox & Nintendo repairs in Prescot."
      intro="Don't bin your console. From snapped HDMI ports to drifting controllers, we repair PlayStation, Xbox and Nintendo Switch — often when others say it can't be done."
      services={[
        "PS4 & PS5 HDMI port repair",
        "Xbox One & Series X|S repair",
        "Nintendo Switch screen & joystick",
        "Controller drift fix",
        "Overheating & fan cleaning",
        "Disc drive repair",
        "Power supply issues",
        "Firmware & software recovery",
      ]}
      whatsappMessage="Hi Prescot Mobiles, I need a gaming console repair quote."
    />
  );
}
