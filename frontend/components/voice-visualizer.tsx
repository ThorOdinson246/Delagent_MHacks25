"use client"

import { useEffect, useState } from "react"

interface VoiceVisualizerProps {
  isRecording: boolean
  isProcessing: boolean
}

export function VoiceVisualizer({ isRecording, isProcessing }: VoiceVisualizerProps) {
  const [dots, setDots] = useState<{ id: number; scale: number; opacity: number; delay: number }[]>([])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isRecording) {
      // Generate bouncing dots
      interval = setInterval(() => {
        setDots(prev => {
          // Create new dots periodically
          const newDots = [...prev]
          
          if (Math.random() > 0.7) { // 30% chance to create new dot
            newDots.push({
              id: Date.now() + Math.random(),
              scale: 0,
              opacity: 1,
              delay: Math.random() * 200
            })
          }
          
          // Update existing dots
          return newDots
            .map(dot => ({
              ...dot,
              scale: dot.scale < 1 ? dot.scale + 0.15 : 0, // Bounce effect
              opacity: dot.opacity > 0 ? dot.opacity - 0.05 : 0
            }))
            .filter(dot => dot.opacity > 0) // Remove faded dots
            .slice(-8) // Keep max 8 dots
        })
      }, 50)
    } else {
      // Clear dots when not recording
      setDots([])
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRecording])

  const generateBouncingDots = () => {
    const numberOfPositions = 16
    const elements: JSX.Element[] = []
    
    for (let i = 0; i < numberOfPositions; i++) {
      const angle = (360 / numberOfPositions) * i
      const radian = (angle * Math.PI) / 180
      
      // Create multiple rings of dots at different distances
      const rings = [45, 60, 75]
      
      rings.forEach((radius, ringIndex) => {
        const x = Math.cos(radian) * radius
        const y = Math.sin(radian) * radius
        
        elements.push(
          <div
            key={`${i}-${ringIndex}`}
            className="absolute w-2 h-2 rounded-full transition-all duration-75"
            style={{
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`,
              backgroundColor: isRecording 
                ? `hsl(${(angle + ringIndex * 120) % 360}, 70%, 60%)` 
                : 'rgb(156, 163, 175)',
              opacity: isRecording ? 0.3 + Math.sin(Date.now() / 200 + angle / 30) * 0.3 : 0.2,
              transform: `translate(-50%, -50%) scale(${
                isRecording ? 0.5 + Math.sin(Date.now() / 150 + angle / 20 + ringIndex) * 0.5 : 0.3
              })`,
            }}
          />
        )
      })
    }
    
    // Add dynamic bouncing dots
    dots.forEach((dot, index) => {
      const angle = (index * 45 + Date.now() / 20) % 360
      const radian = (angle * Math.PI) / 180
      const radius = 30 + dot.scale * 40
      const x = Math.cos(radian) * radius
      const y = Math.sin(radian) * radius
      
      elements.push(
        <div
          key={`bounce-${dot.id}`}
          className="absolute w-3 h-3 rounded-full bg-gradient-to-br from-red-400 to-orange-500 shadow-lg"
          style={{
            left: `calc(50% + ${x}px)`,
            top: `calc(50% + ${y}px)`,
            transform: `translate(-50%, -50%) scale(${dot.scale})`,
            opacity: dot.opacity,
            boxShadow: `0 0 ${dot.scale * 20}px rgba(239, 68, 68, ${dot.opacity * 0.5})`
          }}
        />
      )
    })
    
    return elements
  }

  return (
    <div className="relative w-40 h-40 flex items-center justify-center">
      {/* Animated dot field */}
      <div className="absolute inset-0">
        {generateBouncingDots()}
      </div>
      
      {/* Outer hollow ring */}
      <div 
        className={`absolute inset-8 rounded-full border-2 transition-all duration-500 ${
          isRecording 
            ? 'border-red-400/60 shadow-lg shadow-red-400/30 animate-pulse' 
            : isProcessing
            ? 'border-yellow-400/60 shadow-lg shadow-yellow-400/30 animate-pulse'
            : 'border-muted-foreground/30'
        }`}
        style={{
          boxShadow: isRecording 
            ? 'inset 0 0 20px rgba(239, 68, 68, 0.2), 0 0 30px rgba(239, 68, 68, 0.3)'
            : isProcessing 
            ? 'inset 0 0 20px rgba(250, 204, 21, 0.2), 0 0 30px rgba(250, 204, 21, 0.3)'
            : 'inset 0 0 10px rgba(156, 163, 175, 0.1)'
        }}
      />
      
      {/* Inner hollow ring */}
      <div 
        className={`absolute inset-12 rounded-full border transition-all duration-300 ${
          isRecording 
            ? 'border-red-300/40 bg-red-50/5' 
            : isProcessing
            ? 'border-yellow-300/40 bg-yellow-50/5'
            : 'border-muted-foreground/20 bg-muted/5'
        }`}
      />
      
      {/* Central avatar - hollow */}
      <div className={`relative w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
        isRecording 
          ? 'border-red-400 bg-red-500/10 shadow-lg shadow-red-400/50' 
          : isProcessing
          ? 'border-yellow-400 bg-yellow-500/10 shadow-lg shadow-yellow-400/50'
          : 'border-primary bg-primary/10 shadow-md'
      }`}>
        {isRecording ? (
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        ) : isProcessing ? (
          <div className="w-3 h-3 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 715 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
          </svg>
        )}
      </div>
      
      {/* Status text */}
      <div className="absolute -bottom-6 text-xs text-center text-muted-foreground font-medium">
        {isRecording ? "Listening..." : isProcessing ? "Processing..." : "Ready"}
      </div>
    </div>
  )
}
