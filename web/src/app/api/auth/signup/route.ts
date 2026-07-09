import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users, workspaces, workspaceMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/passwords";
import { signAccessToken, signRefreshToken, refreshCookieOptions } from "@/lib/auth/tokens";
import { successResponse, errorResponse } from "@/lib/api-response";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return errorResponse("VALIDATION", "Name, email, and password are required", 400);
    }

    if (password.length < 8) {
      return errorResponse("VALIDATION", "Password must be at least 8 characters", 400);
    }

    // Check if user exists
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      return errorResponse("CONFLICT", "An account with this email already exists", 409);
    }

    const passwordHash = await hashPassword(password);

    // Create user
    const [user] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        name,
        passwordHash,
        emailVerified: true, // Skip email verification for MVP
      })
      .returning({ id: users.id });

    // Create default workspace
    const slug = email.split("@")[0].replace(/[^a-z0-9]/gi, "-").toLowerCase();
    const [workspace] = await db
      .insert(workspaces)
      .values({
        name: `${name}'s Workspace`,
        slug: `${slug}-${Date.now()}`,
      })
      .returning({ id: workspaces.id });

    // Add user as owner
    await db.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId: user.id,
      role: "owner",
    });

    // Sign tokens
    const accessToken = await signAccessToken({ userId: user.id, workspaceId: workspace.id });
    const refreshToken = await signRefreshToken({ userId: user.id, workspaceId: workspace.id });

    // Set refresh token cookie
    const cookieStore = await cookies();
    const opts = refreshCookieOptions();
    cookieStore.set(opts.name, refreshToken, opts);

    return successResponse({ accessToken }, 201);
  } catch (error) {
    console.error("Signup error:", error);
    return errorResponse("INTERNAL", "An error occurred during signup", 500);
  }
}
