export interface MeetingRequest {
  title: string
  preferred_date: string // YYYY-MM-DD format
  preferred_time: string // HH:MM format
  duration_minutes: number
}

export interface TimeSlot {
  start_time: string
  end_time: string
  duration_minutes: number
  quality_score: number
  day_of_week: string
  date_formatted: string
  time_formatted: string
  explanation?: string
}

export interface NegotiationResult {
  success: boolean
  meeting_request: MeetingRequest
  available_slots: TimeSlot[]
  total_slots_found: number
  search_window: {
    start: string
    end: string
  }
  selected_slot?: TimeSlot
  meeting_id?: string
  message: string
  timestamp: string
}

export interface Meeting {
  id: string
  title: string
  duration_minutes: number
  preferred_start_time: string
  preferred_end_time: string
  status: string
  final_scheduled_time?: string
  created_at: string
}

export interface CalendarBlock {
  id: string
  user_id: string
  title: string
  start_time: string
  end_time: string
  block_type: string
  priority_level: number
  is_flexible: boolean
  created_at: string
}

const API_BASE_URL = "http://localhost:8000"

class ApiService {
  private async fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Health check
  async healthCheck() {
    return this.fetchApi<{
      status: string
      database_connected: boolean
      timestamp: string
    }>("/api/health")
  }

  // Get all meetings
  async getMeetings() {
    return this.fetchApi<{
      success: boolean
      meetings: Meeting[]
      total_meetings: number
      timestamp: string
    }>("/api/meetings")
  }

  // Get user calendar
  async getUserCalendar(userId: "bob" | "alice") {
    return this.fetchApi<{
      success: boolean
      user_id: string
      calendar_blocks: CalendarBlock[]
      total_blocks: number
      timestamp: string
    }>(`/api/calendar/${userId}`)
  }

  // Negotiate meeting (find available slots)
  async negotiateMeeting(request: MeetingRequest): Promise<NegotiationResult> {
    return this.fetchApi<NegotiationResult>("/api/negotiate", {
      method: "POST",
      body: JSON.stringify(request),
    })
  }

  // Schedule meeting
  async scheduleMeeting(request: MeetingRequest, slotIndex = 0): Promise<NegotiationResult> {
    return this.fetchApi<NegotiationResult>(`/api/schedule?slot_index=${slotIndex}`, {
      method: "POST",
      body: JSON.stringify(request),
    })
  }
}

export const apiService = new ApiService()
