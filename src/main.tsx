import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { NuqsAdapter } from "nuqs/adapters/react";

import "./index.css";
import App from "./App.tsx";
import QueryProvider from "./context/query-provider.tsx";
import { Toaster } from "./components/ui/toaster.tsx";
import { ThemeProvider } from "./hooks/ThemeContext.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryProvider>
      <ThemeProvider>
        <NuqsAdapter>
          <App />
        </NuqsAdapter>
      </ThemeProvider>
      <Toaster />
    </QueryProvider>
  </StrictMode>
);
