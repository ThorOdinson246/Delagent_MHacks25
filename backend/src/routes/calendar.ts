import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// GET /calendar - Get all calendar blocks with optional filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const { userId, start, end, limit = '50' } = req.query;

    let whereClause: any = {};

    // Add user filter if provided
    if (userId) {
      whereClause.userId = userId as string;
    }

    // Add date range filter if provided
    if (start || end) {
      whereClause.startTime = {};
      if (start) {
        whereClause.startTime.gte = new Date(start as string);
      }
      if (end) {
        whereClause.startTime.lte = new Date(end as string);
      }
    }

    const calendarBlocks = await prisma.calendarBlock.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      },
      take: parseInt(limit as string)
    });

    res.json({
      success: true,
      calendar_blocks: calendarBlocks,
      total_blocks: calendarBlocks.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching calendar blocks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch calendar blocks'
    });
  }
});

// GET /calendar/:userId - Get user's calendar
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { start, end } = req.query;

    let whereClause: any = { userId };

    // Add date range filter if provided
    if (start || end) {
      whereClause.startTime = {};
      if (start) {
        whereClause.startTime.gte = new Date(start as string);
      }
      if (end) {
        whereClause.startTime.lte = new Date(end as string);
      }
    }

    const calendarBlocks = await prisma.calendarBlock.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    res.json({
      success: true,
      user_id: userId,
      calendar_blocks: calendarBlocks,
      total_blocks: calendarBlocks.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to fetch calendar', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch calendar'
    });
  }
});

// POST /calendar - Create new calendar block
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      userId,
      title,
      description,
      startTime,
      endTime,
      blockType = 'BUSY',
      priority = 5,
      isFlexible = false,
      source = 'manual'
    } = req.body;

    const calendarBlock = await prisma.calendarBlock.create({
      data: {
        userId,
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        blockType,
        priority,
        isFlexible,
        source
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    logger.info('Calendar block created', { 
      blockId: calendarBlock.id, 
      userId, 
      title 
    });

    res.status(201).json({
      success: true,
      calendar_block: calendarBlock,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to create calendar block', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create calendar block'
    });
  }
});

// PUT /calendar/:id - Update calendar block
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Convert date strings to Date objects
    if (updateData.startTime) {
      updateData.startTime = new Date(updateData.startTime);
    }
    if (updateData.endTime) {
      updateData.endTime = new Date(updateData.endTime);
    }

    const calendarBlock = await prisma.calendarBlock.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    logger.info('Calendar block updated', { blockId: id });

    res.json({
      success: true,
      calendar_block: calendarBlock,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to update calendar block', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update calendar block'
    });
  }
});

// DELETE /calendar/:id - Delete calendar block
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.calendarBlock.delete({
      where: { id }
    });

    logger.info('Calendar block deleted', { blockId: id });

    res.json({
      success: true,
      message: 'Calendar block deleted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to delete calendar block', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete calendar block'
    });
  }
});

// GET /calendar/:userId/availability - Check availability
router.get('/:userId/availability', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { start, end, duration = '60' } = req.query;

    if (!start || !end) {
      return res.status(400).json({
        success: false,
        error: 'Start and end date/time are required'
      });
    }

    const startTime = new Date(start as string);
    const endTime = new Date(end as string);
    const durationMinutes = parseInt(duration as string);

    // Get all calendar blocks in the time range
    const busyBlocks = await prisma.calendarBlock.findMany({
      where: {
        userId,
        blockType: 'BUSY',
        OR: [
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } }
            ]
          },
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } }
            ]
          },
          {
            AND: [
              { startTime: { gte: startTime } },
              { endTime: { lte: endTime } }
            ]
          }
        ]
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    // Calculate available time slots
    const availableSlots: Array<{
      start_time: string;
      end_time: string;
      duration_minutes: number;
    }> = [];
    let currentTime = new Date(startTime);

    while (currentTime < endTime) {
      const slotEnd = new Date(currentTime.getTime() + durationMinutes * 60000);
      
      if (slotEnd <= endTime) {
        // Check if this slot conflicts with any busy block
        const hasConflict = busyBlocks.some(block => {
          const blockStart = new Date(block.startTime);
          const blockEnd = new Date(block.endTime);
          
          return (
            (currentTime >= blockStart && currentTime < blockEnd) ||
            (slotEnd > blockStart && slotEnd <= blockEnd) ||
            (currentTime <= blockStart && slotEnd >= blockEnd)
          );
        });

        if (!hasConflict) {
          availableSlots.push({
            start_time: currentTime.toISOString(),
            end_time: slotEnd.toISOString(),
            duration_minutes: durationMinutes
          });
        }
      }
      
      // Move to next slot (30-minute intervals)
      currentTime = new Date(currentTime.getTime() + 30 * 60000);
    }

    res.json({
      success: true,
      user_id: userId,
      search_window: {
        start: startTime.toISOString(),
        end: endTime.toISOString()
      },
      available_slots: availableSlots,
      busy_blocks: busyBlocks,
      total_available_slots: availableSlots.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to check availability', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check availability'
    });
  }
});

export default router;
