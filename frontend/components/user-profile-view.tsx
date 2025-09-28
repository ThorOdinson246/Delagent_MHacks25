"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { X, User, Mail, Calendar, Clock, Settings, Shield } from "lucide-react"

// Hardcoded user data matching the database schema
const userData = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  email: "alex.chen@company.com",
  name: "Alex Chen",
  timezone: "America/New_York",
  voice_enabled: true,
  created_at: "2025-09-20T10:00:00Z",
  updated_at: "2025-09-27T08:30:00Z",
}

const userPreferences = {
  id: "550e8400-e29b-41d4-a716-446655440020",
  user_id: "550e8400-e29b-41d4-a716-446655440000",
  work_hours_start: "09:00:00",
  work_hours_end: "17:00:00",
  break_duration_minutes: 15,
  max_meetings_per_day: 6,
  preferred_meeting_length: 60,
  focus_time_blocks: true,
  allow_back_to_back: false,
  weekend_availability: false,
  created_at: "2025-09-20T10:00:00Z",
  updated_at: "2025-09-27T08:30:00Z",
}

interface UserProfileViewProps {
  onClose: () => void
}

export function UserProfileView({ onClose }: UserProfileViewProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto border-border/50 bg-card/95 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>User Profile</span>
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <div className="p-3 rounded-lg bg-background/50 border border-border/50">{userData.name}</div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <div className="p-3 rounded-lg bg-background/50 border border-border/50 flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{userData.email}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Timezone</label>
                <div className="p-3 rounded-lg bg-background/50 border border-border/50 flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{userData.timezone}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Voice Enabled</label>
                <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                  <Badge
                    className={userData.voice_enabled ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}
                  >
                    {userData.voice_enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Work Preferences */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Work Preferences</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Work Hours</label>
                <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                  {userPreferences.work_hours_start} - {userPreferences.work_hours_end}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Max Meetings/Day</label>
                <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                  {userPreferences.max_meetings_per_day} meetings
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Preferred Meeting Length</label>
                <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                  {userPreferences.preferred_meeting_length} minutes
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Break Duration</label>
                <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                  {userPreferences.break_duration_minutes} minutes
                </div>
              </div>
            </div>
          </div>

          {/* Scheduling Preferences */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Scheduling Preferences</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-background/50 border border-border/50 flex items-center justify-between">
                <span>Focus Time Blocks</span>
                <Badge
                  className={
                    userPreferences.focus_time_blocks ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"
                  }
                >
                  {userPreferences.focus_time_blocks ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              <div className="p-3 rounded-lg bg-background/50 border border-border/50 flex items-center justify-between">
                <span>Back-to-Back Meetings</span>
                <Badge
                  className={
                    !userPreferences.allow_back_to_back
                      ? "bg-green-500/20 text-green-300"
                      : "bg-red-500/20 text-red-300"
                  }
                >
                  {!userPreferences.allow_back_to_back ? "Blocked" : "Allowed"}
                </Badge>
              </div>
              <div className="p-3 rounded-lg bg-background/50 border border-border/50 flex items-center justify-between">
                <span>Weekend Availability</span>
                <Badge
                  className={
                    userPreferences.weekend_availability
                      ? "bg-green-500/20 text-green-300"
                      : "bg-red-500/20 text-red-300"
                  }
                >
                  {userPreferences.weekend_availability ? "Available" : "Unavailable"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Account Information</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Account Created</label>
                <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                  {new Date(userData.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                  {new Date(userData.updated_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4 border-t border-border/50">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button className="bg-gradient-to-r from-primary to-blue-500">Edit Profile</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
