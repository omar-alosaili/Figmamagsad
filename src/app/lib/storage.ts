import { supabase } from "./supabase";

export async function uploadPlacePhoto(ownerId: string, placeId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${ownerId}/${placeId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("place-photos").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("place-photos").getPublicUrl(path);
  return data.publicUrl;
}
