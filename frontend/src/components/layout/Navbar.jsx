import { useLocation } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import { Bell, Moon, Sun, Search } from 'lucide-react'
import { getInitials } from '../../lib/utils'

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/publications': 'Publications',
  '/publications/': 'Publication Details',
  '/faculty': 'Faculty',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
}

function Navbar() {
  const { theme, toggleTheme } = useTheme()
  const { user } = useAuth()
  const location = useLocation()

  const getPageTitle = () => {
    if (location.pathname.startsWith('/publications/')) {
      return 'Publication Details'
    }
    return pageTitles[location.pathname] || 'Dashboard'
  }

  return (
    <header className="sticky top-0 z-30 h-16 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 border-b border-border">
      <div className="flex items-center justify-between h-full px-6">
        {/* Page Title */}
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-foreground">{getPageTitle()}</h1>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <button className="p-2 hover:bg-accent rounded-lg transition-colors">
            <Search className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Moon className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {/* Notifications */}
          <button className="p-2 hover:bg-accent rounded-lg transition-colors relative">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full" />
          </button>

          {/* User Avatar */}
          <div className="flex items-center gap-3 pl-4 border-l border-border">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-foreground">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-muted-foreground">{user?.role}</p>
            </div>
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-medium text-primary">
                {user ? getInitials(user.firstName, user.lastName) : 'U'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Navbar
