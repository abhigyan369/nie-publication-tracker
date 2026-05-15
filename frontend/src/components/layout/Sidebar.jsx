import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '../../lib/utils'
import {
  LayoutDashboard,
  BookOpen,
  Users,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  BookMarked,
  Bell,
  CheckSquare,
  Activity,
  Upload,
  Bot,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const sidebarLinks = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Publications',
    href: '/publications',
    icon: BookOpen,
  },
  {
    title: 'Faculty',
    href: '/faculty',
    icon: Users,
  },
  {
    title: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
  },
  {
    title: 'AI Assistant',
    href: '/chat',
    icon: Bot,
  },
  {
    title: 'Notifications',
    href: '/notifications',
    icon: Bell,
  },
]

const adminLinks = [
  {
    title: 'Workflow',
    href: '/admin/workflow',
    icon: CheckSquare,
    roles: ['ADMIN', 'HOD', 'REVIEWER'],
  },
  {
    title: 'Import',
    href: '/admin/import',
    icon: Upload,
    roles: ['ADMIN', 'HOD'],
  },
  {
    title: 'Audit Logs',
    href: '/admin/audit-logs',
    icon: Activity,
    roles: ['ADMIN', 'HOD'],
  },
]

const bottomLinks = [
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
  },
]

function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const { logout, user } = useAuth()

  // Filter admin links based on user role
  const visibleAdminLinks = adminLinks.filter(link =>
    link.roles.includes(user?.role)
  )

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-card border-r border-border transition-all duration-300 z-40',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-border">
          <Link to="/dashboard" className="flex items-center gap-2">
            <BookMarked className="h-6 w-6 text-primary shrink-0" />
            {!collapsed && (
              <span className="font-semibold text-foreground">NIE Publications</span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {sidebarLinks.map((link) => {
            const Icon = link.icon
            const isActive = location.pathname === link.href

            return (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200',
                  'hover:bg-accent hover:text-accent-foreground',
                  isActive && 'bg-primary/10 text-primary font-medium',
                  collapsed && 'justify-center'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{link.title}</span>}
              </Link>
            )
          })}

          {/* Admin Section */}
          {visibleAdminLinks.length > 0 && (
            <div className="pt-4 mt-4 border-t border-border">
              {!collapsed && (
                <p className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Admin
                </p>
              )}
              {visibleAdminLinks.map((link) => {
                const Icon = link.icon
                const isActive = location.pathname === link.href

                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200',
                      'hover:bg-accent hover:text-accent-foreground',
                      isActive && 'bg-primary/10 text-primary font-medium',
                      collapsed && 'justify-center'
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {!collapsed && <span>{link.title}</span>}
                  </Link>
                )
              })}
            </div>
          )}
        </nav>

        {/* Bottom Links */}
        <div className="p-3 space-y-1 border-t border-border">
          {bottomLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200',
                  'hover:bg-accent hover:text-accent-foreground',
                  collapsed && 'justify-center'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{link.title}</span>}
              </Link>
            )
          })}

          <button
            onClick={logout}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 w-full',
              'hover:bg-destructive/10 hover:text-destructive text-muted-foreground',
              collapsed && 'justify-center'
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 h-6 w-6 bg-card border border-border rounded-full flex items-center justify-center hover:bg-accent transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
