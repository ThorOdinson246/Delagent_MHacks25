"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Calendar, Clock, Users } from "lucide-react"
import { toast } from "sonner"

interface CalendarBlock {
  id: string
  user_id: string
  title: string
  start_time: string
  end_time: string
  block_type: string
  priority: number
  is_fixed: boolean
}

interface Meeting {
  id: string
  title: string
  start_time: string
  end_time: string
  duration_minutes: number
  participants: string[]
  status: string
}

interface RealTimeCalendarProps {
  userId?: string
}

export function RealTimeCalendar({ userId = "bob" }: RealTimeCalendarProps) {
  const [calendarBlocks, setCalendarBlocks] = useState<CalendarBlock[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  
  const wsRef = useRef<WebSocket | null>(null)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize real-time updates (WebSocket disabled for now)
  useEffect(() => {
    console.log("Calendar component initialized with auto-refresh")
  }, [])

  // Set up auto-refresh
  useEffect(() => {
    // Initial load
    fetchCalendarData()
    fetchMeetings()

    // Set up auto-refresh every 30 seconds
    refreshIntervalRef.current = setInterval(() => {
      fetchCalendarData()
      fetchMeetings()
    }, 30000)

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [userId])

  const fetchCalendarData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`http://localhost:8000/calendar/${userId}`)
      if (response.ok) {
        const data = await response.json()
        // Ensure we always set an array
        const blocks = Array.isArray(data.calendar_blocks) ? data.calendar_blocks : []
        setCalendarBlocks(blocks)
        setLastUpdated(new Date())
      } else {
        console.error("Failed to fetch calendar data:", response.status)
        setCalendarBlocks([])
      }
    } catch (error) {
      console.error("Error fetching calendar data:", error)
      setCalendarBlocks([])
      toast.error("Failed to fetch calendar data")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMeetings = async () => {
    try {
      const response = await fetch("http://localhost:8000/meetings")
      if (response.ok) {
        const data = await response.json()
        // Ensure we always set an array
        const meetingsData = Array.isArray(data) ? data : []
        setMeetings(meetingsData)
      } else {
        console.error("Failed to fetch meetings:", response.status)
        setMeetings([])
      }
    } catch (error) {
      console.error("Error fetching meetings:", error)
      setMeetings([])
    }
  }

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDate = (timeString: string) => {
    return new Date(timeString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  const getBlockTypeColor = (blockType: string) => {
    switch (blockType) {
      case 'focus_time':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'busy':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'flexible':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return 'bg-red-500'
    if (priority >= 6) return 'bg-orange-500'
    if (priority >= 4) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  // Group calendar blocks by date
  const blocksArray = Array.isArray(calendarBlocks) ? calendarBlocks : []
  const groupedBlocks = blocksArray.reduce((acc, block) => {
    const date = new Date(block.start_time).toDateString()
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(block)
    return acc
  }, {} as Record<string, CalendarBlock[]>)

  // Group meetings by date
  const meetingsArray = Array.isArray(meetings) ? meetings : []
  const groupedMeetings = meetingsArray.reduce((acc, meeting) => {
    const date = new Date(meeting.start_time).toDateString()
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(meeting)
    return acc
  }, {} as Record<string, Meeting[]>)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Real-Time Calendar - {userId.charAt(0).toUpperCase() + userId.slice(1)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  fetchCalendarData()
                  fetchMeetings()
                }}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Calendar Blocks */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>Calendar Blocks ({blocksArray.length})</span>
              </h3>
              
              {blocksArray.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No calendar blocks found</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedBlocks)
                    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                    .map(([date, blocks]) => (
                      <div key={date} className="border rounded-lg p-4">
                        <h4 className="font-medium text-sm text-muted-foreground mb-3">
                          {formatDate(blocks[0].start_time)}
                        </h4>
                        <div className="space-y-2">
                          {blocks
                            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                            .map((block) => (
                              <div
                                key={block.id}
                                className={`flex items-center justify-between p-3 rounded-lg border ${getBlockTypeColor(block.block_type)}`}
                              >
                                <div className="flex items-center space-x-3">
                                  <div className={`w-3 h-3 rounded-full ${getPriorityColor(block.priority)}`} />
                                  <div>
                                    <p className="font-medium text-sm">{block.title}</p>
                                    <p className="text-xs opacity-75">
                                      {formatTime(block.start_time)} - {formatTime(block.end_time)}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline" className="text-xs">
                                    {block.block_type}
                                  </Badge>
                                  {block.is_fixed && (
                                    <Badge variant="secondary" className="text-xs">
                                      Fixed
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Scheduled Meetings */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Scheduled Meetings ({meetingsArray.length})</span>
              </h3>
              
              {meetingsArray.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No meetings scheduled</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedMeetings)
                    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                    .map(([date, meetings]) => (
                      <div key={date} className="border rounded-lg p-4">
                        <h4 className="font-medium text-sm text-muted-foreground mb-3">
                          {formatDate(meetings[0].start_time)}
                        </h4>
                        <div className="space-y-2">
                          {meetings
                            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                            .map((meeting) => (
                              <div
                                key={meeting.id}
                                className="flex items-center justify-between p-3 rounded-lg border bg-emerald-50 border-emerald-200"
                              >
                                <div className="flex items-center space-x-3">
                                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                  <div>
                                    <p className="font-medium text-sm text-emerald-900">{meeting.title}</p>
                                    <p className="text-xs text-emerald-700">
                                      {formatTime(meeting.start_time)} - {formatTime(meeting.end_time)}
                                      ({meeting.duration_minutes} min)
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline" className="text-xs bg-emerald-100 text-emerald-800">
                                    {meeting.status}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {meeting.participants.length} participants
                                  </Badge>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
