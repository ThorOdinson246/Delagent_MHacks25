"use client"

import { Button } from "@/components/ui/button"
import { Mic, Play, Sparkles } from "lucide-react"

interface HeroSectionProps {
  onGetStarted?: () => void
}

export function HeroSection({ onGetStarted }: HeroSectionProps) {
  return (
    <section className="text-center py-16 space-y-8">
      <div className="space-y-4">
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm">
          <Sparkles className="w-4 h-4 mr-2" />
          Multi-Agent AI Scheduling Platform
        </div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-balance">
          Let AI agents{" "}
          <span className="bg-gradient-to-r from-primary via-blue-500 to-cyan-400 bg-clip-text text-transparent">
            negotiate
          </span>{" "}
          your meetings
        </h1>

        <p className="text-xl text-muted-foreground max-w-3xl mx-auto text-balance">
          Voice-first scheduling where autonomous AI agents represent each user, negotiate optimal meeting times, and
          explain their reasoning in plain language.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Button
          size="lg"
          className="bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-500/90 glow-purple"
          onClick={onGetStarted}
        >
          <Mic className="w-5 h-5 mr-2" />
          Start Voice Scheduling
        </Button>
        <Button size="lg" variant="outline" className="border-primary/20 hover:bg-primary/10 bg-transparent">
          <Play className="w-5 h-5 mr-2" />
          Watch Demo
        </Button>
      </div>

      <div className="text-sm text-muted-foreground">Trusted by AI teams at</div>
      <div className="flex items-center justify-center gap-8 opacity-60">
        <div className="text-lg font-semibold">Fetch.AI</div>
        <div className="text-lg font-semibold">OpenAI</div>
        <div className="text-lg font-semibold">Vercel</div>
        <div className="text-lg font-semibold">Anthropic</div>
      </div>
    </section>
  )
}
