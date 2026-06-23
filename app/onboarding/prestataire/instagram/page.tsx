import Link from "next/link";
import { cookies } from "next/headers";
import {
  OnboardingShell,
  OnboardingHeader,
} from "@/components/onboarding/OnboardingShell";
import {
  isInstagramConfigured,
  type InstagramImport,
} from "@/lib/instagram/config";

function InstagramIcon() {
  return (
    <svg
      width={32}
      height={32}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-or"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function readImport(raw: string | undefined): InstagramImport | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as InstagramImport;
  } catch {
    return null;
  }
}

export default async function InstagramOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const { connected, error } = await searchParams;
  const configured = isInstagramConfigured();
  const cookieStore = await cookies();
  const imported =
    connected === "1" ? readImport(cookieStore.get("ig_import")?.value) : null;

  return (
    <OnboardingShell step={2} totalSteps={3} backLabel="Changer de méthode">
      <section className="bg-creme pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="mx-auto max-w-3xl px-6 md:px-20">
          <OnboardingHeader
            number="03"
            kicker="DEPUIS INSTAGRAM"
            title={
              imported ? (
                <>
                  Compte connecté,{" "}
                  <em className="font-serif italic text-or">on a tout.</em>
                </>
              ) : configured ? (
                <>
                  Ta vitrine,{" "}
                  <em className="font-serif italic text-or">importée.</em>
                </>
              ) : (
                <>
                  Bientôt,{" "}
                  <em className="font-serif italic text-or">promis.</em>
                </>
              )
            }
            subtitle={
              imported ? (
                <>
                  Voici ta bio, ta photo et tes six derniers posts. Tu pourras
                  tout corriger avant de publier.
                </>
              ) : configured ? (
                <>
                  Connecte ton compte Business ou Creator : on récupère ta bio,
                  ta photo de profil et tes six derniers posts pour ta galerie.
                </>
              ) : (
                <>
                  L&apos;import depuis un compte Business ou Creator arrivera
                  dans la prochaine version. En attendant, le remplissage manuel
                  prend 8 minutes.
                </>
              )
            }
          />

          {error && (
            <div className="mt-8 rounded-sm border border-red-900/20 bg-red-900/5 px-4 py-3 text-[13px] text-red-900">
              {error === "denied"
                ? "Connexion annulée. Tu peux réessayer ou remplir ta fiche à la main."
                : "La connexion Instagram n'a pas abouti. Réessaie dans un instant."}
            </div>
          )}

          {/* État 3 : compte connecté → preview de ce qu'on a récupéré. */}
          {imported ? (
            <div className="mt-10 space-y-6">
              <div className="rounded-sm border border-or/20 bg-blanc p-8 md:p-10">
                <div className="flex items-center gap-4">
                  {imported.profile_picture_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imported.profile_picture_url}
                      alt={imported.username}
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <p className="font-serif text-2xl font-light text-vert">
                      @{imported.username}
                    </p>
                    {imported.biography && (
                      <p className="mt-1 text-[13px] text-texte-sec">
                        {imported.biography}
                      </p>
                    )}
                  </div>
                </div>
                {imported.posts.length > 0 && (
                  <div className="mt-6 grid grid-cols-3 gap-2">
                    {imported.posts.map((p) =>
                      p.media_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={p.id}
                          src={p.media_url}
                          alt=""
                          className="aspect-square w-full rounded-sm object-cover"
                        />
                      ) : null,
                    )}
                  </div>
                )}
              </div>
              <p className="text-center text-[12px] italic text-texte-sec">
                La publication de la fiche depuis Instagram s&apos;activera à la
                sortie de l&apos;app — d&apos;ici là, finalise via le remplissage
                manuel.
              </p>
              <div className="flex justify-center">
                <Link
                  href="/onboarding/prestataire/manuel"
                  className="group inline-flex h-12 items-center gap-2 rounded-full bg-vert px-7 text-[12px] font-medium tracking-[0.22em] text-creme uppercase transition-all hover:bg-vert-dark"
                >
                  Finaliser ma fiche
                  <span
                    className="text-or-light transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-12 rounded-sm border border-or/20 bg-blanc p-10 text-center md:p-14">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-or/10">
                <InstagramIcon />
              </div>

              {/* État 2 : app Meta branchée → bouton de connexion officiel. */}
              {configured ? (
                <>
                  <p className="mt-6 font-serif text-3xl font-light text-vert">
                    Connecte ton Instagram
                  </p>
                  <p className="mt-4 text-[14px] leading-[1.7] text-texte-sec">
                    Compte Business ou Creator. On ne lit que ta bio, ta photo
                    et tes posts — rien d&apos;autre, et jamais de publication en
                    ton nom.
                  </p>
                  <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                    {/* Navigation réelle vers un route handler qui 302 vers
                        Meta — surtout pas un <Link> (prefetch/intercept). */}
                    {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                    <a
                      href="/api/onboarding/instagram/start"
                      className="group inline-flex h-12 items-center gap-2 rounded-full bg-vert px-7 text-[12px] font-medium tracking-[0.22em] text-creme uppercase transition-all hover:bg-vert-dark"
                    >
                      Connecter mon compte
                      <span
                        className="text-or-light transition-transform group-hover:translate-x-1"
                        aria-hidden="true"
                      >
                        →
                      </span>
                    </a>
                    <Link
                      href="/onboarding/prestataire/manuel"
                      className="text-[11px] tracking-[0.22em] text-texte-sec uppercase hover:text-or"
                    >
                      Remplir à la main
                    </Link>
                  </div>
                </>
              ) : (
                /* État 1 : app Meta pas encore validée → en préparation. */
                <>
                  <p className="mt-6 font-serif text-3xl font-light text-vert">
                    🚧 En préparation
                  </p>
                  <p className="mt-4 text-[14px] leading-[1.7] text-texte-sec">
                    On finalise l&apos;intégration avec Meta pour récupérer ta
                    bio, ton avatar et tes derniers posts. Tu pourras créer ta
                    fiche en 2 minutes.
                  </p>
                  <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                    <Link
                      href="/onboarding/prestataire/manuel"
                      className="group inline-flex h-12 items-center gap-2 rounded-full bg-vert px-7 text-[12px] font-medium tracking-[0.22em] text-creme uppercase transition-all hover:bg-vert-dark"
                    >
                      Remplir manuellement
                      <span
                        className="text-or-light transition-transform group-hover:translate-x-1"
                        aria-hidden="true"
                      >
                        →
                      </span>
                    </Link>
                    <Link
                      href="/onboarding/prestataire"
                      className="text-[11px] tracking-[0.22em] text-texte-sec uppercase hover:text-or"
                    >
                      Retour aux méthodes
                    </Link>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </section>
    </OnboardingShell>
  );
}
