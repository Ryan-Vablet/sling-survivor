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
      const errDetail = [
        error.message,
        (error as { error?: string }).error && `code: ${(error as { error?: string }).error}`,
        (error as { statusCode?: string }).statusCode && `status: ${(error as { statusCode?: string }).statusCode}`,
      ]
        .filter(Boolean)
        .join(" | ");
      console.warn("[Replay] Storage upload failed:", errDetail, error);
      if (
        errDetail.includes("400") ||
        errDetail.includes("403") ||
        errDetail.includes("Invalid") ||
        errDetail.includes("Bucket") ||
        errDetail.includes("Access") ||
        errDetail.includes("policy")
      ) {
        console.warn(
          "[Replay] Tip: Create bucket 'replays' in Dashboard → Storage (Public), then run the storage policies in docs/SUPABASE_LEADERBOARD_SCHEMA.sql"
        );
      }
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
