"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, Users, MessageSquare, RefreshCw } from "lucide-react"
import { useState, useEffect } from "react"
import { apiService, type Meeting } from "@/lib/api"

export function MeetingDashboard() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMeetings = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiService.getMeetings()
      setMeetings(response.meetings)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch meetings")
      console.error("Error fetching meetings:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMeetings()
  }, [])

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "scheduled":
      case "agreed":
        return "default"
      case "negotiating":
      case "pending":
        return "secondary"
      case "failed":
      case "cancelled":
        return "destructive"
      default:
        return "outline"
    }
  }

  const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case "scheduled":
      case "agreed":
        return "status-agreed"
      case "negotiating":
      case "pending":
        return "status-negotiating"
      case "failed":
      case "cancelled":
        return "status-failed"
      default:
        return ""
    }
  }

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Meeting Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2">Loading meetings...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Meeting Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchMeetings} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Meeting Dashboard
          </div>
          <Button onClick={fetchMeetings} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {meetings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No meetings found. Create your first meeting request!
          </div>
        ) : (
          meetings.map((meeting) => (
            <div key={meeting.id} className="p-6 bg-muted/20 rounded-lg space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">{meeting.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      Bob & Alice
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {meeting.duration_minutes} min
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={getStatusVariant(meeting.status)} className={getStatusClass(meeting.status)}>
                    {meeting.status}
                  </Badge>
                </div>
              </div>

              {meeting.final_scheduled_time && (
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <div className="text-sm font-medium text-primary mb-1">Scheduled Time</div>
                  <div className="text-sm">{new Date(meeting.final_scheduled_time).toLocaleString()}</div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MessageSquare className="w-4 h-4" />
                  Meeting Details
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Preferred: {new Date(meeting.preferred_start_time).toLocaleString()}</p>
                  <p>Created: {new Date(meeting.created_at).toLocaleString()}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  View Details
                </Button>
                {meeting.status === "scheduled" && (
                  <Button size="sm" className="bg-gradient-to-r from-primary to-blue-500">
                    Join Meeting
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
