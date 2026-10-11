import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-sans" });

export const metadata: Metadata = {
  title: { default: "MarginMint", template: "%s · MarginMint" },
  description: "Every sale. Every cost. Your real profit. Seller operations and profit intelligence for Indian e-commerce.",
};

export const viewport: Viewport = {
  themeColor: "#0B2E1A",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN" className={inter.variable}>
      <body>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
