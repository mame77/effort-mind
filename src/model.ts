export type Folder = { id: string; parentId: string | null; name: string };
export type Entry = {
  id: string;
  folderId: string;
  text: string;
  status: "active" | "stock" | "graduated";
  records: { ok: boolean; at: string }[];
};
export type Data = {
  version: 1;
  folders: Folder[];
  entries: Entry[];
  pins: Record<string, string[]>;
  settings: { limit: number; streak: number };
};
export const initialData = (): Data => ({
  version: 1,
  folders: [
    { id: "root", parentId: null, name: "ホーム" },
    { id: "fighting", parentId: "root", name: "格ゲー" },
    { id: "snow", parentId: "root", name: "スノボ" },
  ],
  entries: [],
  pins: {},
  settings: { limit: 3, streak: 5 },
});
export function missRate(e: Entry) {
  const r = e.records.slice(-10);
  return r.length ? r.filter((x) => !x.ok).length / r.length : 1;
}
export function selectFocus(entries: Entry[], pins: string[], limit: number) {
  return entries
    .filter((e) => e.status === "active")
    .sort(
      (a, b) =>
        Number(pins.includes(b.id)) - Number(pins.includes(a.id)) ||
        missRate(b) - missRate(a) ||
        a.id.localeCompare(b.id),
    )
    .slice(0, limit);
}
export function readyToGraduate(e: Entry, streak: number) {
  return (
    e.status === "active" &&
    e.records.length >= streak &&
    e.records.slice(-streak).every((r) => r.ok)
  );
}
export function ancestors(data: Data, id: string): Folder[] {
  const result: Folder[] = [];
  let f = data.folders.find((f) => f.id === id);
  while (f) {
    result.unshift(f);
    f = data.folders.find((x) => x.id === f!.parentId);
  }
  return result;
}
export function validateData(value: unknown): Data {
  const d = value as Data;
  const fail = () => {
    throw new Error("対応する effort-mind の JSON ファイルではありません。");
  };
  if (
    !d ||
    d.version !== 1 ||
    !Array.isArray(d.folders) ||
    !Array.isArray(d.entries) ||
    !d.settings ||
    !d.pins ||
    typeof d.pins !== "object" ||
    Array.isArray(d.pins)
  )
    return fail();
  if (
    !Number.isInteger(d.settings.limit) ||
    d.settings.limit < 1 ||
    d.settings.limit > 20 ||
    !Number.isInteger(d.settings.streak) ||
    d.settings.streak < 1 ||
    d.settings.streak > 100
  )
    return fail();
  const ids = new Set<string>();
  for (const f of d.folders) {
    if (
      !f ||
      typeof f.id !== "string" ||
      ids.has(f.id) ||
      typeof f.name !== "string" ||
      !f.name.trim() ||
      (f.parentId !== null && typeof f.parentId !== "string")
    )
      return fail();
    ids.add(f.id);
  }
  if (
    !d.folders.some((f) => f.id === "root" && f.parentId === null) ||
    d.folders.some(
      (f) => f.id !== "root" && (f.parentId === null || !ids.has(f.parentId)),
    )
  )
    return fail();
  for (const f of d.folders) {
    const seen = new Set<string>();
    let current: Folder | undefined = f;
    while (current) {
      if (seen.has(current.id)) return fail();
      seen.add(current.id);
      current = d.folders.find((x) => x.id === current!.parentId);
    }
  }
  const entryIds = new Set<string>();
  for (const e of d.entries) {
    if (
      !e ||
      typeof e.id !== "string" ||
      entryIds.has(e.id) ||
      !ids.has(e.folderId) ||
      typeof e.text !== "string" ||
      !e.text.trim() ||
      !["active", "stock", "graduated"].includes(e.status) ||
      !Array.isArray(e.records) ||
      e.records.some(
        (r) =>
          !r ||
          typeof r.ok !== "boolean" ||
          typeof r.at !== "string" ||
          !Number.isFinite(Date.parse(r.at)),
      )
    )
      return fail();
    entryIds.add(e.id);
  }
  for (const [folder, pins] of Object.entries(d.pins)) {
    if (
      !ids.has(folder) ||
      !Array.isArray(pins) ||
      pins.some((id) => typeof id !== "string" || !entryIds.has(id))
    )
      return fail();
  }
  return d;
}
