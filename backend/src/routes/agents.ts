import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// GET /agents - Get all agents
router.get('/', async (req: Request, res: Response) => {
  try {
    const agents = await prisma.agent.findMany({
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
        createdAt: 'desc'
      }
    });

    // Parse JSON fields for response
    const agentsWithParsedData = agents.map(agent => ({
      ...agent,
      priority: JSON.parse(agent.priorityData || '[]'),
      config: JSON.parse(agent.config || '{}')
    }));

    res.json({
      success: true,
      agents: agentsWithParsedData,
      total_agents: agents.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to fetch agents', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agents'
    });
  }
});

// GET /agents/:id - Get specific agent
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const agent = await prisma.agent.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        negotiations: {
          include: {
            negotiation: {
              include: {
                meeting: true
              }
            }
          },
          orderBy: {
            timestamp: 'desc'
          },
          take: 10 // Last 10 negotiations
        }
      }
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    // Parse JSON fields
    const agentWithParsedData = {
      ...agent,
      priority: JSON.parse(agent.priorityData || '[]'),
      config: JSON.parse(agent.config || '{}')
    };

    res.json({
      success: true,
      agent: agentWithParsedData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to fetch agent', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agent'
    });
  }
});

// POST /agents - Create new agent
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      userId,
      name,
      personality = 'Balanced',
      flexibility = 5,
      priority = [],
      config = {},
      isActive = true
    } = req.body;

    if (!userId || !name) {
      return res.status(400).json({
        success: false,
        error: 'userId and name are required'
      });
    }

    // Check if user already has an agent
    const existingAgent = await prisma.agent.findUnique({
      where: { userId }
    });

    if (existingAgent) {
      return res.status(409).json({
        success: false,
        error: 'User already has an agent'
      });
    }

    const agent = await prisma.agent.create({
      data: {
        userId,
        name,
        personality,
        flexibility,
        priorityData: JSON.stringify(priority),
        config: JSON.stringify(config),
        isActive,
        status: 'IDLE'
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

    // Parse JSON fields for response
    const agentWithParsedData = {
      ...agent,
      priority: JSON.parse(agent.priorityData || '[]'),
      config: JSON.parse(agent.config || '{}')
    };

    logger.info('Agent created', { agentId: agent.id, userId, name });

    res.status(201).json({
      success: true,
      agent: agentWithParsedData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to create agent', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create agent'
    });
  }
});

// PUT /agents/:id - Update agent
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Convert arrays/objects to JSON strings
    if (updateData.priority) {
      updateData.priorityData = JSON.stringify(updateData.priority);
      delete updateData.priority;
    }
    if (updateData.config) {
      updateData.config = JSON.stringify(updateData.config);
    }

    const agent = await prisma.agent.update({
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

    // Parse JSON fields for response
    const agentWithParsedData = {
      ...agent,
      priority: JSON.parse(agent.priorityData || '[]'),
      config: JSON.parse(agent.config || '{}')
    };

    logger.info('Agent updated', { agentId: id });

    res.json({
      success: true,
      agent: agentWithParsedData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to update agent', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update agent'
    });
  }
});

// DELETE /agents/:id - Delete agent
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.agent.delete({
      where: { id }
    });

    logger.info('Agent deleted', { agentId: id });

    res.json({
      success: true,
      message: 'Agent deleted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to delete agent', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete agent'
    });
  }
});

// GET /agents/:id/status - Get agent status
router.get('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const agent = await prisma.agent.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        status: true,
        currentTask: true,
        isActive: true,
        updatedAt: true
      }
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    res.json({
      success: true,
      agent_status: agent,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to get agent status', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get agent status'
    });
  }
});

// POST /agents/:id/status - Update agent status
router.post('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, currentTask } = req.body;

    const validStatuses = ['IDLE', 'ACTIVE', 'NEGOTIATING', 'SCHEDULING', 'ERROR'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Valid values: ${validStatuses.join(', ')}`
      });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (currentTask !== undefined) updateData.currentTask = currentTask;

    const agent = await prisma.agent.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        status: true,
        currentTask: true,
        isActive: true,
        updatedAt: true
      }
    });

    // Emit real-time status update
    global.io.emit('agent-status-update', {
      agent_id: id,
      status: agent.status,
      current_task: agent.currentTask,
      timestamp: new Date().toISOString()
    });

    logger.info('Agent status updated', { agentId: id, status, currentTask });

    res.json({
      success: true,
      agent_status: agent,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to update agent status', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update agent status'
    });
  }
});

export default router;
