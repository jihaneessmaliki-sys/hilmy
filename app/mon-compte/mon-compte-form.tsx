"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { PAYS, type UserProfile } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

interface Props {
  userId: string;
  profile: UserProfile;
}

export function MonCompteForm({ userId, profile }: Props) {
  const router = useRouter();
  const [prenom, setPrenom] = useState(profile.prenom);
  const [pays, setPays] = useState(profile.pays);
  const [ville, setVille] = useState(profile.ville);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    const supabase = createClient();
    await supabase
      .from("user_profiles")
      .update({ prenom: prenom.trim(), pays, ville: ville.trim() })
      .eq("user_id", userId);

    setSuccess(true);
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {success && (
        <div className="p-4 rounded-xl bg-green-deep/5 border border-green-deep/20">
          <p className="text-sm text-green-deep font-medium">
            C&apos;est mis à jour.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="prenom">Ton prénom</Label>
        <Input
          id="prenom"
          value={prenom}
          onChange={(e) => setPrenom(e.target.value)}
          required
          className="bg-cream border-border-subtle"
        />
      </div>

      <div className="space-y-2">
        <Label>Ton pays</Label>
        <Select value={pays} onValueChange={(v) => { if (v) setPays(v); }}>
          <SelectTrigger className="bg-cream border-border-subtle">
            <SelectValue />
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

      <Button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-green-deep text-primary-foreground hover:bg-green-deep/90"
      >
        {loading ? "Un instant..." : "Enregistrer"}
      </Button>
    </form>
  );
}
