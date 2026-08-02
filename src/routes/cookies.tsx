import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/cookies")({
  beforeLoad: () => {
    throw redirect({ to: "/privacy", replace: true });
  },
});
