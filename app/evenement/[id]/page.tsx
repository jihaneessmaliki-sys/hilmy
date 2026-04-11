import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ReportRecoButton } from "@/components/report-reco-button";
import { Separator } from "@/components/ui/separator";
import { eventTypeLabel, type HilmyEvent } from "@/lib/constants";
import { MapPin, Globe } from "lucide-react";

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} jours`;
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

export default async function EvenementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .eq("status", "published")
    .single();

  if (!data) notFound();
  const evt = data as HilmyEvent;

  // Get organiser prénom
  const { data: organiser } = await supabase
    .from("user_profiles")
    .select("prenom, ville")
    .eq("user_id", evt.user_id)
    .single();

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <nav className="text-sm text-muted-foreground mb-8">
            <Link href="/evenements" className="hover:text-gold transition-colors">
              Événements
            </Link>
            <span className="mx-2">/</span>
            <span className="text-foreground line-clamp-1">{evt.title}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-[5fr_7fr] gap-10">
            {/* Left: flyer */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-lg overflow-hidden shadow-md bg-[#2a2520]">
                {evt.flyer_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={evt.flyer_url}
                    alt={evt.title}
                    className="w-full object-contain"
                  />
                )}
              </div>
              <div className="mt-4">
                <ReportRecoButton
                  targetId={evt.id}
                  table="event_reports"
                  foreignKey="event_id"
                />
              </div>
            </div>

            {/* Right: details */}
            <div>
              <span className="inline-block font-sans text-xs font-medium uppercase tracking-[0.32em] text-gold mb-4">
                {eventTypeLabel(evt.event_type)}
              </span>

              <h1 className="font-heading text-4xl md:text-5xl font-light text-green-deep leading-tight tracking-tight mb-6">
                {evt.title}
              </h1>

              <p className="font-heading text-xl md:text-2xl italic text-gold mb-6">
                {formatFullDate(evt.start_date)}
                {evt.end_date && (
                  <>
                    {" "}— {new Date(evt.end_date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </>
                )}
              </p>

              <div className="flex items-start gap-2 text-sm text-muted-foreground mb-2">
                {evt.format === "presentiel" ? (
                  <>
                    <MapPin className="w-4 h-4 mt-0.5 text-gold shrink-0" />
                    <div>
                      <p className="text-foreground font-medium">
                        {evt.city}{evt.region ? `, ${evt.region}` : ""}{evt.country ? ` — ${evt.country}` : ""}
                      </p>
                      {evt.address && <p className="mt-0.5">{evt.address}</p>}
                    </div>
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4 mt-0.5 text-gold shrink-0" />
                    <p className="text-foreground font-medium">Événement en ligne</p>
                  </>
                )}
              </div>

              <div className="mt-4 mb-6">
                {evt.price_type === "gratuit" ? (
                  <span className="inline-block font-sans text-xs font-medium uppercase tracking-wider text-gold bg-gold/10 px-3 py-1 rounded-full">
                    Gratuit
                  </span>
                ) : (
                  <span className="text-sm text-foreground font-medium">
                    À partir de {evt.price_amount} {evt.price_currency}
                  </span>
                )}
              </div>

              <Separator className="my-6 bg-border-subtle" />

              <div className="text-base leading-[1.85] text-[#4a4a4a] whitespace-pre-line">
                {evt.description}
              </div>

              {evt.external_signup_url && (
                <div className="mt-8">
                  <a
                    href={evt.external_signup_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-full px-12 py-5 text-base font-medium tracking-wide bg-green-deep text-[#F5F0E6] hover:bg-green-deep/90 transition-colors"
                  >
                    S&apos;inscrire à l&apos;événement
                  </a>
                </div>
              )}

              <Separator className="my-8 bg-border-subtle" />

              <p className="text-xs text-muted-foreground">
                Proposé par {organiser?.prenom ?? "une fille"}{organiser?.ville ? `, ${organiser.ville}` : ""}
                {" "}— {formatRelative(evt.created_at)}
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
