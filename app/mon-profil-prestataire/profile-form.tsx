"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
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
import {
  CATEGORIES,
  PAYS,
  categoryLabel,
  type Profile,
} from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

interface Props {
  userId: string;
  profile: Profile | null;
}

export function ProfileForm({ userId, profile }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    nom: profile?.nom ?? "",
    categorie: profile?.categorie ?? "",
    pays: profile?.pays ?? "",
    region: profile?.region ?? "",
    ville: profile?.ville ?? "",
    code_postal: profile?.code_postal ?? "",
    zone_intervention: profile?.zone_intervention ?? "",
    description: profile?.description ?? "",
    whatsapp: profile?.whatsapp ?? "",
    instagram: profile?.instagram ?? "",
  });

  const [photos, setPhotos] = useState<string[]>(profile?.photos ?? []);
  const [newFiles, setNewFiles] = useState<File[]>([]);

  function update(field: string, value: string | null) {
    setForm((prev) => ({ ...prev, [field]: value ?? "" }));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const totalSlots = 3 - photos.length;
    const accepted = files.slice(0, Math.max(0, totalSlots));
    setNewFiles((prev) => [...prev, ...accepted].slice(0, 3 - photos.length));
  }

  function removeExistingPhoto(url: string) {
    setPhotos((prev) => prev.filter((p) => p !== url));
  }

  function removeNewFile(idx: number) {
    setNewFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    const supabase = createClient();

    const uploadedUrls: string[] = [];
    for (const file of newFiles) {
      const ts = Date.now();
      const path = `${userId}/${ts}-${file.name}`;
      const { error } = await supabase.storage
        .from("profile-photos")
        .upload(path, file);

      if (!error) {
        const {
          data: { publicUrl },
        } = supabase.storage.from("profile-photos").getPublicUrl(path);
        uploadedUrls.push(publicUrl);
      }
    }

    const allPhotos = [...photos, ...uploadedUrls].slice(0, 3);

    const payload = {
      user_id: userId,
      nom: form.nom,
      categorie: form.categorie,
      pays: form.pays,
      region: form.region || null,
      ville: form.ville,
      code_postal: form.code_postal || null,
      zone_intervention: form.zone_intervention || null,
      description: form.description || null,
      whatsapp: form.whatsapp,
      instagram: form.instagram || null,
      photos: allPhotos,
      status: "pending" as const,
    };

    const { error: upsertError } = await supabase.from("profiles").upsert(payload, {
      onConflict: "user_id",
    });

    if (upsertError) {
      console.error(upsertError);
      setLoading(false);
      return;
    }

    setPhotos(allPhotos);
    setNewFiles([]);
    setSuccess(true);
    setLoading(false);
    router.refresh();
  }

  const totalPhotos = photos.length + newFiles.length;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {success && (
        <div className="p-4 rounded-xl bg-green-deep/5 border border-green-deep/20">
          <p className="text-sm text-green-deep font-medium">
            C&apos;est enregistré. Ton profil sera visible après validation.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nom">Ton nom / raison sociale</Label>
          <Input
            id="nom"
            value={form.nom}
            onChange={(e) => update("nom", e.target.value)}
            required
            className="bg-cream border-border-subtle"
          />
        </div>
        <div className="space-y-2">
          <Label>Catégorie</Label>
          <Select
            value={form.categorie || undefined}
            onValueChange={(v) => update("categorie", v)}
            required
          >
            <SelectTrigger className="bg-cream border-border-subtle">
              <SelectValue placeholder="Choisis..." />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {categoryLabel(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Pays</Label>
          <Select
            value={form.pays || undefined}
            onValueChange={(v) => update("pays", v)}
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
          <Label htmlFor="region">Région / Canton</Label>
          <Input
            id="region"
            value={form.region}
            onChange={(e) => update("region", e.target.value)}
            placeholder="Ex: Genève, Île-de-France, Wallonie..."
            className="bg-cream border-border-subtle"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="ville">Ville</Label>
          <Input
            id="ville"
            value={form.ville}
            onChange={(e) => update("ville", e.target.value)}
            required
            placeholder="Ex: Genève, Lyon, Bruxelles..."
            className="bg-cream border-border-subtle"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="code_postal">Code postal</Label>
          <Input
            id="code_postal"
            value={form.code_postal}
            onChange={(e) => update("code_postal", e.target.value)}
            placeholder="Optionnel"
            className="bg-cream border-border-subtle"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="zone_intervention">Zone d&apos;intervention</Label>
        <Input
          id="zone_intervention"
          value={form.zone_intervention}
          onChange={(e) => update("zone_intervention", e.target.value)}
          placeholder="Ex: Toute la région lémanique, Paris intra-muros..."
          className="bg-cream border-border-subtle"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Raconte ton activité</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          rows={5}
          placeholder="Qu'est-ce que tu fais ? Qu'est-ce qui te rend spéciale ?"
          className="bg-cream border-border-subtle resize-none"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="whatsapp">WhatsApp</Label>
          <Input
            id="whatsapp"
            value={form.whatsapp}
            onChange={(e) => update("whatsapp", e.target.value)}
            required
            placeholder="+41 76 123 45 67"
            className="bg-cream border-border-subtle"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="instagram">Instagram</Label>
          <Input
            id="instagram"
            value={form.instagram}
            onChange={(e) => update("instagram", e.target.value)}
            placeholder="@ton_compte"
            className="bg-cream border-border-subtle"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Photos (max 3)</Label>
        <div className="flex flex-wrap gap-3">
          {photos.map((url) => (
            <div key={url} className="relative w-24 h-24 rounded-xl overflow-hidden border border-border-subtle">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="object-cover w-full h-full" />
              <button type="button" onClick={() => removeExistingPhoto(url)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-foreground/70 text-white flex items-center justify-center text-xs">x</button>
            </div>
          ))}
          {newFiles.map((file, idx) => (
            <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden border border-border-subtle">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={URL.createObjectURL(file)} alt="" className="object-cover w-full h-full" />
              <button type="button" onClick={() => removeNewFile(idx)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-foreground/70 text-white flex items-center justify-center text-xs">x</button>
            </div>
          ))}
          {totalPhotos < 3 && (
            <button type="button" onClick={() => fileRef.current?.click()} className="w-24 h-24 rounded-xl border-2 border-dashed border-border-subtle flex items-center justify-center text-muted-foreground hover:border-gold transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
      </div>

      <Button type="submit" disabled={loading} className="w-full rounded-full bg-green-deep text-primary-foreground hover:bg-green-deep/90">
        {loading ? "Un instant..." : "Enregistrer mon profil"}
      </Button>
    </form>
  );
}
