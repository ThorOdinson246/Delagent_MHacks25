"use client"

import { useEffect, useRef, useState } from "react"

interface AudioParticle {
  x: number
  y: number
  homeX: number
  homeY: number
  radius: number
  color: string
  vx: number
  vy: number
  friction: number
  springConstant: number
  maxSpeed: number
  orbitAngle: number
  orbitSpeed: number
  orbitRadius: number
  time: number
  baseRadius: number
  audioIntensity: number
}

class AudioParticle {
  x: number
  y: number
  homeX: number
  homeY: number
  radius: number
  color: string
  vx: number
  vy: number
  friction: number
  springConstant: number
  maxSpeed: number
  orbitAngle: number
  orbitSpeed: number
  orbitRadius: number
  time: number
  baseRadius: number
  audioIntensity: number

  constructor(x: number, y: number, radius: number, color: string, homeX: number, homeY: number) {
    this.x = x
    this.y = y
    this.homeX = homeX
    this.homeY = homeY
    this.radius = radius
    this.baseRadius = radius
    this.color = color
    this.audioIntensity = 0
    
    // Physics properties
    this.vx = (Math.random() - 0.5) * 0.2
    this.vy = (Math.random() - 0.5) * 0.2
    this.friction = 0.85
    this.springConstant = 0.025
    this.maxSpeed = 30
    
    // Gentle orbital motion around home position
    this.orbitAngle = Math.random() * Math.PI * 2
    this.orbitSpeed = 0.2
    this.orbitRadius = 0.5 + Math.random() * 2
    this.time = Math.random() * 1000
  }

  update(allParticles: AudioParticle[] = [], canvasWidth = 0, canvasHeight = 0, audioLevel = 0) {
    this.time += 0.016
    this.audioIntensity = audioLevel / 100
    
    // Update radius based on audio intensity
    this.radius = this.baseRadius + this.audioIntensity * 3
    
    // Calculate gentle orbital target position with audio influence
    const audioOrbitRadius = this.orbitRadius + this.audioIntensity * 10
    const orbitX = this.homeX + Math.cos(this.orbitAngle) * audioOrbitRadius
    const orbitY = this.homeY + Math.sin(this.orbitAngle) * audioOrbitRadius
    this.orbitAngle += this.orbitSpeed * 0.01 * (1 + this.audioIntensity)
    
    // Spring force back to orbital position
    const dx = this.x - orbitX
    const dy = this.y - orbitY
    
    this.vx += -dx * this.springConstant
    this.vy += -dy * this.springConstant
    
    // Audio-influenced random motion
    if (this.audioIntensity > 0.1) {
      this.vx += (Math.random() - 0.5) * this.audioIntensity * 0.5
      this.vy += (Math.random() - 0.5) * this.audioIntensity * 0.5
    }
    
    // Particle-to-particle repulsion
    allParticles.forEach(other => {
      if (other === this) return
      
      const odx = this.x - other.x
      const ody = this.y - other.y
      const distance = Math.sqrt(odx * odx + ody * ody)
      const minDistance = (this.radius + other.radius) * 1.2
      
      if (distance < minDistance && distance > 0) {
        const repulseForce = (minDistance - distance) * 0.008
        const angle = Math.atan2(ody, odx)
        
        this.vx += Math.cos(angle) * repulseForce
        this.vy += Math.sin(angle) * repulseForce
      }
    })
    
    // Update position
    this.x += this.vx
    this.y += this.vy
    
    // Boundary bouncing
    if (canvasWidth && canvasHeight) {
      const margin = 10
      if (this.x - this.radius < margin) {
        this.x = margin + this.radius
        this.vx *= -0.8
      }
      if (this.x + this.radius > canvasWidth - margin) {
        this.x = canvasWidth - margin - this.radius
        this.vx *= -0.8
      }
      if (this.y - this.radius < margin) {
        this.y = margin + this.radius
        this.vy *= -0.8
      }
      if (this.y + this.radius > canvasHeight - margin) {
        this.y = canvasHeight - margin - this.radius
        this.vy *= -0.8
      }
    }
    
    // Apply friction
    this.vx *= this.friction
    this.vy *= this.friction
    
    // Speed limit
    const currentSpeed = Math.hypot(this.vx, this.vy)
    if (currentSpeed > this.maxSpeed) {
      this.vx = (this.vx / currentSpeed) * this.maxSpeed
      this.vy = (this.vy / currentSpeed) * this.maxSpeed
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath()
    
    // Add glow effect based on audio intensity
    if (this.audioIntensity > 0.1) {
      ctx.shadowColor = this.color
      ctx.shadowBlur = this.audioIntensity * 20
    } else {
      ctx.shadowBlur = 0
    }
    
    ctx.fillStyle = this.color
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.shadowBlur = 0
  }
}

interface EnhancedAudioVisualizerProps {
  isRecording: boolean
  isProcessing: boolean
  audioLevels?: number[]
  width?: number
  height?: number
  particleCount?: number
}

export function EnhancedAudioVisualizer({ 
  isRecording, 
  isProcessing, 
  audioLevels = [],
  width = 280, 
  height = 280,
  particleCount = 120
}: EnhancedAudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<AudioParticle[]>([])
  const animationRef = useRef<number>()
  const [simulatedAudioLevels, setSimulatedAudioLevels] = useState<number[]>(Array(particleCount).fill(0))
  const circleAnimationRef = useRef<number>(0)

  // Use provided audioLevels or simulate them based on recording/processing state
  useEffect(() => {
    if (audioLevels.length > 0) {
      // Use real audio levels if provided
      setSimulatedAudioLevels(audioLevels)
      return
    }

    let interval: NodeJS.Timeout | null = null

    if (isRecording || isProcessing) {
      interval = setInterval(() => {
        setSimulatedAudioLevels(prev => prev.map(() => {
          if (isRecording) {
            // More dynamic levels when recording
            return Math.random() * 80 + 20
          } else if (isProcessing) {
            // Gentler pulsing when processing
            return Math.random() * 40 + 10
          }
          return 0
        }))
      }, 80)
    } else {
      // Gradually fade out when idle
      const fadeInterval = setInterval(() => {
        setSimulatedAudioLevels(prev => prev.map(level => Math.max(0, level * 0.9)))
      }, 50)
      
      setTimeout(() => {
        clearInterval(fadeInterval)
        setSimulatedAudioLevels(Array(particleCount).fill(0))
      }, 1000)
      
      return () => clearInterval(fadeInterval)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRecording, isProcessing, audioLevels, particleCount])

  // Initialize particles
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = width
    canvas.height = height

    const centerX = width / 2
    const centerY = height / 2
    const micRadius = 40 // Minimum radius around the mic icon
    const maxRadius = Math.min(width, height) / 2 - 20
    const rings = 5

    // Create particles in concentric rings around mic icon
    particlesRef.current = []

    for (let ring = 0; ring < rings; ring++) {
      const ringRadius = micRadius + ((ring + 1) / rings) * (maxRadius - micRadius)
      const particlesInThisRing = Math.max(6, Math.floor(particleCount / rings) + ring * 2)
      
      for (let i = 0; i < particlesInThisRing; i++) {
        const angle = (i / particlesInThisRing) * Math.PI * 2
        const x = centerX + Math.cos(angle) * ringRadius
        const y = centerY + Math.sin(angle) * ringRadius
        
        // Use theme colors based on state
        let color: string
        if (isRecording) {
          color = `hsl(${0 + ring * 5}, 70%, ${60 + ring * 3}%)` // Red theme for recording
        } else if (isProcessing) {
          color = `hsl(${45}, 70%, ${60 + ring * 3}%)` // Yellow theme for processing
        } else {
          color = `hsl(${220}, 50%, ${40 + ring * 5}%)` // Blue theme for idle
        }

        const baseRadius = 2 + ring * 0.4
        const particle = new AudioParticle(x, y, baseRadius, color, x, y)
        particlesRef.current.push(particle)
      }
    }
  }, [width, height, isRecording, isProcessing, particleCount])

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const animate = () => {
      // Clear canvas
      ctx.clearRect(0, 0, width, height)

      // Calculate average audio level
      const averageLevel = simulatedAudioLevels.length > 0 
        ? simulatedAudioLevels.reduce((sum, level) => sum + level, 0) / simulatedAudioLevels.length 
        : 0

      // Draw expanding concentric circles during audio activity
      if (averageLevel > 10) {
        const centerX = width / 2
        const centerY = height / 2
        circleAnimationRef.current += 0.05

        for (let i = 0; i < 3; i++) {
          const radius = 60 + i * 30 + Math.sin(circleAnimationRef.current + i) * 10
          const opacity = (averageLevel / 100) * (0.3 - i * 0.1)
          
          ctx.beginPath()
          ctx.strokeStyle = isRecording 
            ? `rgba(239, 68, 68, ${opacity})` // Red
            : isProcessing 
            ? `rgba(245, 158, 11, ${opacity})` // Yellow
            : `rgba(59, 130, 246, ${opacity})` // Blue
          ctx.lineWidth = 2
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
          ctx.stroke()
        }
      }

      // Update particle colors based on current state
      particlesRef.current.forEach((particle, index) => {
        const ring = Math.floor(index / Math.ceil(particleCount / 5))
        if (isRecording) {
          particle.color = `hsl(${0 + ring * 5}, 70%, ${60 + ring * 3}%)`
        } else if (isProcessing) {
          particle.color = `hsl(${45}, 70%, ${60 + ring * 3}%)`
        } else {
          particle.color = `hsl(${220}, 50%, ${40 + ring * 5}%)`
        }
      })

      // Update and draw particles
      particlesRef.current.forEach((particle, index) => {
        const individualLevel = simulatedAudioLevels[index % simulatedAudioLevels.length] || averageLevel
        particle.update(particlesRef.current, width, height, individualLevel)
        particle.draw(ctx)
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [simulatedAudioLevels, width, height, isRecording, isProcessing, particleCount])

  return (
    <div className="relative flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="rounded-full"
        style={{ width: `${width}px`, height: `${height}px` }}
      />
      
      {/* Central microphone icon */}
      <div className={`absolute w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
        isRecording 
          ? 'bg-red-50 border-2 border-red-400 shadow-lg shadow-red-200/50' 
          : isProcessing
          ? 'bg-yellow-50 border-2 border-yellow-400 shadow-lg shadow-yellow-200/50'
          : 'bg-white border-2 border-gray-300 shadow-lg shadow-gray-200/50'
      }`}>
        {isRecording ? (
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
        ) : isProcessing ? (
          <div className="w-3 h-3 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-8 h-8 text-black" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 715 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
          </svg>
        )}
      </div>
    </div>
  )
}
