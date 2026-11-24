import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
export async function GET() {
  const user = getSession();
  return user ? NextResponse.json({ user }) : NextResponse.json({ user: null }, { status: 401 });
}
