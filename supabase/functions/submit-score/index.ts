// Leaderboard submit-score: validate payload and insert via service_role (Matt-proof).
// Invoked by client with anon key; only this function can INSERT into leaderboard.

import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "jsr:@supabase/supabase-js@2/cors";

const TABLE = "leaderboard";
const MAX_DISTANCE = 50_000_000;
const MAX_SCRAP = 10_000_000;
const MAX_GOLD = 5_000_000;
const MAX_SUMMARY_JSON_LENGTH = 50_000;
const MAX_REPLAY_URL_LENGTH = 2_000;
const MAX_GAME_VERSION_LENGTH = 64;

type Body = {
  initials?: unknown;
  distance?: unknown;
  scrap?: unknown;
  gold?: unknown;
  summary_json?: unknown;
  replay_url?: unknown;
  game_version?: unknown;
};

function jsonResponse(data: object, status: number) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

function validate(body: Body): { ok: true; row: Record<string, unknown> } | { ok: false; error: string } {
  const initials =
    typeof body.initials === "string"
      ? String(body.initials).trim().toUpperCase().slice(0, 3)
      : "";
  if (!initials || initials.length < 1) {
    return { ok: false, error: "initials required (1–3 characters)" };
  }

  const distance = Number(body.distance);
  if (!Number.isFinite(distance) || distance < 0 || distance > MAX_DISTANCE) {
    return { ok: false, error: "distance must be 0–" + MAX_DISTANCE.toLocaleString() };
  }

  const scrap = Number(body.scrap);
  if (!Number.isFinite(scrap) || scrap < 0 || scrap > MAX_SCRAP) {
    return { ok: false, error: "scrap must be 0–" + MAX_SCRAP.toLocaleString() };
  }

  const gold = Number(body.gold);
  if (!Number.isFinite(gold) || gold < 0 || gold > MAX_GOLD) {
    return { ok: false, error: "gold must be 0–" + MAX_GOLD.toLocaleString() };
  }

  let summary_json: string | null = null;
  if (body.summary_json != null) {
    if (typeof body.summary_json !== "string") {
      return { ok: false, error: "summary_json must be a string" };
    }
    if (body.summary_json.length > MAX_SUMMARY_JSON_LENGTH) {
      return { ok: false, error: "summary_json too long" };
    }
    summary_json = body.summary_json;
  }

  let replay_url: string | null = null;
  if (body.replay_url != null) {
    if (typeof body.replay_url !== "string") {
      return { ok: false, error: "replay_url must be a string" };
    }
    if (body.replay_url.length > MAX_REPLAY_URL_LENGTH) {
      return { ok: false, error: "replay_url too long" };
    }
    replay_url = body.replay_url;
  }

  let game_version: string | null = null;
  if (body.game_version != null) {
    if (typeof body.game_version !== "string") {
      return { ok: false, error: "game_version must be a string" };
    }
    if (body.game_version.length > MAX_GAME_VERSION_LENGTH) {
      return { ok: false, error: "game_version too long" };
    }
    game_version = body.game_version;
  }

  const row: Record<string, unknown> = {
    initials,
    score: Math.round(distance),
    distance: Math.round(distance),
    scrap: Math.round(scrap),
    gold: Math.round(gold),
    summary_json: summary_json ?? null,
    replay_url: replay_url ?? null,
    game_version: game_version ?? null,
  };
  return { ok: true, row };
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
