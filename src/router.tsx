import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

if (typeof window !== "undefined") {
  const origWarn = console.warn;
  console.warn = (...args: any[]) => {
    const msg = typeof args[0] === "string" ? args[0] : "";
    if (
      msg.includes("google.maps.places.Autocomplete is not available to new customers") ||
      msg.includes("google.maps.places.AutocompleteService is not available to new customers") ||
      msg.includes("Google Maps JavaScript API has been loaded directly without loading=async") ||
      msg.includes("Missing `Description` or `aria-describedby={undefined}`")
    ) {
      return;
    }
    origWarn.apply(console, args);
  };
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    trailingSlash: "always",
  });

  return router;
};
