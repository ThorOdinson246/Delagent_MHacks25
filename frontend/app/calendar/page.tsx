import { Header } from "@/components/header"
import { CalendarView } from "@/components/calendar-view"

export default function CalendarPage() {
  return (
    <div className="min-h-screen grid-pattern">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
              Calendar
            </h1>
            <p className="text-muted-foreground mt-2">
              View your schedule and manage calendar blocks with AI agent assistance
            </p>
          </div>
        </div>

        <CalendarView />
      </main>
    </div>
  )
}
