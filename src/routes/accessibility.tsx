import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/accessibility")({
  beforeLoad: () => {
    throw redirect({ to: "/contact", replace: true });
  },
});
