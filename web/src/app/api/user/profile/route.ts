import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return errorResponse("UNAUTHORIZED", "Not authenticated", 401);
    }

    const body = await request.json();
    const { name } = body;

    if (!name || name.trim().length === 0) {
      return errorResponse("VALIDATION", "Name is required", 400);
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        name: name.trim(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.userId))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
      });

    if (!updatedUser) {
      return errorResponse("NOT_FOUND", "User not found", 404);
    }

    return successResponse({ user: updatedUser });
  } catch (error) {
    console.error("Profile update error:", error);
    return errorResponse("INTERNAL", "An error occurred updating the profile", 500);
  }
}
