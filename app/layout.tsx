import type { Metadata } from "next";
import { Fraunces, DM_Sans } from "next/font/google";
import { AuthListener } from "@/components/auth-listener";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hilmy — L'annuaire des femmes pour les femmes",
  description:
    "Coiffeuses, nounous, traiteuses, avocates, salons de thé, événements entre femmes… Toutes les bonnes adresses entre nous, en Suisse romande, en France, en Belgique et au Luxembourg.",
  keywords:
    "annuaire femmes, prestataires femmes, recommandations femmes, services femmes francophones, événements femmes",
  openGraph: {
    title: "Hilmy — L'annuaire des femmes pour les femmes",
    description:
      "Toutes les bonnes adresses entre femmes, en Suisse romande, en France, en Belgique et au Luxembourg.",
    siteName: "Hilmy",
    locale: "fr_FR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${fraunces.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <AuthListener />
        {children}
      </body>
    </html>
  );
}
