import { afterEach, describe, expect, it, vi } from "vitest";
import { createMeiliEngine } from "./meili-engine";

/** A fake Meilisearch that records every call and can be told to fail one. */
function fakeMeili() {
  const calls: string[] = [];
  let failNextPost = false;
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    const path = url.replace("http://meili", "");
    calls.push(`${init?.method ?? "GET"} ${path}`);
    if (failNextPost && init?.method === "POST" && path.endsWith("/documents")) {
      failNextPost = false;
      return new Response("boom", { status: 500 });
    }
    if (path.startsWith("/tasks/")) return Response.json({ status: "succeeded" });
    if (path.includes("/search")) return Response.json({ hits: [] });
    return Response.json({ taskUid: 1 });
  });
  return { calls, failPost: () => (failNextPost = true) };
}

afterEach(() => vi.unstubAllGlobals());

describe("Meilisearch refresh", () => {
  it("clears the documents before rebuilding, even when the refresh itself failed", async () => {
    const m = fakeMeili();
    const engine = createMeiliEngine({ url: "http://meili", key: "k", load: async () => [] });
    await engine.search({ text: "", filters: { kind: "stay" } });
    m.failPost();
    await expect(engine.refresh()).rejects.toThrow();
    m.calls.length = 0;
    await engine.search({ text: "", filters: { kind: "stay" } });
    const del = m.calls.findIndex((c) => c === "DELETE /indexes/supply/documents");
    const post = m.calls.findIndex((c) => c === "POST /indexes/supply/documents");
    expect(del).toBeGreaterThanOrEqual(0);
    expect(del).toBeLessThan(post);
  });
});
