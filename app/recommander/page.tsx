"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { PlaceSearch } from "@/components/place-search";
import { StarRating } from "@/components/star-rating";
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
  PLACE_CATEGORIES,
  placeCategoryLabel,
  CATEGORIES,
  categoryLabel,
  PAYS,
  REC_TAGS,
  recTagLabel,
} from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

type Step = "choose" | "place" | "prestataire";

interface PlaceData {
  google_place_id: string;
  name: string;
  address: string;
  city: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  google_category: string | null;
}

export default function RecommanderPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("choose");
  const [loading, setLoading] = useState(false);

  // Place fields
  const [placeData, setPlaceData] = useState<PlaceData | null>(null);
  const [placeCategory, setPlaceCategory] = useState("");

  // Prestataire fields
  const [prestaNom, setPrestaNom] = useState("");
  const [prestaCategorie, setPrestaCategorie] = useState("");
  const [prestaVille, setPrestaVille] = useState("");
  const [prestaPays, setPrestaPays] = useState("");

  // Shared fields
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [priceIndicator, setPriceIndicator] = useState("");

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (comment.trim().length < 30) return;
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/inscription"); return; }

    if (step === "place" && placeData) {
      // Upsert place
      const { data: existingPlace } = await supabase
        .from("places")
        .select("id")
        .eq("google_place_id", placeData.google_place_id)
        .single();

      let placeId: string;

      if (existingPlace) {
        placeId = existingPlace.id;
      } else {
        const { data: newPlace, error } = await supabase
          .from("places")
          .insert({
            google_place_id: placeData.google_place_id,
            name: placeData.name,
            address: placeData.address,
            city: placeData.city,
            region: placeData.region || null,
            country: placeData.country,
            latitude: placeData.latitude,
            longitude: placeData.longitude,
            google_category: placeData.google_category,
            hilmy_category: placeCategory,
          })
          .select("id")
          .single();

        if (error || !newPlace) { setLoading(false); return; }
        placeId = newPlace.id;
      }

      await supabase.from("recommendations").insert({
        user_id: user.id,
        type: "place",
        place_id: placeId,
        comment: comment.trim(),
        rating,
        tags: selectedTags.length > 0 ? selectedTags : null,
        price_indicator: priceIndicator || null,
      });

      router.push(`/lieu/${placeId}`);
    }

    if (step === "prestataire") {
      // Check if prestataire exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .ilike("nom", prestaNom.trim())
        .single();

      let profileId: string;

      if (existingProfile) {
        profileId = existingProfile.id;
      } else {
        // Create ghost profile
        const slug = prestaNom.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        const { data: newProfile, error } = await supabase
          .from("profiles")
          .insert({
            nom: prestaNom.trim(),
            slug: `${slug}-${Date.now()}`,
            categorie: prestaCategorie,
            ville: prestaVille,
            pays: prestaPays,
            whatsapp: "",
            photos: [],
            status: "ghost",
          })
          .select("id")
          .single();

        if (error || !newProfile) { setLoading(false); return; }
        profileId = newProfile.id;
      }

      await supabase.from("recommendations").insert({
        user_id: user.id,
        type: "prestataire",
        profile_id: profileId,
        comment: comment.trim(),
        rating,
        tags: selectedTags.length > 0 ? selectedTags : null,
        price_indicator: priceIndicator || null,
      });

      router.push("/bonnes-adresses");
    }

    setLoading(false);
  }

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {step === "choose" && (
            <div className="text-center">
              <span className="inline-block text-[13px] font-medium uppercase tracking-[0.15em] text-gold">
                Recommander
              </span>
              <h1 className="mt-4 font-heading text-2xl md:text-4xl font-medium text-green-deep">
                Tu veux nous parler de quoi ?
              </h1>

              <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setStep("place")}
                  className="bg-card-white rounded-2xl p-8 shadow-sm border border-border-subtle hover:shadow-md hover:border-gold/50 transition-all text-center"
                >
                  <span className="block font-heading text-lg font-medium text-green-deep">
                    Un endroit
                  </span>
                  <span className="block mt-2 text-sm text-muted-foreground">
                    Un restaurant, un salon, une boutique, un spa...
                  </span>
                </button>
                <button
                  onClick={() => setStep("prestataire")}
                  className="bg-card-white rounded-2xl p-8 shadow-sm border border-border-subtle hover:shadow-md hover:border-gold/50 transition-all text-center"
                >
                  <span className="block font-heading text-lg font-medium text-green-deep">
                    Une femme
                  </span>
                  <span className="block mt-2 text-sm text-muted-foreground">
                    Une coiffeuse, une traiteuse, une avocate, une coach...
                  </span>
                </button>
              </div>
            </div>
          )}

          {step === "place" && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <button
                  type="button"
                  onClick={() => setStep("choose")}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
                >
                  &larr; Retour
                </button>
                <h1 className="font-heading text-2xl font-medium text-green-deep">
                  Raconte-nous cet endroit
                </h1>
              </div>

              <div className="space-y-2">
                <Label>Cherche le lieu</Label>
                <PlaceSearch onSelect={(p) => setPlaceData(p)} />
                {placeData && (
                  <div className="p-3 rounded-xl bg-green-deep/5 border border-green-deep/20 mt-2">
                    <p className="text-sm font-medium text-green-deep">{placeData.name}</p>
                    <p className="text-xs text-muted-foreground">{placeData.address}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select value={placeCategory || undefined} onValueChange={(v) => { if (v) setPlaceCategory(v); }} required>
                  <SelectTrigger className="bg-cream border-border-subtle">
                    <SelectValue placeholder="Choisis une catégorie..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PLACE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{placeCategoryLabel(c)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <SharedFields
                comment={comment}
                setComment={setComment}
                rating={rating}
                setRating={setRating}
                selectedTags={selectedTags}
                toggleTag={toggleTag}
                priceIndicator={priceIndicator}
                setPriceIndicator={setPriceIndicator}
              />

              <Button
                type="submit"
                disabled={loading || !placeData || !placeCategory || comment.trim().length < 30}
                className="w-full rounded-full bg-green-deep text-primary-foreground hover:bg-green-deep/90"
              >
                {loading ? "Un instant..." : "Je partage avec les filles"}
              </Button>
            </form>
          )}

          {step === "prestataire" && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <button
                  type="button"
                  onClick={() => setStep("choose")}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
                >
                  &larr; Retour
                </button>
                <h1 className="font-heading text-2xl font-medium text-green-deep">
                  Parle-nous d&apos;elle
                </h1>
              </div>

              <div className="space-y-2">
                <Label>Son nom</Label>
                <Input
                  value={prestaNom}
                  onChange={(e) => setPrestaNom(e.target.value)}
                  required
                  placeholder="Le nom de la prestataire..."
                  className="bg-cream border-border-subtle"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Catégorie</Label>
                  <Select value={prestaCategorie || undefined} onValueChange={(v) => { if (v) setPrestaCategorie(v); }} required>
                    <SelectTrigger className="bg-cream border-border-subtle">
                      <SelectValue placeholder="Choisis..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{categoryLabel(c)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Pays</Label>
                  <Select value={prestaPays || undefined} onValueChange={(v) => { if (v) setPrestaPays(v); }} required>
                    <SelectTrigger className="bg-cream border-border-subtle">
                      <SelectValue placeholder="Pays..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYS.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Sa ville</Label>
                <Input
                  value={prestaVille}
                  onChange={(e) => setPrestaVille(e.target.value)}
                  required
                  placeholder="Genève, Lyon, Bruxelles..."
                  className="bg-cream border-border-subtle"
                />
              </div>

              <SharedFields
                comment={comment}
                setComment={setComment}
                rating={rating}
                setRating={setRating}
                selectedTags={selectedTags}
                toggleTag={toggleTag}
                priceIndicator={priceIndicator}
                setPriceIndicator={setPriceIndicator}
              />

              <Button
                type="submit"
                disabled={loading || !prestaNom.trim() || !prestaCategorie || !prestaVille.trim() || !prestaPays || comment.trim().length < 30}
                className="w-full rounded-full bg-green-deep text-primary-foreground hover:bg-green-deep/90"
              >
                {loading ? "Un instant..." : "Je partage avec les filles"}
              </Button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function SharedFields({
  comment,
  setComment,
  rating,
  setRating,
  selectedTags,
  toggleTag,
  priceIndicator,
  setPriceIndicator,
}: {
  comment: string;
  setComment: (v: string) => void;
  rating: number | null;
  setRating: (v: number) => void;
  selectedTags: string[];
  toggleTag: (t: string) => void;
  priceIndicator: string;
  setPriceIndicator: (v: string) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label>Ta note</Label>
        <StarRating value={rating} onChange={setRating} />
      </div>

      <div className="space-y-2">
        <Label>Raconte</Label>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={5}
          required
          minLength={30}
          placeholder="Pourquoi t'as adoré ? Qu'est-ce qui t'a marquée ? Parle comme si tu racontais à une copine au téléphone."
          className="bg-cream border-border-subtle resize-none"
        />
        <p className="text-xs text-muted-foreground">
          {comment.trim().length}/30 caractères minimum
        </p>
      </div>

      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="flex flex-wrap gap-2">
          {REC_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                selectedTags.includes(tag)
                  ? "bg-gold/20 border-gold text-gold"
                  : "border-border-subtle text-muted-foreground hover:border-gold/50"
              }`}
            >
              {recTagLabel(tag)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Budget</Label>
        <div className="flex gap-2">
          {["€", "€€", "€€€"].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriceIndicator(priceIndicator === p ? "" : p)}
              className={`text-sm px-4 py-1.5 rounded-full border transition-colors ${
                priceIndicator === p
                  ? "bg-gold/20 border-gold text-gold"
                  : "border-border-subtle text-muted-foreground hover:border-gold/50"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
