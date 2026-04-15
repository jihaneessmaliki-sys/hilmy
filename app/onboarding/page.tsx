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

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
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

    // Check if profile already exists (via RPC to bypass PostgREST schema cache)
    const { data: existing } = await supabase.rpc("get_user_profile", {
      p_user_id: user.id,
    });

    if (existing && existing.length > 0) {
      window.location.href = "/prestataires";
      return;
    }

    const signupType = user.user_metadata?.signupType ?? "member";

    const { error: insertError } = await supabase.rpc("create_user_profile", {
      p_user_id: user.id,
      p_prenom: prenom.trim(),
      p_pays: pays,
      p_ville: ville.trim(),
      p_signup_type: signupType,
    });

    if (insertError) {
      console.error("user_profiles insert error:", insertError);
      setError(`Une erreur est survenue : ${insertError.message}`);
      setLoading(false);
      return;
    }

    window.location.href = "/prestataires";
  }

  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="bg-card-white rounded-2xl shadow-sm border border-border-subtle p-8">
            {/* Progress */}
            <div className="flex items-center gap-2 mb-8">
              <div className="h-1 flex-1 rounded-full bg-gold" />
              <div className="h-1 flex-1 rounded-full bg-gold" />
              <div className="h-1 flex-1 rounded-full bg-border-subtle" />
            </div>

            <div className="text-center mb-8">
              <h1 className="font-heading text-3xl font-semibold text-green-deep">
                Bienvenue chez nous
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Quelques infos pour personnaliser ton expérience.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pays</Label>
                  <Select
                    value={pays || undefined}
                    onValueChange={(v) => { if (v) setPays(v); }}
                  >
                    <SelectTrigger className="bg-cream border-border-subtle">
                      <SelectValue placeholder="Pays..." />
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
                  <Label htmlFor="ville">Ville</Label>
                  <Input
                    id="ville"
                    value={ville}
                    onChange={(e) => setVille(e.target.value)}
                    required
                    placeholder="Genève, Lyon..."
                    className="bg-cream border-border-subtle"
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <Button
                type="submit"
                disabled={loading || !prenom.trim() || !pays || !ville.trim()}
                className="w-full rounded-full bg-green-deep text-primary-foreground hover:bg-green-deep/90 mt-2"
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
