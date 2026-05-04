import { Link } from 'react-router-dom'
import * as Icons from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { VISION_DONATION_CATEGORIES } from '../../fixtures/donations.fixtures'

function CategoryIcon({ name }: { name: string }) {
  const Icon =
    (Icons as unknown as Record<string, typeof Icons.Gift>)[name] ??
    Icons.Gift
  return <Icon className="h-8 w-8 text-teal-700" aria-hidden />
}

export function DonationsGridPage() {
  return (
    <div>
      <PageHeader
        title="תרומות"
        subtitle="§2.3 — רשת קטגוריות (+ שידוכים טוב נפרד מ-matchmaking)"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {VISION_DONATION_CATEGORIES.map((c) => (
          <Link
            key={c.id}
            to={
              c.slug === 'knowledge'
                ? '/donations/knowledge'
                : c.slug === 'shiduchim-tov'
                  ? '/donations/shiduchim-tov'
                  : `/donations/category/${c.slug}`
            }
            className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm transition hover:border-teal-500"
          >
            <CategoryIcon name={c.icon} />
            <span className="font-semibold text-slate-900">{c.label_he}</span>
            <span className="text-xs text-slate-500">{c.label_en}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
