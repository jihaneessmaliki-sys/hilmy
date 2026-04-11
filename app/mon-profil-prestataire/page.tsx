import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SignOutButton } from "@/components/sign-out-button";
import { ProfileForm } from "./profile-form";
import type { Profile } from "@/lib/constants";

export default async function MonProfilPrestatairePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/inscription-prestataire");

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const profile = data as Profile | null;

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading text-2xl md:text-3xl font-semibold text-green-deep">
                Mon profil prestataire
              </h1>
              <p className="mt-2 text-muted-foreground">
                Raconte-nous ton activité pour que les filles te trouvent.
              </p>
            </div>
            <SignOutButton />
          </div>

          {profile?.status === "pending" && (
            <div className="mt-6 p-4 rounded-xl bg-gold/10 border border-gold/30">
              <p className="text-sm text-foreground font-medium">
                Ton profil est en attente de validation. On s&apos;en occupe.
              </p>
            </div>
          )}
          {profile?.status === "rejected" && (
            <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200">
              <p className="text-sm text-red-800 font-medium">
                Ton profil a été refusé.
              </p>
              {profile.admin_notes && (
                <p className="text-sm text-red-600 mt-1">{profile.admin_notes}</p>
              )}
            </div>
          )}
          {profile?.status === "approved" && (
            <div className="mt-6 p-4 rounded-xl bg-green-deep/5 border border-green-deep/20">
              <p className="text-sm text-green-deep font-medium">
                Ton profil est visible dans l&apos;annuaire. Les filles peuvent te trouver.
              </p>
            </div>
          )}

          <div className="mt-8 bg-card-white rounded-2xl shadow-sm border border-border-subtle p-6 md:p-8">
            <ProfileForm userId={user.id} profile={profile} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
