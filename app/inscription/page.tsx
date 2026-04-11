"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function InscriptionPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="bg-card-white rounded-2xl shadow-sm border border-border-subtle p-8">
            <div className="text-center mb-8">
              <h1 className="font-heading text-2xl font-semibold text-green-deep">
                {sent ? "Regarde ta boîte mail" : "Rejoins les filles"}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {sent
                  ? "On t'a envoyé un lien magique. Clique dessus et c'est parti."
                  : "Entre ton email et on t'envoie un lien pour te connecter. Simple, rapide, pas de mot de passe."}
              </p>
            </div>

            {sent ? (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-deep/10 mb-4">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-green-deep"
                  >
                    <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm text-muted-foreground">
                  On a envoyé un lien à{" "}
                  <span className="font-medium text-foreground">{email}</span>.
                </p>
                <Button
                  variant="outline"
                  className="mt-6 rounded-full border-green-deep text-green-deep hover:bg-green-deep/5"
                  onClick={() => {
                    setSent(false);
                    setEmail("");
                  }}
                >
                  Utiliser une autre adresse
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm text-foreground">
                    Ton email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="sara@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-cream border-border-subtle"
                  />
                </div>
                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-green-deep text-primary-foreground hover:bg-green-deep/90"
                >
                  {loading ? "On t'envoie ça..." : "Recevoir mon lien"}
                </Button>
              </form>
            )}
          </div>

          <div className="mt-6 p-4 rounded-xl bg-gold/5 border border-gold/20">
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              Hilmy est un cercle de femmes. En t&apos;inscrivant, tu confirmes
              sur l&apos;honneur être une femme. Si tu as un doute sur un profil,
              tu peux le signaler en un clic — on vérifie tout.
            </p>
          </div>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Tu proposes un service ?{" "}
            <Link href="/inscription-prestataire" className="text-gold hover:underline">
              Inscris-toi comme prestataire
            </Link>
          </p>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            En te connectant, tu acceptes nos{" "}
            <Link href="/cgu" className="underline">CGU</Link> et notre{" "}
            <Link href="/confidentialite" className="underline">politique de confidentialité</Link>.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
