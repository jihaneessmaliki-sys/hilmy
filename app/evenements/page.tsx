import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { eventTypeLabel, type HilmyEvent } from "@/lib/constants";
import { EvenementsFilters } from "./filters";

interface Props {
  searchParams: Promise<{
    date?: string;
    format?: string;
    pays?: string;
    ville?: string;
    type?: string;
  }>;
}

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function EvenementsPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();

  const now = new Date().toISOString();

  let query = supabase
    .from("events")
    .select("*")
    .eq("status", "published")
    .gte("start_date", now)
    .order("start_date", { ascending: true });

  if (params.format && params.format !== "all") {
    query = query.eq("format", params.format);
  }
  if (params.pays && params.pays !== "all") {
    query = query.eq("country", params.pays);
  }
  if (params.ville) {
    query = query.ilike("city", `%${params.ville}%`);
  }
  if (params.type && params.type !== "all") {
    query = query.eq("event_type", params.type);
  }

  // Date range filter
  if (params.date === "semaine") {
    const weekLater = new Date(Date.now() + 7 * 86400000).toISOString();
    query = query.lte("start_date", weekLater);
  } else if (params.date === "mois") {
    const monthLater = new Date(Date.now() + 30 * 86400000).toISOString();
    query = query.lte("start_date", monthLater);
  } else if (params.date === "trimestre") {
    const qLater = new Date(Date.now() + 90 * 86400000).toISOString();
    query = query.lte("start_date", qLater);
  }

  const { data } = await query.limit(50);
  const events = (data ?? []) as HilmyEvent[];

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="py-16 md:py-20 px-4 text-center">
          <span className="inline-block font-sans text-xs font-medium uppercase tracking-[0.32em] text-gold mb-8">
            Événements entre nous
          </span>
          <h1 className="font-heading text-4xl md:text-5xl font-light text-green-deep leading-tight tracking-tight">
            Tout ce qui se passe, près de chez toi.
          </h1>
          <p className="mt-6 text-lg leading-[1.7] text-[#4a4a4a] max-w-2xl mx-auto">
            Ateliers, brunchs, conférences, retraites... Les filles organisent,
            on partage. Tu vois ce qui se passe dans ta ville (ou en ligne) et
            tu y vas.
          </p>
          <Link
            href="/proposer-un-evenement"
            className="inline-flex items-center gap-2 mt-6 text-sm text-gold hover:underline transition-colors"
          >
            Tu organises un événement ? Propose-le ici &rarr;
          </Link>
        </div>

        <EvenementsFilters
          currentDate={params.date}
          currentFormat={params.format}
          currentPays={params.pays}
          currentVille={params.ville}
          currentType={params.type}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {events.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-lg text-muted-foreground">
                Aucun événement par ici pour le moment.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Les filles n&apos;ont rien proposé qui matche tes critères.
                Tente un autre filtre, ou propose ton propre événement.
              </p>
              <Link
                href="/proposer-un-evenement"
                className="inline-flex items-center justify-center rounded-full px-10 py-5 mt-6 text-base font-medium tracking-wide bg-green-deep text-[#F5F0E6] hover:bg-green-deep/90 transition-colors"
              >
                Je propose un événement
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {events.map((evt) => (
                <Link
                  key={evt.id}
                  href={`/evenement/${evt.id}`}
                  className="group block bg-[#F5F0E6] rounded-md border border-[rgba(201,169,97,0.3)] hover:border-gold hover:shadow-md transition-all overflow-hidden"
                >
                  <div className="aspect-[4/5] relative bg-[#2a2520]">
                    {evt.flyer_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={evt.flyer_url}
                        alt={evt.title}
                        className="object-cover w-full h-full"
                      />
                    )}
                  </div>
                  <div className="p-6">
                    <p className="font-heading text-sm italic text-gold">
                      {formatEventDate(evt.start_date)}
                    </p>
                    <h3 className="mt-2 font-heading text-xl font-normal text-green-deep line-clamp-2 group-hover:text-gold transition-colors">
                      {evt.title}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {evt.format === "en_ligne"
                        ? "En ligne"
                        : `${evt.city ?? ""}${evt.country ? `, ${evt.country}` : ""}`}
                    </p>
                    <span className="inline-block mt-3 font-sans text-[11px] font-medium uppercase tracking-wider text-gold">
                      {eventTypeLabel(evt.event_type)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
