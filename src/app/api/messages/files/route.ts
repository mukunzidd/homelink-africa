import { type NextRequest, NextResponse } from "next/server";
import { repos } from "@/lib/repos";
import { MESSAGE_LIMITS } from "@/lib/repos/types";
import { ROLE_COOKIE, parseRole } from "@/lib/preferences/role";

/**
 * Takes one photo for a reply that has not been sent yet. A route rather
 * than a server action because actions cap a request body at 1MB, and a
 * phone photo is larger than that even after the browser has shrunk it.
 *
 * The browser re-draws the photo before sending it, which is what strips
 * its location data; this side checks the role, the thread, the size and
 * the bytes, and keeps none of the browser's claims on trust.
 */
export async function POST(request: NextRequest) {
  const role = parseRole(request.cookies.get(ROLE_COOKIE)?.value);
  if (role === "visitor") return NextResponse.json({ error: "refused" }, { status: 401 });
  // Counted as it arrives, not taken from Content-Length: a chunked
  // request has none, and the header is the sender's claim anyway.
  const body = await readCapped(request, MESSAGE_LIMITS.bytes + 64 * 1024);
  if (!body) return NextResponse.json({ error: "tooBig" }, { status: 413 });

  let form: FormData;
  try {
    form = await new Response(body, { headers: { "content-type": request.headers.get("content-type") ?? "" } }).formData();
  } catch {
    return NextResponse.json({ error: "refused" }, { status: 400 });
  }
  const conversationId = form.get("conversationId");
  const file = form.get("file");
  if (typeof conversationId !== "string" || !(file instanceof File)) return NextResponse.json({ error: "refused" }, { status: 400 });
  if (file.size > MESSAGE_LIMITS.bytes) return NextResponse.json({ error: "tooBig" }, { status: 413 });

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const made = await repos().messaging.upload(conversationId, role, { mime: file.type, bytes });
    return NextResponse.json(made, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "wrongType" }, { status: 415 });
  }
}

/** The whole body, or null as soon as it passes `max` bytes. */
async function readCapped(request: NextRequest, max: number): Promise<Uint8Array<ArrayBuffer> | null> {
  if (Number(request.headers.get("content-length") ?? 0) > max) return null;
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array(0);
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.byteLength;
  }
  return out;
}
