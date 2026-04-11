import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ReportButton } from "@/components/report-button";
import { ReportRecoButton } from "@/components/report-reco-button";
import { StarRating } from "@/components/star-rating";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { categoryLabel, recTagLabel, type Profile, type Recommendation } from "@/lib/constants";

export default async function PrestatairePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // Allow both approved and ghost profiles
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("slug", slug)
    .in("status", ["approved", "ghost"])
    .single();

  if (!data) notFound();
  const p = data as Profile;

  // Fetch recommendations
  const { data: recsData } = await supabase
    .from("recommendations")
    .select("*")
    .eq("profile_id", p.id)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  const recs = (recsData ?? []) as Recommendation[];

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
            <Link href="/prestataires" className="hover:text-gold transition-colors">
              L&apos;annuaire
            </Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">{p.nom}</span>
          </nav>

          {/* Ghost banner */}
          {p.status === "ghost" && (
            <div className="mb-6 p-5 rounded-2xl bg-gold/10 border border-gold/30 text-center">
              <p className="text-sm text-foreground font-medium">
                Cette femme n&apos;a pas encore réclamé son profil.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Si c&apos;est toi, on serait ravies de t&apos;accueillir.
              </p>
              <Link
                href="/inscription-prestataire"
                className="inline-flex items-center justify-center rounded-full px-6 py-2 mt-3 text-sm font-medium bg-green-deep text-primary-foreground hover:bg-green-deep/90 transition-colors"
              >
                C&apos;est moi, je crée mon profil
              </Link>
            </div>
          )}

          <div className="bg-card-white rounded-2xl shadow-sm border border-border-subtle overflow-hidden">
            {p.photos && p.photos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
                {p.photos.map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={url} alt={`${p.nom} - photo ${i + 1}`} className={`object-cover w-full ${p.photos.length === 1 ? "aspect-[3/1] col-span-full" : "aspect-square"}`} />
                ))}
              </div>
            ) : (
              <div className="aspect-[3/1] bg-gradient-to-br from-green-deep/10 to-gold/10" />
            )}

            <div className="p-6 md:p-8">
              <h1 className="font-heading text-2xl md:text-3xl font-semibold text-green-deep">
                {p.nom}
              </h1>

              <div className="flex flex-wrap gap-3 mt-3 text-sm text-muted-foreground">
                <Badge variant="outline" className="border-border-subtle">
                  {categoryLabel(p.categorie)}
                </Badge>
                <Badge variant="outline" className="border-border-subtle">
                  {p.ville}{p.region ? `, ${p.region}` : ""} — {p.pays}
                </Badge>
              </div>

              {recs.length > 0 && (
                <div className="mt-4 flex items-center gap-3">
                  <StarRating value={Math.round(avgRating)} readonly size="sm" />
                  <span className="text-sm text-muted-foreground">
                    {recs.length} femme{recs.length > 1 ? "s" : ""} l&apos;ont recommandée
                  </span>
                </div>
              )}

              {p.description && (
                <>
                  <Separator className="my-6 bg-border-subtle" />
                  <div>
                    <h2 className="font-heading text-lg font-medium text-foreground mb-3">
                      Son histoire
                    </h2>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                      {p.description}
                    </p>
                  </div>
                </>
              )}

              {p.status !== "ghost" && p.whatsapp && (
                <>
                  <Separator className="my-6 bg-border-subtle" />
                  <div>
                    <h2 className="font-heading text-lg font-medium text-foreground mb-4">
                      La contacter
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">WhatsApp : </span>
                        <a href={`https://wa.me/${p.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">
                          {p.whatsapp}
                        </a>
                      </div>
                      {p.instagram && (
                        <div>
                          <span className="text-muted-foreground">Instagram : </span>
                          <a href={`https://instagram.com/${p.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">
                            {p.instagram}
                          </a>
                        </div>
                      )}
                    </div>
                    <div className="mt-6">
                      <a href={`https://wa.me/${p.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-full px-8 py-3 text-sm font-medium bg-green-deep text-primary-foreground hover:bg-green-deep/90 transition-colors">
                        Lui écrire sur WhatsApp
                      </a>
                    </div>
                  </div>
                </>
              )}

              {p.zone_intervention && (
                <>
                  <Separator className="my-6 bg-border-subtle" />
                  <div>
                    <h2 className="font-heading text-lg font-medium text-foreground mb-3">
                      Zone d&apos;intervention
                    </h2>
                    <p className="text-muted-foreground leading-relaxed">{p.zone_intervention}</p>
                  </div>
                </>
              )}

              {/* Recommendations section */}
              <Separator className="my-6 bg-border-subtle" />
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-heading text-lg font-medium text-foreground">
                  Ce que les filles en disent
                </h2>
                <Link href={`/recommander`} className="text-sm text-gold hover:underline">
                  J&apos;ai testé aussi
                </Link>
              </div>

              {recs.length === 0 ? (
                <p className="text-muted-foreground text-center py-6 text-sm">
                  Personne n&apos;a encore laissé d&apos;avis. Sois la première.
                </p>
              ) : (
                <div className="space-y-6">
                  {recs.map((rec) => {
                    const user = userMap.get(rec.user_id);
                    return (
                      <div key={rec.id} className="border-b border-border-subtle pb-6 last:border-0 last:pb-0">
                        {rec.photo_urls && rec.photo_urls.length > 0 && (
                          <div className="flex gap-2 mb-3 overflow-x-auto">
                            {rec.photo_urls.map((url, i) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img key={i} src={url} alt="" className="w-20 h-20 rounded-lg object-cover border border-border-subtle shrink-0" />
                            ))}
                          </div>
                        )}
                        {rec.rating && <StarRating value={rec.rating} readonly size="sm" />}
                        <p className="mt-2 text-muted-foreground leading-relaxed whitespace-pre-line text-sm">{rec.comment}</p>
                        {rec.tags && rec.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {rec.tags.map((t) => (
                              <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-gold/10 text-gold">{recTagLabel(t)}</span>
                            ))}
                          </div>
                        )}
                        <div className="mt-3 flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            {user?.prenom ?? "Anonyme"}{user?.ville ? `, ${user.ville}` : ""}
                          </p>
                          <ReportRecoButton targetId={rec.id} table="recommendation_reports" foreignKey="recommendation_id" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <Separator className="my-6 bg-border-subtle" />
              <ReportButton profileId={p.id} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
