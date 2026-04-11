"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: insertError } = await supabase
      .from("waitlist")
      .insert({ email: email.trim().toLowerCase() });

    if (insertError) {
      if (insertError.code === "23505") {
        setError("Vous êtes déjà sur la liste.");
      } else {
        setError("Une erreur est survenue. Réessayez.");
      }
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);
  }

  if (done) {
    return (
      <p className="text-sm text-green-deep font-medium">
        Merci, vous êtes sur la liste.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
      <Input
        type="email"
        placeholder="votre@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="bg-card-white border-border-subtle flex-1"
      />
      <Button
        type="submit"
        disabled={loading}
        className="rounded-full px-6 bg-green-deep text-primary-foreground hover:bg-green-deep/90 shrink-0"
      >
        {loading ? "..." : "Me prévenir"}
      </Button>
      {error && (
        <p className="text-sm text-gold basis-full text-center sm:text-left">{error}</p>
      )}
    </form>
  );
}
