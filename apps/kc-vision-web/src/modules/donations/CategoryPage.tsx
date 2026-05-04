import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { VISION_DONATION_CATEGORIES } from '../../fixtures/donations.fixtures'
import { useFeedStore } from '../../store/feedStore'
import { PostCard } from '../posts/PostCard'

const LS_KEY = 'kc-vision-donation-draft'

export function CategoryPage() {
  const { slug } = useParams()
  const cat = VISION_DONATION_CATEGORIES.find((c) => c.slug === slug)
  const posts = useFeedStore((s) => s.posts)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')

  const openRequests = posts.filter(
    (p) => p.intent === 'request' && p.category_slug === slug,
  )

  if (!cat) {
    return <p className="text-slate-500">קטגוריה לא נמצאה.</p>
  }

  return (
    <div>
      <PageHeader title={cat.label_he} subtitle={cat.label_en} />
      <div className="mb-4 rounded-xl border border-slate-200 bg-amber-50 p-4">
        <button
          type="button"
          className="flex w-full items-center justify-between font-semibold text-amber-950"
          onClick={() => setOpen((o) => !o)}
        >
          <span>§2.5.9 — Open Requests (מצב Give)</span>
          {open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
        {open ? (
          <div className="mt-3 space-y-3">
            {openRequests.length === 0 ? (
              <p className="text-sm text-amber-900">אין בקשות פתוחות בקטגוריה זו.</p>
            ) : (
              openRequests.map((p) => <PostCard key={p.id} post={p} />)
            )}
          </div>
        ) : null}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="font-semibold">הצעת תרומה (localStorage)</h3>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          className="mt-2 w-full rounded-lg border px-3 py-2"
          placeholder="תארו מה תרצו לתרום…"
        />
        <button
          type="button"
          className="mt-2 rounded-lg bg-teal-600 px-3 py-1.5 text-sm text-white"
          onClick={() => {
            localStorage.setItem(LS_KEY, JSON.stringify({ slug, text: draft, at: Date.now() }))
            alert('נשמר ב-localStorage (דמה).')
          }}
        >
          שמור טיוטה
        </button>
      </div>
    </div>
  )
}
