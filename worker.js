const DATA_KEY = "entries";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders,
      ...init.headers,
    },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    if (request.method !== "GET") {
      return jsonResponse({ error: "Method not allowed" }, { status: 405 });
    }

    const url = new URL(request.url);

    if (url.pathname !== "/" && url.pathname !== "/entries") {
      return jsonResponse({ error: "Not found" }, { status: 404 });
    }

    const value = await env.DAILY_SPORT_DATA.get(DATA_KEY);

    if (!value) {
      return jsonResponse({ error: "Daily sport entries not found" }, { status: 404 });
    }

    return new Response(value, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=60",
        ...corsHeaders,
      },
    });
  },
};
