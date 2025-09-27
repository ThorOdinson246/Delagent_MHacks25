"use client"

import { useEffect, useRef } from "react"

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

interface AudioVisualizerProps {
  isRecording: boolean
  isProcessing: boolean
  audioLevels: number[]
  width?: number
  height?: number
}

export function AudioVisualizer({ isRecording, isProcessing, audioLevels, width = 400, height = 400 }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<AudioParticle[]>([])
  const animationRef = useRef<number>()

  // Initialize particles
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = width
    canvas.height = height

    const centerX = width / 2
    const centerY = height / 2
    const maxRadius = Math.min(width, height) / 2 - 50

    // Create particles in circular pattern
    particlesRef.current = []
    const numberOfRings = 6
    const particlesPerRing = 8

    for (let ring = 0; ring < numberOfRings; ring++) {
      const ringRadius = (ring + 1) * (maxRadius / numberOfRings)
      const particlesInThisRing = particlesPerRing + ring * 2
      
      for (let i = 0; i < particlesInThisRing; i++) {
        const angle = (i / particlesInThisRing) * Math.PI * 2
        const x = centerX + Math.cos(angle) * ringRadius
        const y = centerY + Math.sin(angle) * ringRadius
        
        // Use theme colors
        let color: string
        if (isRecording) {
          color = `hsl(${220 + ring * 10}, 70%, ${60 + ring * 5}%)` // Blue theme
        } else if (isProcessing) {
          color = `hsl(${45}, 70%, ${60 + ring * 5}%)` // Yellow
        } else {
          color = `hsl(${220}, 50%, ${40 + ring * 8}%)` // Muted blue
        }

        const baseRadius = 2 + ring * 0.5
        const particle = new AudioParticle(x, y, baseRadius, color, x, y)
        particlesRef.current.push(particle)
      }
    }
  }, [width, height, isRecording, isProcessing])

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const animate = () => {
      ctx.clearRect(0, 0, width, height)

      // Calculate average audio level
      const averageLevel = audioLevels.length > 0 
        ? audioLevels.reduce((sum, level) => sum + level, 0) / audioLevels.length 
        : 0

      // Update and draw particles
      particlesRef.current.forEach((particle, index) => {
        const individualLevel = audioLevels[index % audioLevels.length] || averageLevel
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
  }, [audioLevels, width, height])

  return (
    <canvas
      ref={canvasRef}
      className="rounded-full"
      style={{ width: `${width}px`, height: `${height}px` }}
    />
  )
}
