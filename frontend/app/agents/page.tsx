import { Header } from "@/components/header"
import { AgentDetailView } from "@/components/agent-detail-view"

export default function AgentsPage() {
  return (
    <div className="min-h-screen grid-pattern">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
              AI Agents
            </h1>
            <p className="text-muted-foreground mt-2">
              Monitor your personal AI agents and their negotiation strategies
            </p>
          </div>
        </div>

        <AgentDetailView />
      </main>
    </div>
  )
}
