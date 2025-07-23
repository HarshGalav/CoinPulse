'use client';

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { CryptoProvider } from "@/components/providers/CryptoProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <CryptoProvider>
          {children}
        </CryptoProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}