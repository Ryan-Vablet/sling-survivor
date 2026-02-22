/**
 * Upload replay data to Supabase Storage as gzipped JSON.
 * Returns the public URL or null on failure.
 */
import type { ReplayData } from "./replayTypes";
import { getSupabase } from "../../api/supabase";

const BUCKET = "replays";

/** Gzip a string and return a Blob. */
async function gzipString(str: string): Promise<Blob> {
  const stream = new Blob([str]).stream();
  const compressed = stream.pipeThrough(
    new CompressionStream("gzip")
  );
  return await new Response(compressed).blob();
}

/**
 * Upload replay to Storage. Caller must have Supabase configured.
 * Returns public URL for the object, or null on failure.
 */
export async function uploadReplay(data: ReplayData): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const json = JSON.stringify(data);
    const blob = await gzipString(json);
    const path = `${crypto.randomUUID()}.json.gz`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { contentType: "application/gzip" });

    if (error) {
      console.warn("[Replay] Storage upload failed:", error.message);
      return null;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return publicUrl;
  } catch (e) {
    console.warn("[Replay] Upload error:", e);
    return null;
  }
}
