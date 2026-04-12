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

export default function ConnexionPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Email ou mot de passe incorrect.");
      setLoading(false);
      return;
    }

    // Check if user has a profile already
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        router.push("/onboarding");
        return;
      }
    }

    router.push("/prestataires");
  }

  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="bg-card-white rounded-2xl shadow-sm border border-border-subtle p-8">
            <div className="text-center mb-8">
              <h1 className="font-heading text-3xl font-semibold text-green-deep">
                Bon retour parmi nous
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Connecte-toi pour retrouver tes bonnes adresses.
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
                  placeholder="Ton mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-cream border-border-subtle"
                />
              </div>

              <div className="text-right">
                <Link
                  href="/mot-de-passe-oublie"
                  className="text-sm text-gold hover:underline font-medium"
                >
                  Mot de passe oublié ?
                </Link>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <Button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-green-deep text-primary-foreground hover:bg-green-deep/90 mt-2"
              >
                {loading ? "Connexion..." : "Me connecter"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Pas encore de compte ?{" "}
                <Link href="/inscription" className="text-gold hover:underline font-medium">
                  Inscris-toi
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
