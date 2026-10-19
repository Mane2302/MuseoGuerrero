import { redirect } from "next/navigation";
import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { DemoNotice, SiteHeader } from "@/components/site-shell";
import { TeacherDashboard } from "@/components/teacher-dashboard";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export default async function TeacherPage() {
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
  if (profile?.role !== "admin") redirect("/alumno");

  return (
    <>
      <SiteHeader />
      <main className="page-main">
        <div className="page-heading"><p className="eyebrow"><span /> Revisión editorial</p><h1>Panel de moderación</h1><p>Revisa la información, acompaña las correcciones y publica las historias que formarán parte de la colección.</p></div>
        <DemoNotice />
        <TeacherDashboard userId={user.id} />
      </main>
    </>
  );
}
