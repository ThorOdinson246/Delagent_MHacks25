"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Brain, MessageCircle, Zap, Users, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react"
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

interface AgentThinkingOverlayProps {
  isVisible: boolean
  onClose: () => void
}

export function AgentThinkingOverlay({ isVisible, onClose }: AgentThinkingOverlayProps) {
  const [thoughts, setThoughts] = useState<AgentThought[]>([])
  const [currentPhase, setCurrentPhase] = useState<string>('idle')
  const [isNegotiating, setIsNegotiating] = useState(false)

  useEffect(() => {
    if (!isVisible) return

    websocketService.connect()

    const handleAgentThinking = (event: CustomEvent) => {
      const data = event.detail
      
      if (data.type === 'negotiation_start') {
        setIsNegotiating(true)
        setCurrentPhase('Initial Analysis')
        setThoughts([])
      } else if (data.type === 'agent_reasoning') {
        // Convert agent reasoning to structured thoughts
        const newThought = generateAgentThought(data)
        if (newThought) {
          setThoughts(prev => [...prev, newThought])
        }
      } else if (data.type === 'negotiation_result') {
        setCurrentPhase('Consensus Reached')
        setTimeout(() => {
          setIsNegotiating(false)
          setCurrentPhase('idle')
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
  }, [isVisible])

  const generateAgentThought = (data: any): AgentThought | null => {
    const agentName = data.agent || 'Unknown Agent'
    const message = data.message || ''
    const reasoning = data.reasoning || ''
    
    // Use backend-provided confidence or calculate from message content
    let confidence = data.confidence || 85
    let conflictsWith: string[] = data.conflicts_with || []
    let agreessWith: string[] = data.agrees_with || []
    
    // Determine thought type based on message content and backend data
    let thoughtType: AgentThought['type'] = 'analysis'

    if (message.includes('❌') || message.includes('CONFLICT') || message.includes('oppose') || conflictsWith.length > 0) {
      thoughtType = 'disagreement'
      confidence = Math.max(confidence, 90)
    } else if (message.includes('✅') || message.includes('agree') || message.includes('perfect') || agreessWith.length > 0) {
      thoughtType = 'agreement'
      confidence = Math.max(confidence, 85)
    } else if (message.includes('concern') || message.includes('worried') || message.includes('impact') || message.includes('⚠️')) {
      thoughtType = 'concern'
      confidence = Math.max(confidence, 80)
    } else if (message.includes('propose') || message.includes('suggest') || message.includes('alternative') || message.includes('Mediating')) {
      thoughtType = 'proposal'
      confidence = Math.max(confidence, 75)
    } else if (message.includes('analyzing') || message.includes('evaluating') || message.includes('checking') || message.includes('Found')) {
      thoughtType = 'analysis'
      confidence = Math.max(confidence, 70)
    } else if (message.includes('opinion') || message.includes('think') || message.includes('believe') || message.includes('Efficiency')) {
      thoughtType = 'opinion'
      confidence = Math.max(confidence, 80)
    }

    return {
      id: `${Date.now()}-${Math.random()}`,
      agent: agentName,
      type: thoughtType,
      thought: message,
      reasoning: reasoning,
      confidence: confidence,
      timestamp: new Date().toISOString(),
      conflictsWith: conflictsWith.length > 0 ? conflictsWith : undefined,
      agreessWith: agreessWith.length > 0 ? agreessWith : undefined
    }
  }

  const getAgentColor = (agent: string) => {
    if (agent.includes('Alice')) return 'bg-purple-500/20 border-purple-500/50 text-purple-100'
    if (agent.includes('Charlie')) return 'bg-blue-500/20 border-blue-500/50 text-blue-100'
    if (agent.includes('Pappu')) return 'bg-green-500/20 border-green-500/50 text-green-100'
    return 'bg-gray-500/20 border-gray-500/50 text-gray-100'
  }

  const getThoughtIcon = (type: AgentThought['type']) => {
    switch (type) {
      case 'analysis': return <Brain className="w-4 h-4" />
      case 'opinion': return <MessageCircle className="w-4 h-4" />
      case 'disagreement': return <XCircle className="w-4 h-4 text-red-400" />
      case 'agreement': return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'concern': return <AlertTriangle className="w-4 h-4 text-yellow-400" />
      case 'proposal': return <Zap className="w-4 h-4 text-blue-400" />
      default: return <Brain className="w-4 h-4" />
    }
  }

  const getThoughtTypeColor = (type: AgentThought['type']) => {
    switch (type) {
      case 'disagreement': return 'bg-red-500/20 text-red-300'
      case 'agreement': return 'bg-green-500/20 text-green-300'
      case 'concern': return 'bg-yellow-500/20 text-yellow-300'
      case 'proposal': return 'bg-blue-500/20 text-blue-300'
      case 'opinion': return 'bg-purple-500/20 text-purple-300'
      default: return 'bg-gray-500/20 text-gray-300'
    }
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl h-[80vh] bg-gray-900/95 border-gray-700">
        <div className="p-6 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-xl font-bold text-white">Live Agent Thinking Process</h2>
              <p className="text-sm text-gray-400">
                {isNegotiating ? `Phase: ${currentPhase}` : 'Waiting for negotiation...'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <CardContent className="p-6 h-[calc(80vh-120px)] overflow-y-auto">
          {!isNegotiating && thoughts.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Brain className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg">Agents are ready to think...</p>
              <p className="text-sm">Start a voice command to see their reasoning process</p>
            </div>
          )}

          <div className="space-y-4">
            {thoughts.map((thought, index) => (
              <div
                key={thought.id}
                className={`p-4 rounded-lg border ${getAgentColor(thought.agent)} animate-in slide-in-from-left duration-300`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getThoughtIcon(thought.type)}
                    <span className="font-medium text-white">{thought.agent}</span>
                    <Badge className={`text-xs ${getThoughtTypeColor(thought.type)}`}>
                      {thought.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    {new Date(thought.timestamp).toLocaleTimeString()}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-white font-medium">{thought.thought}</p>
                  <p className="text-gray-300 text-sm italic">"{thought.reasoning}"</p>
                  
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-4">
                      {thought.agreessWith && (
                        <div className="flex items-center gap-1 text-green-400 text-xs">
                          <CheckCircle className="w-3 h-3" />
                          Agrees with: {thought.agreessWith.join(', ')}
                        </div>
                      )}
                      {thought.conflictsWith && (
                        <div className="flex items-center gap-1 text-red-400 text-xs">
                          <XCircle className="w-3 h-3" />
                          Conflicts with: {thought.conflictsWith.join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <span>Confidence:</span>
                      <span className="font-medium">{thought.confidence}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {isNegotiating && (
            <div className="mt-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 text-primary">
                <Zap className="w-4 h-4 animate-pulse" />
                <span className="font-medium">Live Negotiation in Progress</span>
              </div>
              <p className="text-sm text-gray-400 mt-1">
                Watch as the three agents analyze, debate, and reach consensus in real-time
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
