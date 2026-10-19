import { redirect } from "next/navigation";
import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { DemoNotice, SiteHeader } from "@/components/site-shell";
import { StudentDashboard } from "@/components/student-dashboard";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export default async function StudentPage() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/login");

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError && !isAuthSessionMissingError(userError)) {
    throw new Error(`No se pudo verificar la sesión: ${userError.message}`);
  }
  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) throw new Error(`No se pudo cargar el perfil: ${profileError.message}`);
  if (!profile) redirect("/login");
  if (profile.role === "admin") redirect("/profesor");

  return (
    <>
      <SiteHeader />
      <main className="page-main">
        <div className="page-heading"><p className="eyebrow"><span /> Espacio de estudiante</p><h1>Hola, {profile.display_name}</h1><p>Comparte una historia de tu comunidad y sigue su recorrido hasta el museo.</p></div>
        <DemoNotice />
        <StudentDashboard userId={user.id} />
      </main>
    </>
  );
}
