import { cookies } from "next/headers";
import { successResponse } from "@/lib/api-response";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete("consensus_refresh");
  return successResponse({ message: "Logged out" });
}
