import { cookies } from "next/headers";

const SESSION_COOKIE = "enerpilot_session";
const SESSION_MAX_AGE = 30 * 60;

function apiUrl(path: string) {
  const baseUrl = (process.env.ENERPILOT_API_URL ?? "http://127.0.0.1:8000").replace(/\/+$/, "");
  return `${baseUrl}${path}`;
}

function unavailableResponse() {
  return Response.json(
    { success: false, error: { code: "API_UNAVAILABLE", message: "The EnerPilot API is unavailable. Check that the backend is running and configured." } },
    { status: 502, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return Response.json({ success: false, error: { message: "Sign in to continue." } }, { status: 401 });
  }

  try {
    const response = await fetch(apiUrl("/api/auth/me"), {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    });
    return new Response(response.body, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json", "Cache-Control": "no-store" },
    });
  } catch {
    return unavailableResponse();
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { mode?: string; email?: string; password?: string } | null;
  if (!body || !["login", "register"].includes(body.mode ?? "")) {
    return Response.json({ success: false, error: { message: "Choose sign in or create account." } }, { status: 400 });
  }

  const endpoint = body.mode === "register" ? "register" : "login";
  try {
    const response = await fetch(apiUrl(`/api/auth/${endpoint}`), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email: body.email, password: body.password }),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null) as { data?: { access_token?: string } } | null;

    if (!response.ok) {
      return Response.json(payload ?? { success: false, error: { message: "The request could not be completed." } }, { status: response.status });
    }

    if (endpoint === "login") {
      const token = payload?.data?.access_token;
      if (!token) return unavailableResponse();
      const cookieStore = await cookies();
      cookieStore.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_MAX_AGE,
      });
      const meResponse = await fetch(apiUrl("/api/auth/me"), {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        cache: "no-store",
      });
      if (!meResponse.ok) return Response.json({ success: false, error: { message: "Signed in, but your account could not be loaded." } }, { status: meResponse.status });
      return new Response(meResponse.body, {
        status: meResponse.status,
        headers: { "Content-Type": meResponse.headers.get("Content-Type") ?? "application/json", "Cache-Control": "no-store" },
      });
    }

    return Response.json(payload ?? { success: true, data: null }, { status: response.status });
  } catch {
    return unavailableResponse();
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  return Response.json({ success: true, data: null }, { headers: { "Cache-Control": "no-store" } });
}
