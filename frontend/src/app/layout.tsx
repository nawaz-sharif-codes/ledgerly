import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { PersonaProvider } from "@/components/persona-provider";

export const metadata: Metadata = {
  title: "Ledgerly",
  description: "A precise payment and wallet platform built on an immutable ledger.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <PersonaProvider>{children}</PersonaProvider>
      </body>
    </html>
  );
}
