import { type NextRequest, NextResponse } from "next/server";
import { repos } from "@/lib/repos";
import { ROLE_COOKIE, parseRole } from "@/lib/preferences/role";

/**
 * A photo from a thread, only for someone who can read that thread. Private
 * and never cached by anything shared: these are pictures of people's doors.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const role = parseRole(request.cookies.get(ROLE_COOKIE)?.value);
  const found = await repos().messaging.file(id, role);
  if (!found) return new NextResponse(null, { status: 404 });
  return new NextResponse(Buffer.from(found.bytes), {
    headers: {
      "Content-Type": found.mime,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
