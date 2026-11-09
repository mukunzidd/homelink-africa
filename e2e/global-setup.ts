/** Back to the seed before the run, so every journey starts from the same store. */
export default async function globalSetup() {
  const base = process.env.BASE ?? "http://localhost:3100";
  const res = await fetch(`${base}/api/dev/reset`, { method: "POST" }).catch(() => null);
  if (!res?.ok) throw new Error(`Could not reset the fixture store at ${base}/api/dev/reset. Start the stack with \`make up\` (it sets HOMELINK_E2E=1).`);
}
