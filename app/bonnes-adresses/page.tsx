import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { StarRating } from "@/components/star-rating";
import { placeCategoryLabel, categoryLabel, recTagLabel } from "@/lib/constants";
import type { Recommendation, Place, Profile } from "@/lib/constants";
import { BonnesAdressesFilters } from "./filters";

interface Props {
  searchParams: Promise<{ type?: string; categorie?: string; pays?: string; ville?: string; tri?: string }>;
}

export default async function BonnesAdressesPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("recommendations")
    .select("*, places(*), profiles(nom, slug, ville, pays, categorie)")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(50);

  if (params.type === "place") {
    query = query.eq("type", "place");
  } else if (params.type === "prestataire") {
    query = query.eq("type", "prestataire");
  }

  const { data } = await query;
  const recs = (data ?? []) as (Recommendation & { places: Place | null; profiles: Pick<Profile, "nom" | "slug" | "ville" | "pays" | "categorie"> | null })[];

  // Fetch user prénoms
  const userIds = [...new Set(recs.map((r) => r.user_id))];
  const { data: userProfiles } = await supabase
    .from("user_profiles")
    .select("user_id, prenom, ville")
    .in("user_id", userIds.length > 0 ? userIds : ["none"]);

  const userMap = new Map((userProfiles ?? []).map((u: { user_id: string; prenom: string; ville: string }) => [u.user_id, u]));

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="py-10 px-4 text-center">
          <span className="inline-block text-[13px] font-medium uppercase tracking-[0.15em] text-gold">
            Bonnes adresses
          </span>
          <h1 className="mt-3 font-heading text-3xl md:text-4xl font-medium text-green-deep">
            Les pépites des filles
          </h1>
          <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
            Tout ce que les copines ont testé, aimé et qu&apos;elles veulent te
            faire découvrir.
          </p>
        </div>

        <BonnesAdressesFilters
          currentType={params.type}
          currentPays={params.pays}
          currentVille={params.ville}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-muted-foreground">
              {recs.length} recommandation{recs.length > 1 ? "s" : ""}
            </p>
            <Link
              href="/recommander"
              className="inline-flex items-center justify-center rounded-full px-6 py-2 text-sm font-medium bg-green-deep text-primary-foreground hover:bg-green-deep/90 transition-colors"
            >
              Je partage une adresse
            </Link>
          </div>

          {recs.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-lg text-muted-foreground">
                Les filles n&apos;ont encore rien partagé.
                Sois la première à lancer le bal.
              </p>
              <Link
                href="/recommander"
                className="inline-flex items-center justify-center rounded-full px-8 py-4 mt-6 text-base font-medium bg-green-deep text-primary-foreground hover:bg-green-deep/90 transition-colors"
              >
                Je partage une adresse
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recs.map((rec) => {
                const user = userMap.get(rec.user_id);
                const isPlace = rec.type === "place" && rec.places;
                const name = isPlace ? rec.places!.name : rec.profiles?.nom ?? "Prestataire";
                const city = isPlace ? rec.places!.city : rec.profiles?.ville ?? "";
                const cat = isPlace
                  ? placeCategoryLabel(rec.places!.hilmy_category)
                  : categoryLabel(rec.profiles?.categorie ?? "");
                const href = isPlace ? `/lieu/${rec.places!.id}` : rec.profiles?.slug ? `/prestataire/${rec.profiles.slug}` : "#";
                const photo = rec.photo_urls?.[0] ?? (isPlace ? rec.places!.main_photo_url : null);

                return (
                  <Link
                    key={rec.id}
                    href={href}
                    className="group block bg-card-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-border-subtle overflow-hidden"
                  >
                    <div className="aspect-[4/3] bg-border-subtle relative">
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo} alt={name} className="object-cover w-full h-full" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-deep/5 to-gold/10">
                          <span className="text-muted-foreground text-sm">
                            {isPlace ? "Lieu" : "Prestataire"}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="font-heading text-base font-medium text-foreground group-hover:text-green-deep transition-colors">
                        {name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {cat} {city ? `· ${city}` : ""}
                      </p>
                      {rec.rating && (
                        <div className="mt-2">
                          <StarRating value={rec.rating} readonly size="sm" />
                        </div>
                      )}
                      {rec.comment && (
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2 italic">
                          &laquo; {rec.comment} &raquo;
                        </p>
                      )}
                      {rec.tags && rec.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {rec.tags.map((t) => (
                            <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-gold/10 text-gold">
                              {recTagLabel(t)}
                            </span>
                          ))}
                        </div>
                      )}
                      {user && (
                        <p className="mt-3 text-xs text-muted-foreground">
                          {user.prenom}, {user.ville}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
