// Leaderboard submit-score: replay verification then insert via service_role (Matt-proof).
// Invoked by client with anon key; only this function can INSERT into leaderboard.

import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "jsr:@supabase/supabase-js@2/cors";

const TABLE = "leaderboard";

type Body = {
  initials?: unknown;
  distance?: unknown;
  scrap?: unknown;
  gold?: unknown;
  total_gold_earned?: unknown;
  summary_json?: unknown;
  replay_url?: unknown;
  game_version?: unknown;
};

type ReplaySnapshot = {
  t: number;
  runState?: {
    totalDistanceM?: number;
    totalScrap?: number;
    gold?: number;
    totalGoldEarned?: number;
  };
};

type ReplayData = {
  snapshots?: ReplaySnapshot[];
};

function jsonResponse(data: object, status: number) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

/** Decompress gzip bytes and return parsed JSON. */
async function fetchAndParseReplay(replayUrl: string): Promise<ReplayData | null> {
  try {
    const res = await fetch(replayUrl);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(buf));
        controller.close();
      },
    });
    const decompressed = stream.pipeThrough(new DecompressionStream("gzip"));
    const reader = decompressed.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
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
    const json = new TextDecoder().decode(out);
    return JSON.parse(json) as ReplayData;
  } catch {
    return null;
  }
}

/** Compute stats from last replay snapshot. Returns null if replay invalid or missing required fields (totalDistanceM, totalScrap, gold). totalGoldEarned optional for backward compat. */
function getReplayStats(
  replay: ReplayData
): { distance: number; scrap: number; gold: number; totalGoldEarned: number | null } | null {
  const snapshots = replay?.snapshots;
  if (!Array.isArray(snapshots) || snapshots.length === 0) return null;

  const last = snapshots[snapshots.length - 1];
  const rs = last?.runState;
  if (!rs) return null;

  const totalDistanceM = rs.totalDistanceM;
  const totalScrap = rs.totalScrap;
  const gold = rs.gold;
  if (
    typeof totalDistanceM !== "number" ||
    typeof totalScrap !== "number" ||
    typeof gold !== "number"
  ) {
    return null;
  }

  const totalGoldEarned =
    typeof rs.totalGoldEarned === "number" ? Math.round(rs.totalGoldEarned) : null;

  return {
    distance: Math.round(totalDistanceM),
    scrap: Math.round(totalScrap),
    gold: Math.round(gold),
    totalGoldEarned,
  };
}

function validate(
  body: Body
): { ok: true; row: Record<string, unknown>; distance: number; scrap: number; gold: number; totalGoldEarned: number | null } | { ok: false; error: string } {
  const initials =
    typeof body.initials === "string"
      ? String(body.initials).trim().toUpperCase().slice(0, 3)
      : "";
  if (!initials || initials.length < 1) {
    return { ok: false, error: "initials required (1–3 characters)" };
  }

  const distance = Number(body.distance);
  if (!Number.isFinite(distance) || distance < 0) {
    return { ok: false, error: "distance must be a non-negative number" };
  }

  const scrap = Number(body.scrap);
  if (!Number.isFinite(scrap) || scrap < 0) {
    return { ok: false, error: "scrap must be a non-negative number" };
  }

  const gold = Number(body.gold);
  if (!Number.isFinite(gold) || gold < 0) {
    return { ok: false, error: "gold must be a non-negative number" };
  }

  let total_gold_earned: number | null = null;
  if (body.total_gold_earned != null) {
    const n = Number(body.total_gold_earned);
    if (!Number.isFinite(n) || n < 0) {
      return { ok: false, error: "total_gold_earned must be a non-negative number" };
    }
    total_gold_earned = Math.round(n);
  }

  const replay_url = typeof body.replay_url === "string" ? body.replay_url.trim() : "";
  if (!replay_url) {
    return { ok: false, error: "replay_url is required" };
  }

  let summary_json: string | null = null;
  if (body.summary_json != null) {
    if (typeof body.summary_json !== "string") {
      return { ok: false, error: "summary_json must be a string" };
    }
    summary_json = body.summary_json;
  }

  let game_version: string | null = null;
  if (body.game_version != null) {
    if (typeof body.game_version !== "string") {
      return { ok: false, error: "game_version must be a string" };
    }
    game_version = body.game_version;
  }

  const row: Record<string, unknown> = {
    initials,
    score: Math.round(distance),
    distance: Math.round(distance),
    scrap: Math.round(scrap),
    gold: Math.round(gold),
    total_gold_earned: total_gold_earned,
    summary_json: summary_json ?? null,
    replay_url,
    game_version: game_version ?? null,
  };
  return {
    ok: true,
    row,
    distance: Math.round(distance),
    scrap: Math.round(scrap),
    gold: Math.round(gold),
    totalGoldEarned: total_gold_earned,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const validated = validate(body);
  if (!validated.ok) {
    return jsonResponse({ error: validated.error }, 400);
  }

  // Replay verification: fetch replay and ensure stats match submitted payload
  const replayUrl = validated.row.replay_url as string;
  const replay = await fetchAndParseReplay(replayUrl);
  if (!replay) {
    return jsonResponse({ error: "Replay could not be fetched or parsed" }, 400);
  }

  const replayStats = getReplayStats(replay);
  if (!replayStats) {
    return jsonResponse({ error: "Replay has no valid snapshots" }, 400);
  }

  // Allow 1 unit tolerance for rounding
  if (Math.abs(replayStats.distance - validated.distance) > 1) {
    return jsonResponse(
      { error: "Replay verification failed: distance does not match replay" },
      400
    );
  }
  if (Math.abs(replayStats.gold - validated.gold) > 1) {
    return jsonResponse(
      { error: "Replay verification failed: gold does not match replay" },
      400
    );
  }
  if (Math.abs(replayStats.scrap - validated.scrap) > 1) {
    return jsonResponse(
      { error: "Replay verification failed: scrap does not match replay" },
      400
    );
  }
  if (validated.totalGoldEarned != null && replayStats.totalGoldEarned != null) {
    if (Math.abs(replayStats.totalGoldEarned - validated.totalGoldEarned) > 1) {
      return jsonResponse(
        { error: "Replay verification failed: total_gold_earned does not match replay" },
        400
      );
    }
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) {
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

  const supabase = createClient(url, serviceRoleKey);
  const { error } = await supabase.from(TABLE).insert(validated.row);

  if (error) {
    console.error("[submit-score] insert error:", error.message);
    return jsonResponse({ error: "Failed to save score" }, 400);
  }

  return jsonResponse({ ok: true }, 200);
});
