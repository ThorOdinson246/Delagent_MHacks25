import { Router, Request, Response } from 'express';
import { NegotiationService } from '../services/negotiationService';
import { geminiService } from '../services/geminiService';
import { ttsService } from '../services/ttsService';
import { logger } from '../utils/logger';

const router = Router();

// POST /negotiate - Analyze meeting request and find available slots
router.post('/', async (req: Request, res: Response) => {
  try {
    const meetingRequest = req.body;
    
    // Validate required fields
    if (!meetingRequest.title || !meetingRequest.preferred_date || !meetingRequest.duration_minutes) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, preferred_date, duration_minutes'
      });
    }

    logger.info('Starting meeting negotiation', { meetingRequest });

    // Use global negotiation service
    const negotiationService = global.negotiationService;
    const result = await negotiationService.negotiateMeeting(meetingRequest);

    res.json(result);

  } catch (error) {
    logger.error('Negotiation failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to negotiate meeting',
      message: 'An error occurred while processing the meeting request'
    });
  }
});

// POST /schedule - Schedule meeting with selected slot
router.post('/', async (req: Request, res: Response) => {
  try {
    const meetingRequest = req.body;
    const slotIndex = parseInt(req.query.slot_index as string) || 0;

    if (!meetingRequest.title || !meetingRequest.preferred_date || !meetingRequest.duration_minutes) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, preferred_date, duration_minutes'
      });
    }

    logger.info('Scheduling meeting', { meetingRequest, slotIndex });

    // First, get available slots
    const negotiationService = global.negotiationService;
    const negotiationResult = await negotiationService.negotiateMeeting(meetingRequest);

    if (!negotiationResult.success || negotiationResult.available_slots.length === 0) {
      return res.json({
        success: false,
        message: 'No available time slots found',
        meeting_request: meetingRequest,
        available_slots: [],
        total_slots_found: 0,
        timestamp: new Date().toISOString()
      });
    }

    // Select the slot
    const selectedSlot = negotiationResult.available_slots[slotIndex];
    if (!selectedSlot) {
      return res.status(400).json({
        success: false,
        error: `Slot index ${slotIndex} not found. Available slots: 0-${negotiationResult.available_slots.length - 1}`
      });
    }

    // Schedule the meeting
    const result = await negotiationService.scheduleMeeting(meetingRequest, selectedSlot);

    // Generate TTS feedback
    if (result.success) {
      const ttsResponse = await ttsService.generateMeetingFeedback(result);
      
      if (ttsResponse.success) {
        // Emit TTS audio to connected clients
        global.io.emit('meeting-scheduled-audio', {
          meeting_id: result.meeting_id,
          audio_data: ttsResponse.audio_data?.toString('base64')
        });
      }
    }

    res.json(result);

  } catch (error) {
    logger.error('Scheduling failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to schedule meeting',
      message: 'An error occurred while scheduling the meeting'
    });
  }
});

// POST /negotiate/start - Start a new negotiation session (alias for /)
router.post('/start', async (req: Request, res: Response) => {
  try {
    const { meeting_request } = req.body;
    
    // Validate required fields
    if (!meeting_request || !meeting_request.title || !meeting_request.preferred_date || !meeting_request.duration_minutes) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields in meeting_request: title, preferred_date, duration_minutes'
      });
    }

    logger.info('Starting new negotiation session', { meeting_request });

    // Use global negotiation service
    const negotiationService = global.negotiationService;
    const result = await negotiationService.negotiateMeeting(meeting_request);

    // Add negotiation session metadata
    const response = {
      ...result,
      negotiation_id: `neg_${Date.now()}`,
      session_started: new Date().toISOString(),
      status: 'in_progress'
    };

    res.json(response);

  } catch (error) {
    logger.error('Failed to start negotiation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start negotiation session'
    });
  }
});

// GET /negotiate/:id - Get negotiation details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const prisma = global.prisma;
    const negotiation = await prisma.negotiation.findUnique({
      where: { id },
      include: {
        meeting: {
          include: {
            organizer: true,
            participants: {
              include: {
                user: true
              }
            }
          }
        },
        messages: {
          include: {
            fromAgent: true
          },
          orderBy: {
            timestamp: 'asc'
          }
        }
      }
    });

    if (!negotiation) {
      return res.status(404).json({
        success: false,
        error: 'Negotiation not found'
      });
    }

    res.json({
      success: true,
      negotiation: negotiation,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to fetch negotiation', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch negotiation'
    });
  }
});

// GET /negotiate/:id/summary - Get negotiation summary
router.get('/:id/summary', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const prisma = global.prisma;
    const negotiation = await prisma.negotiation.findUnique({
      where: { id },
      include: {
        messages: {
          include: {
            fromAgent: true
          },
          orderBy: {
            timestamp: 'asc'
          }
        }
      }
    });

    if (!negotiation) {
      return res.status(404).json({
        success: false,
        error: 'Negotiation not found'
      });
    }

    // Generate human-readable summary using Gemini
    const summary = await geminiService.generateNegotiationSummary(negotiation.messages);

    res.json({
      success: true,
      negotiation_id: id,
      summary: summary,
      status: negotiation.status,
      total_messages: negotiation.messages.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to generate negotiation summary', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate negotiation summary'
    });
  }
});

export default router;
