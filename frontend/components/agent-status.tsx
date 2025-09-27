import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bot, Brain } from "lucide-react"

export function AgentStatus() {
  const agents = [
    {
      name: "Alice's Agent",
      status: "active",
      personality: "Diplomatic",
      flexibility: 8,
      currentTask: "Analyzing calendar conflicts",
    },
    {
      name: "Bob's Agent",
      status: "negotiating",
      personality: "Direct",
      flexibility: 5,
      currentTask: "Proposing alternative times",
    },
    {
      name: "Carol's Agent",
      status: "idle",
      personality: "Flexible",
      flexibility: 9,
      currentTask: "Waiting for proposals",
    },
  ]

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          Agent Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {agents.map((agent, index) => (
          <div key={index} className="p-4 bg-muted/20 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">{agent.name}</h4>
              <Badge
                variant={
                  agent.status === "active" ? "default" : agent.status === "negotiating" ? "secondary" : "outline"
                }
                className={
                  agent.status === "active"
                    ? "status-agreed"
                    : agent.status === "negotiating"
                      ? "status-negotiating"
                      : ""
                }
              >
                {agent.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Personality:</span>
                <div className="font-medium">{agent.personality}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Flexibility:</span>
                <div className="flex items-center gap-1">
                  <span className="font-medium">{agent.flexibility}/10</span>
                  <div className="flex gap-1">
                    {[...Array(10)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-1 h-3 rounded-full ${i < agent.flexibility ? "bg-primary" : "bg-muted"}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Brain className="w-4 h-4" />
              {agent.currentTask}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
