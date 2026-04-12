import { exec } from "child_process";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url || !url.startsWith("http")) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  exec(`open '${url.replace(/'/g, "'\\''")}'`);

  return NextResponse.redirect(new URL("/", request.url));
}
