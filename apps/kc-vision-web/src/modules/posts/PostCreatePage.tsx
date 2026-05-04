import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { useFeedStore } from '../../store/feedStore'
import {
  getActingUserId,
  usePersonaStore,
} from '../../store/personaStore'
import type { AnonymityLevel, PostIntent, VisionPostType } from '../../fixtures/posts.fixtures'

export function PostCreatePage() {
  const navigate = useNavigate()
  const addPost = useFeedStore((s) => s.addPost)
  const preset = usePersonaStore((s) => s.preset)
  const uid = getActingUserId(preset)

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [intent, setIntent] = useState<PostIntent>('give')
  const [postType, setPostType] = useState<VisionPostType>('regular')
  const [anonymityLevel, setAnonymityLevel] = useState<AnonymityLevel>(4)

  if (!uid) {
    return (
      <p className="text-rose-700">יש להתחבר (לא אורח) כדי ליצור פוסט.</p>
    )
  }

  return (
    <div>
      <PageHeader title="יצירת פוסט (דמה)" subtitle="§2.5.7–§2.5.8" />
      <form
        className="max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-6"
        onSubmit={(e) => {
          e.preventDefault()
          addPost({
            id: `local-${Date.now()}`,
            author_id: uid,
            title,
            body,
            post_type: postType,
            intent,
            anonymity_level: anonymityLevel,
            likes_count: 0,
            comments_count: 0,
            created_at: new Date().toISOString(),
          })
          navigate('/feed')
        }}
      >
        <label className="block text-sm font-medium">
          כותרת
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </label>
        <label className="block text-sm font-medium">
          תוכן
          <textarea
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </label>
        <label className="block text-sm font-medium">
          Intent (§2.5.8)
          <select
            value={intent}
            onChange={(e) => setIntent(e.target.value as PostIntent)}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          >
            <option value="give">give / לתת</option>
            <option value="request">request / לקבל</option>
          </select>
        </label>
        <label className="block text-sm font-medium">
          סוג פוסט
          <select
            value={postType}
            onChange={(e) => setPostType(e.target.value as VisionPostType)}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          >
            <option value="regular">רגיל</option>
            <option value="donation_item">כרטיס תרומה</option>
            <option value="ride">נסיעה</option>
            <option value="challenge">אתגר</option>
          </select>
        </label>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">רמת אנונימיות (§2.5.7)</legend>
          {([1, 2, 3, 4] as const).map((lv) => (
            <label key={lv} className="flex cursor-pointer gap-2 text-sm">
              <input
                type="radio"
                name="anon"
                checked={anonymityLevel === lv}
                onChange={() => setAnonymityLevel(lv)}
              />
              <span>
                L{lv} —{' '}
                {lv === 1
                  ? 'אופרטורים בלבד + תור התאמה'
                  : lv === 2
                    ? 'אופרטורים + עוקבים'
                    : lv === 3
                      ? 'ציבור מצומצם'
                      : 'ציבורי מלא'}
              </span>
            </label>
          ))}
        </fieldset>
        <button
          type="submit"
          className="rounded-lg bg-teal-600 px-4 py-2 font-medium text-white"
        >
          פרסם (מקומי)
        </button>
      </form>
    </div>
  )
}
