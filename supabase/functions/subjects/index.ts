import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const url = new URL(req.url);
  // Normalize path: strip /functions/v1/subjects prefix
  const path = url.pathname.replace(/.*\/subjects/, "") || "/";

  // ── GET /subjects ──────────────────────────────────────────────────────────
  if (path === "/" || path === "") {
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("subjects")
        .select("id, name, created_at, learning_packages(id)")
        .order("name");

      if (error) return json({ error: error.message }, 500);

      return json(
        data.map((s) => ({
          id: s.id,
          name: s.name,
          created_at: s.created_at,
          package_count: s.learning_packages.length,
        })),
      );
    }

    // ── POST /subjects ───────────────────────────────────────────────────────
    if (req.method === "POST") {
      const body = await req.json();
      const name = body?.name?.trim();
      if (!name) return json({ error: "Name fehlt." }, 400);

      const { data, error } = await supabase
        .from("subjects")
        .insert({ name })
        .select()
        .single();

      if (error) return json({ error: error.message }, 500);

      return json({ ...data, package_count: 0 }, 201);
    }
  }

  // ── GET /subjects/:id/packages ─────────────────────────────────────────────
  const packagesMatch = path.match(/^\/([^/]+)\/packages$/);
  if (packagesMatch && req.method === "GET") {
    const subjectId = packagesMatch[1];

    const { data, error } = await supabase
      .from("learning_packages")
      .select("id, name, created_at, learning_materials(id)")
      .eq("subject_id", subjectId)
      .order("created_at", { ascending: false });

    if (error) return json({ error: error.message }, 500);

    return json(
      data.map((p) => ({
        id: p.id,
        name: p.name,
        created_at: p.created_at,
        material_count: p.learning_materials.length,
      })),
    );
  }

  return json({ error: "Not found" }, 404);
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
