"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { useRouter } from "next/navigation"

export default function HomePage() {
  const [showApp, setShowApp] = useState(false)
  const router = useRouter()

  const handleGetStarted = () => {
    setShowApp(true)
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen grid-pattern">
      <Header onGetStarted={handleGetStarted} showNavigation={showApp} />
      <main className="container mx-auto px-4 py-8">
        <HeroSection onGetStarted={handleGetStarted} />
      </main>
    </div>
  )
}
