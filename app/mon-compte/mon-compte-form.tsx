"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAYS, type UserProfile } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { Camera } from "lucide-react";

interface Props {
  userId: string;
  profile: UserProfile;
}

export function MonCompteForm({ userId, profile }: Props) {
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [prenom, setPrenom] = useState(profile.prenom);
  const [pays, setPays] = useState(profile.pays);
  const [ville, setVille] = useState(profile.ville);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    profile.avatar_url ?? null
  );
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    const supabase = createClient();

    let avatarUrl = profile.avatar_url ?? null;

    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop();
      const path = `avatars/${userId}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("uploads")
        .upload(path, avatarFile, { upsert: true });

      if (!uploadErr) {
        const { data: urlData } = supabase.storage
          .from("uploads")
          .getPublicUrl(path);
        avatarUrl = urlData.publicUrl;
      }
    }

    await supabase
      .from("user_profiles")
      .update({
        prenom: prenom.trim(),
        pays,
        ville: ville.trim(),
        bio: bio.trim() || null,
        avatar_url: avatarUrl,
      })
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

      {/* Avatar */}
      <div className="flex flex-col items-center gap-3">
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />
        <button
          type="button"
          onClick={() => avatarInputRef.current?.click()}
          className="relative w-20 h-20 rounded-full bg-cream border-2 border-dashed border-gold/40 flex items-center justify-center cursor-pointer hover:border-gold transition-colors overflow-hidden"
        >
          {avatarPreview ? (
            <Image
              src={avatarPreview}
              alt="Avatar"
              fill
              className="object-cover"
            />
          ) : (
            <Camera className="w-7 h-7 text-gold/60" />
          )}
        </button>
        <span className="text-xs text-muted-foreground">
          Ta photo de profil
        </span>
      </div>

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

      <div className="grid grid-cols-2 gap-4">
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
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">
          Ta bio{" "}
          <span className="text-muted-foreground font-normal">(optionnel)</span>
        </Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Quelques mots sur toi..."
          rows={3}
          className="bg-cream border-border-subtle resize-none"
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
