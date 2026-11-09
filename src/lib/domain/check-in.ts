/**
 * How a guest gets into a home. Most Kigali homes hand keys over in person
 * or have someone at the gate (a caretaker who lives on site, a guard day
 * and night); a door or key-box code is the exception, so it is one choice
 * of four and the code is only kept when it is the way in.
 */
export const ENTRY_KINDS = ["keys", "caretaker", "guard", "code"] as const;
export type EntryKind = (typeof ENTRY_KINDS)[number];

export type CheckInDetails = {
  directions: string;
  entry: EntryKind;
  /** Only when `entry` is "code". */
  doorCode?: string;
  /** Who and where, in the manager's words: "Jean at the gate has the keys." */
  entryNote?: string;
  wifiName: string;
  wifiPassword: string;
};

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * Check-in details from a form or from storage, made whole. Details saved
 * before there was a choice had only a door code: a code there means the
 * way in is a code, and an empty one means keys.
 */
export function normaliseCheckIn(raw: unknown): CheckInDetails {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const code = text(r.doorCode, 40);
  const entry: EntryKind = ENTRY_KINDS.includes(r.entry as EntryKind) ? (r.entry as EntryKind) : r.entry === undefined && code ? "code" : "keys";
  const note = text(r.entryNote, 300);
  return {
    directions: text(r.directions, 1000),
    entry,
    ...(entry === "code" ? { doorCode: code } : {}),
    ...(note ? { entryNote: note } : {}),
    wifiName: text(r.wifiName, 60),
    wifiPassword: text(r.wifiPassword, 60),
  };
}
