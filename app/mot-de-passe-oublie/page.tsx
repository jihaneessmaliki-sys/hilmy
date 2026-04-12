"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: "https://hilmy.io/auth/callback" }
    );

    if (resetError) {
      setError("Une erreur est survenue. Vérifie ton email et réessaie.");
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
              <h1 className="font-heading text-3xl font-semibold text-green-deep">
                Mot de passe oublié ?
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Entre ton email, on t&apos;envoie un lien pour le réinitialiser.
              </p>
            </div>

            {sent ? (
              <div className="text-center space-y-4">
                <p className="text-sm text-green-deep font-medium">
                  C&apos;est envoyé ! Vérifie ta boîte mail (et tes spams, on ne
                  sait jamais).
                </p>
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

                {error && <p className="text-sm text-red-600">{error}</p>}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-green-deep text-primary-foreground hover:bg-green-deep/90 mt-2"
                >
                  {loading ? "Envoi en cours..." : "Envoyer le lien"}
                </Button>
              </form>
            )}

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Tu t&apos;en souviens finalement ?{" "}
                <Link
                  href="/connexion"
                  className="text-gold hover:underline font-medium"
                >
                  Connecte-toi
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
