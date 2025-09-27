"use client"

import { useEffect, useState } from "react"

interface VoiceVisualizerProps {
  isRecording: boolean
  isProcessing: boolean
}

export function VoiceVisualizer({ isRecording, isProcessing }: VoiceVisualizerProps) {
  const [audioLevels, setAudioLevels] = useState<number[]>(Array(12).fill(0))

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isRecording) {
      // Simulate audio levels when recording
      interval = setInterval(() => {
        setAudioLevels(prev => prev.map(() => Math.random() * 100))
      }, 100)
    } else {
      // Reset when not recording
      setAudioLevels(Array(12).fill(0))
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRecording])

  const generateCircleElements = () => {
    const elements = []
    const numberOfBars = 12
    
    for (let i = 0; i < numberOfBars; i++) {
      const angle = (360 / numberOfBars) * i
      const level = audioLevels[i]
      const height = isRecording ? 20 + (level * 0.3) : 15
      
      elements.push(
        <div
          key={i}
          className="absolute w-1 bg-gradient-to-t from-primary to-blue-500 rounded-full transition-all duration-100"
          style={{
            height: `${height}px`,
            transform: `rotate(${angle}deg) translateY(-60px)`,
            transformOrigin: 'bottom center',
            opacity: isRecording ? 0.8 + (level * 0.002) : 0.3,
          }}
        />
      )
    }
    
    return elements
  }

  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      {/* Outer circle with bars */}
      <div className="absolute inset-0 flex items-center justify-center">
        {generateCircleElements()}
      </div>
      
      {/* Pulsing background circle */}
      <div 
        className={`absolute inset-4 rounded-full transition-all duration-300 ${
          isRecording 
            ? 'bg-red-500/20 shadow-lg shadow-red-500/50 animate-pulse' 
            : isProcessing
            ? 'bg-yellow-500/20 shadow-lg shadow-yellow-500/50 animate-pulse'
            : 'bg-muted/20'
        }`}
      />
      
      {/* Avatar circle */}
      <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center shadow-lg">
        {isRecording ? (
          <div className="w-4 h-4 rounded-full bg-white animate-pulse" />
        ) : isProcessing ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
          </svg>
        )}
      </div>
      
      {/* Status text */}
      <div className="absolute -bottom-8 text-xs text-center text-muted-foreground font-medium">
        {isRecording ? "Recording..." : isProcessing ? "Processing..." : "Ready"}
      </div>
    </div>
  )
}
