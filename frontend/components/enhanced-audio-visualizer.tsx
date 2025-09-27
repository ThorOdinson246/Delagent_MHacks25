"use client"

import { useEffect, useRef } from "react"

/**
 * AudioParticle - Based on PhotoParticle but optimized for audio visualization
 */
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
  hue: number
  
  constructor(x: number, y: number, radius: number, color: string, homeX: number, homeY: number, hue: number = 220) {
    this.x = x
    this.y = y
    this.homeX = homeX
    this.homeY = homeY
    this.radius = radius
    this.baseRadius = radius
    this.color = color
    this.audioIntensity = 0
    this.hue = hue
    
    // Physics properties - tuned for audio responsiveness
    this.vx = (Math.random() - 0.5) * 0.1
    this.vy = (Math.random() - 0.5) * 0.1
    this.friction = 0.92
    this.springConstant = 0.018
    this.maxSpeed = 25
    
    // Gentle orbital motion around home position
    this.orbitAngle = Math.random() * Math.PI * 2
    this.orbitSpeed = 0.15 + Math.random() * 0.1
    this.orbitRadius = 0.3 + Math.random() * 1.2
    this.time = Math.random() * 1000
  }

  update(allParticles: AudioParticle[] = [], canvasWidth = 0, canvasHeight = 0, audioLevel = 0, globalIntensity = 0) {
    this.time += 0.016
    this.audioIntensity = audioLevel / 100
    
    // Dynamic radius based on audio intensity
    this.radius = this.baseRadius + this.audioIntensity * 3 + globalIntensity * 2
    
    // Calculate center position for radial movement
    const centerX = canvasWidth / 2
    const centerY = canvasHeight / 2
    const distanceFromCenter = Math.sqrt((this.homeX - centerX) ** 2 + (this.homeY - centerY) ** 2)
    const angleFromCenter = Math.atan2(this.homeY - centerY, this.homeX - centerX)
    
    // Audio-influenced radial expansion/contraction
    const expansionFactor = 1 + (this.audioIntensity * 0.4 + globalIntensity * 0.3)
    const targetDistance = distanceFromCenter * expansionFactor
    
    // Calculate target position based on radial expansion
    const targetX = centerX + Math.cos(angleFromCenter) * targetDistance
    const targetY = centerY + Math.sin(angleFromCenter) * targetDistance
    
    // Add slight orbital motion for visual interest
    const orbitOffset = Math.sin(this.time * this.orbitSpeed) * (this.audioIntensity * 5 + 2)
    const finalTargetX = targetX + Math.cos(angleFromCenter + Math.PI/2) * orbitOffset
    const finalTargetY = targetY + Math.sin(angleFromCenter + Math.PI/2) * orbitOffset
    
    // Spring force toward target position
    const dx = this.x - finalTargetX
    const dy = this.y - finalTargetY
    
    this.vx += -dx * this.springConstant
    this.vy += -dy * this.springConstant
    
    // Particle-to-particle interaction (repulsion with audio boost)
    allParticles.forEach(other => {
      if (other === this) return
      
      const odx = this.x - other.x
      const ody = this.y - other.y
      const distance = Math.sqrt(odx * odx + ody * ody)
      const minDistance = (this.radius + other.radius) * 1.1
      
      if (distance < minDistance && distance > 0) {
        const repulseForce = (minDistance - distance) * 0.012 * (1 + globalIntensity)
        const angle = Math.atan2(ody, odx)
        
        this.vx += Math.cos(angle) * repulseForce
        this.vy += Math.sin(angle) * repulseForce
      }
    })
    
    // Update position
    this.x += this.vx
    this.y += this.vy
    
    // Boundary bouncing with audio-enhanced elasticity
    if (canvasWidth && canvasHeight) {
      const margin = 8
      const elasticity = 0.8 + this.audioIntensity * 0.3
      
      if (this.x - this.radius < margin) {
        this.x = margin + this.radius
        this.vx *= -elasticity
      }
      if (this.x + this.radius > canvasWidth - margin) {
        this.x = canvasWidth - margin - this.radius
        this.vx *= -elasticity
      }
      if (this.y - this.radius < margin) {
        this.y = margin + this.radius
        this.vy *= -elasticity
      }
      if (this.y + this.radius > canvasHeight - margin) {
        this.y = canvasHeight - margin - this.radius
        this.vy *= -elasticity
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

  draw(ctx: CanvasRenderingContext2D, globalIntensity: number) {
    ctx.beginPath()
    
    // Dynamic color based on audio intensity
    const saturation = 70 + this.audioIntensity * 20
    const lightness = 60 + this.audioIntensity * 20
    const alpha = 0.8 + this.audioIntensity * 0.2
    
    // Simple particle without glow
    ctx.fillStyle = `hsla(${this.hue}, ${saturation}%, ${lightness}%, ${alpha})`
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
    ctx.fill()
  }
}

interface EnhancedAudioVisualizerProps {
  isRecording: boolean
  isProcessing: boolean
  audioLevels: number[]
  width?: number
  height?: number
  particleCount?: number
}

export function EnhancedAudioVisualizer({ 
  isRecording, 
  isProcessing, 
  audioLevels, 
  width = 400, 
  height = 400,
  particleCount = 120
}: EnhancedAudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<AudioParticle[]>([])
  const animationRef = useRef<number>()

  // Initialize particles in an organic pattern
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = width
    canvas.height = height

    const centerX = width / 2
    const centerY = height / 2
    const maxRadius = Math.min(width, height) / 2 - 40

    // Only recreate particles if the count or dimensions changed significantly
    if (particlesRef.current.length === 0 || Math.abs(particlesRef.current.length - particleCount) > 10) {
      particlesRef.current = []

      // Create particles in multiple rings around the mic icon (64px = 32px radius + padding)
      const rings = 5
      const micRadius = 40 // Minimum radius around the mic icon
      const particlesPerRing = Math.ceil(particleCount / rings)

      for (let ring = 0; ring < rings; ring++) {
        const ringRadius = micRadius + ((ring + 1) / rings) * (maxRadius - micRadius)
        const particlesInThisRing = Math.floor(particlesPerRing * (0.7 + ring * 0.15)) // More particles in outer rings
        
        for (let i = 0; i < particlesInThisRing; i++) {
          // Add some organic randomness to positions
          const angleOffset = (Math.random() - 0.5) * 0.5
          const radiusOffset = (Math.random() - 0.5) * ringRadius * 0.3
          const angle = (i / particlesInThisRing) * Math.PI * 2 + angleOffset
          const actualRadius = ringRadius + radiusOffset
          
          const x = centerX + Math.cos(angle) * actualRadius
          const y = centerY + Math.sin(angle) * actualRadius
          
          // Dynamic theming based on state
          let hue: number
          if (isRecording) {
            hue = 0 + ring * 5 // Red spectrum for recording
          } else if (isProcessing) {
            hue = 45 + ring * 8 // Yellow-orange for processing
          } else {
            hue = 220 + ring * 10 // Blue spectrum for idle
          }

          const baseRadius = 1.5 + ring * 0.3 + Math.random() * 0.8
          const color = `hsl(${hue}, 70%, 60%)`
          
          const particle = new AudioParticle(x, y, baseRadius, color, x, y, hue)
          particlesRef.current.push(particle)
        }
      }
    }
  }, [width, height, particleCount, isRecording, isProcessing])

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const animate = () => {
      // Clear canvas completely for crisp movement
      ctx.clearRect(0, 0, width, height)

      // Calculate global audio intensity
      const averageLevel = audioLevels.length > 0 
        ? audioLevels.reduce((sum, level) => sum + level, 0) / audioLevels.length 
        : 0
      const globalIntensity = averageLevel / 100

      // Draw expanding concentric circles if there's audio activity
      if (globalIntensity > 0.1) {
        const centerX = width / 2
        const centerY = height / 2
        const maxRadius = Math.min(width, height) / 2 - 20
        
        // Draw 3 expanding circles
        for (let i = 0; i < 3; i++) {
          const phase = (Date.now() / 1000 + i * 0.3) % 2 // 2 second cycle per circle
          const radius = (phase / 2) * maxRadius * (0.5 + globalIntensity * 0.5)
          const alpha = (1 - phase / 2) * globalIntensity * 0.3
          
          if (alpha > 0.02) {
            ctx.beginPath()
            ctx.strokeStyle = `hsla(${isRecording ? '0' : isProcessing ? '45' : '220'}, 70%, 60%, ${alpha})`
            ctx.lineWidth = 2
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
            ctx.stroke()
          }
        }
      }

      // Update and draw particles
      particlesRef.current.forEach((particle, index) => {
        // Use specific frequency band for this particle, with fallback to average
        const individualLevel = audioLevels[index % audioLevels.length] || averageLevel
        particle.update(particlesRef.current, width, height, individualLevel, globalIntensity)
        particle.draw(ctx, globalIntensity)
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [audioLevels, width, height])

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="rounded-full"
        style={{ 
          width: `${width}px`, 
          height: `${height}px`,
          background: 'transparent'
        }}      />
      
      {/* Central microphone icon */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
          isRecording 
            ? 'bg-red-50 border-2 border-red-400 shadow-lg shadow-red-200/50' 
            : isProcessing
            ? 'bg-yellow-50 border-2 border-yellow-400 shadow-lg shadow-yellow-200/50'
            : 'bg-white border-2 border-gray-300 shadow-lg shadow-gray-200/50'
        }`}>
          {isRecording ? (
            <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse" />
          ) : isProcessing ? (
            <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-8 h-8 text-black" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      </div>
    </div>
  )
}
