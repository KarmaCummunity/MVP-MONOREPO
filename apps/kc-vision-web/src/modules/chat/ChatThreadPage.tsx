import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Smile } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Avatar } from '../../components/ui/Avatar'
import { useChatStore } from '../../store/chatStore'
import { getActingUserId, usePersonaStore } from '../../store/personaStore'
import { visionUserById } from '../users/fixtures'

export function ChatThreadPage() {
  const { conversationId } = useParams()
  const preset = usePersonaStore((s) => s.preset)
  const uid = getActingUserId(preset)
  const messages = useChatStore((s) => s.messages)
  const sendMessage = useChatStore((s) => s.sendMessage)
  const [text, setText] = useState('')
  const [typing, setTyping] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  const thread = messages.filter((m) => m.conversation_id === conversationId)

  useEffect(() => {
    const t = window.setTimeout(() => setTyping(false), 1200)
    return () => window.clearTimeout(t)
  }, [typing])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [thread.length])

  if (!uid || !conversationId) return <p>לא זמין</p>

  return (
    <div className="flex h-[calc(100vh-220px)] flex-col">
      <PageHeader
        title="שיחה"
        action={
          <Link to="/chat" className="text-sm text-teal-700">
            ←
          </Link>
        }
      />
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4">
        {thread.map((m) => {
          const sender = visionUserById(m.sender_id)
          const mine = m.sender_id === uid
          return (
            <div
              key={m.id}
              className={`flex gap-2 ${mine ? 'justify-end' : 'justify-start'}`}
            >
              {!mine ? (
                <Avatar src={sender?.avatar_url ?? ''} alt="" size="sm" />
              ) : null}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                  mine ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-900'
                }`}
              >
                {m.body}
                {m.reactions?.length ? (
                  <div className="mt-1 text-xs opacity-80">{m.reactions.join(' ')}</div>
                ) : null}
                <div className="mt-1 text-[10px] opacity-70">
                  {m.read ? 'נקרא' : 'נשלח'}
                </div>
              </div>
            </div>
          )
        })}
        {typing ? (
          <p className="text-xs text-slate-400">מקליד… (דמה)</p>
        ) : null}
      </div>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!text.trim() || !conversationId) return
          sendMessage({
            id: `m-${Date.now()}`,
            conversation_id: conversationId,
            sender_id: uid,
            body: text.trim(),
            created_at: new Date().toISOString(),
            read: false,
          })
          setText('')
        }}
      >
        <button
          type="button"
          className="rounded-lg border px-2"
          aria-label="react"
          onClick={() =>
            sendMessage({
              id: `m-${Date.now()}`,
              conversation_id: conversationId,
              sender_id: uid,
              body: '👍',
              created_at: new Date().toISOString(),
              read: false,
              reactions: ['👍'],
            })
          }
        >
          <Smile className="h-5 w-5" />
        </button>
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setTyping(true)
          }}
          className="flex-1 rounded-lg border px-3 py-2"
          placeholder="הודעה…"
        />
        <button type="submit" className="rounded-lg bg-teal-600 px-4 text-white">
          שלח
        </button>
      </form>
    </div>
  )
}
