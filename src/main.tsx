// Error tracking first, so it catches errors from everything below
import "./lib/sentry";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { NuqsAdapter } from "nuqs/adapters/react";

import "./index.css";
import App from "./App.tsx";
import QueryProvider from "./context/query-provider.tsx";
import { Toaster } from "./components/ui/toaster.tsx";
import AppearanceProvider from "./components/appearance/appearance-provider.tsx";
import AppErrorBoundary from "./components/app-error-boundary.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppErrorBoundary>
    <QueryProvider>
      <AppearanceProvider>
        <NuqsAdapter>
          <App />
        </NuqsAdapter>
      </AppearanceProvider>
      <Toaster />
    </QueryProvider>
    </AppErrorBoundary>
  </StrictMode>
);
