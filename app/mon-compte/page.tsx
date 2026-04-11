import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SignOutButton } from "@/components/sign-out-button";
import { MonCompteForm } from "./mon-compte-form";
import { StarRating } from "@/components/star-rating";
import { Separator } from "@/components/ui/separator";
import { placeCategoryLabel, categoryLabel, eventTypeLabel } from "@/lib/constants";
import type { UserProfile, Recommendation, Place, Profile, HilmyEvent } from "@/lib/constants";

export default async function MonComptePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/inscription");

  const { data } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const profile = data as UserProfile | null;
  if (!profile) redirect("/onboarding");

  // Fetch my recommendations
  const { data: recsData } = await supabase
    .from("recommendations")
    .select("*, places(id, name, city, hilmy_category), profiles(nom, slug, categorie)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const recs = (recsData ?? []) as (Recommendation & {
    places: Pick<Place, "id" | "name" | "city" | "hilmy_category"> | null;
    profiles: Pick<Profile, "nom" | "slug" | "categorie"> | null;
  })[];

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading text-2xl md:text-3xl font-semibold text-green-deep">
                Mon compte
              </h1>
              <p className="mt-2 text-muted-foreground">
                Salut {profile.prenom}, c&apos;est ton espace.
              </p>
            </div>
            <SignOutButton />
          </div>

          <div className="mt-8 bg-card-white rounded-2xl shadow-sm border border-border-subtle p-6 md:p-8">
            <MonCompteForm userId={user.id} profile={profile} />
          </div>

          <Separator className="my-10 bg-border-subtle" />

          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-xl font-medium text-green-deep">
                Mes recommandations
              </h2>
              <Link
                href="/recommander"
                className="text-sm text-gold hover:underline"
              >
                Partager une adresse
              </Link>
            </div>

            {recs.length === 0 ? (
              <div className="bg-card-white rounded-2xl shadow-sm border border-border-subtle p-8 text-center">
                <p className="text-muted-foreground">
                  Tu n&apos;as encore rien partagé. Tes bonnes adresses
                  attendent.
                </p>
                <Link
                  href="/recommander"
                  className="inline-flex items-center justify-center rounded-full px-6 py-2 mt-4 text-sm font-medium bg-green-deep text-primary-foreground hover:bg-green-deep/90 transition-colors"
                >
                  Je partage une adresse
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recs.map((rec) => {
                  const isPlace = rec.type === "place" && rec.places;
                  const name = isPlace ? rec.places!.name : rec.profiles?.nom ?? "Prestataire";
                  const cat = isPlace ? placeCategoryLabel(rec.places!.hilmy_category) : categoryLabel(rec.profiles?.categorie ?? "");
                  const href = isPlace ? `/lieu/${rec.places!.id}` : rec.profiles?.slug ? `/prestataire/${rec.profiles.slug}` : "#";

                  return (
                    <Link
                      key={rec.id}
                      href={href}
                      className="block bg-card-white rounded-2xl shadow-sm border border-border-subtle p-5 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-heading text-base font-medium text-foreground">
                            {name}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">{cat}</p>
                          {rec.rating && (
                            <div className="mt-1">
                              <StarRating value={rec.rating} readonly size="sm" />
                            </div>
                          )}
                          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                            {rec.comment}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(rec.created_at).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <Separator className="my-10 bg-border-subtle" />

          <MesEvenements userId={user.id} />
        </div>
      </main>
      <Footer />
    </>
  );
}

async function MesEvenements({ userId }: { userId: string }) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const events = (data ?? []) as HilmyEvent[];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-xl font-light text-green-deep">
          Mes événements
        </h2>
        <Link href="/proposer-un-evenement" className="text-sm text-gold hover:underline">
          Proposer un événement
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="bg-card-white rounded-2xl shadow-sm border border-border-subtle p-8 text-center">
          <p className="text-muted-foreground">
            Tu n&apos;as encore proposé aucun événement.
          </p>
          <Link
            href="/proposer-un-evenement"
            className="inline-flex items-center justify-center rounded-full px-6 py-2 mt-4 text-sm font-medium bg-green-deep text-primary-foreground hover:bg-green-deep/90 transition-colors"
          >
            Je propose un événement
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((evt) => (
            <Link
              key={evt.id}
              href={`/evenement/${evt.id}`}
              className="block bg-card-white rounded-2xl shadow-sm border border-border-subtle p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading text-base font-normal text-foreground">{evt.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {eventTypeLabel(evt.event_type)} · {new Date(evt.start_date).toLocaleDateString("fr-FR")}
                    {evt.city ? ` · ${evt.city}` : evt.format === "en_ligne" ? " · En ligne" : ""}
                  </p>
                </div>
                <span className={`text-xs shrink-0 px-2 py-0.5 rounded-full ${
                  evt.status === "published" ? "bg-green-deep/10 text-green-deep"
                  : evt.status === "flagged" ? "bg-gold/20 text-gold"
                  : "bg-muted text-muted-foreground"
                }`}>
                  {evt.status === "published" ? "En ligne" : evt.status === "past" ? "Passé" : "Signalé"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
