"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function InscriptionPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      if (authError.message.includes("already registered")) {
        setError("Ce compte existe déjà. Connecte-toi ou réinitialise ton mot de passe.");
      } else if (authError.message.includes("rate limit")) {
        setError("Trop de tentatives. Attends quelques minutes avant de réessayer.");
      } else {
        setError("Une erreur est survenue. Réessaie dans quelques instants.");
      }
      setLoading(false);
      return;
    }

    setEmailSent(true);
    setLoading(false);
  }

  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="bg-card-white rounded-2xl shadow-sm border border-border-subtle p-8">
            {emailSent ? (
              <div className="text-center space-y-4 py-4">
                <h1 className="font-heading text-3xl font-semibold text-green-deep">
                  Vérifie ta boîte mail
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  On t&apos;a envoyé un email à <strong className="text-foreground">{email}</strong>.
                  <br />
                  Clique sur le lien pour confirmer ton compte et accéder à Hilmy.
                </p>
                <p className="text-xs text-muted-foreground">
                  Rien reçu ? Vérifie tes spams, on ne sait jamais.
                </p>
                <div className="pt-4">
                  <Link
                    href="/connexion"
                    className="text-sm text-gold hover:underline font-medium"
                  >
                    Aller à la page de connexion
                  </Link>
                </div>
              </div>
            ) : (
            <>
            <div className="text-center mb-8">
              <h1 className="font-heading text-3xl font-semibold text-green-deep">
                Crée ton compte
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Rejoins le cercle. C&apos;est gratuit, rapide, et entre nous.
              </p>
            </div>

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

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm text-foreground">
                  Ton mot de passe
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimum 8 caractères"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-cream border-border-subtle"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm" className="text-sm text-foreground">
                  Confirme ton mot de passe
                </Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="Confirme ton mot de passe"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
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
                {loading ? "Création en cours..." : "Créer mon compte"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Tu as déjà un compte ?{" "}
                <Link href="/connexion" className="text-gold hover:underline font-medium">
                  Connecte-toi
                </Link>
              </p>
            </div>
            </>
            )}
          </div>

          {!emailSent && (
            <>
              <div className="mt-6 p-4 rounded-xl bg-gold/5 border border-gold/20">
                <p className="text-xs text-muted-foreground text-center leading-relaxed">
                  Hilmy est un cercle de femmes. En t&apos;inscrivant, tu confirmes
                  sur l&apos;honneur être une femme.
                </p>
              </div>

              <p className="mt-4 text-center text-sm text-muted-foreground">
                Tu proposes un service ?{" "}
                <Link href="/inscription-prestataire" className="text-gold hover:underline">
                  Inscris-toi comme prestataire
                </Link>
              </p>

              <p className="mt-4 text-center text-xs text-muted-foreground">
                En t&apos;inscrivant, tu acceptes nos{" "}
                <Link href="/cgu" className="underline">CGU</Link> et notre{" "}
                <Link href="/confidentialite" className="underline">politique de confidentialité</Link>.
              </p>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
