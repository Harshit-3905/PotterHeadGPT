import type { Metadata } from "next";
import { Cormorant_Garamond, Source_Serif_4 } from "next/font/google";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next"
import "./globals.css";

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "600"],
});

export const metadata: Metadata = {
  title: "PotterHeadGPT",
  description:
    "Ask questions about the seven Harry Potter books and get answers cited back to the text.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${sourceSerif.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
