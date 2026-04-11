import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SignOutButton } from "@/components/sign-out-button";
import { AdminDashboard } from "./admin-dashboard";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.user_metadata?.is_admin) {
    notFound();
  }

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading text-2xl md:text-3xl font-semibold text-green-deep">
                Administration
              </h1>
              <p className="mt-2 text-muted-foreground">
                Profils, signalements, tout est là.
              </p>
            </div>
            <SignOutButton />
          </div>

          <div className="mt-8">
            <AdminDashboard />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
