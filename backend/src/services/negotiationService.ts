import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import { addDays, addHours, format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { logger } from '../utils/logger';

export interface TimeSlot {
  start_time: string;
  end_time: string;
  duration_minutes: number;
  quality_score: number;
  day_of_week: string;
  date_formatted: string;
  time_formatted: string;
}

export interface MeetingRequest {
  title: string;
  preferred_date: string;
  preferred_time: string;
  duration_minutes: number;
  participants?: string[];
  meeting_type?: string;
  priority?: string;
}

export interface NegotiationResult {
  success: boolean;
  meeting_request: MeetingRequest;
  available_slots: TimeSlot[];
  total_slots_found: number;
  search_window: {
    start: string;
    end: string;
  };
  selected_slot?: TimeSlot;
  meeting_id?: string;
  message: string;
  timestamp: string;
  negotiation_id?: string;
}

export class NegotiationService {
  constructor(
    private prisma: PrismaClient,
    private io: Server
  ) {}

  async findAvailableSlots(
    meetingRequest: MeetingRequest,
    searchDays: number = 14
  ): Promise<TimeSlot[]> {
    const startDate = new Date(meetingRequest.preferred_date);
    const endDate = addDays(startDate, searchDays);
    
    const availableSlots: TimeSlot[] = [];
    
    // Get all agents
    const agents = await this.prisma.agent.findMany({
      where: { isActive: true }
    });

    // Get calendar blocks for all agents in the search window
    const calendarBlocks = await this.prisma.calendarBlock.findMany({
      where: {
        startTime: {
          gte: startOfDay(startDate),
          lte: endOfDay(endDate)
        }
      }
    });

    // Generate potential time slots
    for (let day = 0; day < searchDays; day++) {
      const currentDate = addDays(startDate, day);
      const dayOfWeek = format(currentDate, 'EEEE').toLowerCase();
      
      // Skip weekends for now (can be made configurable)
      if (dayOfWeek === 'saturday' || dayOfWeek === 'sunday') {
        continue;
      }

      // Check each hour from 9 AM to 5 PM
      for (let hour = 9; hour < 17; hour++) {
        const slotStart = new Date(currentDate);
        slotStart.setHours(hour, 0, 0, 0);
        
        const slotEnd = addHours(slotStart, meetingRequest.duration_minutes / 60);
        
        // Check if all agents are available
        const isSlotAvailable = agents.every(agent => {
          return !calendarBlocks.some(block => {
            const blockStart = new Date(block.startTime);
            const blockEnd = new Date(block.endTime);
            
            return (
              block.userId === agent.userId &&
              (
                isWithinInterval(slotStart, { start: blockStart, end: blockEnd }) ||
                isWithinInterval(slotEnd, { start: blockStart, end: blockEnd }) ||
                (slotStart <= blockStart && slotEnd >= blockEnd)
              )
            );
          });
        });

        if (isSlotAvailable) {
          const qualityScore = this.calculateSlotQuality(slotStart, meetingRequest, agents);
          
          availableSlots.push({
            start_time: slotStart.toISOString(),
            end_time: slotEnd.toISOString(),
            duration_minutes: meetingRequest.duration_minutes,
            quality_score: qualityScore,
            day_of_week: dayOfWeek,
            date_formatted: format(slotStart, 'MMMM do, yyyy'),
            time_formatted: format(slotStart, 'h:mm a')
          });
        }
      }
    }

    // Sort by quality score (highest first)
    return availableSlots
      .sort((a, b) => b.quality_score - a.quality_score)
      .slice(0, 10); // Return top 10 slots
  }

  private calculateSlotQuality(
    slotStart: Date,
    meetingRequest: MeetingRequest,
    agents: any[]
  ): number {
    let score = 0.5; // Base score
    
    // Prefer requested time/date
    const preferredDate = new Date(meetingRequest.preferred_date);
    const preferredTime = meetingRequest.preferred_time;
    
    if (format(slotStart, 'yyyy-MM-dd') === format(preferredDate, 'yyyy-MM-dd')) {
      score += 0.3; // Same date bonus
    }
    
    if (preferredTime) {
      const [prefHour, prefMinute] = preferredTime.split(':').map(Number);
      const slotHour = slotStart.getHours();
      const hourDiff = Math.abs(slotHour - prefHour);
      
      if (hourDiff === 0) score += 0.2; // Exact time match
      else if (hourDiff === 1) score += 0.1; // Close time match
    }
    
    // Prefer mid-week, mid-day slots
    const dayOfWeek = slotStart.getDay(); // 0 = Sunday
    if (dayOfWeek >= 2 && dayOfWeek <= 4) score += 0.1; // Tue-Thu
    
    const hour = slotStart.getHours();
    if (hour >= 10 && hour <= 14) score += 0.1; // 10 AM - 2 PM
    
    return Math.min(score, 1.0);
  }

  async negotiateMeeting(meetingRequest: MeetingRequest): Promise<NegotiationResult> {
    try {
      logger.info('Starting meeting negotiation', { meetingRequest });

      // Find available slots
      const availableSlots = await this.findAvailableSlots(meetingRequest);
      
      if (availableSlots.length === 0) {
        return {
          success: false,
          meeting_request: meetingRequest,
          available_slots: [],
          total_slots_found: 0,
          search_window: {
            start: meetingRequest.preferred_date,
            end: format(addDays(new Date(meetingRequest.preferred_date), 14), 'yyyy-MM-dd')
          },
          message: 'No available time slots found in the specified timeframe',
          timestamp: new Date().toISOString()
        };
      }

      // Check if there are conflicts with the preferred slot
      const preferredSlot = availableSlots.find(slot => {
        const slotDate = format(new Date(slot.start_time), 'yyyy-MM-dd');
        const slotTime = format(new Date(slot.start_time), 'HH:mm');
        
        return slotDate === meetingRequest.preferred_date && 
               slotTime === meetingRequest.preferred_time;
      });

      if (preferredSlot) {
        // No conflicts, can schedule directly
        return {
          success: true,
          meeting_request: meetingRequest,
          available_slots: availableSlots,
          total_slots_found: availableSlots.length,
          search_window: {
            start: meetingRequest.preferred_date,
            end: format(addDays(new Date(meetingRequest.preferred_date), 14), 'yyyy-MM-dd')
          },
          selected_slot: preferredSlot,
          message: 'Meeting can be scheduled at the preferred time',
          timestamp: new Date().toISOString()
        };
      } else {
        // Return available alternatives
        return {
          success: false,
          meeting_request: meetingRequest,
          available_slots: availableSlots,
          total_slots_found: availableSlots.length,
          search_window: {
            start: meetingRequest.preferred_date,
            end: format(addDays(new Date(meetingRequest.preferred_date), 14), 'yyyy-MM-dd')
          },
          message: 'Preferred time not available. Here are some alternatives.',
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      logger.error('Negotiation failed', error);
      throw error;
    }
  }

  // Simplified version without AI negotiation for initial implementation

  async scheduleMeeting(
    meetingRequest: MeetingRequest,
    selectedSlot: TimeSlot
  ): Promise<NegotiationResult> {
    try {
      // Create meeting record
      const meeting = await this.prisma.meeting.create({
        data: {
          title: meetingRequest.title,
          durationMinutes: meetingRequest.duration_minutes,
          preferredStartTime: new Date(meetingRequest.preferred_date + 'T' + meetingRequest.preferred_time),
          preferredEndTime: new Date(selectedSlot.end_time),
          finalStartTime: new Date(selectedSlot.start_time),
          finalEndTime: new Date(selectedSlot.end_time),
          status: 'SCHEDULED',
          organizerId: 'cmg3232xu0000xafxrru38zte' // Default to Alice for demo
        }
      });

      // Block time in all agent calendars
      const agents = await this.prisma.agent.findMany({
        where: { isActive: true }
      });

      for (const agent of agents) {
        await this.prisma.calendarBlock.create({
          data: {
            userId: agent.userId,
            title: meetingRequest.title,
            startTime: new Date(selectedSlot.start_time),
            endTime: new Date(selectedSlot.end_time),
            blockType: 'BUSY',
            priority: 3,
            isFlexible: false
          }
        });
      }

      logger.info('Meeting scheduled successfully', {
        meetingId: meeting.id,
        startTime: selectedSlot.start_time
      });

      return {
        success: true,
        meeting_request: meetingRequest,
        available_slots: [selectedSlot],
        total_slots_found: 1,
        search_window: {
          start: meetingRequest.preferred_date,
          end: meetingRequest.preferred_date
        },
        selected_slot: selectedSlot,
        meeting_id: meeting.id,
        message: 'Meeting scheduled successfully',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Failed to schedule meeting', error);
      throw error;
    }
  }

  async getMeetings(): Promise<any> {
    const meetings = await this.prisma.meeting.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return {
      success: true,
      meetings: meetings,
      total_meetings: meetings.length,
      timestamp: new Date().toISOString()
    };
  }

  async getUserCalendar(userId: string): Promise<any> {
    const calendarBlocks = await this.prisma.calendarBlock.findMany({
      where: { userId: userId },
      orderBy: { startTime: 'asc' }
    });

    return {
      success: true,
      user_id: userId,
      calendar_blocks: calendarBlocks,
      total_blocks: calendarBlocks.length,
      timestamp: new Date().toISOString()
    };
  }
}
