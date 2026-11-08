import { beforeEach, describe, expect, it } from "vitest";
import { fixtureRepositories as repos } from "@/lib/repos/fixtures";
import { resetStore, store } from "./store";

const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const guestThread = () => store().conversations.find((c) => c.participantRoles.join() === "guest,ops")!;
const driverOnly = () => store().conversations.find((c) => c.participantRoles.join() === "ops,driver")!;

describe("messaging.send", () => {
  beforeEach(() => resetStore());

  it("adds the message under the sender's name and makes it the thread's latest", async () => {
    const c = guestThread();
    const m = await repos.messaging.send(c.id, "guest", { body: "  Landing at 19:40  " });
    expect(m).toMatchObject({ conversationId: c.id, authorRole: "guest", authorName: c.participantNames[0], body: "Landing at 19:40" });
    // Fixture threads carry their own (sometimes later) times, so this checks
    // the stamp the list sorts by rather than the order.
    const after = (await repos.messaging.byId(c.id, "guest"))!;
    expect(after.lastMessageAt).toBe(m.sentAt);
    expect(after.lastMessagePreview).toBe("Landing at 19:40");
  });

  it("refuses a thread the sender is not in", async () => {
    await expect(repos.messaging.send(driverOnly().id, "guest", { body: "hi" })).rejects.toThrow();
  });

  it("refuses an empty message with no photo", async () => {
    await expect(repos.messaging.send(guestThread().id, "guest", { body: "   " })).rejects.toThrow();
  });

  it("tells the other side, not the sender", async () => {
    const c = guestThread();
    const before = store().notifications.length;
    await repos.messaging.send(c.id, "guest", { body: "Hello" });
    const made = store().notifications.slice(before);
    expect(made.map((n) => n.audience)).toEqual(["ops"]);
    expect(made[0]).toMatchObject({ kind: "newMessage", href: `/manage/inbox?thread=${c.id}` });
  });

  it("attaches a photo uploaded to the same thread by the same role, once", async () => {
    const c = guestThread();
    const up = await repos.messaging.upload(c.id, "guest", { mime: "image/png", bytes: PNG });
    expect(up.url).toBe(`/api/messages/files/${up.id}`);
    const m = await repos.messaging.send(c.id, "guest", { body: "", attachments: [{ id: up.id, alt: "The key box" }] });
    expect(m.attachments).toEqual([{ id: up.id, url: up.url, alt: "The key box" }]);
    await expect(repos.messaging.send(c.id, "guest", { body: "", attachments: [{ id: up.id, alt: "" }] })).rejects.toThrow();
  });

  it("refuses a photo uploaded by someone else or to another thread", async () => {
    const c = guestThread();
    const theirs = await repos.messaging.upload(c.id, "ops", { mime: "image/png", bytes: PNG });
    await expect(repos.messaging.send(c.id, "guest", { body: "x", attachments: [{ id: theirs.id, alt: "" }] })).rejects.toThrow();
  });

  it("only lets someone in the thread upload to it, and only images", async () => {
    await expect(repos.messaging.upload(driverOnly().id, "guest", { mime: "image/png", bytes: PNG })).rejects.toThrow();
    await expect(repos.messaging.upload(guestThread().id, "guest", { mime: "application/pdf", bytes: PNG })).rejects.toThrow();
  });

  it("serves a file only to someone who can see its thread", async () => {
    const c = guestThread();
    const up = await repos.messaging.upload(c.id, "guest", { mime: "image/png", bytes: PNG });
    expect((await repos.messaging.file(up.id, "guest"))?.mime).toBe("image/png");
    expect(await repos.messaging.file(up.id, "driver")).toBeNull();
  });
});

describe("messaging.markRead", () => {
  beforeEach(() => resetStore());

  it("marks what the others wrote as read, for this reader", async () => {
    const c = (await repos.messaging.forRole("guest")).find((x) => x.unreadCount > 0)!;
    expect(await repos.messaging.markRead(c.id, "guest")).toBeGreaterThan(0);
    expect((await repos.messaging.byId(c.id, "guest"))!.unreadCount).toBe(0);
  });
});

describe("seeded threads", () => {
  it("are never later than now, so a reply sent now is the newest", async () => {
    resetStore();
    const now = Date.now();
    expect(store().messages.every((m) => Date.parse(m.sentAt) <= now)).toBe(true);
    const c = guestThread();
    const m = await repos.messaging.send(c.id, "guest", { body: "Latest" });
    expect((await repos.messaging.messages(c.id)).at(-1)!.id).toBe(m.id);
    expect((await repos.messaging.forRole("guest"))[0].id).toBe(c.id);
  });
});
