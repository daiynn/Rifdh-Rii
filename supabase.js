import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://assuwvkdhwtmqyoifekl.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzc3V3dmtkaHd0bXF5b2lmZWtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzNzczMDcsImV4cCI6MjA3ODk1MzMwN30.oqu5KTm_7rslAievc88Spxl7IJuub6vO0BcNk9gBmak";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// UPLOAD PHOTO
export async function uploadPhoto(file) {
  const filePath = `${Date.now()}-${file.name}`;

  // upload ke bucket
  const { data: storageData, error: storageErr } = await supabase.storage
    .from("gallery")
    .upload(filePath, file);

  if (storageErr) throw storageErr;

  // ambil public URL
  const { data: urlData } = supabase.storage
    .from("gallery")
    .getPublicUrl(filePath);

  const publicUrl = urlData.publicUrl;

  // masukkan ke database
  const { error: insertErr } = await supabase
    .from("photos")
    .insert({ name: file.name, url: publicUrl });

  if (insertErr) throw insertErr;

  return publicUrl;
}

// SUBSCRIBE FOR REALTIME GALLERY
export function subscribeToGallery(callback) {
  // fetch awal
  supabase
    .from("photos")
    .select("*")
    .order("id", { ascending: false })
    .then(({ data }) => callback(data));

  // realtime listener
  const channel = supabase
    .channel("photos-db-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "photos" },
      (payload) => {
        supabase
          .from("photos")
          .select("*")
          .order("id", { ascending: false })
          .then(({ data }) => callback(data));
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
