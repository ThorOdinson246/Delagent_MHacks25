"use client"

import { Button } from "@/components/ui/button"
import { Settings, User } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { UserProfileView } from "./user-profile-view"

interface HeaderProps {
  onGetStarted?: () => void
  showNavigation?: boolean
}

export function Header({ onGetStarted, showNavigation = true }: HeaderProps) {
  const pathname = usePathname()
  const [showProfile, setShowProfile] = useState(false)

  const isActive = (path: string) => {
    if (path === "/" && pathname === "/") return true
    if (path !== "/" && pathname.startsWith(path)) return true
    return false
  }

  return (
    <>
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">AS</span>
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
              AgentSchedule
            </h1>
          </Link>

          {showNavigation && pathname !== "/" && (
            <nav className="hidden md:flex items-center space-x-6">
              <Link
                href="/dashboard"
                className={`transition-colors ${
                  isActive("/dashboard") ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/agents"
                className={`transition-colors ${
                  isActive("/agents") ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Agents
              </Link>
              <Link
                href="/calendar"
                className={`transition-colors ${
                  isActive("/calendar") ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Calendar
              </Link>
              <Link
                href="/settings"
                className={`transition-colors ${
                  isActive("/settings") ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Settings
              </Link>
            </nav>
          )}

          <div className="flex items-center space-x-2">
            {showNavigation && pathname !== "/" && (
              <>
                <Button variant="ghost" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setShowProfile(true)}>
                  <User className="h-4 w-4" />
                </Button>
              </>
            )}
            {pathname === "/" && (
              <Button
                className="bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-500/90"
                onClick={onGetStarted}
              >
                Get Started
              </Button>
            )}
          </div>
        </div>
      </header>

      {showProfile && <UserProfileView onClose={() => setShowProfile(false)} />}
    </>
  )
}
