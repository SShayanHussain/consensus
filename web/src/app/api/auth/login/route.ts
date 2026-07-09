import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users, workspaceMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword } from "@/lib/auth/passwords";
import { signAccessToken, signRefreshToken, refreshCookieOptions } from "@/lib/auth/tokens";
import { successResponse, errorResponse } from "@/lib/api-response";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return errorResponse("VALIDATION", "Email and password are required", 400);
    }

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user) {
      return errorResponse("UNAUTHORIZED", "Invalid email or password", 401);
    }

    // Verify password
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return errorResponse("UNAUTHORIZED", "Invalid email or password", 401);
    }

    // Get first workspace membership
    const [membership] = await db
      .select({ workspaceId: workspaceMembers.workspaceId })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userId, user.id))
      .limit(1);

    if (!membership) {
      return errorResponse("NOT_FOUND", "No workspace found for this user", 404);
    }

    // Sign tokens
    const accessToken = await signAccessToken({
      userId: user.id,
      workspaceId: membership.workspaceId,
    });
    const refreshToken = await signRefreshToken({
      userId: user.id,
      workspaceId: membership.workspaceId,
    });

    // Set refresh token cookie
    const cookieStore = await cookies();
    const opts = refreshCookieOptions();
    cookieStore.set(opts.name, refreshToken, opts);

    return successResponse({ accessToken });
  } catch (error) {
    console.error("Login error:", error);
    return errorResponse("INTERNAL", "An error occurred during login", 500);
  }
}
