import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { BottomNav } from './BottomNav'
import { PrototypeBanner } from '../PrototypeBanner'

export function AppLayout() {
  return (
    <div className="flex h-full min-h-screen flex-col bg-slate-50">
      <Header />
      <PrototypeBanner />
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-32">
        <div className="mx-auto max-w-lg">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
