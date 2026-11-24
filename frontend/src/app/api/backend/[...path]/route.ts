import { cookies } from "next/headers";

const SESSION_COOKIE = "enerpilot_session";
const ALLOWED_RESOURCES = new Set([
  "factories",
  "machines",
  "energy",
  "production",
  "forecast",
  "anomalies",
  "root-cause",
  "recommendations",
  "alerts",
  "simulation",
  "optimization",
  "copilot",
]);

type RouteContext = { params: Promise<{ path: string[] }> };

async function forward(request: Request, context: RouteContext) {
  const { path } = await context.params;
  if (!path.length || !ALLOWED_RESOURCES.has(path[0])) {
    return Response.json({ success: false, error: { message: "Unknown API resource." } }, { status: 404 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return Response.json({ success: false, error: { message: "Sign in to continue." } }, { status: 401 });
  }

  const baseUrl = (process.env.ENERPILOT_API_URL ?? "http://127.0.0.1:8000").replace(/\/+$/, "");
  const resourcePath = path.map((segment) => encodeURIComponent(segment)).join("/");
  const incomingUrl = new URL(request.url);
  const upstreamUrl = `${baseUrl}/api/${resourcePath}${incomingUrl.search}`;
  const headers = new Headers({ Authorization: `Bearer ${token}`, Accept: "application/json" });
  const contentType = request.headers.get("Content-Type");
  if (contentType) headers.set("Content-Type", contentType);

  try {
    const response = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
      cache: "no-store",
    });
    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") ?? "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json(
      { success: false, error: { code: "API_UNAVAILABLE", message: "The EnerPilot API is unavailable. Check that the backend is running and configured." } },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
