import { openUrl } from "@tauri-apps/plugin-opener";

const SHORTCUTS = [
  { keys: "⌘⇧X", action: "Toggle overlay on / off" },
  { keys: "⌘⇧D", action: "Toggle draw mode" },
  { keys: "⌘⇧C", action: "Clear canvas" },
  { keys: "⌘⇧Z", action: "Undo" },
  { keys: "⌘⇧Y", action: "Redo" },
  { keys: "⌘⇧S", action: "Toggle mouse tracker" },
];

export function About() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <section className="max-w-xl mx-auto rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-wide">About Mira</h1>
          <p className="text-sm text-slate-300">
            Mira is a lightweight screen annotation overlay for live explanations and presentations.
          </p>
        </header>

        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Developed by</h2>
          <p>Pedro Santos</p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Repository</h2>
          <button
            onClick={() => void openUrl("https://github.com/p-c-g-s/MIRA")}
            className="text-sky-300 hover:text-sky-200 underline underline-offset-4"
          >
            https://github.com/p-c-g-s/MIRA
          </button>
        </div>

        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Shortcuts</h2>
          <ul className="space-y-2">
            {SHORTCUTS.map((item) => (
              <li key={item.keys} className="flex items-center justify-between gap-3 text-sm">
                <code className="px-2 py-1 rounded bg-slate-800">{item.keys}</code>
                <span className="text-slate-300 text-right">{item.action}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
