import { useMemo, useState } from 'react'
import { marked } from 'marked'
import { NavLink } from 'react-router-dom'
import { ArrowRight, BookOpen, MessageCircle } from 'lucide-react'

const rawFiles = import.meta.glob('../../../../../docs/SSOT/PRD_HE_V2/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

function formatName(path: string): string {
  return (
    path
      .split('/')
      .at(-1)
      ?.replace('.md', '')
      .replace(/^\d+_/, '')
      .replaceAll('_', ' ') ?? path
  )
}

const files = Object.entries(rawFiles)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, content]) => ({
    path,
    label: formatName(path),
    content,
  }))

export function PRDViewerPage() {
  const [selectedPath, setSelectedPath] = useState(files[0]?.path ?? '')

  const current = files.find((f) => f.path === selectedPath)
  const html = useMemo(
    () => (current ? (marked.parse(current.content) as string) : ''),
    [current],
  )

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 shadow-sm">
        <NavLink
          to="/feed"
          className="flex items-center gap-1.5 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-teal-700 transition-colors"
          title="חזרה לאפליקציה"
        >
          <ArrowRight className="h-5 w-5" />
        </NavLink>
        <BookOpen className="h-5 w-5 text-teal-700" />
        <h1 className="text-sm font-bold text-slate-800">
          מסמך PRD V2 — Karma Community
        </h1>
      </header>

      {/* 3-column body */}
      <div className="flex flex-1 min-h-0">
        {/* File list sidebar (left) */}
        <aside className="w-56 shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50">
          <div className="px-3 py-3 border-b border-slate-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              פרקים
            </p>
          </div>
          <nav className="p-2 flex flex-col gap-1" dir="rtl">
            {files.map((f) => (
              <button
                key={f.path}
                type="button"
                onClick={() => setSelectedPath(f.path)}
                className={`w-full rounded-lg px-3 py-2 text-right text-sm transition-colors ${
                  selectedPath === f.path
                    ? 'bg-teal-600 text-white font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main markdown content */}
        <main className="flex-1 overflow-y-auto">
          <div className="px-8 py-6 max-w-4xl mx-auto" dir="rtl">
            <article
              className="prose prose-slate prose-headings:text-teal-800 prose-a:text-teal-600 max-w-none"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        </main>

        {/* Feedback sidebar (right) */}
        <aside className="w-56 shrink-0 border-l border-slate-200 bg-amber-50 p-4 flex flex-col gap-4">
          <div className="rounded-xl bg-white border border-amber-200 shadow-sm p-4 text-sm leading-relaxed">
            <div className="flex items-center gap-2 mb-2 text-amber-700 font-semibold">
              <MessageCircle className="h-4 w-4 shrink-0" />
              <span>יש לך הערות?</span>
            </div>
            <p className="text-slate-600 text-xs mb-2">שלח הודעה למספר:</p>
            <a
              href="https://wa.me/9720528616878"
              target="_blank"
              rel="noreferrer"
              className="block font-bold text-teal-700 text-base hover:underline"
              dir="ltr"
            >
              052-8616878
            </a>
            <p className="mt-2 text-slate-500 text-xs">— נוה</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
