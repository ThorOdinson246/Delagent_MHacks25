import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { geminiService } from '../services/geminiService';
import { ttsService } from '../services/ttsService';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// POST /voice/extract - Extract meeting details from voice input
router.post('/extract', async (req: Request, res: Response) => {
  try {
    const { transcript, userId } = req.body;

    if (!transcript) {
      return res.status(400).json({
        success: false,
        error: 'Transcript is required'
      });
    }

    logger.info('Processing voice input', { 
      transcriptLength: transcript.length,
      userId 
    });

    const startTime = Date.now();

    // Extract meeting details using Gemini
    const extractionResult = await geminiService.extractMeetingDetails(transcript);
    
    const processingTime = Date.now() - startTime;

    // Store voice interaction log
    const voiceInteraction = await prisma.voiceInteraction.create({
      data: {
        userId,
        transcript,
        extractedInfo: JSON.stringify(extractionResult.extracted_data),
        meetingRequest: extractionResult.success ? 
          JSON.stringify(extractionResult.extracted_data) : null,
        processingTime,
        confidence: extractionResult.confidence_score,
        responseText: extractionResult.reasoning
      }
    });

    logger.info('Voice processing completed', {
      interactionId: voiceInteraction.id,
      success: extractionResult.success,
      confidence: extractionResult.confidence_score,
      processingTime
    });

    res.json({
      success: true,
      interaction_id: voiceInteraction.id,
      extraction_result: extractionResult,
      processing_time_ms: processingTime,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Voice extraction failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process voice input'
    });
  }
});

// POST /voice/synthesize - Generate TTS audio from text
router.post('/synthesize', async (req: Request, res: Response) => {
  try {
    const {
      text,
      voice_id,
      speed = 1.0,
      emotion = 'neutral'
    } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }

    logger.info('Generating TTS audio', { 
      textLength: text.length,
      voiceId: voice_id,
      emotion
    });

    const ttsResult = await ttsService.generateSpeech({
      text,
      voice_id,
      speed,
      emotion
    });

    if (!ttsResult.success) {
      return res.status(500).json({
        success: false,
        error: ttsResult.error || 'Failed to generate speech'
      });
    }

    // Return audio data as base64
    res.json({
      success: true,
      audio_data: ttsResult.audio_data?.toString('base64'),
      audio_format: 'mp3',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('TTS synthesis failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to synthesize speech'
    });
  }
});

// GET /voice/voices - Get available TTS voices
router.get('/voices', async (req: Request, res: Response) => {
  try {
    const voices = ttsService.getAvailableVoices();
    
    res.json({
      success: true,
      voices: voices.map(voiceId => ({
        id: voiceId,
        name: `Voice ${voiceId.substring(0, 8)}...`,
        language: 'en-US',
        gender: 'unknown' // Cartesia doesn't provide this info by default
      })),
      total_voices: voices.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to get voices', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get available voices'
    });
  }
});

// GET /voice/interactions - Get voice interaction history
router.get('/interactions', async (req: Request, res: Response) => {
  try {
    const { userId, limit = '50', offset = '0' } = req.query;

    const whereClause = userId ? { userId: userId as string } : {};
    
    const interactions = await prisma.voiceInteraction.findMany({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });

    // Parse JSON fields for response
    const interactionsWithParsedData = interactions.map(interaction => ({
      ...interaction,
      extractedInfo: JSON.parse(interaction.extractedInfo || '{}'),
      meetingRequest: interaction.meetingRequest ? 
        JSON.parse(interaction.meetingRequest) : null
    }));

    res.json({
      success: true,
      interactions: interactionsWithParsedData,
      total_interactions: interactions.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to fetch voice interactions', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch voice interactions'
    });
  }
});

// GET /voice/interactions/:id - Get specific voice interaction
router.get('/interactions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const interaction = await prisma.voiceInteraction.findUnique({
      where: { id }
    });

    if (!interaction) {
      return res.status(404).json({
        success: false,
        error: 'Voice interaction not found'
      });
    }

    // Parse JSON fields
    const interactionWithParsedData = {
      ...interaction,
      extractedInfo: JSON.parse(interaction.extractedInfo || '{}'),
      meetingRequest: interaction.meetingRequest ? 
        JSON.parse(interaction.meetingRequest) : null
    };

    res.json({
      success: true,
      interaction: interactionWithParsedData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to fetch voice interaction', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch voice interaction'
    });
  }
});

// POST /voice/process-meeting - Complete voice-to-meeting pipeline
router.post('/process-meeting', async (req: Request, res: Response) => {
  try {
    const { transcript, userId, auto_schedule = false } = req.body;

    if (!transcript) {
      return res.status(400).json({
        success: false,
        error: 'Transcript is required'
      });
    }

    logger.info('Processing complete voice-to-meeting pipeline', { userId, autoSchedule: auto_schedule });

    // Step 1: Extract meeting details
    const extractionResult = await geminiService.extractMeetingDetails(transcript);

    if (!extractionResult.success || extractionResult.confidence_score < 0.7) {
      // Generate clarification TTS
      const clarificationText = "I couldn't quite understand all the meeting details. Could you please repeat the meeting title, date, and time?";
      const ttsResult = await ttsService.generateSpeech({
        text: clarificationText,
        emotion: 'helpful'
      });

      return res.json({
        success: false,
        extraction_result: extractionResult,
        clarification_needed: true,
        audio_response: ttsResult.success ? 
          ttsResult.audio_data?.toString('base64') : null,
        timestamp: new Date().toISOString()
      });
    }

    // Step 2: Create meeting request
    const meetingRequest = extractionResult.extracted_data;

    // Step 3: Negotiate/find slots
    const negotiationService = global.negotiationService;
    const negotiationResult = await negotiationService.negotiateMeeting(meetingRequest);

    // Step 4: Auto-schedule if requested and slots available
    let finalResult = negotiationResult;
    if (auto_schedule && negotiationResult.success && negotiationResult.available_slots.length > 0) {
      const selectedSlot = negotiationResult.available_slots[0]; // Use best slot
      finalResult = await negotiationService.scheduleMeeting(meetingRequest, selectedSlot);
    }

    // Step 5: Generate voice response
    const responseText = finalResult.success ? 
      `Great! I've found ${negotiationResult.available_slots.length} available time slots for your ${meetingRequest.title}. ${auto_schedule && finalResult.meeting_id ? 'The meeting has been scheduled successfully!' : 'Would you like me to schedule it at the first available slot?'}` :
      `I couldn't find any available time slots for your requested time. Let me suggest some alternative options.`;

    const ttsResult = await ttsService.generateSpeech({
      text: responseText,
      emotion: finalResult.success ? 'positive' : 'helpful'
    });

    // Store complete interaction
    await prisma.voiceInteraction.create({
      data: {
        userId,
        transcript,
        extractedInfo: JSON.stringify(extractionResult.extracted_data),
        meetingRequest: JSON.stringify(meetingRequest),
        processingTime: 0, // Will be calculated by the caller
        confidence: extractionResult.confidence_score,
        responseText
      }
    });

    res.json({
      success: true,
      extraction_result: extractionResult,
      negotiation_result: finalResult,
      audio_response: ttsResult.success ? 
        ttsResult.audio_data?.toString('base64') : null,
      response_text: responseText,
      meeting_scheduled: auto_schedule && finalResult.meeting_id ? true : false,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Voice-to-meeting processing failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process voice meeting request'
    });
  }
});

// POST /voice/process - Process voice input and extract meeting details (alias for /extract)
router.post('/process', async (req: Request, res: Response) => {
  try {
    const { transcript, user_id, session_id } = req.body;

    if (!transcript) {
      return res.status(400).json({
        success: false,
        error: 'Transcript is required'
      });
    }

    logger.info('Processing voice input via /process endpoint', { 
      transcriptLength: transcript.length,
      userId: user_id,
      sessionId: session_id
    });

    // Create a voice interaction record
    const voiceInteraction = await prisma.voiceInteraction.create({
      data: {
        userId: user_id,
        transcript,
        processingTime: 0,
        confidence: 0.9 // Default confidence for now
      }
    });

    const startTime = Date.now();

    // Extract meeting details using Gemini
    const extractionResult = await geminiService.extractMeetingDetails(transcript);
    
    const processingTime = Date.now() - startTime;

    // Update the voice interaction with results
    await prisma.voiceInteraction.update({
      where: { id: voiceInteraction.id },
      data: {
        processingTime,
        confidence: extractionResult.confidence_score,
        extractedInfo: JSON.stringify(extractionResult.extracted_data)
      }
    });

    res.json({
      success: true,
      interaction_id: voiceInteraction.id,
      extracted_data: extractionResult.extracted_data,
      confidence_score: extractionResult.confidence_score,
      reasoning: extractionResult.reasoning,
      processing_time_ms: processingTime,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Voice processing failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process voice input'
    });
  }
});

export default router;
