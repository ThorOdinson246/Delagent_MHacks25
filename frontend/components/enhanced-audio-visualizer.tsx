"use client"

import { useEffect, useRef, useState } from "react"

interface EnhancedAudioVisualizerProps {
  isRecording: boolean
  isProcessing: boolean
  audioLevels: number[]
  width: number
  height: number
  particleCount?: number
}

export function EnhancedAudioVisualizer({
  isRecording,
  isProcessing,
  audioLevels,
  width,
  height,
  particleCount = 100
}: EnhancedAudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const particlesRef = useRef<Particle[]>([])
  const [isInitialized, setIsInitialized] = useState(false)

  interface Particle {
    x: number
    y: number
    vx: number
    vy: number
    size: number
    opacity: number
    color: string
    life: number
    maxLife: number
  }

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = width
    canvas.height = height

    // Initialize particles
    const initParticles = () => {
      particlesRef.current = []
      for (let i = 0; i < particleCount; i++) {
        particlesRef.current.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          size: Math.random() * 3 + 1,
          opacity: Math.random() * 0.5 + 0.2,
          color: getRandomColor(),
          life: 0,
          maxLife: Math.random() * 200 + 100
        })
      }
    }

    const getRandomColor = () => {
      const colors = [
        '#3B82F6', // Blue
        '#8B5CF6', // Purple
        '#06B6D4', // Cyan
        '#10B981', // Emerald
        '#F59E0B', // Amber
        '#EF4444', // Red
        '#EC4899', // Pink
      ]
      return colors[Math.floor(Math.random() * colors.length)]
    }

    const updateParticles = () => {
      const centerX = width / 2
      const centerY = height / 2
      const averageLevel = audioLevels.length > 0 
        ? audioLevels.reduce((sum, level) => sum + level, 0) / audioLevels.length 
        : 0

      particlesRef.current.forEach((particle) => {
        // Update position
        particle.x += particle.vx
        particle.y += particle.vy

        // Apply audio influence
        if (isRecording && averageLevel > 10) {
          const force = averageLevel / 100
          const angle = Math.atan2(particle.y - centerY, particle.x - centerX)
          particle.vx += Math.cos(angle) * force * 0.1
          particle.vy += Math.sin(angle) * force * 0.1
        }

        // Apply processing effect
        if (isProcessing) {
          particle.vx *= 0.95
          particle.vy *= 0.95
          particle.opacity = Math.min(particle.opacity + 0.01, 0.8)
        }

        // Boundary collision
        if (particle.x < 0 || particle.x > width) {
          particle.vx *= -0.8
          particle.x = Math.max(0, Math.min(width, particle.x))
        }
        if (particle.y < 0 || particle.y > height) {
          particle.vy *= -0.8
          particle.y = Math.max(0, Math.min(height, particle.y))
        }

        // Update life
        particle.life++
        if (particle.life > particle.maxLife) {
          particle.x = Math.random() * width
          particle.y = Math.random() * height
          particle.vx = (Math.random() - 0.5) * 2
          particle.vy = (Math.random() - 0.5) * 2
          particle.life = 0
          particle.color = getRandomColor()
        }
      })
    }

    const drawParticles = () => {
      ctx.clearRect(0, 0, width, height)

      // Draw background gradient
      const gradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width/2)
      if (isRecording) {
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.1)')
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0.02)')
      } else if (isProcessing) {
        gradient.addColorStop(0, 'rgba(245, 158, 11, 0.1)')
        gradient.addColorStop(1, 'rgba(245, 158, 11, 0.02)')
      } else {
        gradient.addColorStop(0, 'rgba(107, 114, 128, 0.05)')
        gradient.addColorStop(1, 'rgba(107, 114, 128, 0.01)')
      }
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)

      // Draw particles
      particlesRef.current.forEach((particle) => {
        ctx.save()
        ctx.globalAlpha = particle.opacity
        ctx.fillStyle = particle.color
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      })

      // Draw center circle
      ctx.save()
      ctx.globalAlpha = isRecording ? 0.3 : isProcessing ? 0.2 : 0.1
      ctx.fillStyle = isRecording ? '#3B82F6' : isProcessing ? '#F59E0B' : '#6B7280'
      ctx.beginPath()
      ctx.arc(width / 2, height / 2, 20, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      // Draw audio level rings
      if (isRecording && audioLevels.length > 0) {
        const averageLevel = audioLevels.reduce((sum, level) => sum + level, 0) / audioLevels.length
        const ringCount = Math.min(5, Math.floor(averageLevel / 20))
        
        for (let i = 0; i < ringCount; i++) {
          ctx.save()
          ctx.globalAlpha = 0.3 - (i * 0.05)
          ctx.strokeStyle = '#3B82F6'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(width / 2, height / 2, 30 + (i * 15), 0, Math.PI * 2)
          ctx.stroke()
          ctx.restore()
        }
      }
    }

    const animate = () => {
      updateParticles()
      drawParticles()
      animationRef.current = requestAnimationFrame(animate)
    }

    if (!isInitialized) {
      initParticles()
      setIsInitialized(true)
    }

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isRecording, isProcessing, audioLevels, width, height, particleCount, isInitialized])

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="rounded-full border-2 border-gray-200 shadow-lg"
        style={{ width, height }}
      />
      
      {/* Status indicator */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          isRecording 
            ? 'bg-red-500 animate-pulse' 
            : isProcessing 
            ? 'bg-yellow-500 animate-spin' 
            : 'bg-gray-400'
        }`}>
          {isProcessing && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      </div>
    </div>
  )
}