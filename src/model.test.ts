import { describe, it, expect } from "vitest";
import {
  selectFocus,
  readyToGraduate,
  initialData,
  validateData,
  ancestors,
  type Entry,
} from "./model";
const item = (
  id: string,
  values: boolean[] = [],
  status: Entry["status"] = "active",
): Entry => ({
  id,
  folderId: "root",
  text: id,
  status,
  records: values.map((ok) => ({ ok, at: "2026-11-08T00:00:00Z" })),
});
describe("今意識する項目", () => {
  it("未記録と×率の高い順に選ぶ", () => {
    expect(
      selectFocus(
        [
          item("a", [true]),
          item("b", [false, true]),
          item("c"),
          item("d", [false, false, true]),
        ],
        [],
        3,
      ).map((e) => e.id),
    ).toEqual(["c", "d", "b"]);
  });
  it("直近10回だけを使う", () => {
    expect(
      selectFocus(
        [
          item("a", [...Array(20).fill(false), ...Array(10).fill(true)]),
          item("b", [false, true]),
        ],
        [],
        1,
      )[0].id,
    ).toBe("b");
  });
  it("固定を優先し、ストックと卒業は除く", () => {
    expect(
      selectFocus(
        [
          item("a", [true]),
          item("b"),
          item("c", [], "stock"),
          item("d", [], "graduated"),
        ],
        ["a", "c", "d"],
        2,
      ).map((e) => e.id),
    ).toEqual(["a", "b"]);
  });
  it("上限と固定の超過を扱い、元配列を変更しない", () => {
    const entries = [item("b", [true]), item("a")];
    expect(selectFocus(entries, ["a", "b"], 1).map((e) => e.id)).toEqual(["a"]);
    expect(entries[0].id).toBe("b");
    expect(selectFocus(entries, [], 5)).toHaveLength(2);
  });
});
describe("卒業判定", () => {
  it("設定回数の連続○で候補になる", () => {
    expect(
      readyToGraduate(item("a", [false, true, true, true, true, true]), 5),
    ).toBe(true);
    expect(readyToGraduate(item("a", [true, true]), 2)).toBe(true);
  });
  it("不足・途中の×・卒業済みは候補にしない", () => {
    expect(readyToGraduate(item("a", [true, true]), 5)).toBe(false);
    expect(readyToGraduate(item("a", [true, true, false, true, true]), 5)).toBe(
      false,
    );
    expect(
      readyToGraduate(item("a", Array(5).fill(true), "graduated"), 5),
    ).toBe(false);
  });
});
describe("データの読み込み", () => {
  it("初期データと祖先を扱う", () => {
    const d = initialData();
    expect(validateData(JSON.parse(JSON.stringify(d)))).toEqual(d);
    expect(ancestors(d, "fighting").map((f) => f.id)).toEqual([
      "root",
      "fighting",
    ]);
  });
  it("循環フォルダや壊れた記録、設定を拒否する", () => {
    const d = initialData();
    d.folders[1].parentId = "fighting";
    expect(() => validateData(d)).toThrow();
    expect(() =>
      validateData({ ...initialData(), settings: { limit: 0, streak: 5 } }),
    ).toThrow();
    expect(() =>
      validateData({
        ...initialData(),
        entries: [{ ...item("a"), records: [{ ok: "yes", at: "bad" }] }],
      }),
    ).toThrow();
  });
});
