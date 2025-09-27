import { Header } from "@/components/header"
import { SettingsView } from "@/components/settings-view"

export default function SettingsPage() {
  return (
    <div className="min-h-screen grid-pattern">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
              Settings
            </h1>
            <p className="text-muted-foreground mt-2">
              Configure your preferences, agent personalities, and system settings
            </p>
          </div>
        </div>

        <SettingsView />
      </main>
    </div>
  )
}
