const UPSTREAM = "https://podarkino-admin-api.wannahi459.workers.dev";
const ADMIN_ORIGIN = "https://wan-ship-qq.github.io";

function corsHeaders(origin) {
  const headers = {
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
    Vary: "Origin"
  };
  if (origin === ADMIN_ORIGIN) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

export async function OPTIONS(request) {
  const origin = request.headers.get("origin") || "";
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

async function proxy(request, context) {
  const origin = request.headers.get("origin") || "";
  if (origin !== ADMIN_ORIGIN) {
    return Response.json(
      { error: "Origin denied" },
      { status: 403, headers: corsHeaders(origin) }
    );
  }

  const { path = [] } = await context.params;
  const upstreamUrl = new URL(`/${path.join("/")}`, UPSTREAM);
  const requestUrl = new URL(request.url);
  upstreamUrl.search = requestUrl.search;

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const authorization = request.headers.get("authorization");
  if (contentType) headers.set("Content-Type", contentType);
  if (authorization) headers.set("Authorization", authorization);
  headers.set("Origin", ADMIN_ORIGIN);

  const method = request.method;
  const response = await fetch(upstreamUrl, {
    method,
    headers,
    body: method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer(),
    cache: "no-store"
  });

  const responseHeaders = corsHeaders(origin);
  responseHeaders["Content-Type"] = response.headers.get("content-type") || "application/json; charset=utf-8";

  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
