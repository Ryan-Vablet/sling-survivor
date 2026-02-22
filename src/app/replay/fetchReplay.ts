/**
 * Fetch replay from URL (gzipped JSON), decompress and parse.
 */
import type { ReplayData } from "./replayTypes";

/** Decompress gzip bytes and return as string. */
async function decompressGzip(blob: Blob): Promise<string> {
  const stream = blob.stream().pipeThrough(
    new DecompressionStream("gzip")
  );
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const totalLen = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(totalLen);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return new TextDecoder().decode(out);
}

/**
 * Fetch replay from URL (expects gzipped JSON).
 * Returns parsed ReplayData or null on failure.
 */
export async function fetchReplay(replayUrl: string): Promise<ReplayData | null> {
  try {
    const res = await fetch(replayUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    const json = await decompressGzip(blob);
    return JSON.parse(json) as ReplayData;
  } catch (e) {
    console.warn("[Replay] Fetch/parse failed:", e);
    return null;
  }
}
