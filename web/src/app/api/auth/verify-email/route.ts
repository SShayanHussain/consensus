import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ message: "Email verification coming soon" }, { status: 501 });
}
