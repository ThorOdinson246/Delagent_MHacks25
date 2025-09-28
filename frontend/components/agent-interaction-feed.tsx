"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bot, Brain, CheckCircle, XCircle, AlertTriangle, Zap, MessageSquare, Activity, Clock, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { websocketService } from "@/lib/websocket-service"

interface AgentInteraction {
  id: string
  agent: string
  message: string
  reasoning: string
  confidence: number
  timestamp: string
  conflictsWith?: string[]
  agreessWith?: string[]
  isTyping?: boolean
  displayedText?: string
}

export function AgentInteractionFeed() {
  const [interactions, setInteractions] = useState<AgentInteraction[]>([])
  const [isActive, setIsActive] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    websocketService.connect()

    const handleAgentInteraction = (event: CustomEvent) => {
      const data = event.detail
      
      // Handle all types of agent interactions from our REAL Gemini negotiations
      if (data.type === 'agent_reasoning' || 
          data.type === 'agent_negotiation' || 
          data.type === 'agent_status' || 
          data.type === 'agent_consensus' || 
          data.type === 'agent_success' || 
          data.type === 'agent_failure' ||
          data.type === 'agent_error') {
        setIsActive(true)
        
        // Clear old negotiations when a new one starts
        if (data.type === 'agent_status' && 
            (data.message?.includes('Analyzing meeting request') || 
             data.message?.includes('Processing request'))) {
          console.log('🧹 Clearing old negotiations - new negotiation starting')
          setInteractions([])
        }
        
        // Create a content-based hash for better deduplication
        const contentHash = `${data.agent}-${data.message}-${data.type}`.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
        
        const newInteraction: AgentInteraction = {
          id: `${contentHash}-${Date.now()}`,
          agent: data.agent || 'Unknown Agent',
          message: data.message || '',
          reasoning: data.reasoning || '',
          confidence: data.confidence || 85,
          timestamp: data.timestamp || new Date().toISOString(),
          conflictsWith: data.conflictsWith || [],
          agreessWith: data.agreessWith || [],
          isTyping: true,
          displayedText: ''
        }

        // Check for duplicates before adding - prevent same agent with same message within 5 seconds
        setInteractions(prev => {
          const now = new Date(newInteraction.timestamp).getTime()
          const isDuplicate = prev.some(existing => {
            const existingTime = new Date(existing.timestamp).getTime()
            const timeDiff = Math.abs(now - existingTime)
            return (
              existing.agent === newInteraction.agent &&
              existing.message === newInteraction.message &&
              timeDiff < 5000 // 5 seconds window
            )
          })
          
          if (isDuplicate) {
            console.log(`🔄 Duplicate interaction filtered: ${newInteraction.agent} - ${newInteraction.message.substring(0, 50)}...`)
            return prev
          }
          
          // Only start typing effect if we're actually adding the interaction
          setTimeout(() => {
            startTypingEffect(newInteraction.id, newInteraction.message, newInteraction.reasoning)
          }, 100)
          
          return [...prev, newInteraction]
        })
      }
    }

    window.addEventListener('negotiation-update', handleAgentInteraction as EventListener)
    
    return () => {
      window.removeEventListener('negotiation-update', handleAgentInteraction as EventListener)
    }
  }, [])

  const startTypingEffect = (id: string, message: string, reasoning: string) => {
    const fullText = `${message}\n${reasoning}`
    let currentIndex = 0
    
    const typeInterval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setInteractions(prev => prev.map(interaction => 
          interaction.id === id 
            ? { ...interaction, displayedText: fullText.slice(0, currentIndex) }
            : interaction
        ))
        currentIndex++
      } else {
        // Typing complete
        setInteractions(prev => prev.map(interaction => 
          interaction.id === id 
            ? { ...interaction, isTyping: false, displayedText: fullText }
            : interaction
        ))
        clearInterval(typeInterval)
      }
    }, 25) // Faster typing for better effect
  }

  const clearInteractions = () => {
    setInteractions([])
    setIsActive(false)
  }

  // Auto scroll to bottom when new interactions are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [interactions])

  const getAgentIcon = (agentName: string) => {
    switch (agentName) {
      case "Alice's Agent":
        return <Brain className="w-5 h-5 text-purple-500" />
      case "Pappu's Agent":
        return <MessageSquare className="w-5 h-5 text-blue-500" />
      case "Charlie's Agent":
        return <Zap className="w-5 h-5 text-green-500" />
      default:
        return <Bot className="w-5 h-5 text-gray-500" />
    }
  }

  const getAgentColor = (agentName: string) => {
    switch (agentName) {
      case "Alice":
      case "Alice's Agent":
        return "border-l-purple-500 bg-purple-50 dark:bg-purple-950/20"
      case "Bob (Pappu)":
      case "Bob":
      case "Pappu's Agent":
        return "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20"
      case "Charlie":
      case "Charlie's Agent":
        return "border-l-green-500 bg-green-50 dark:bg-green-950/20"
      case "Agent Consensus":
        return "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20"
      case "System":
        return "border-l-gray-500 bg-gray-50 dark:bg-gray-950/20"
      default:
        return "border-l-slate-500 bg-slate-50 dark:bg-slate-950/20"
    }
  }

  const getConflictBadges = (interaction: AgentInteraction) => {
    const badges = []
    
    if (interaction.conflictsWith && interaction.conflictsWith.length > 0) {
      badges.push(
        <Badge key="conflicts" variant="destructive" className="text-xs">
          <XCircle className="w-3 h-3 mr-1" />
          Conflicts
        </Badge>
      )
    }
    
    if (interaction.agreessWith && interaction.agreessWith.length > 0) {
      badges.push(
        <Badge key="agrees" variant="default" className="text-xs bg-green-500">
          <CheckCircle className="w-3 h-3 mr-1" />
          Agrees
        </Badge>
      )
    }
    
    return badges
  }

  return (
    <Card className="h-[800px] flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className={`w-5 h-5 ${isActive ? 'text-green-500 animate-pulse' : 'text-gray-400'}`} />
            Live Agent Negotiations
          </CardTitle>
          <div className="flex items-center gap-2">
            {isActive && (
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                Active
              </Badge>
            )}
            {interactions.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearInteractions}
                className="h-8 px-2 text-xs"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden p-0">
        <div 
          ref={scrollRef}
          className="h-full overflow-y-auto px-6 pb-6 space-y-4"
        >
          {interactions.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">Waiting for agent interactions...</p>
                <p className="text-xs mt-2">Start a voice command to see agents negotiate</p>
              </div>
            </div>
          ) : (
            interactions.map((interaction) => (
              <div
                key={interaction.id}
                className={`border-l-4 p-4 rounded-r-lg transition-all duration-500 ${getAgentColor(interaction.agent)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getAgentIcon(interaction.agent)}
                    <span className="font-medium text-sm">{interaction.agent}</span>
                    <Badge variant="outline" className="text-xs">
                      {interaction.confidence}% confident
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    {getConflictBadges(interaction)}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="font-medium text-sm">
                    {interaction.displayedText?.split('\n')[0] || interaction.message}
                    {interaction.isTyping && interaction.displayedText && (
                      <span className="animate-pulse">|</span>
                    )}
                  </div>
                  
                  {interaction.displayedText?.includes('\n') && (
                    <div className="text-xs text-muted-foreground leading-relaxed">
                      {interaction.displayedText.split('\n').slice(1).join('\n')}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(interaction.timestamp).toLocaleTimeString()}
                  </span>
                  
                  {(interaction.conflictsWith?.length || 0) + (interaction.agreessWith?.length || 0) > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {interaction.conflictsWith?.length ? `Conflicts: ${interaction.conflictsWith.length}` : ''}
                      {interaction.conflictsWith?.length && interaction.agreessWith?.length ? ' • ' : ''}
                      {interaction.agreessWith?.length ? `Agrees: ${interaction.agreessWith.length}` : ''}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
