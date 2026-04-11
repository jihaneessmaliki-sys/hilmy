import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { StarRating } from "@/components/star-rating";
import { ReportRecoButton } from "@/components/report-reco-button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { placeCategoryLabel, recTagLabel } from "@/lib/constants";
import type { Place, Recommendation } from "@/lib/constants";

export default async function LieuPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: placeData } = await supabase
    .from("places")
    .select("*")
    .eq("id", id)
    .single();

  if (!placeData) notFound();
  const place = placeData as Place;

  const { data: recsData } = await supabase
    .from("recommendations")
    .select("*")
    .eq("place_id", id)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  const recs = (recsData ?? []) as Recommendation[];

  // Fetch user prénoms
  const userIds = [...new Set(recs.map((r) => r.user_id))];
  const { data: userProfiles } = await supabase
    .from("user_profiles")
    .select("user_id, prenom, ville")
    .in("user_id", userIds.length > 0 ? userIds : ["none"]);

  const userMap = new Map((userProfiles ?? []).map((u: { user_id: string; prenom: string; ville: string }) => [u.user_id, u]));

  const avgRating = recs.length > 0
    ? recs.reduce((sum, r) => sum + (r.rating ?? 0), 0) / recs.filter((r) => r.rating).length || 0
    : 0;

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <nav className="text-sm text-muted-foreground mb-8">
            <Link href="/bonnes-adresses" className="hover:text-gold transition-colors">
              Bonnes adresses
            </Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">{place.name}</span>
          </nav>

          <div className="bg-card-white rounded-2xl shadow-sm border border-border-subtle overflow-hidden">
            {place.main_photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={place.main_photo_url} alt={place.name} className="w-full aspect-[3/1] object-cover" />
            ) : (
              <div className="aspect-[3/1] bg-gradient-to-br from-green-deep/10 to-gold/10" />
            )}

            <div className="p-6 md:p-8">
              <h1 className="font-heading text-2xl md:text-3xl font-semibold text-green-deep">
                {place.name}
              </h1>

              <p className="mt-2 text-sm text-muted-foreground">
                {place.address}
              </p>

              <div className="flex flex-wrap gap-3 mt-4">
                <Badge variant="outline" className="border-border-subtle">
                  {placeCategoryLabel(place.hilmy_category)}
                </Badge>
                <Badge variant="outline" className="border-border-subtle">
                  {place.city}{place.region ? `, ${place.region}` : ""} — {place.country}
                </Badge>
              </div>

              {recs.length > 0 && (
                <div className="mt-4 flex items-center gap-3">
                  <StarRating value={Math.round(avgRating)} readonly size="sm" />
                  <span className="text-sm text-muted-foreground">
                    {recs.length} femme{recs.length > 1 ? "s" : ""} l&apos;ont recommandé
                  </span>
                </div>
              )}

              {place.latitude !== 0 && place.longitude !== 0 && (
                <div className="mt-6 rounded-xl overflow-hidden border border-border-subtle">
                  <iframe
                    width="100%"
                    height="200"
                    style={{ border: 0 }}
                    loading="lazy"
                    src={`https://www.google.com/maps?q=${place.latitude},${place.longitude}&z=15&output=embed`}
                    title="Carte"
                  />
                </div>
              )}

              <Separator className="my-6 bg-border-subtle" />

              <div className="flex items-center justify-between mb-6">
                <h2 className="font-heading text-lg font-medium text-foreground">
                  Ce que les filles en disent
                </h2>
                <Link
                  href={`/recommander?place_id=${place.id}`}
                  className="text-sm text-gold hover:underline"
                >
                  J&apos;ai testé aussi
                </Link>
              </div>

              {recs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Personne n&apos;a encore laissé d&apos;avis. Sois la première.
                </p>
              ) : (
                <div className="space-y-6">
                  {recs.map((rec) => {
                    const user = userMap.get(rec.user_id);
                    const relTime = formatRelativeTime(rec.created_at);

                    return (
                      <div key={rec.id} className="border-b border-border-subtle pb-6 last:border-0 last:pb-0">
                        {rec.photo_urls && rec.photo_urls.length > 0 && (
                          <div className="flex gap-2 mb-3 overflow-x-auto">
                            {rec.photo_urls.map((url, i) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img key={i} src={url} alt="" className="w-24 h-24 rounded-lg object-cover border border-border-subtle shrink-0" />
                            ))}
                          </div>
                        )}
                        {rec.rating && <StarRating value={rec.rating} readonly size="sm" />}
                        <p className="mt-2 text-muted-foreground leading-relaxed whitespace-pre-line">
                          {rec.comment}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {rec.tags?.map((t) => (
                            <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-gold/10 text-gold">
                              {recTagLabel(t)}
                            </span>
                          ))}
                          {rec.price_indicator && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-deep/10 text-green-deep">
                              {rec.price_indicator}
                            </span>
                          )}
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            {user?.prenom ?? "Anonyme"}{user?.ville ? `, ${user.ville}` : ""} — {relTime}
                          </p>
                          <ReportRecoButton targetId={rec.id} table="recommendation_reports" foreignKey="recommendation_id" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <Separator className="my-6 bg-border-subtle" />
              <ReportRecoButton targetId={place.id} table="place_reports" foreignKey="place_id" />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) return "il y a quelques minutes";
  if (hours < 24) return `il y a ${hours}h`;
  if (days < 7) return `il y a ${days}j`;
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}
