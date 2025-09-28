import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// GET /meetings - Get all meetings
router.get('/', async (req: Request, res: Response) => {
  try {
    const meetings = await prisma.meeting.findMany({
      include: {
        organizer: true,
        participants: {
          include: {
            user: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      meetings: meetings,
      total_meetings: meetings.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to fetch meetings', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch meetings'
    });
  }
});

// GET /meetings/:id - Get specific meeting
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        organizer: true,
        participants: {
          include: {
            user: true
          }
        },
        negotiation: {
          include: {
            messages: {
              include: {
                fromAgent: true
              }
            }
          }
        }
      }
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found'
      });
    }

    res.json({
      success: true,
      meeting: meeting,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to fetch meeting', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch meeting'
    });
  }
});

// POST /meetings - Create new meeting
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      organizerId,
      preferredStartTime,
      preferredEndTime,
      durationMinutes,
      priority = 5,
      participants = []
    } = req.body;

    // Create the meeting
    const meeting = await prisma.meeting.create({
      data: {
        title,
        description,
        organizerId,
        preferredStartTime: preferredStartTime ? new Date(preferredStartTime) : null,
        preferredEndTime: preferredEndTime ? new Date(preferredEndTime) : null,
        durationMinutes,
        priority,
        status: 'PENDING'
      }
    });

    // Add participants
    if (participants.length > 0) {
      await prisma.meetingParticipant.createMany({
        data: participants.map((userId: string) => ({
          meetingId: meeting.id,
          userId,
          status: 'INVITED'
        }))
      });
    }

    // Fetch the complete meeting data
    const completeMeeting = await prisma.meeting.findUnique({
      where: { id: meeting.id },
      include: {
        organizer: true,
        participants: {
          include: {
            user: true
          }
        }
      }
    });

    logger.info('Meeting created', { meetingId: meeting.id, title });

    res.status(201).json({
      success: true,
      meeting: completeMeeting,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to create meeting', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create meeting'
    });
  }
});

// PUT /meetings/:id - Update meeting
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    
    // Convert date strings to Date objects
    if (updateData.preferredStartTime) {
      updateData.preferredStartTime = new Date(updateData.preferredStartTime);
    }
    if (updateData.preferredEndTime) {
      updateData.preferredEndTime = new Date(updateData.preferredEndTime);
    }
    if (updateData.finalStartTime) {
      updateData.finalStartTime = new Date(updateData.finalStartTime);
    }
    if (updateData.finalEndTime) {
      updateData.finalEndTime = new Date(updateData.finalEndTime);
    }

    const meeting = await prisma.meeting.update({
      where: { id },
      data: updateData,
      include: {
        organizer: true,
        participants: {
          include: {
            user: true
          }
        }
      }
    });

    logger.info('Meeting updated', { meetingId: id });

    res.json({
      success: true,
      meeting: meeting,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to update meeting', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update meeting'
    });
  }
});

// DELETE /meetings/:id - Delete meeting
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.meeting.delete({
      where: { id }
    });

    logger.info('Meeting deleted', { meetingId: id });

    res.json({
      success: true,
      message: 'Meeting deleted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to delete meeting', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete meeting'
    });
  }
});

export default router;
