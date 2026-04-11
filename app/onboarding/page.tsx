"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAYS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingPage() {
  const router = useRouter();
  const [prenom, setPrenom] = useState("");
  const [pays, setPays] = useState("");
  const [ville, setVille] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/inscription");
      return;
    }

    const { data: existing } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (existing) {
      router.push("/prestataires");
      return;
    }

    const { error: insertError } = await supabase
      .from("user_profiles")
      .insert({
        user_id: user.id,
        prenom: prenom.trim(),
        pays,
        ville: ville.trim(),
      });

    if (insertError) {
      setError("Une erreur est survenue. Réessaie.");
      setLoading(false);
      return;
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
              <h1 className="font-heading text-2xl font-semibold text-green-deep">
                Bienvenue chez nous
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Dis-nous comment tu t&apos;appelles et où tu es. C&apos;est tout
                ce qu&apos;il nous faut.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prenom">Ton prénom</Label>
                <Input
                  id="prenom"
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  required
                  placeholder="Sara"
                  className="bg-cream border-border-subtle"
                />
              </div>
              <div className="space-y-2">
                <Label>Ton pays</Label>
                <Select
                  value={pays || undefined}
                  onValueChange={(v) => { if (v) setPays(v); }}
                  required
                >
                  <SelectTrigger className="bg-cream border-border-subtle">
                    <SelectValue placeholder="Choisis ton pays..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ville">Ta ville</Label>
                <Input
                  id="ville"
                  value={ville}
                  onChange={(e) => setVille(e.target.value)}
                  required
                  placeholder="Genève, Lyon, Bruxelles..."
                  className="bg-cream border-border-subtle"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button
                type="submit"
                disabled={loading || !prenom.trim() || !pays || !ville.trim()}
                className="w-full rounded-full bg-green-deep text-primary-foreground hover:bg-green-deep/90"
              >
                {loading ? "C'est parti..." : "Découvrir l'annuaire"}
              </Button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
