import { openDB } from "idb";
import { initialData, validateData, type Data } from "./model";
const db = openDB("effort-mind", 1, {
  upgrade(db) {
    db.createObjectStore("state");
  },
});
export async function loadData(): Promise<Data> {
  const value = await (await db).get("state", "data");
  return value ? validateData(value) : initialData();
}
export async function saveData(data: Data) {
  await (await db).put("state", data, "data");
}
