import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { RequireRole } from './components/RequireRole'
import { LoginPage } from './modules/auth/LoginPage'
import { RegisterPage } from './modules/auth/RegisterPage'
import { FeedPage } from './modules/posts/FeedPage'
import { PostCreatePage } from './modules/posts/PostCreatePage'
import {
  ProfilePage,
} from './modules/users/ProfilePage'
import { DiscoverPage } from './modules/users/DiscoverPage'
import { HierarchyPage } from './modules/users/HierarchyPage'
import { UserPublicPage } from './modules/users/UserPublicPage'
import { DonationsGridPage } from './modules/donations/DonationsGridPage'
import { CategoryPage } from './modules/donations/CategoryPage'
import { KnowledgePage } from './modules/donations/KnowledgePage'
import { ShiduchimTovLayout } from './modules/donations/ShiduchimTovLayout'
import { ShiduchimTovHomePage } from './modules/donations/ShiduchimTovHomePage'
import { RidesListPage } from './modules/rides/RidesListPage'
import { RideDetailPage } from './modules/rides/RideDetailPage'
import { ItemsListPage } from './modules/items/ItemsListPage'
import { ItemDetailPage } from './modules/items/ItemDetailPage'
import { ChatListPage } from './modules/chat/ChatListPage'
import { ChatThreadPage } from './modules/chat/ChatThreadPage'
import { ChallengesPage } from './modules/challenges/ChallengesPage'
import { NotificationsPage } from './modules/notifications/NotificationsPage'
import { StatisticsPage } from './modules/statistics/StatisticsPage'
import { AdminPage } from './modules/admin/AdminPage'
import { SyncPage } from './modules/sync/SyncPage'
import { OperatorQueuePage } from './modules/operator/OperatorQueuePage'
import { OperatorCaseListPage } from './modules/operator/OperatorCaseListPage'
import { OperatorCaseDetailPage } from './modules/operator/OperatorCaseDetailPage'
import { OperatorAuditPage } from './modules/operator/OperatorAuditPage'
import { PRDViewerPage } from './modules/prd/PRDViewerPage'
import { SettingsPage } from './modules/settings/SettingsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/feed" replace />} />
        <Route path="/feed" element={<FeedPage />} />
        <Route path="/posts/new" element={<PostCreatePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/user/:userId" element={<UserPublicPage />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/hierarchy" element={<HierarchyPage />} />
        <Route path="/donations" element={<DonationsGridPage />} />
        <Route path="/donations/category/:slug" element={<CategoryPage />} />
        <Route path="/donations/knowledge" element={<KnowledgePage />} />
        <Route path="/donations/shiduchim-tov" element={<ShiduchimTovLayout />}>
          <Route index element={<ShiduchimTovHomePage />} />
          <Route path="queue" element={<OperatorQueuePage />} />
          <Route path="cases" element={<OperatorCaseListPage />} />
          <Route path="cases/:caseId" element={<OperatorCaseDetailPage />} />
          <Route path="cases/:caseId/audit" element={<OperatorAuditPage />} />
        </Route>
        <Route path="/rides" element={<RidesListPage />} />
        <Route path="/rides/:rideId" element={<RideDetailPage />} />
        <Route path="/items" element={<ItemsListPage />} />
        <Route path="/items/:itemId" element={<ItemDetailPage />} />
        <Route path="/chat" element={<ChatListPage />} />
        <Route path="/chat/:conversationId" element={<ChatThreadPage />} />
        <Route path="/challenges" element={<ChallengesPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/statistics" element={<StatisticsPage />} />
        <Route
          path="/admin"
          element={
            <RequireRole allow={['admin', 'super_admin']}>
              <AdminPage />
            </RequireRole>
          }
        />
        <Route path="/sync" element={<SyncPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="/prd" element={<PRDViewerPage />} />
      <Route path="*" element={<Navigate to="/feed" replace />} />
    </Routes>
  )
}
