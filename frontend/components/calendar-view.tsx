"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Users, Brain, Calendar, RefreshCw } from "lucide-react"
import { useState, useEffect } from "react"
import { apiService, type CalendarBlock, type Meeting } from "@/lib/api"

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<"month" | "week" | "day">("month")
  const [calendarBlocks, setCalendarBlocks] = useState<CalendarBlock[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCalendarData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch calendar blocks for both users
      const [bobCalendar, aliceCalendar, meetingsData] = await Promise.all([
        apiService.getUserCalendar("bob"),
        apiService.getUserCalendar("alice"),
        apiService.getMeetings(),
      ])

      // Combine calendar blocks from both users
      const allBlocks = [...bobCalendar.calendar_blocks, ...aliceCalendar.calendar_blocks]
      setCalendarBlocks(allBlocks)
      setMeetings(meetingsData.meetings)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch calendar data")
      console.error("Error fetching calendar data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCalendarData()
  }, [])

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    const days = []
    const currentDateObj = new Date(startDate)

    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDateObj))
      currentDateObj.setDate(currentDateObj.getDate() + 1)
    }

    return days
  }

  const getEventsForDay = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0]
    return calendarBlocks.filter((block) => {
      const blockDate = new Date(block.start_time).toISOString().split("T")[0]
      return blockDate === dateStr
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  }

  const getBlockTypeColor = (blockType: string) => {
    switch (blockType) {
      case "focus_time":
        return "bg-purple-500/20 border-purple-500/50 text-purple-300"
      case "busy":
        return "bg-red-500/20 border-red-500/50 text-red-300"
      case "available":
        return "bg-green-500/20 border-green-500/50 text-green-300"
      case "flexible":
        return "bg-blue-500/20 border-blue-500/50 text-blue-300"
      default:
        return "bg-gray-500/20 border-gray-500/50 text-gray-300"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "negotiating":
      case "pending":
        return "bg-yellow-500/20 border-yellow-500/50 text-yellow-300"
      case "agreed":
      case "scheduled":
        return "bg-green-500/20 border-green-500/50 text-green-300"
      case "failed":
      case "cancelled":
        return "bg-red-500/20 border-red-500/50 text-red-300"
      default:
        return "bg-gray-500/20 border-gray-500/50 text-gray-300"
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-primary mr-2" />
            <span>Loading calendar data...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="text-center py-8">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchCalendarData} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="icon" onClick={() => navigateMonth("prev")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-2xl font-bold">
                {currentDate.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </h2>
              <Button variant="outline" size="icon" onClick={() => navigateMonth("next")}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <Button variant={view === "month" ? "default" : "outline"} size="sm" onClick={() => setView("month")}>
                Month
              </Button>
              <Button variant={view === "week" ? "default" : "outline"} size="sm" onClick={() => setView("week")}>
                Week
              </Button>
              <Button variant={view === "day" ? "default" : "outline"} size="sm" onClick={() => setView("day")}>
                Day
              </Button>
              <Button onClick={fetchCalendarData} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>{view === "month" ? "Monthly View" : view === "week" ? "Weekly View" : "Daily View"}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {view === "month" && (
                <div className="space-y-4">
                  {/* Day headers */}
                  <div className="grid grid-cols-7 gap-2 text-center text-sm font-medium text-muted-foreground">
                    <div>Sun</div>
                    <div>Mon</div>
                    <div>Tue</div>
                    <div>Wed</div>
                    <div>Thu</div>
                    <div>Fri</div>
                    <div>Sat</div>
                  </div>

                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-2">
                    {generateCalendarDays().map((day, index) => {
                      const isCurrentMonth = day.getMonth() === currentDate.getMonth()
                      const isToday = day.toDateString() === new Date().toDateString()
                      const dayEvents = getEventsForDay(day)

                      return (
                        <div
                          key={index}
                          className={`min-h-[100px] p-2 rounded-lg border transition-all hover:bg-background/50 ${
                            isCurrentMonth
                              ? "border-border/50 bg-background/20"
                              : "border-border/20 bg-background/10 opacity-50"
                          } ${isToday ? "ring-2 ring-primary/50" : ""}`}
                        >
                          <div
                            className={`text-sm font-medium mb-1 ${
                              isToday ? "text-primary" : isCurrentMonth ? "text-foreground" : "text-muted-foreground"
                            }`}
                          >
                            {day.getDate()}
                          </div>

                          <div className="space-y-1">
                            {dayEvents.slice(0, 2).map((event) => (
                              <div
                                key={event.id}
                                className={`text-xs p-1 rounded border ${getBlockTypeColor(event.block_type)} truncate`}
                                title={`${event.title} (${event.user_id === "bob" ? "Bob" : "Alice"})`}
                              >
                                {event.title}
                              </div>
                            ))}
                            {dayEvents.length > 2 && (
                              <div className="text-xs text-muted-foreground">+{dayEvents.length - 2} more</div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {view !== "month" && (
                <div className="space-y-3">
                  {calendarBlocks.map((block) => (
                    <div
                      key={block.id}
                      className={`p-3 rounded-lg border ${getBlockTypeColor(block.block_type)} transition-all hover:scale-[1.02]`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{block.title}</h4>
                          <p className="text-sm opacity-80">
                            {formatDate(block.start_time)} • {formatTime(block.start_time)} -{" "}
                            {formatTime(block.end_time)}
                          </p>
                          <p className="text-xs opacity-60">{block.user_id === "bob" ? "Bob" : "Alice"}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            Priority {block.priority_level}
                          </Badge>
                          {block.is_flexible && (
                            <Badge variant="outline" className="text-xs bg-blue-500/20">
                              Flexible
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Meeting Requests Sidebar */}
        <div className="space-y-6">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Meeting Requests</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {meetings.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">No meeting requests found</div>
                ) : (
                  meetings.map((meeting) => (
                    <div key={meeting.id} className="p-4 rounded-lg border border-border/50 bg-background/50 space-y-3">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium">{meeting.title}</h4>
                        <Badge className={getStatusColor(meeting.status)}>{meeting.status}</Badge>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Duration:</span>
                          <span>{meeting.duration_minutes} min</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Preferred:</span>
                          <span>{formatDate(meeting.preferred_start_time)}</span>
                        </div>
                        {meeting.final_scheduled_time && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Scheduled:</span>
                            <span className="text-green-400">
                              {formatDate(meeting.final_scheduled_time)} {formatTime(meeting.final_scheduled_time)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* AI Agent Calendar Insights */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5" />
                <span>AI Insights</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <h4 className="font-medium text-purple-300 mb-2">Schedule Optimization</h4>
                  <p className="text-sm text-muted-foreground">
                    Found {calendarBlocks.filter((b) => b.is_flexible).length} flexible blocks that can be optimized for
                    better meeting scheduling.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <h4 className="font-medium text-blue-300 mb-2">Availability Analysis</h4>
                  <p className="text-sm text-muted-foreground">
                    Both Bob and Alice have {calendarBlocks.filter((b) => b.block_type === "available").length}{" "}
                    available slots for new meetings.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <h4 className="font-medium text-green-300 mb-2">Focus Time Protected</h4>
                  <p className="text-sm text-muted-foreground">
                    {calendarBlocks.filter((b) => b.block_type === "focus_time").length} focus time blocks are protected
                    from meeting interruptions.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
