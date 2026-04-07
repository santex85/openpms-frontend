import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";

import "@/i18n";
import App from "@/App";
import "@/index.css";
import { queryClient } from "@/lib/queryClient";
import "@/stores/theme-store";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster richColors position="top-center" closeButton />
    </QueryClientProvider>
  </StrictMode>
);
