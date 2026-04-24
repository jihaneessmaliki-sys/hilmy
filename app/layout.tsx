import type { Metadata } from "next";
import { Fraunces, DM_Sans } from "next/font/google";
import { AuthListener } from "@/components/auth-listener";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { createClient } from "@/lib/supabase/server";
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
  title: "Hilmy — Le carnet d'adresses qui circule entre femmes",
  description:
    "Le carnet des bonnes adresses qui circule entre femmes, enfin digitalisé. Coiffeuses, thérapeutes, spas, restos, événements — vérifiés entre copines.",
  keywords:
    "carnet adresses femmes, bonnes adresses femmes francophones, annuaire coiffeuses, thérapeutes femmes, spas femmes, événements femmes Suisse France Belgique Luxembourg Monaco",
  openGraph: {
    title: "Hilmy — Le carnet d'adresses qui circule entre femmes",
    description:
      "Le carnet des bonnes adresses qui circule entre femmes, enfin digitalisé.",
    siteName: "Hilmy",
    locale: "fr_FR",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html
      lang="fr"
      className={`${fraunces.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <SessionProvider initialUser={user}>
          <AuthListener />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
