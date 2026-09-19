import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Serve cached data instantly, refresh quietly in the background.
        staleTime: 5 * 60_000,
        gcTime: 30 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: true,
        retry: 1,
        placeholderData: (previous: unknown) => previous,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Fetch the next page's code and data the moment a link is touched/hovered.
    defaultPreload: "intent",
    defaultPreloadDelay: 0,
    defaultPreloadStaleTime: 5 * 60_000,
    // Keep the old screen on-screen briefly instead of flashing a spinner.
    defaultPendingMs: 250,
    defaultPendingMinMs: 0,
  });

  return router;
};
