import { useState } from 'react'
import {
  Bell,
  Globe,
  KeyRound,
  Lock,
  LogOut,
  Palette,
  Settings as SettingsIcon,
  ShieldCheck,
  Trash2,
  User,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../components/ui/PageHeader'
import { Tabs } from '../../components/ui/Tabs'
import { Badge } from '../../components/ui/Badge'

type SettingsTab = 'profile' | 'notifications' | 'privacy' | 'language' | 'about'

interface ToggleRowProps {
  label: string
  description?: string
  initial?: boolean
}

function ToggleRow({ label, description, initial = true }: ToggleRowProps) {
  const [on, setOn] = useState(initial)
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="font-medium text-slate-900">{label}</p>
        {description ? (
          <p className="text-xs text-slate-500">{description}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => setOn((x) => !x)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          on ? 'bg-teal-600' : 'bg-slate-300'
        }`}
        aria-pressed={on}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            on ? 'translate-x-0.5' : 'translate-x-5'
          }`}
        />
      </button>
    </div>
  )
}

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof User
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center gap-2 text-slate-900">
        <Icon className="h-5 w-5 text-teal-700" aria-hidden />
        <h3 className="text-base font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function ProfileTab() {
  return (
    <div className="space-y-4">
      <SectionCard icon={User} title="פרטי חשבון">
        <ToggleRow
          label="הצג וי כחול בפרופיל"
          description="זמין רק למאומתים — תלוי בהשלמת אימות תעודת זהות"
        />
        <ToggleRow
          label="הצג נקודות קארמה לציבור"
          description="מצטבר ממעורבות אקטיבית בקהילה"
        />
        <ToggleRow
          label="הראה את הארגונים שאני משוייך אליהם"
          initial={true}
        />
      </SectionCard>
      <SectionCard icon={KeyRound} title="סיסמה ואימות">
        <button className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right text-sm hover:bg-slate-50">
          שנה סיסמה (דמה)
        </button>
        <button className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-right text-sm hover:bg-slate-50">
          השלם אימות זהות (העלאת ת"ז)
        </button>
        <p className="mt-2 text-xs text-slate-500">
          ללא אימות — לא יוצג וי כחול. הרשאות הפעולה זהות בכל מקרה.
        </p>
      </SectionCard>
    </div>
  )
}

function NotificationsTab() {
  return (
    <div className="space-y-4">
      <SectionCard icon={Bell} title="התראות פעולה (Action Required)">
        <ToggleRow label="הצעת התאמה ממוקדן" description="פוסטים ברמה 1 בלבד" />
        <ToggleRow label="בקשות הצטרפות לנסיעה" />
        <ToggleRow label="בקשות לחפצים שפרסמתי" />
        <ToggleRow label="בקשות הצטרפות לארגון" />
      </SectionCard>
      <SectionCard icon={Bell} title="עדכונים">
        <ToggleRow label="לייקים על הפוסטים שלי" initial={false} />
        <ToggleRow label="תגובות חדשות" />
        <ToggleRow label="עוקבים חדשים" />
        <ToggleRow label="אישור תרומה / קבלה" />
      </SectionCard>
      <SectionCard icon={Bell} title="תזכורות">
        <ToggleRow label="תזכורת אתגר יומי" />
        <ToggleRow
          label="תזכורת השלמת פרופיל"
          description={'עד שתעלה ת"ז — נציג פעם בשבוע'}
        />
        <ToggleRow label="תזכורת דיווח שעות התנדבות" initial={false} />
      </SectionCard>
    </div>
  )
}

function PrivacyTab() {
  const [defaultLevel, setDefaultLevel] = useState<'1' | '2' | '3'>('3')
  return (
    <div className="space-y-4">
      <SectionCard icon={Lock} title="ברירות מחדל לאנונימיות">
        <p className="mb-2 text-sm text-slate-600">
          רמת הפרטיות שתיבחר אוטומטית בעת פרסום פוסט חדש (ניתן לשנות בעת הפרסום).
        </p>
        <div className="grid gap-2 md:grid-cols-3">
          {(['1', '2', '3'] as const).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setDefaultLevel(lvl)}
              className={`rounded-lg border p-3 text-right text-sm transition ${
                defaultLevel === lvl
                  ? 'border-teal-500 bg-teal-50 text-teal-900'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">רמה {lvl}</span>
                {defaultLevel === lvl ? <Badge variant="success">נבחר</Badge> : null}
              </div>
              <p className="mt-1 text-xs">
                {lvl === '1' ? 'מוקדנים בלבד' : lvl === '2' ? 'עוקבים בלבד' : 'ציבורי לכולם'}
              </p>
            </button>
          ))}
        </div>
      </SectionCard>
      <SectionCard icon={ShieldCheck} title="מסננים קבועים בפיד">
        <p className="text-sm text-slate-600">
          ניהול חסימות שהפעלת מהפיד — לפי קטגוריה או סטטוס.
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
            <span>הסתרת קטגוריית "מתכונים"</span>
            <button className="text-rose-700 underline">בטל</button>
          </li>
          <li className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
            <span>חסימת משתמש "tester_42"</span>
            <button className="text-rose-700 underline">בטל</button>
          </li>
        </ul>
      </SectionCard>
      <SectionCard icon={Palette} title="התאמת עיצוב אישית">
        <p className="text-sm text-slate-600">
          ניתן לפנות לעוזר ה-AI כדי להתאים את ערכת הצבעים והתצוגה — שמור ברמת המשתמש בלבד.
        </p>
        <button className="mt-3 rounded-lg bg-teal-600 px-3 py-1.5 text-sm text-white">
          פתח התאמת עיצוב (דמה)
        </button>
      </SectionCard>
    </div>
  )
}

function LanguageTab() {
  const { i18n } = useTranslation()
  const [lang, setLang] = useState<'he' | 'en'>(
    (i18n.language as 'he' | 'en') || 'he',
  )
  return (
    <div className="space-y-4">
      <SectionCard icon={Globe} title="שפה">
        <div className="grid gap-2 md:grid-cols-2">
          {(['he', 'en'] as const).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => {
                setLang(code)
                void i18n.changeLanguage(code)
              }}
              className={`rounded-lg border p-3 text-right text-sm transition ${
                lang === code
                  ? 'border-teal-500 bg-teal-50 text-teal-900'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              <span className="font-semibold">
                {code === 'he' ? 'עברית' : 'English'}
              </span>
              {lang === code ? (
                <Badge variant="success" className="mr-2">
                  פעיל
                </Badge>
              ) : null}
            </button>
          ))}
        </div>
      </SectionCard>
      <SectionCard icon={SettingsIcon} title="נגישות">
        <ToggleRow label="גודל טקסט מוגדל" initial={false} />
        <ToggleRow label="ניגודיות גבוהה" initial={false} />
        <ToggleRow label="הקטנת אנימציות" initial={false} />
      </SectionCard>
    </div>
  )
}

function AboutTab() {
  return (
    <div className="space-y-4">
      <SectionCard icon={SettingsIcon} title="אודות Karma Community">
        <p className="text-sm text-slate-600">
          פלטפורמה חברתית-קהילתית שנועדה לרכז, לעודד ולהעצים את כל ממדי הנתינה
          והעשייה הקהילתית במקום אחד.
        </p>
        <p className="mt-2 text-xs text-slate-400">
          גרסת POC · מאי 2026 · ללא backend אמיתי.
        </p>
      </SectionCard>
      <SectionCard icon={LogOut} title="פעולות חשבון">
        <button className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right text-sm hover:bg-slate-50">
          התנתקות (דמה)
        </button>
        <button className="mt-2 flex w-full items-center justify-end gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-right text-sm text-rose-800 hover:bg-rose-100">
          <Trash2 className="h-4 w-4" /> מחיקת חשבון (דמה)
        </button>
      </SectionCard>
    </div>
  )
}

export function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>('profile')

  return (
    <div>
      <PageHeader
        title="הגדרות"
        subtitle="§3.14 — פרופיל, התראות, פרטיות, שפה ואודות"
      />
      <Tabs
        tabs={[
          { id: 'profile', label: 'פרופיל' },
          { id: 'notifications', label: 'התראות' },
          { id: 'privacy', label: 'פרטיות' },
          { id: 'language', label: 'שפה ונגישות' },
          { id: 'about', label: 'אודות' },
        ]}
        value={tab}
        onChange={(t) => setTab(t as SettingsTab)}
      />
      <div className="mt-4">
        {tab === 'profile' ? <ProfileTab /> : null}
        {tab === 'notifications' ? <NotificationsTab /> : null}
        {tab === 'privacy' ? <PrivacyTab /> : null}
        {tab === 'language' ? <LanguageTab /> : null}
        {tab === 'about' ? <AboutTab /> : null}
      </div>
    </div>
  )
}
