import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bot,
  Mic,
  Search,
  Send,
  Sparkles,
} from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { useFeedStore } from '../../store/feedStore'
import { VISION_RIDES } from '../../fixtures/rides.fixtures'
import { VISION_ITEMS } from '../../fixtures/items.fixtures'
import { VISION_KNOWLEDGE_COURSES } from '../../fixtures/knowledge.fixtures'

interface AssistantMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  suggestions?: Array<{ label: string; link: string }>
}

const SAMPLE_PROMPTS = [
  'אני מחפש התנדבות באזור תל אביב בתחום החינוך',
  'איך תורמים תרומה כספית לעמותה?',
  'יש קורסים חינמיים לתכנות לבני נוער?',
  'מה זה מוקד שידוכים טוב?',
  'יש נסיעה מנתניה לבית חולים בילינסון?',
]

const SCRIPTED_REPLIES: Array<{
  match: RegExp
  buildResponse: () => AssistantMessage
}> = [
  {
    match: /התנדב|התנדבות|לעזור/i,
    buildResponse: () => ({
      id: `a-${Date.now()}`,
      role: 'assistant',
      text:
        'מצאתי לך 3 הזדמנויות התנדבות באזור הצפון/מרכז: ' +
        'מרכז "אורות" בתל אביב מחפשים מתנדבים לאירועי קהילה, ' +
        '"יד ביד נתניה" צריכים מתנדבי שטח לחלוקת סלי מזון, ' +
        'ובהרצליה תמר מארגנת שיעורי יוגה קהילתיים שזקוקים לעוזרים.',
      suggestions: [
        { label: 'גילוי אנשים', link: '/discover' },
        { label: 'פיד נסיעות', link: '/rides' },
        { label: 'אתגרים פעילים', link: '/challenges' },
      ],
    }),
  },
  {
    match: /תרומה|תרומ|לתרום|כסף/i,
    buildResponse: () => ({
      id: `a-${Date.now()}`,
      role: 'assistant',
      text:
        'אפשר לתרום ישירות מתוך פרופיל העמותה — יש כפתור "תרום" בולט. ' +
        'התרומה מתבצעת דרך טופס מאובטח, ניתן לתרום אנונימית או עם הקדשה. ' +
        'בנוסף, עמותות חוזרות לעיתים בפיד עם בקשות מימון ספציפיות.',
      suggestions: [
        { label: 'מסך תרומות', link: '/donations' },
        { label: 'קטגוריית כסף', link: '/donations/category/money' },
      ],
    }),
  },
  {
    match: /קורס|תכנות|לימוד/i,
    buildResponse: () => ({
      id: `a-${Date.now()}`,
      role: 'assistant',
      text:
        'הנה הקורסים המומלצים בתחום הטכנולוגיה: "מבוא ל-Python לבני נוער" של רון סילבר ' +
        '(8 שיעורים, רייטינג 4.8). יש גם סדנאות וידאו של 30 דק׳ לסיכום נושאים. ' +
        'כל הקורסים חינם — חלקם בהמתנה לאישור הארגון לפני פרסום.',
      suggestions: [{ label: 'מסך ידע', link: '/donations/knowledge' }],
    }),
  },
  {
    match: /שידוך|מוקד|אנונימ/i,
    buildResponse: () => ({
      id: `a-${Date.now()}`,
      role: 'assistant',
      text:
        '"שידוכים טוב" הוא מוקד אנושי המטפל בבקשות רגישות בדיסקרטיות מלאה. ' +
        'מוקדן/ית מקבל פניה, מאמת אותה, ורק לאחר הסכמה הדדית של מתנדב והמבקש — נחשפות הזהויות. ' +
        'הפנייה לעולם לא מופיעה בפיד הציבורי.',
      suggestions: [
        { label: 'מערך שידוכים טוב', link: '/donations/shiduchim-tov' },
      ],
    }),
  },
  {
    match: /נסיע|טרמפ|הסעה/i,
    buildResponse: () => ({
      id: `a-${Date.now()}`,
      role: 'assistant',
      text:
        'יש כיום 12 נסיעות פעילות בפיד. אבי בן דוד נוסע לבילינסון כל יום שני בבוקר ' +
        'עם 3 מקומות פנויים. דוד הלל יוצא מנתניה לחדרה מחר ב-07:30. ' +
        'אפשר לסנן לפי מוצא ויעד במסך הנסיעות.',
      suggestions: [{ label: 'פיד נסיעות', link: '/rides' }],
    }),
  },
]

function generateAssistantReply(question: string): AssistantMessage {
  const matched = SCRIPTED_REPLIES.find((s) => s.match.test(question))
  if (matched) return matched.buildResponse()
  return {
    id: `a-${Date.now()}`,
    role: 'assistant',
    text:
      'אני עוזר חכם של Karma Community. אני יכול לעזור לך למצוא התנדבויות, ' +
      'נסיעות, קורסים, אתגרים פעילים ומידע על עמותות בקהילה. נסה לשאול ' +
      'משהו ממוקד יותר — או בחר באחת ההצעות מלמעלה.',
    suggestions: [
      { label: 'תרומות', link: '/donations' },
      { label: 'אתגרים', link: '/challenges' },
      { label: 'מועדפים', link: '/bookmarks' },
    ],
  }
}

export function SearchAIPage() {
  const [query, setQuery] = useState('')
  const [chatInput, setChatInput] = useState('')
  const [history, setHistory] = useState<AssistantMessage[]>([
    {
      id: 'a-init',
      role: 'assistant',
      text:
        'שלום! אני העוזר הקהילתי של Karma. אתה יכול לשאול בעברית חופשית ' +
        '— אני אזהה את הצרכים ואכוון אותך לפיצ\'ר המתאים.',
    },
  ])
  const posts = useFeedStore((s) => s.posts)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || q.length < 2) return null
    const postHits = posts
      .filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.body.toLowerCase().includes(q),
      )
      .slice(0, 5)
    const rideHits = VISION_RIDES.filter(
      (r) =>
        r.from_city.includes(query) ||
        r.to_city.includes(query) ||
        r.notes.includes(query),
    ).slice(0, 5)
    const itemHits = VISION_ITEMS.filter(
      (i) =>
        i.title.includes(query) ||
        i.description.includes(query) ||
        i.city.includes(query),
    ).slice(0, 5)
    const courseHits = VISION_KNOWLEDGE_COURSES.filter(
      (c) =>
        c.title.includes(query) || c.description.includes(query),
    ).slice(0, 3)
    return { postHits, rideHits, itemHits, courseHits }
  }, [query, posts])

  function sendChat() {
    const text = chatInput.trim()
    if (!text) return
    const userMsg: AssistantMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text,
    }
    const reply = generateAssistantReply(text)
    setHistory((h) => [...h, userMsg, reply])
    setChatInput('')
  }

  return (
    <div>
      <PageHeader
        title="חיפוש ועוזר AI"
        subtitle="§3.2.2 — חיפוש חופשי + צ'אט-בוט מנחה"
      />

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2">
          <Search className="h-5 w-5 text-slate-400" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חפש פוסטים, נסיעות, חפצים, קורסים…"
            className="flex-1 bg-transparent text-sm focus:outline-none"
          />
          <button
            type="button"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-200"
            title="חיפוש קולי (דמה)"
            onClick={() => alert('חיפוש קולי — POC, לא פעיל')}
          >
            <Mic className="h-4 w-4" aria-hidden />
          </button>
        </div>
        {results ? (
          <div className="mt-4 space-y-4 text-sm">
            <SearchSection
              title="פוסטים"
              count={results.postHits.length}
              empty="אין פוסטים תואמים"
              items={results.postHits.map((p) => ({
                id: p.id,
                primary: p.title,
                secondary: p.body.slice(0, 100),
                link: '/feed',
              }))}
            />
            <SearchSection
              title="נסיעות"
              count={results.rideHits.length}
              empty="אין נסיעות תואמות"
              items={results.rideHits.map((r) => ({
                id: r.id,
                primary: `${r.from_city} ↔ ${r.to_city}`,
                secondary: `${new Date(r.departure_at).toLocaleString('he-IL')} · ${r.seats_left} מקומות פנויים`,
                link: `/rides/${r.id}`,
              }))}
            />
            <SearchSection
              title="חפצים"
              count={results.itemHits.length}
              empty="אין חפצים תואמים"
              items={results.itemHits.map((i) => ({
                id: i.id,
                primary: i.title,
                secondary: `${i.city} · ${i.condition}`,
                link: `/items/${i.id}`,
              }))}
            />
            <SearchSection
              title="קורסים"
              count={results.courseHits.length}
              empty="אין קורסים תואמים"
              items={results.courseHits.map((c) => ({
                id: c.id,
                primary: c.title,
                secondary: `${c.instructor_name} · ${c.lessons.length} שיעורים`,
                link: '/donations/knowledge',
              }))}
            />
          </div>
        ) : (
          <p className="mt-3 text-xs text-slate-400">
            התחל להקליד כדי לראות תוצאות עיקריות מכל המקומות.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
          <Bot className="h-5 w-5 text-teal-700" aria-hidden />
          <h3 className="font-semibold text-slate-900">העוזר הקהילתי</h3>
          <Badge variant="outline">דמה — תשובות מתוסרטות</Badge>
        </div>

        <div className="px-4 pt-3">
          <p className="mb-2 text-xs uppercase tracking-wider text-slate-400">
            הצעות לשאלה
          </p>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_PROMPTS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setChatInput(s)}
                className="flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs text-teal-800 hover:bg-teal-100"
              >
                <Sparkles className="h-3 w-3" aria-hidden /> {s}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-96 space-y-3 overflow-y-auto px-4 py-4">
          {history.map((m) => (
            <ChatBubble key={m.id} msg={m} />
          ))}
        </div>

        <div className="flex gap-2 border-t border-slate-200 px-4 py-3">
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') sendChat()
            }}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="שאל בעברית חופשית…"
          />
          <button
            type="button"
            onClick={sendChat}
            className="flex items-center gap-1 rounded-lg bg-teal-600 px-3 text-sm text-white hover:bg-teal-700"
          >
            <Send className="h-4 w-4" aria-hidden /> שלח
          </button>
        </div>
      </div>
    </div>
  )
}

function SearchSection({
  title,
  items,
  count,
  empty,
}: {
  title: string
  items: Array<{ id: string; primary: string; secondary: string; link: string }>
  count: number
  empty: string
}) {
  return (
    <div>
      <p className="mb-1 font-semibold text-slate-700">
        {title} <span className="font-normal text-slate-400">({count})</span>
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-slate-400">{empty}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((it) => (
            <li key={it.id}>
              <Link
                to={it.link}
                className="block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 hover:border-teal-400"
              >
                <p className="font-medium text-slate-800">{it.primary}</p>
                <p className="text-xs text-slate-500">{it.secondary}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ChatBubble({ msg }: { msg: AssistantMessage }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
          isUser
            ? 'bg-slate-100 text-slate-900'
            : 'bg-teal-50 text-teal-900 ring-1 ring-teal-200'
        }`}
      >
        <p>{msg.text}</p>
        {msg.suggestions ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {msg.suggestions.map((s) => (
              <Link
                key={s.link}
                to={s.link}
                className="rounded-full border border-teal-300 bg-white px-2.5 py-0.5 text-xs text-teal-700 hover:bg-teal-100"
              >
                {s.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
