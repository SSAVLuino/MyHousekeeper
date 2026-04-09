import Sidebar from '@/components/Sidebar'
import PWAInstallBanner from '@/components/PWAInstallBanner'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="pt-16 lg:pt-0">
          {children}
        </div>
      </main>
      <PWAInstallBanner />
    </div>
  )
}
