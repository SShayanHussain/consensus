import { cookies } from "next/headers";
import { verifyRefreshToken, signAccessToken } from "@/lib/auth/tokens";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("consensus_refresh")?.value;

    if (!refreshToken) {
      return errorResponse("UNAUTHORIZED", "No refresh token", 401);
    }

    const payload = await verifyRefreshToken(refreshToken);
    const accessToken = await signAccessToken({
      userId: payload.userId,
      workspaceId: payload.workspaceId,
    });

    return successResponse({ accessToken });
  } catch {
    return errorResponse("UNAUTHORIZED", "Invalid or expired refresh token", 401);
  }
}
