"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
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
import { CATEGORIES_MAP, PAYS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { Camera, ImagePlus, X, Film } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [domaine, setDomaine] = useState("");
  const [pays, setPays] = useState("");
  const [ville, setVille] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Avatar
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Media (photos + vidéos)
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<
    { url: string; type: "image" | "video" }[]
  >([]);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function handleMediaAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (mediaFiles.length + files.length > 6) {
      setError("Maximum 6 fichiers.");
      return;
    }

    const newFiles = [...mediaFiles, ...files];
    const newPreviews = [
      ...mediaPreviews,
      ...files.map((f) => ({
        url: URL.createObjectURL(f),
        type: f.type.startsWith("video/") ? "video" as const : "image" as const,
      })),
    ];

    setMediaFiles(newFiles);
    setMediaPreviews(newPreviews);
    if (mediaInputRef.current) mediaInputRef.current.value = "";
  }

  function removeMedia(index: number) {
    URL.revokeObjectURL(mediaPreviews[index].url);
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
    setMediaPreviews((prev) => prev.filter((_, i) => i !== index));
  }

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

    // Check if profile already exists
    const { data: existing } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (existing) {
      router.push("/prestataires");
      return;
    }

    // Upload avatar if provided
    let avatarUrl: string | null = null;
    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop();
      const path = `avatars/${user.id}.${ext}`;
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

    // Upload media files
    const mediaUrls: string[] = [];
    for (let i = 0; i < mediaFiles.length; i++) {
      const file = mediaFiles[i];
      const ext = file.name.split(".").pop();
      const path = `media/${user.id}/${Date.now()}-${i}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("uploads")
        .upload(path, file);

      if (!uploadErr) {
        const { data: urlData } = supabase.storage
          .from("uploads")
          .getPublicUrl(path);
        mediaUrls.push(urlData.publicUrl);
      }
    }

    // Insert profile
    const { error: insertError } = await supabase
      .from("user_profiles")
      .insert({
        user_id: user.id,
        prenom: prenom.trim(),
        nom: nom.trim(),
        domaine,
        pays,
        ville: ville.trim(),
        bio: bio.trim() || null,
        avatar_url: avatarUrl,
        media_urls: mediaUrls.length > 0 ? mediaUrls : null,
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
        <div className="w-full max-w-lg">
          <div className="bg-card-white rounded-2xl shadow-sm border border-border-subtle p-8">
            {/* Progress */}
            <div className="flex items-center gap-2 mb-8">
              <div className="h-1 flex-1 rounded-full bg-gold" />
              <div className="h-1 flex-1 rounded-full bg-gold" />
              <div className="h-1 flex-1 rounded-full bg-border-subtle" />
            </div>

            <div className="text-center mb-8">
              <h1 className="font-heading text-3xl font-semibold text-green-deep">
                Complète ton profil
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Dis-nous un peu plus sur toi pour personnaliser ton expérience.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
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
                  className="relative w-24 h-24 rounded-full bg-cream border-2 border-dashed border-gold/40 flex items-center justify-center cursor-pointer hover:border-gold transition-colors overflow-hidden"
                >
                  {avatarPreview ? (
                    <Image
                      src={avatarPreview}
                      alt="Avatar"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <Camera className="w-8 h-8 text-gold/60" />
                  )}
                </button>
                <span className="text-xs text-muted-foreground">
                  Ajoute ta photo (optionnel)
                </span>
              </div>

              {/* Prénom & Nom */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prenom">Prénom</Label>
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
                  <Label htmlFor="nom">Nom</Label>
                  <Input
                    id="nom"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    required
                    placeholder="El Amrani"
                    className="bg-cream border-border-subtle"
                  />
                </div>
              </div>

              {/* Domaine */}
              <div className="space-y-2">
                <Label>Ce qui t&apos;intéresse le plus</Label>
                <Select
                  value={domaine || undefined}
                  onValueChange={(v) => { if (v) setDomaine(v); }}
                >
                  <SelectTrigger className="bg-cream border-border-subtle">
                    <SelectValue placeholder="Choisis un domaine..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORIES_MAP).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Tu pourras en sélectionner d&apos;autres plus tard.
                </p>
              </div>

              {/* Localisation */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pays</Label>
                  <Select
                    value={pays || undefined}
                    onValueChange={(v) => { if (v) setPays(v); }}
                    required
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

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio">
                  Quelques mots sur toi{" "}
                  <span className="text-muted-foreground font-normal">(optionnel)</span>
                </Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Ce que tu aimes, ce que tu cherches..."
                  rows={3}
                  className="bg-cream border-border-subtle resize-none"
                />
              </div>

              {/* Photos / Vidéos d'activité */}
              <div className="space-y-3">
                <Label>
                  Photos &amp; vidéos de ton activité{" "}
                  <span className="text-muted-foreground font-normal">(optionnel)</span>
                </Label>
                <input
                  ref={mediaInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={handleMediaAdd}
                />
                <div className="grid grid-cols-3 gap-3">
                  {mediaPreviews.map((media, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-border-subtle">
                      {media.type === "video" ? (
                        <div className="w-full h-full bg-green-deep/10 flex items-center justify-center">
                          <Film className="w-8 h-8 text-green-deep/40" />
                        </div>
                      ) : (
                        <Image
                          src={media.url}
                          alt=""
                          fill
                          className="object-cover"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => removeMedia(i)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/80 flex items-center justify-center hover:bg-white"
                      >
                        <X className="w-3.5 h-3.5 text-foreground" />
                      </button>
                    </div>
                  ))}
                  {mediaPreviews.length < 6 && (
                    <button
                      type="button"
                      onClick={() => mediaInputRef.current?.click()}
                      className="aspect-square rounded-xl bg-cream border-2 border-dashed border-gold/30 flex flex-col items-center justify-center cursor-pointer hover:border-gold transition-colors"
                    >
                      <ImagePlus className="w-6 h-6 text-gold/50 mb-1" />
                      <span className="text-[10px] text-muted-foreground">Ajouter</span>
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Montre ton savoir-faire : créations, avant/après, ambiance...
                  Jusqu&apos;à 6 photos ou vidéos.
                </p>
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
