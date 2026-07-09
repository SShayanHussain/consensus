import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

function getAccessSecret(): Uint8Array {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error("Missing JWT_ACCESS_SECRET");
  return new TextEncoder().encode(secret);
}

const PUBLIC_PATHS = [
  "/",
  "/pricing",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/refresh",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/verify-email",
  "/api/health",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow public paths + static assets
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith("/_next") || pathname.startsWith("/favicon.ico"))) {
    return NextResponse.next();
  }

  const isApiRoute = pathname.startsWith("/api/");

  if (isApiRoute) {
    // API Route protection: requires Access Token in Authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Missing or invalid token" } },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    try {
      const { payload } = await jwtVerify(token, getAccessSecret());

      // Inject user context for downstream handlers
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-user-id", payload.userId as string);
      requestHeaders.set("x-workspace-id", payload.workspaceId as string);

      return NextResponse.next({
        request: { headers: requestHeaders },
      });
    } catch {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Invalid or expired token" } },
        { status: 401 }
      );
    }
  } else {
    // Page Route protection: check refresh cookie existence
    const hasRefreshCookie = request.cookies.has("consensus_refresh");
    if (!hasRefreshCookie) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
