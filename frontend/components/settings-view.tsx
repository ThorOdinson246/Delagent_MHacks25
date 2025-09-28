"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Settings, User, Bell, Shield, Mic, Calendar, Palette } from "lucide-react"
import { useState } from "react"

// Hardcoded user data matching the database schema
const userData = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "Alex Johnson",
  email: "alex.johnson@company.com",
  agent_address: "agent://alex-scheduler-001",
  timezone: "America/New_York",
  created_at: "2025-09-01T10:00:00Z",
}

const userPreferences = {
  notifications: {
    email_notifications: true,
    push_notifications: true,
    negotiation_updates: true,
    meeting_reminders: true,
    daily_summary: false,
    weekly_report: true,
  },
  voice: {
    voice_enabled: true,
    auto_transcription: true,
    voice_commands: true,
    preferred_language: "en-US",
    voice_feedback: true,
  },
  calendar: {
    default_meeting_duration: 60,
    buffer_time: 15,
    work_hours_start: "09:00",
    work_hours_end: "17:00",
    lunch_break_start: "12:00",
    lunch_break_end: "13:00",
    weekend_availability: false,
  },
  privacy: {
    share_availability: true,
    share_preferences: false,
    anonymous_feedback: true,
    data_retention_days: 90,
  },
  appearance: {
    theme: "dark",
    accent_color: "purple",
    compact_view: false,
    animations: true,
  },
}

export function SettingsView() {
  const [activeSection, setActiveSection] = useState<
    "profile" | "notifications" | "voice" | "calendar" | "privacy" | "appearance"
  >("profile")
  const [preferences, setPreferences] = useState(userPreferences)

  const updatePreference = (section: string, key: string, value: any) => {
    setPreferences((prev) => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [key]: value,
      },
    }))
  }

  const settingSections = [
    { id: "profile", label: "Profile", icon: User },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "voice", label: "Voice Settings", icon: Mic },
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "privacy", label: "Privacy", icon: Shield },
    { id: "appearance", label: "Appearance", icon: Palette },
  ]

  return (
    <div className="grid lg:grid-cols-4 gap-6">
      {/* Settings Navigation */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <nav className="space-y-2">
            {settingSections.map((section) => {
              const Icon = section.icon
              return (
                <Button
                  key={section.id}
                  variant={activeSection === section.id ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveSection(section.id as any)}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {section.label}
                </Button>
              )
            })}
          </nav>
        </CardContent>
      </Card>

      {/* Settings Content */}
      <div className="lg:col-span-3 space-y-6">
        {/* Profile Settings */}
        {activeSection === "profile" && (
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Profile Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">Full Name</label>
                  <input
                    type="text"
                    value={userData.name}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                    readOnly
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Email Address</label>
                  <input
                    type="email"
                    value={userData.email}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                    readOnly
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Agent Address</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={userData.agent_address}
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-sm font-mono"
                    readOnly
                  />
                  <Badge className="bg-green-500/20 text-green-300">Connected</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Your unique Fetch.AI agent identifier for autonomous scheduling
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Timezone</label>
                <select
                  value={userData.timezone}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                >
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>

              <div className="flex space-x-2 pt-4">
                <Button className="bg-gradient-to-r from-primary to-blue-500">Save Changes</Button>
                <Button variant="outline">Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notifications Settings */}
        {activeSection === "notifications" && (
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Notification Preferences</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Email Notifications</h4>
                    <p className="text-sm text-muted-foreground">Receive updates via email</p>
                  </div>
                  <Switch
                    checked={preferences.notifications.email_notifications}
                    onCheckedChange={(checked) => updatePreference("notifications", "email_notifications", checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Push Notifications</h4>
                    <p className="text-sm text-muted-foreground">Browser and mobile notifications</p>
                  </div>
                  <Switch
                    checked={preferences.notifications.push_notifications}
                    onCheckedChange={(checked) => updatePreference("notifications", "push_notifications", checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Negotiation Updates</h4>
                    <p className="text-sm text-muted-foreground">Real-time agent negotiation progress</p>
                  </div>
                  <Switch
                    checked={preferences.notifications.negotiation_updates}
                    onCheckedChange={(checked) => updatePreference("notifications", "negotiation_updates", checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Meeting Reminders</h4>
                    <p className="text-sm text-muted-foreground">Upcoming meeting notifications</p>
                  </div>
                  <Switch
                    checked={preferences.notifications.meeting_reminders}
                    onCheckedChange={(checked) => updatePreference("notifications", "meeting_reminders", checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Daily Summary</h4>
                    <p className="text-sm text-muted-foreground">End-of-day scheduling summary</p>
                  </div>
                  <Switch
                    checked={preferences.notifications.daily_summary}
                    onCheckedChange={(checked) => updatePreference("notifications", "daily_summary", checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Weekly Report</h4>
                    <p className="text-sm text-muted-foreground">Weekly agent performance report</p>
                  </div>
                  <Switch
                    checked={preferences.notifications.weekly_report}
                    onCheckedChange={(checked) => updatePreference("notifications", "weekly_report", checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Voice Settings */}
        {activeSection === "voice" && (
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mic className="h-5 w-5" />
                <span>Voice Interface Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Voice Interface</h4>
                    <p className="text-sm text-muted-foreground">Enable voice-first scheduling</p>
                  </div>
                  <Switch
                    checked={preferences.voice.voice_enabled}
                    onCheckedChange={(checked) => updatePreference("voice", "voice_enabled", checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Auto Transcription</h4>
                    <p className="text-sm text-muted-foreground">Automatically transcribe voice input</p>
                  </div>
                  <Switch
                    checked={preferences.voice.auto_transcription}
                    onCheckedChange={(checked) => updatePreference("voice", "auto_transcription", checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Voice Commands</h4>
                    <p className="text-sm text-muted-foreground">Enable voice command shortcuts</p>
                  </div>
                  <Switch
                    checked={preferences.voice.voice_commands}
                    onCheckedChange={(checked) => updatePreference("voice", "voice_commands", checked)}
                  />
                </div>

                <Separator />

                <div>
                  <label className="text-sm font-medium mb-2 block">Preferred Language</label>
                  <select
                    value={preferences.voice.preferred_language}
                    onChange={(e) => updatePreference("voice", "preferred_language", e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                  >
                    <option value="en-US">English (US)</option>
                    <option value="en-GB">English (UK)</option>
                    <option value="es-ES">Spanish</option>
                    <option value="fr-FR">French</option>
                    <option value="de-DE">German</option>
                  </select>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Voice Feedback</h4>
                    <p className="text-sm text-muted-foreground">Agent speaks responses aloud</p>
                  </div>
                  <Switch
                    checked={preferences.voice.voice_feedback}
                    onCheckedChange={(checked) => updatePreference("voice", "voice_feedback", checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Calendar Settings */}
        {activeSection === "calendar" && (
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Calendar Preferences</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">Default Meeting Duration</label>
                  <select
                    value={preferences.calendar.default_meeting_duration}
                    onChange={(e) =>
                      updatePreference("calendar", "default_meeting_duration", Number.parseInt(e.target.value))
                    }
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                    <option value={120}>2 hours</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Buffer Time</label>
                  <select
                    value={preferences.calendar.buffer_time}
                    onChange={(e) => updatePreference("calendar", "buffer_time", Number.parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                  >
                    <option value={0}>No buffer</option>
                    <option value={5}>5 minutes</option>
                    <option value={10}>10 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                  </select>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-4">Work Hours</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Start Time</label>
                    <input
                      type="time"
                      value={preferences.calendar.work_hours_start}
                      onChange={(e) => updatePreference("calendar", "work_hours_start", e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">End Time</label>
                    <input
                      type="time"
                      value={preferences.calendar.work_hours_end}
                      onChange={(e) => updatePreference("calendar", "work_hours_end", e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-4">Lunch Break</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Start Time</label>
                    <input
                      type="time"
                      value={preferences.calendar.lunch_break_start}
                      onChange={(e) => updatePreference("calendar", "lunch_break_start", e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">End Time</label>
                    <input
                      type="time"
                      value={preferences.calendar.lunch_break_end}
                      onChange={(e) => updatePreference("calendar", "lunch_break_end", e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Weekend Availability</h4>
                  <p className="text-sm text-muted-foreground">Allow meetings on weekends</p>
                </div>
                <Switch
                  checked={preferences.calendar.weekend_availability}
                  onCheckedChange={(checked) => updatePreference("calendar", "weekend_availability", checked)}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Privacy Settings */}
        {activeSection === "privacy" && (
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Privacy & Security</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Share Availability</h4>
                    <p className="text-sm text-muted-foreground">Allow others to see your free/busy status</p>
                  </div>
                  <Switch
                    checked={preferences.privacy.share_availability}
                    onCheckedChange={(checked) => updatePreference("privacy", "share_availability", checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Share Preferences</h4>
                    <p className="text-sm text-muted-foreground">Share your scheduling preferences with other agents</p>
                  </div>
                  <Switch
                    checked={preferences.privacy.share_preferences}
                    onCheckedChange={(checked) => updatePreference("privacy", "share_preferences", checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Anonymous Feedback</h4>
                    <p className="text-sm text-muted-foreground">Help improve the platform with anonymous usage data</p>
                  </div>
                  <Switch
                    checked={preferences.privacy.anonymous_feedback}
                    onCheckedChange={(checked) => updatePreference("privacy", "anonymous_feedback", checked)}
                  />
                </div>

                <Separator />

                <div>
                  <label className="text-sm font-medium mb-2 block">Data Retention</label>
                  <select
                    value={preferences.privacy.data_retention_days}
                    onChange={(e) =>
                      updatePreference("privacy", "data_retention_days", Number.parseInt(e.target.value))
                    }
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
                  >
                    <option value={30}>30 days</option>
                    <option value={60}>60 days</option>
                    <option value={90}>90 days</option>
                    <option value={180}>6 months</option>
                    <option value={365}>1 year</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    How long to keep your negotiation history and voice data
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Appearance Settings */}
        {activeSection === "appearance" && (
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="h-5 w-5" />
                <span>Appearance & Theme</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Theme</label>
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    variant={preferences.appearance.theme === "light" ? "default" : "outline"}
                    onClick={() => updatePreference("appearance", "theme", "light")}
                    className="flex flex-col items-center p-4 h-auto"
                  >
                    <div className="w-8 h-8 bg-white border border-gray-300 rounded mb-2"></div>
                    <span className="text-xs">Light</span>
                  </Button>
                  <Button
                    variant={preferences.appearance.theme === "dark" ? "default" : "outline"}
                    onClick={() => updatePreference("appearance", "theme", "dark")}
                    className="flex flex-col items-center p-4 h-auto"
                  >
                    <div className="w-8 h-8 bg-gray-900 border border-gray-600 rounded mb-2"></div>
                    <span className="text-xs">Dark</span>
                  </Button>
                  <Button
                    variant={preferences.appearance.theme === "auto" ? "default" : "outline"}
                    onClick={() => updatePreference("appearance", "theme", "auto")}
                    className="flex flex-col items-center p-4 h-auto"
                  >
                    <div className="w-8 h-8 bg-gradient-to-r from-white to-gray-900 border border-gray-400 rounded mb-2"></div>
                    <span className="text-xs">Auto</span>
                  </Button>
                </div>
              </div>

              <Separator />

              <div>
                <label className="text-sm font-medium mb-2 block">Accent Color</label>
                <div className="grid grid-cols-4 gap-3">
                  {["purple", "blue", "green", "orange"].map((color) => (
                    <Button
                      key={color}
                      variant={preferences.appearance.accent_color === color ? "default" : "outline"}
                      onClick={() => updatePreference("appearance", "accent_color", color)}
                      className="flex flex-col items-center p-4 h-auto"
                    >
                      <div
                        className={`w-8 h-8 rounded mb-2 ${
                          color === "purple"
                            ? "bg-purple-500"
                            : color === "blue"
                              ? "bg-blue-500"
                              : color === "green"
                                ? "bg-green-500"
                                : "bg-orange-500"
                        }`}
                      ></div>
                      <span className="text-xs capitalize">{color}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Compact View</h4>
                    <p className="text-sm text-muted-foreground">Use smaller spacing and components</p>
                  </div>
                  <Switch
                    checked={preferences.appearance.compact_view}
                    onCheckedChange={(checked) => updatePreference("appearance", "compact_view", checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Animations</h4>
                    <p className="text-sm text-muted-foreground">Enable smooth transitions and effects</p>
                  </div>
                  <Switch
                    checked={preferences.appearance.animations}
                    onCheckedChange={(checked) => updatePreference("appearance", "animations", checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Save Button */}
        <div className="flex justify-end space-x-2">
          <Button variant="outline">Reset All Settings</Button>
          <Button className="bg-gradient-to-r from-primary to-blue-500">Save All Changes</Button>
        </div>
      </div>
    </div>
  )
}
