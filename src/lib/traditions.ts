import { demoTraditions } from "@/lib/demo-data";
import { createPublicSupabaseClient } from "@/lib/supabase";
import type { Tradition } from "@/lib/types";

async function addSignedImages(
  traditions: Tradition[],
  client: NonNullable<ReturnType<typeof createPublicSupabaseClient>>,
) {
  return Promise.all(
    traditions.map(async (tradition) => {
      if (!tradition.image_path) return tradition;
      if (tradition.image_path.startsWith("demo:")) {
        const filename = tradition.image_path.slice("demo:".length);
        return { ...tradition, image_url: `/demo-images/${filename}`, is_demo: true };
      }
      const { data, error } = await client.storage
        .from("tradition-images")
        .createSignedUrl(tradition.image_path, 3600);
      if (error) throw new Error(`No se pudo cargar la imagen: ${error.message}`);
      return { ...tradition, image_url: data.signedUrl };
    }),
  );
}

export async function getPublishedTraditions(): Promise<Tradition[]> {
  const client = createPublicSupabaseClient();
  if (!client) return demoTraditions;

  const { data, error } = await client
    .from("traditions")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`No se pudieron cargar las fichas: ${error.message}`);
  return addSignedImages(data ?? [], client);
}

export async function getPublishedTradition(id: string): Promise<Tradition | null> {
  const client = createPublicSupabaseClient();
  if (!client) return demoTraditions.find((tradition) => tradition.id === id) ?? null;

  const { data, error } = await client
    .from("traditions")
    .select("*")
    .eq("id", id)
    .eq("status", "approved")
    .maybeSingle();

  if (error) throw new Error(`No se pudo cargar la ficha: ${error.message}`);
  if (!data) return null;
  const [tradition] = await addSignedImages([data], client);
  return tradition;
}
