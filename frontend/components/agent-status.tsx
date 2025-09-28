import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bot, Brain, CheckCircle, XCircle, AlertTriangle, Zap, MessageSquare, Activity, Clock } from "lucide-react"
import { useState, useEffect } from "react"
import { websocketService } from "@/lib/websocket-service"

interface AgentThought {
  id: string
  agent: string
  type: 'analysis' | 'opinion' | 'disagreement' | 'agreement' | 'concern' | 'proposal'
  thought: string
  reasoning: string
  confidence: number
  timestamp: string
  conflictsWith?: string[]
  agreessWith?: string[]
}

interface Agent {
  name: string
  status: 'idle' | 'thinking' | 'negotiating' | 'completed'
  personality: string
  flexibility: number
  currentTask: string
  lastThought?: AgentThought
  confidence?: number
}

export function AgentStatus() {
  const [agents, setAgents] = useState<Agent[]>([
    {
      name: "Alice's Agent",
      status: "idle",
      personality: "Focus-Protective",
      flexibility: 3,
      currentTask: "Ready to analyze focus time conflicts",
    },
    {
      name: "Pappu's Agent", 
      status: "idle",
      personality: "Collaborative",
      flexibility: 8,
      currentTask: "Ready to coordinate team schedules",
    },
    {
      name: "Charlie's Agent",
      status: "idle",
      personality: "Strategic",
      flexibility: 6,
      currentTask: "Ready to optimize efficiency metrics",
    },
  ])

  useEffect(() => {
    websocketService.connect()

    const handleAgentThinking = (event: CustomEvent) => {
      const data = event.detail
      
      if (data.type === 'negotiation_start') {
        // Reset all agents to thinking state
        setAgents(prev => prev.map(agent => ({
          ...agent,
          status: 'thinking' as const,
          currentTask: 'Analyzing meeting request...'
        })))
      } else if (data.type === 'agent_reasoning') {
        const agentName = data.agent || 'Unknown Agent'
        const newThought: AgentThought = {
          id: `${Date.now()}-${Math.random()}`,
          agent: agentName,
          type: determineThoughtType(data),
          thought: data.message || '',
          reasoning: data.reasoning || '',
          confidence: data.confidence || 85,
          timestamp: data.timestamp || new Date().toISOString(),
          conflictsWith: data.conflictsWith || [],
          agreessWith: data.agreessWith || []
        }

        setAgents(prev => prev.map(agent => {
          if (agent.name === agentName) {
            return {
              ...agent,
              status: 'negotiating' as const,
              currentTask: newThought.thought,
              lastThought: newThought,
              confidence: newThought.confidence
            }
          }
          return agent
        }))
      } else if (data.type === 'negotiation_result') {
        // Mark all agents as completed
        setAgents(prev => prev.map(agent => ({
          ...agent,
          status: 'completed' as const,
          currentTask: 'Negotiation completed successfully'
        })))
        
        // Reset to idle after 3 seconds
        setTimeout(() => {
          setAgents(prev => prev.map(agent => ({
            ...agent,
            status: 'idle' as const,
            currentTask: getIdleTask(agent.name)
          })))
        }, 3000)
      }
    }

    window.addEventListener('negotiation-update', handleAgentThinking as EventListener)
    websocketService.on('message', (data) => {
      try {
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data
        handleAgentThinking({ detail: parsedData } as CustomEvent)
      } catch (e) {
        console.log('Non-JSON WebSocket message:', data)
      }
    })

    return () => {
      window.removeEventListener('negotiation-update', handleAgentThinking as EventListener)
    }
  }, [])

  const determineThoughtType = (data: any): AgentThought['type'] => {
    const message = data.message || ''
    const conflictsWith = data.conflicts_with || []
    const agreessWith = data.agrees_with || []

    if (message.includes('❌') || message.includes('CONFLICT') || conflictsWith.length > 0) {
      return 'disagreement'
    } else if (message.includes('✅') || message.includes('agree') || agreessWith.length > 0) {
      return 'agreement'
    } else if (message.includes('⚠️') || message.includes('concern')) {
      return 'concern'
    } else if (message.includes('Mediating') || message.includes('propose')) {
      return 'proposal'
    } else if (message.includes('Efficiency') || message.includes('Strategic')) {
      return 'opinion'
    }
    return 'analysis'
  }

  const getIdleTask = (agentName: string): string => {
    if (agentName.includes('Alice')) return 'Ready to analyze focus time conflicts'
    if (agentName.includes('Charlie')) return 'Ready to optimize efficiency metrics'
    if (agentName.includes('Pappu')) return 'Ready to coordinate team schedules'
    return 'Ready for negotiation'
  }

  const getStatusIcon = (status: Agent['status']) => {
    switch (status) {
      case 'thinking': return <Brain className="w-4 h-4 animate-pulse text-yellow-500" />
      case 'negotiating': return <Zap className="w-4 h-4 animate-pulse text-blue-500" />
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />
      default: return <Bot className="w-4 h-4 text-muted-foreground" />
    }
  }

  const getThoughtIcon = (type: AgentThought['type']) => {
    switch (type) {
      case 'disagreement': return <XCircle className="w-3 h-3 text-red-400" />
      case 'agreement': return <CheckCircle className="w-3 h-3 text-green-400" />
      case 'concern': return <AlertTriangle className="w-3 h-3 text-yellow-400" />
      case 'proposal': return <Zap className="w-3 h-3 text-blue-400" />
      default: return <Brain className="w-3 h-3 text-purple-400" />
    }
  }

  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'thinking': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50'
      case 'negotiating': return 'bg-blue-500/20 text-blue-300 border-blue-500/50'
      case 'completed': return 'bg-green-500/20 text-green-300 border-green-500/50'
      default: return 'bg-muted/20 text-muted-foreground border-muted/50'
    }
  }

  return (
    <Card className="bg-gradient-to-br from-card/80 to-primary/5 backdrop-blur-sm border-primary/20 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Brain className="w-6 h-6 text-primary animate-pulse" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
              🧠 Live Agent Thinking
            </span>
          </div>
          <Badge variant="secondary" className="animate-pulse">
            {agents.filter(a => a.status !== 'idle').length} Active
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Real-time AI agent negotiations and decision-making process
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {agents.map((agent, index) => (
          <div 
            key={index} 
            className={`p-4 rounded-lg space-y-3 transition-all duration-500 border-l-4 ${
              agent.status === 'thinking' ? 'bg-yellow-500/10 border-l-yellow-500 shadow-lg scale-105' :
              agent.status === 'negotiating' ? 'bg-blue-500/10 border-l-blue-500 shadow-lg scale-105' :
              agent.status === 'completed' ? 'bg-green-500/10 border-l-green-500' :
              'bg-muted/10 border-l-muted/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {getStatusIcon(agent.status)}
                  {agent.status !== 'idle' && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-base">{agent.name}</h4>
                  <p className="text-xs text-muted-foreground">{agent.personality}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`${getStatusColor(agent.status)} font-medium`}>
                  {agent.status === 'thinking' ? '🤔 Thinking' :
                   agent.status === 'negotiating' ? '⚡ Negotiating' :
                   agent.status === 'completed' ? '✅ Done' : '💤 Idle'}
                </Badge>
                {agent.confidence && (
                  <span className="text-xs text-muted-foreground">
                    {agent.confidence}%
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Activity className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Current Task:</span>
              </div>
              <div className={`p-3 rounded-md text-sm font-medium ${
                agent.status === 'thinking' ? 'bg-yellow-500/20 text-yellow-800 dark:text-yellow-200' :
                agent.status === 'negotiating' ? 'bg-blue-500/20 text-blue-800 dark:text-blue-200' :
                'bg-muted/50 text-muted-foreground'
              }`}>
                {agent.currentTask}
              </div>
              
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Flexibility:</span>
                  <div className="flex gap-1">
                    {[...Array(10)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-1.5 h-2 rounded-full transition-colors ${
                          i < agent.flexibility ? "bg-primary" : "bg-muted/50"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-medium">{agent.flexibility}/10</span>
                </div>
                {agent.confidence && (
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Confidence:</span>
                    <span className="font-medium text-primary">{agent.confidence}%</span>
                  </div>
                )}
              </div>
            </div>

            {agent.lastThought && (
              <div className="space-y-3 border-t border-muted/20 pt-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Latest Thought:</span>
                  <Badge variant="outline" className="text-xs">
                    {agent.lastThought.type}
                  </Badge>
                </div>
                
                <div className="bg-muted/30 p-3 rounded-md border-l-2 border-primary/50">
                  <div className="text-sm font-medium mb-1">
                    "{agent.lastThought.thought}"
                  </div>
                  <div className="text-xs text-muted-foreground italic">
                    {agent.lastThought.reasoning}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {new Date(agent.lastThought.timestamp).toLocaleTimeString()}
                    </div>
                    {agent.lastThought.confidence && (
                      <div className="text-xs font-medium text-primary">
                        {agent.lastThought.confidence}% confident
                      </div>
                    )}
                  </div>
                </div>
                
                {(agent.lastThought.conflictsWith?.length || agent.lastThought.agreessWith?.length) && (
                  <div className="flex flex-wrap gap-1">
                    {agent.lastThought.conflictsWith?.map((conflict, i) => (
                      <Badge key={i} variant="destructive" className="text-xs animate-pulse">
                        ⚡ Conflicts with {conflict.replace("'s Agent", "")}
                      </Badge>
                    ))}
                    {agent.lastThought.agreessWith?.map((agreement, i) => (
                      <Badge key={i} className="text-xs bg-green-500/20 text-green-300 border-green-500/50">
                        ✅ Agrees with {agreement.replace("'s Agent", "")}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
