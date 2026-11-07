import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ancestors,
  readyToGraduate,
  selectFocus,
  validateData,
  type Data,
  type Entry,
} from "./model";
import { loadData, saveData } from "./db";
import "./style.css";
function App() {
  const [data, setData] = useState<Data>();
  const [folder, setFolder] = useState("root");
  const [page, setPage] = useState<
    "folder" | "stock" | "graduated" | "settings"
  >("folder");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [text, setText] = useState("");
  const [newFolder, setNewFolder] = useState("");
  const [expanded, setExpanded] = useState(false);
  const queue = useRef(Promise.resolve());
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    loadData()
      .then(setData)
      .catch(() =>
        setError(
          "データを開けませんでした。ブラウザの保存設定を確認して再読み込みしてください。",
        ),
      );
  }, []);
  function update(next: Data) {
    setData(next);
    setSaving(true);
    setError("");
    queue.current = queue.current
      .catch(() => {})
      .then(() => saveData(next))
      .then(() => {
        setSaving(false);
      })
      .catch(() => {
        setSaving(false);
        setError(
          "保存に失敗しました。画面のデータを JSON に書き出して保管してください。",
        );
      });
  }
  if (!data)
    return (
      <main className="loading">
        <h1>effort-mind</h1>
        <p role="alert">{error || "意識することを開いています…"}</p>
      </main>
    );
  const path = ancestors(data, folder);
  const visible = data.entries.filter((e) =>
    path.some((f) => f.id === e.folderId),
  );
  const pins = data.pins[folder] || [];
  const focus = selectFocus(visible, pins, data.settings.limit);
  const others = visible.filter(
    (e) => e.status === "active" && !focus.some((f) => f.id === e.id),
  );
  const changeEntry = (id: string, patch: Partial<Entry>) =>
    update({
      ...data,
      entries: data.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    });
  function openFolder(id: string) {
    setFolder(id);
    setExpanded(false);
    setText("");
    setNewFolder("");
    setPage("folder");
  }
  function deleteFolder(id: string) {
    const deleted = new Set([id]);
    let count = -1;
    while (count !== deleted.size) {
      count = deleted.size;
      data!.folders.forEach((f) => {
        if (f.parentId && deleted.has(f.parentId)) deleted.add(f.id);
      });
    }
    const items = data!.entries.filter((e) => deleted.has(e.folderId));
    if (
      !confirm(
        `このフォルダと配下のフォルダ、項目 ${items.length} 件を削除します。よろしいですか？`,
      )
    )
      return;
    const ids = new Set(items.map((e) => e.id));
    update({
      ...data!,
      folders: data!.folders.filter((f) => !deleted.has(f.id)),
      entries: data!.entries.filter((e) => !ids.has(e.id)),
      pins: Object.fromEntries(
        Object.entries(data!.pins)
          .filter(([id]) => !deleted.has(id))
          .map(([id, p]) => [id, p.filter((x) => !ids.has(x))]),
      ),
    });
  }
  function card(e: Entry) {
    const fixed = pins.includes(e.id);
    return (
      <article className="item" key={e.id}>
        <div className="origin">
          {ancestors(data!, e.folderId)
            .map((f) => f.name)
            .join(" › ")}
        </div>
        <h3>{e.text}</h3>
        <div className="history" aria-label="直近10回の記録">
          {e.records.length
            ? e.records.slice(-10).map((r, i) => (
                <span key={i} className={r.ok ? "ok" : "miss"}>
                  {r.ok ? "○" : "×"}
                </span>
              ))
            : "まだ記録がありません"}
          <small> · 全 {e.records.length} 回</small>
        </div>
        {e.status === "active" ? (
          <>
            <div className="record">
              <button
                className="yes"
                aria-label={`${e.text}：○を記録`}
                onClick={() =>
                  changeEntry(e.id, {
                    records: [
                      ...e.records,
                      { ok: true, at: new Date().toISOString() },
                    ],
                  })
                }
              >
                ○<span>できた</span>
              </button>
              <button
                className="no"
                aria-label={`${e.text}：×を記録`}
                onClick={() =>
                  changeEntry(e.id, {
                    records: [
                      ...e.records,
                      { ok: false, at: new Date().toISOString() },
                    ],
                  })
                }
              >
                ×<span>次こそ</span>
              </button>
            </div>
            {readyToGraduate(e, data!.settings.streak) && (
              <button
                className="graduate"
                onClick={() => changeEntry(e.id, { status: "graduated" })}
              >
                ✧ {data!.settings.streak} 回連続 ○！ 卒業しますか？
              </button>
            )}
            <div className="actions">
              <button
                aria-pressed={fixed}
                onClick={() =>
                  update({
                    ...data!,
                    pins: {
                      ...data!.pins,
                      [folder]: fixed
                        ? pins.filter((id) => id !== e.id)
                        : [...pins, e.id],
                    },
                  })
                }
              >
                {fixed ? "● 固定中" : "＋ ここで固定"}
              </button>
              <button onClick={() => changeEntry(e.id, { status: "stock" })}>
                ストックへ
              </button>
              <button
                onClick={() => {
                  const value = prompt("項目を編集", e.text);
                  if (value?.trim()) changeEntry(e.id, { text: value.trim() });
                }}
              >
                編集
              </button>
            </div>
          </>
        ) : (
          <button
            className="restore"
            onClick={() => changeEntry(e.id, { status: "active" })}
          >
            意識する項目に戻す
          </button>
        )}
      </article>
    );
  }
  async function importFile(selected: File) {
    try {
      const next = validateData(JSON.parse(await selected.text()));
      if (
        !confirm(
          `現在のデータを読み込んだ ${next.entries.length} 件の項目で置き換えます。よろしいですか？`,
        )
      )
        return;
      update(next);
      openFolder("root");
      setNotice("ファイルを読み込みました。");
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました。");
    }
  }
  return (
    <div className="shell">
      <header>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            openFolder("root");
          }}
        >
          effort<span>—</span>mind
        </a>
        <span className="save">
          {saving ? "保存中…" : "このブラウザに保存"}
        </span>
      </header>
      <main>
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        {notice && (
          <div className="notice" role="status">
            {notice}
            <button onClick={() => setNotice("")}>閉じる</button>
          </div>
        )}
        {page === "folder" ? (
          <>
            <nav className="breadcrumbs" aria-label="パンくず">
              {path.map((f, i) => (
                <React.Fragment key={f.id}>
                  {i > 0 && <span>›</span>}
                  <button onClick={() => openFolder(f.id)}>{f.name}</button>
                </React.Fragment>
              ))}
            </nav>
            <div className="title">
              <div>
                <p className="eyebrow">ONE STEP AT A TIME</p>
                <h1>{path.at(-1)?.name}</h1>
              </div>
              <span className="folder-mark">▱</span>
            </div>
            <section className="folders">
              <h2>フォルダ</h2>
              {data.folders
                .filter((f) => f.parentId === folder)
                .map((f) => (
                  <div className="folder-row" key={f.id}>
                    <button
                      className="folder-link"
                      onClick={() => openFolder(f.id)}
                    >
                      ▱ <strong>{f.name}</strong>
                      <span>›</span>
                    </button>
                    <button
                      aria-label={`${f.name}の名前を変更`}
                      onClick={() => {
                        const name = prompt("フォルダ名", f.name);
                        if (name?.trim())
                          update({
                            ...data,
                            folders: data.folders.map((x) =>
                              x.id === f.id ? { ...x, name: name.trim() } : x,
                            ),
                          });
                      }}
                    >
                      名前
                    </button>
                    <button
                      aria-label={`${f.name}を削除`}
                      onClick={() => deleteFolder(f.id)}
                    >
                      削除
                    </button>
                  </div>
                ))}
              <form
                className="inline-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newFolder.trim()) return;
                  update({
                    ...data,
                    folders: [
                      ...data.folders,
                      {
                        id: crypto.randomUUID(),
                        parentId: folder,
                        name: newFolder.trim(),
                      },
                    ],
                  });
                  setNewFolder("");
                }}
              >
                <input
                  aria-label="新しいフォルダ名"
                  placeholder="新しいフォルダ"
                  value={newFolder}
                  onChange={(e) => setNewFolder(e.target.value)}
                  maxLength={100}
                />
                <button disabled={!newFolder.trim()}>＋ 追加</button>
              </form>
            </section>
            <section>
              <div className="section-heading">
                <h2>今意識する{data.settings.limit}つ</h2>
                <span>
                  {focus.length} / {data.settings.limit}
                </span>
              </div>
              <p className="hint">ひとつずつ、できたを増やそう。</p>
              {focus.length ? (
                focus.map(card)
              ) : (
                <div className="empty">
                  意識したいことを、ひとつ書いてみよう。
                  <br />
                  上のフォルダの項目もここに届きます。
                </div>
              )}
            </section>
            <section>
              <button
                className="disclosure"
                aria-expanded={expanded}
                onClick={() => setExpanded(!expanded)}
              >
                <span>{expanded ? "▾" : "▸"} ほかの項目</span>
                <span>{others.length} 件</span>
              </button>
              {expanded && others.map(card)}
            </section>
            <form
              className="add-item"
              onSubmit={(e) => {
                e.preventDefault();
                if (!text.trim()) return;
                update({
                  ...data,
                  entries: [
                    ...data.entries,
                    {
                      id: crypto.randomUUID(),
                      folderId: folder,
                      text: text.trim(),
                      status: "active",
                      records: [],
                    },
                  ],
                });
                setText("");
              }}
            >
              <label htmlFor="new-item">意識することを追加</label>
              <textarea
                id="new-item"
                placeholder="例：対空は昇竜を早めに"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={1000}
                rows={2}
              />
              <button className="primary" disabled={!text.trim()}>
                ＋ このフォルダに追加
              </button>
            </form>
          </>
        ) : page === "settings" ? (
          <>
            <p className="eyebrow">MAKE IT YOURS</p>
            <h1>設定</h1>
            <section className="settings">
              <label>
                今意識する項目の上限
                <select
                  value={data.settings.limit}
                  onChange={(e) =>
                    update({
                      ...data,
                      settings: {
                        ...data.settings,
                        limit: Number(e.target.value),
                      },
                    })
                  }
                >
                  {Array.from({ length: 20 }, (_, i) => (
                    <option key={i} value={i + 1}>
                      {i + 1} つ
                    </option>
                  ))}
                </select>
              </label>
              <label>
                卒業をすすめる連続 ○ の回数
                <select
                  value={data.settings.streak}
                  onChange={(e) =>
                    update({
                      ...data,
                      settings: {
                        ...data.settings,
                        streak: Number(e.target.value),
                      },
                    })
                  }
                >
                  {Array.from({ length: 100 }, (_, i) => (
                    <option key={i} value={i + 1}>
                      {i + 1} 回
                    </option>
                  ))}
                </select>
              </label>
              <p className="hint">
                直近10回の ×
                率が高い項目を優先します。記録のない項目も優先されます。固定した項目が上限を超えた場合は同じ基準で選びます。
              </p>
            </section>
            <section className="settings">
              <h2>データの持ち運び</h2>
              <p>
                データはこのブラウザだけに保存されます。端末の移行やバックアップに
                JSON ファイルを使えます。
              </p>
              <button
                className="primary"
                onClick={() => {
                  const url = URL.createObjectURL(
                    new Blob([JSON.stringify(data, null, 2)], {
                      type: "application/json",
                    }),
                  );
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `effort-mind-${new Date().toISOString().slice(0, 10)}.json`;
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                }}
              >
                JSON に書き出す
              </button>
              <input
                ref={file}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(e) => {
                  const selected = e.target.files?.[0];
                  if (selected) void importFile(selected);
                  e.target.value = "";
                }}
              />
              <button className="restore" onClick={() => file.current?.click()}>
                JSON を読み込む
              </button>
              <small>読み込むと現在のデータを置き換えます。</small>
            </section>
            <section className="settings">
              <h2>電波がない場所でも</h2>
              <p>
                一度オンラインで開くと、次回からオフラインでも利用できます。ホーム画面に追加すると、より開きやすくなります。
              </p>
            </section>
          </>
        ) : (
          <>
            <p className="eyebrow">
              {page === "stock" ? "FOR ANOTHER DAY" : "WELL DONE"}
            </p>
            <h1>{page === "stock" ? "ストック" : "卒業した項目"}</h1>
            <p className="hint">
              {page === "stock"
                ? "今はお休み。また意識したいときに戻せます。"
                : "身についたことの足あと。いつでも戻せます。"}
            </p>
            {data.entries.filter((e) => e.status === page).length ? (
              data.entries.filter((e) => e.status === page).map(card)
            ) : (
              <div className="empty">まだ項目はありません。</div>
            )}
          </>
        )}
      </main>
      <nav className="bottom" aria-label="メインナビゲーション">
        {(
          [
            ["folder", "▱", "フォルダ"],
            ["stock", "☷", "ストック"],
            ["graduated", "✓", "卒業"],
            ["settings", "⚙", "設定"],
          ] as const
        ).map(([id, icon, label]) => (
          <button
            key={id}
            className={page === id ? "selected" : ""}
            onClick={() => {
              setPage(id);
              setNotice("");
            }}
          >
            <span>{icon}</span>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
