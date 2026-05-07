import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";
import { AppNav } from "@/components/AppNav";
import { AppFooter } from "@/components/AppFooter";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["700", "800"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Eventsee — wedding & event planners",
  description:
    "Find and book vetted planners with transparent pricing and verified reviews.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${jakarta.variable} ${playfair.variable}`}>
      <body className="min-h-dvh font-sans antialiased selection:bg-sage-tint">
        <AppNav />
        <main>{children}</main>
        <AppFooter />
      </body>
    </html>
  );
}
