"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
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
import { EVENT_TYPES, eventTypeLabel, PAYS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

export default function ProposerEvenementPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    event_type: "",
    format: "presentiel" as "presentiel" | "en_ligne",
    start_date: "",
    end_date: "",
    country: "",
    region: "",
    city: "",
    address: "",
    online_link: "",
    description: "",
    external_signup_url: "",
    price_type: "gratuit" as "gratuit" | "payant",
    price_amount: "",
    price_currency: "EUR",
  });

  const [flyerFile, setFlyerFile] = useState<File | null>(null);
  const [flyerPreview, setFlyerPreview] = useState<string | null>(null);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Le fichier est trop gros (max 5 Mo).");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      alert("Format non supporté. Utilise JPG, PNG ou WebP.");
      return;
    }
    setFlyerFile(file);
    setFlyerPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!flyerFile) return;
    if (form.description.trim().length < 50) return;
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/inscription"); return; }

    // Upload flyer
    const ts = Date.now();
    const path = `${user.id}/${ts}-${flyerFile.name}`;
    const { error: uploadError } = await supabase.storage
      .from("event-flyers")
      .upload(path, flyerFile);

    if (uploadError) {
      console.error(uploadError);
      setLoading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("event-flyers")
      .getPublicUrl(path);

    const payload = {
      user_id: user.id,
      title: form.title.trim(),
      description: form.description.trim(),
      event_type: form.event_type,
      format: form.format,
      start_date: new Date(form.start_date).toISOString(),
      end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
      country: form.format === "presentiel" ? form.country : null,
      region: form.format === "presentiel" ? form.region || null : null,
      city: form.format === "presentiel" ? form.city : null,
      address: form.format === "presentiel" ? form.address : null,
      online_link: form.format === "en_ligne" ? form.online_link || null : null,
      flyer_url: publicUrl,
      external_signup_url: form.external_signup_url || null,
      price_type: form.price_type,
      price_amount: form.price_type === "payant" ? parseFloat(form.price_amount) || null : null,
      price_currency: form.price_type === "payant" ? form.price_currency : null,
      status: "published",
    };

    const { data: newEvent, error } = await supabase
      .from("events")
      .insert(payload)
      .select("id")
      .single();

    if (error || !newEvent) {
      console.error(error);
      setLoading(false);
      return;
    }

    router.push(`/evenement/${newEvent.id}`);
  }

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="text-center mb-12">
            <span className="inline-block font-sans text-xs font-medium uppercase tracking-[0.32em] text-gold mb-8">
              Propose un événement
            </span>
            <h1 className="font-heading text-3xl md:text-4xl font-light text-green-deep leading-tight tracking-tight">
              Partage ton événement avec les filles.
            </h1>
            <p className="mt-4 text-base leading-[1.7] text-[#4a4a4a] max-w-lg mx-auto">
              Tu organises quelque chose entre femmes ? Atelier, brunch,
              masterclass, retraite... Raconte-nous tout ici, et on le fait
              connaître.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Titre de l&apos;événement</Label>
              <Input id="title" value={form.title} onChange={(e) => update("title", e.target.value)} required className="bg-cream border-border-subtle" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.event_type || undefined} onValueChange={(v) => { if (v) update("event_type", v); }} required>
                  <SelectTrigger className="bg-cream border-border-subtle"><SelectValue placeholder="Choisis..." /></SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t) => (<SelectItem key={t} value={t}>{eventTypeLabel(t)}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Format</Label>
                <div className="flex gap-3 pt-2">
                  {[
                    { value: "presentiel", label: "En présentiel" },
                    { value: "en_ligne", label: "En ligne" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => update("format", opt.value)}
                      className={`text-sm px-4 py-2 rounded-full border transition-colors ${form.format === opt.value ? "bg-gold/20 border-gold text-gold" : "border-border-subtle text-muted-foreground hover:border-gold/50"}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Date de début</Label>
                <Input id="start_date" type="datetime-local" value={form.start_date} onChange={(e) => update("start_date", e.target.value)} required className="bg-cream border-border-subtle" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Date de fin (optionnel)</Label>
                <Input id="end_date" type="datetime-local" value={form.end_date} onChange={(e) => update("end_date", e.target.value)} className="bg-cream border-border-subtle" />
              </div>
            </div>

            {form.format === "presentiel" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Pays</Label>
                    <Select value={form.country || undefined} onValueChange={(v) => { if (v) update("country", v); }} required>
                      <SelectTrigger className="bg-cream border-border-subtle"><SelectValue placeholder="Pays..." /></SelectTrigger>
                      <SelectContent>
                        {PAYS.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="region">Région (optionnel)</Label>
                    <Input id="region" value={form.region} onChange={(e) => update("region", e.target.value)} className="bg-cream border-border-subtle" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Ville</Label>
                    <Input id="city" value={form.city} onChange={(e) => update("city", e.target.value)} required className="bg-cream border-border-subtle" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Adresse</Label>
                    <Input id="address" value={form.address} onChange={(e) => update("address", e.target.value)} required className="bg-cream border-border-subtle" />
                  </div>
                </div>
              </>
            )}

            {form.format === "en_ligne" && (
              <div className="space-y-2">
                <Label htmlFor="online_link">Lien de connexion (optionnel)</Label>
                <Input id="online_link" type="url" value={form.online_link} onChange={(e) => update("online_link", e.target.value)} placeholder="https://..." className="bg-cream border-border-subtle" />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Raconte ton événement</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                rows={6}
                required
                minLength={50}
                placeholder="Raconte ton événement comme à une copine. Ce qu'il y aura, à qui ça s'adresse, ce qu'on en retire..."
                className="bg-cream border-border-subtle resize-none"
              />
              <p className="text-xs text-muted-foreground">{form.description.trim().length}/50 caractères minimum</p>
            </div>

            <div className="space-y-2">
              <Label>Photo du flyer (obligatoire)</Label>
              {flyerPreview ? (
                <div className="relative w-48">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={flyerPreview} alt="Aperçu" className="rounded-lg border border-border-subtle" />
                  <button type="button" onClick={() => { setFlyerFile(null); setFlyerPreview(null); }} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-foreground/70 text-white flex items-center justify-center text-xs">x</button>
                </div>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()} className="w-48 h-60 rounded-lg border-2 border-dashed border-border-subtle flex flex-col items-center justify-center text-muted-foreground hover:border-gold transition-colors gap-2">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  <span className="text-xs">JPG, PNG ou WebP (max 5 Mo)</span>
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="external_signup_url">Lien d&apos;inscription (optionnel)</Label>
              <Input id="external_signup_url" type="url" value={form.external_signup_url} onChange={(e) => update("external_signup_url", e.target.value)} placeholder="Eventbrite, Billetweb, ton site, WhatsApp..." className="bg-cream border-border-subtle" />
              <p className="text-xs text-muted-foreground">Mets le lien où les filles peuvent réserver.</p>
            </div>

            <div className="space-y-2">
              <Label>Prix</Label>
              <div className="flex gap-3">
                {[
                  { value: "gratuit", label: "Gratuit" },
                  { value: "payant", label: "Payant" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update("price_type", opt.value)}
                    className={`text-sm px-4 py-2 rounded-full border transition-colors ${form.price_type === opt.value ? "bg-gold/20 border-gold text-gold" : "border-border-subtle text-muted-foreground hover:border-gold/50"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {form.price_type === "payant" && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <Input type="number" min="0" step="0.01" value={form.price_amount} onChange={(e) => update("price_amount", e.target.value)} placeholder="Montant" className="bg-cream border-border-subtle" />
                  <Select value={form.price_currency} onValueChange={(v) => { if (v) update("price_currency", v); }}>
                    <SelectTrigger className="bg-cream border-border-subtle"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="CHF">CHF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading || !flyerFile || !form.title.trim() || !form.event_type || !form.start_date || form.description.trim().length < 50}
              className="w-full rounded-full px-12 py-5 text-base font-medium tracking-wide bg-green-deep text-[#F5F0E6] hover:bg-green-deep/90"
            >
              {loading ? "Un instant..." : "Je partage avec les filles"}
            </Button>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}
