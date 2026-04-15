import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { PrestataireCard } from "@/components/prestataire-card";
import { CATEGORIES, PAYS, type Profile } from "@/lib/constants";
import { FiltersBar } from "./filters-bar";

interface Props {
  searchParams: Promise<{ categorie?: string; pays?: string; ville?: string; q?: string }>;
}

export default async function PrestatairesPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (params.categorie) {
    query = query.eq("categorie", params.categorie);
  }
  if (params.pays) {
    query = query.eq("pays", params.pays);
  }
  if (params.ville) {
    query = query.ilike("ville", `%${params.ville}%`);
  }
  if (params.q) {
    query = query.ilike("nom", `%${params.q}%`);
  }

  const { data } = await query;
  const profiles = (data as Profile[]) || [];

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="py-10 px-4 text-center">
          <span className="inline-block text-[13px] font-medium uppercase tracking-[0.15em] text-gold">
            L&apos;annuaire
          </span>
          <h1 className="mt-3 font-heading text-3xl md:text-4xl font-medium text-green-deep">
            Nos pépites
          </h1>
          <p className="mt-3 text-muted-foreground">
            Des femmes triées sur le volet, recommandées par les nôtres.
          </p>
        </div>

        <FiltersBar
          categories={CATEGORIES}
          pays={PAYS}
          currentCategorie={params.categorie}
          currentPays={params.pays}
          currentVille={params.ville}
          currentQ={params.q}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <p className="text-sm text-muted-foreground mb-6">
            {profiles.length} pépite{profiles.length > 1 ? "s" : ""} trouvée
            {profiles.length > 1 ? "s" : ""}
          </p>
          {profiles.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-lg text-muted-foreground">
                Les premières pépites arrivent bientôt, reviens vite.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                En attendant, tu connais une perle ? Dis-lui de nous rejoindre.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {profiles.map((p) => (
                <PrestataireCard key={p.id} p={p} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
