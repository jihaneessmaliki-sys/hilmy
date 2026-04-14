"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function ReinitialiserMotDePassePage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
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
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(
        "Une erreur est survenue. Le lien a peut-être expiré, réessaie depuis la page de connexion."
      );
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    setTimeout(() => router.push("/connexion"), 2000);
  }

  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="bg-card-white rounded-2xl shadow-sm border border-border-subtle p-8">
            <div className="text-center mb-8">
              <h1 className="font-heading text-3xl font-semibold text-green-deep">
                Choisis ton nouveau mot de passe
              </h1>
            </div>

            {success ? (
              <div className="text-center space-y-4">
                <p className="text-sm text-green-deep font-medium">
                  C&apos;est bon, ton mot de passe a été mis à jour !
                </p>
                <p className="text-xs text-muted-foreground">
                  Redirection vers la connexion...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm text-foreground">
                    Nouveau mot de passe
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
                    Confirme ton nouveau mot de passe
                  </Label>
                  <Input
                    id="confirm"
                    type="password"
                    placeholder="Minimum 8 caractères"
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
                  {loading ? "Mise à jour..." : "Mettre à jour"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
