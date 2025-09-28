"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Users, Brain, Calendar, RefreshCw, X, Clock, User } from "lucide-react"
import { useState, useEffect } from "react"
import { apiService, type CalendarBlock, type Meeting } from "@/lib/api"

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<"month" | "week" | "day">("month")
  const [calendarBlocks, setCalendarBlocks] = useState<CalendarBlock[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null)

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
        return "bg-gradient-to-r from-purple-500/30 to-indigo-600/30 border-purple-400/60 text-black shadow-lg shadow-purple-500/20"
      case "busy":
        return "bg-gradient-to-r from-orange-500/30 to-red-600/30 border-orange-400/60 text-black shadow-lg shadow-orange-500/20"
      case "available":
        return "bg-gradient-to-r from-green-500/30 to-emerald-600/30 border-green-400/60 text-black shadow-lg shadow-green-500/20"
      case "flexible":
        return "bg-gradient-to-r from-blue-500/30 to-cyan-600/30 border-blue-400/60 text-black shadow-lg shadow-blue-500/20"
      default:
        return "bg-gradient-to-r from-gray-500/30 to-slate-600/30 border-gray-400/60 text-black shadow-lg shadow-gray-500/20"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "negotiating":
      case "pending":
        return "bg-gradient-to-r from-amber-500/30 to-orange-600/30 border-amber-400/60 text-black shadow-lg shadow-amber-500/20"
      case "agreed":
      case "scheduled":
        return "bg-gradient-to-r from-emerald-500/30 to-green-600/30 border-emerald-400/60 text-black shadow-lg shadow-emerald-500/20"
      case "failed":
      case "cancelled":
        return "bg-gradient-to-r from-red-500/30 to-rose-600/30 border-red-400/60 text-black shadow-lg shadow-red-500/20"
      default:
        return "bg-gradient-to-r from-slate-500/30 to-gray-600/30 border-slate-400/60 text-black shadow-lg shadow-slate-500/20"
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

            <div className="flex items-center space-x-4">
              {/* Color Legend */}
              <div className="flex items-center space-x-3 text-sm">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded bg-gradient-to-r from-purple-500/30 to-indigo-600/30 border border-purple-400/60"></div>
                  <span className="text-muted-foreground">Focus Time</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded bg-gradient-to-r from-orange-500/30 to-red-600/30 border border-orange-400/60"></div>
                  <span className="text-muted-foreground">Busy</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded bg-gradient-to-r from-green-500/30 to-emerald-600/30 border border-green-400/60"></div>
                  <span className="text-muted-foreground">Available</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded bg-gradient-to-r from-blue-500/30 to-cyan-600/30 border border-blue-400/60"></div>
                  <span className="text-muted-foreground">Flexible</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button variant={view === "month" ? "default" : "outline"} size="sm" onClick={() => {
                  setView("month")
                  setExpandedBlock(null)
                }}>
                  Month
                </Button>
                <Button variant={view === "week" ? "default" : "outline"} size="sm" onClick={() => {
                  setView("week")
                  setExpandedBlock(null)
                }}>
                  Week
                </Button>
                <Button variant={view === "day" ? "default" : "outline"} size="sm" onClick={() => {
                  setView("day")
                  setExpandedBlock(null)
                }}>
                  Day
                </Button>
                <Button onClick={fetchCalendarData} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
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
                          className={`min-h-[100px] p-2 rounded-lg border transition-all hover:bg-background/50 cursor-pointer ${
                            isCurrentMonth
                              ? "border-border/50 bg-background/20"
                              : "border-border/20 bg-background/10 opacity-50"
                          } ${isToday ? "ring-2 ring-primary/50" : ""}`}
                          onClick={() => {
                            if (isCurrentMonth) {
                              setSelectedDay(day)
                            }
                          }}
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
                                className={`text-xs p-1 rounded border ${getBlockTypeColor(event.block_type)} truncate text-black`}
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
                  {calendarBlocks.map((block) => {
                    const isExpanded = expandedBlock === block.id
                    return (
                      <div
                        key={block.id}
                        className={`rounded-lg border ${getBlockTypeColor(block.block_type)} transition-all duration-300 cursor-pointer ${
                          isExpanded ? "scale-105 shadow-xl ring-2 ring-primary/50" : "hover:scale-[1.02]"
                        }`}
                        onClick={() => {
                          // Simple toggle logic - if this block is expanded, collapse it
                          // If it's not expanded, expand it (this automatically collapses any other expanded block)
                          setExpandedBlock(isExpanded ? null : block.id)
                        }}
                      >
                        <div className={`p-3 ${isExpanded ? "pb-4" : ""}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-black">{block.title}</h4>
                              <p className="text-sm text-black">
                                {formatDate(block.start_time)} • {formatTime(block.start_time)} -{" "}
                                {formatTime(block.end_time)}
                              </p>
                              <p className="text-xs text-black">{block.user_id === "bob" ? "Bob" : "Alice"}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="text-xs">
                                Priority {block.priority_level}
                              </Badge>
                              {block.is_flexible && (
                                <Badge variant="outline" className="text-xs bg-cyan-500/20">
                                  Flexible
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-black/20 space-y-3 animate-in slide-in-from-top-2 duration-300">
                              <div className="grid grid-cols-2 gap-4 text-sm text-black">
                                <div className="flex items-center space-x-2">
                                  <Clock className="w-4 h-4 text-black" />
                                  <span>Duration: {Math.round((new Date(block.end_time).getTime() - new Date(block.start_time).getTime()) / (1000 * 60))} min</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <User className="w-4 h-4 text-black" />
                                  <span>Owner: {block.user_id === "bob" ? "Bob" : "Alice"}</span>
                                </div>
                              </div>
                              <div className="text-sm text-black">
                                <strong>Block Type:</strong> {block.block_type.replace('_', ' ').toUpperCase()}
                              </div>
                              {block.description && (
                                <div className="text-sm text-black">
                                  <strong>Description:</strong> {block.description}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
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

      {/* Day Details Modal */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border/50 rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-border/50">
              <h3 className="text-xl font-bold">
                {selectedDay.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedDay(null)}
                className="hover:bg-destructive/10"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {(() => {
                const dayEvents = getEventsForDay(selectedDay)
                const dayMeetings = meetings.filter(meeting => {
                  const meetingDate = new Date(meeting.preferred_start_time).toISOString().split("T")[0]
                  const selectedDate = selectedDay.toISOString().split("T")[0]
                  return meetingDate === selectedDate
                })

                if (dayEvents.length === 0 && dayMeetings.length === 0) {
                  return (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No events scheduled for this day</p>
                    </div>
                  )
                }

                return (
                  <div className="space-y-6">
                    {/* Calendar Blocks */}
                    {dayEvents.length > 0 && (
                      <div>
                        <h4 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                          <Calendar className="w-5 h-5" />
                          <span>Calendar Blocks ({dayEvents.length})</span>
                        </h4>
                        <div className="space-y-3">
                          {dayEvents.map((block) => (
                            <div
                              key={block.id}
                              className={`p-4 rounded-lg border ${getBlockTypeColor(block.block_type)}`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <h5 className="font-medium text-black">{block.title}</h5>
                                  <p className="text-sm text-black">
                                    {formatTime(block.start_time)} - {formatTime(block.end_time)}
                                  </p>
                                  <p className="text-xs text-black">{block.user_id === "bob" ? "Bob" : "Alice"}</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline" className="text-xs">
                                    Priority {block.priority_level}
                                  </Badge>
                                  {block.is_flexible && (
                                    <Badge variant="outline" className="text-xs bg-cyan-500/20">
                                      Flexible
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Meetings */}
                    {dayMeetings.length > 0 && (
                      <div>
                        <h4 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                          <Users className="w-5 h-5" />
                          <span>Meetings ({dayMeetings.length})</span>
                        </h4>
                        <div className="space-y-3">
                          {dayMeetings.map((meeting) => (
                            <div
                              key={meeting.id}
                              className="p-4 rounded-lg border border-border/50 bg-background/50"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <h5 className="font-medium text-black">{meeting.title}</h5>
                                  <p className="text-sm text-black">
                                    Duration: {meeting.duration_minutes} minutes
                                  </p>
                                  {meeting.final_scheduled_time && (
                                    <p className="text-sm text-black">
                                      Scheduled: {formatTime(meeting.final_scheduled_time)}
                                    </p>
                                  )}
                                </div>
                                <Badge className={getStatusColor(meeting.status)}>
                                  {meeting.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
