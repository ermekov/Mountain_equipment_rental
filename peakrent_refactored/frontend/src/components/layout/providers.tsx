"use client";
import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

function makeQC() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 300_000,
        retry: 2,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: 0 },
    },
  });
}

let browserQC: QueryClient | null = null;

function getQC() {
  if (typeof window === "undefined") return makeQC();
  if (!browserQC) browserQC = makeQC();
  return browserQC;
}

export function Providers({ children }: { children: ReactNode }) {
  const [qc] = useState(getQC);
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}
