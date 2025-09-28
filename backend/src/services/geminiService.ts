import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger';

export interface MeetingExtractionResult {
  success: boolean;
  extracted_data: {
    title?: string;
    preferred_date?: string;
    preferred_time?: string;
    duration_minutes?: number;
    participants?: string[];
    meeting_type?: string;
    priority?: 'low' | 'medium' | 'high';
    description?: string;
  };
  confidence_score: number;
  reasoning: string;
}

export interface AgentReasoningResult {
  agent_response: string;
  reasoning_steps: string[];
  decision: 'accept' | 'counter_propose' | 'reject';
  counter_proposal?: {
    alternative_time?: string;
    alternative_date?: string;
    reasoning: string;
  };
  priority_factors: string[];
}

export class GeminiService {
  private genAI: GoogleGenerativeAI | null;
  private model: any;
  private apiKey: string | null;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || null;
    
    if (this.apiKey && this.apiKey !== 'your_gemini_api_key_here') {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
      logger.info('Gemini API initialized successfully');
    } else {
      this.genAI = null;
      this.model = null;
      logger.warn('Gemini API key not configured. Running in mock mode.');
    }
  }

  async extractMeetingDetails(voiceInput: string): Promise<MeetingExtractionResult> {
    // If no API key, return mock response
    if (!this.model) {
      return this.generateMockExtractionResult(voiceInput);
    }

    try {
      const prompt = `
You are an AI assistant that extracts meeting scheduling information from natural language voice input.

Extract the following information from this voice input: "${voiceInput}"

Return a JSON object with this exact structure:
{
  "success": true/false,
  "extracted_data": {
    "title": "meeting title or null",
    "preferred_date": "YYYY-MM-DD format or null", 
    "preferred_time": "HH:MM format (24hr) or null",
    "duration_minutes": number or null,
    "participants": ["participant names"] or [],
    "meeting_type": "one of: meeting, call, interview, presentation, review, other",
    "priority": "low/medium/high",
    "description": "any additional details or null"
  },
  "confidence_score": 0.0-1.0,
  "reasoning": "explanation of extraction decisions"
}

Guidelines:
- If today is mentioned, use today's date
- If tomorrow is mentioned, use tomorrow's date  
- Convert relative times (like "3pm", "morning", "afternoon") to 24-hour format
- Default duration is 60 minutes if not specified
- Infer meeting type from context
- Be conservative with confidence scores
- Handle ambiguous requests gracefully

Current date: ${new Date().toISOString().split('T')[0]}
Current time: ${new Date().toTimeString().split(' ')[0]}
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      try {
        const parsedResult = JSON.parse(text);
        
        // Validate required structure
        if (!parsedResult.hasOwnProperty('success') || 
            !parsedResult.hasOwnProperty('extracted_data') ||
            !parsedResult.hasOwnProperty('confidence_score')) {
          throw new Error('Invalid response structure');
        }

        logger.info('Meeting extraction successful', {
          input: voiceInput,
          confidence: parsedResult.confidence_score,
          extracted: parsedResult.extracted_data
        });

        return parsedResult;
      } catch (parseError) {
        logger.error('Failed to parse Gemini response', { error: parseError, response: text });
        return {
          success: false,
          extracted_data: {},
          confidence_score: 0,
          reasoning: 'Failed to parse AI response'
        };
      }
    } catch (error) {
      logger.error('Gemini API call failed', error);
      return {
        success: false,
        extracted_data: {},
        confidence_score: 0,
        reasoning: 'AI service unavailable'
      };
    }
  }

  async generateAgentReasoning(
    agentPersonality: any,
    meetingRequest: any,
    availableSlots: any[],
    conflictingEvents: any[]
  ): Promise<AgentReasoningResult> {
    // If no API key, return mock response
    if (!this.model) {
      return {
        agent_response: "I can accommodate this meeting request.",
        reasoning_steps: ["Checking availability...", "No conflicts found", "Meeting looks good"],
        decision: 'accept',
        priority_factors: ["schedule_flexibility", "team_collaboration"]
      };
    }

    try {
      const prompt = `
You are an AI agent representing a user with the following personality and preferences:

Agent Personality:
${JSON.stringify(agentPersonality, null, 2)}

You've received a meeting request:
${JSON.stringify(meetingRequest, null, 2)}

Available time slots found:
${JSON.stringify(availableSlots, null, 2)}

Conflicting events:
${JSON.stringify(conflictingEvents, null, 2)}

Based on your personality and schedule, provide your response as a JSON object:
{
  "agent_response": "natural language response to the meeting request",
  "reasoning_steps": ["step 1", "step 2", "step 3"],
  "decision": "accept|counter_propose|reject",
  "counter_proposal": {
    "alternative_time": "HH:MM",
    "alternative_date": "YYYY-MM-DD", 
    "reasoning": "why this alternative is better"
  },
  "priority_factors": ["factor 1", "factor 2"]
}

Consider:
- Your working hours preferences
- Meeting type preferences  
- Workload and existing commitments
- Personality traits (punctual, flexible, etc.)
- Priority of the meeting vs existing events
- Travel time between meetings if applicable
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      try {
        const parsedResult = JSON.parse(text);
        
        logger.info('Agent reasoning generated', {
          agentId: agentPersonality.id,
          decision: parsedResult.decision
        });

        return parsedResult;
      } catch (parseError) {
        logger.error('Failed to parse agent reasoning response', { error: parseError, response: text });
        return {
          agent_response: "I need more information to make a decision about this meeting.",
          reasoning_steps: ["Unable to process request properly"],
          decision: 'counter_propose',
          priority_factors: ['communication_error']
        };
      }
    } catch (error) {
      logger.error('Agent reasoning generation failed', error);
      return {
        agent_response: "I'm having trouble processing this request right now.",
        reasoning_steps: ["System error occurred"],
        decision: 'counter_propose',
        priority_factors: ['system_error']
      };
    }
  }

  async generateNegotiationSummary(negotiationHistory: any[]): Promise<string> {
    try {
      const prompt = `
Summarize the following agent negotiation in a clear, concise way for the user:

Negotiation History:
${JSON.stringify(negotiationHistory, null, 2)}

Provide a natural language summary explaining:
1. What time slots were proposed
2. Which agents had concerns and why
3. How the conflict was resolved (or if it's still ongoing)
4. The final decision or recommendation

Keep it conversational and user-friendly.
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      logger.error('Failed to generate negotiation summary', error);
      return "The agents discussed the meeting request and are working on finding the best time for everyone.";
    }
  }

  private generateMockExtractionResult(voiceInput: string): MeetingExtractionResult {
    // Simple pattern matching for demo purposes
    const input = voiceInput.toLowerCase();
    
    // Extract basic patterns
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const mockData: any = {};
    
    // Try to extract meeting title
    if (input.includes('meeting with') || input.includes('schedule a meeting')) {
      const titleMatch = input.match(/(?:meeting with|schedule a meeting with) ([^,\s]+)/);
      mockData.title = titleMatch ? `Meeting with ${titleMatch[1]}` : "Team Meeting";
    } else if (input.includes('call')) {
      mockData.title = "Phone Call";
    } else {
      mockData.title = "Meeting";
    }
    
    // Try to extract date
    if (input.includes('tomorrow')) {
      mockData.preferred_date = tomorrow.toISOString().split('T')[0];
    } else if (input.includes('today')) {
      mockData.preferred_date = new Date().toISOString().split('T')[0];
    } else if (input.includes('tuesday') || input.includes('next tuesday')) {
      mockData.preferred_date = "2025-10-01"; // Example date
    }
    
    // Try to extract time
    const timeMatch = input.match(/(\d{1,2})\s*(pm|am)/i);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1]);
      if (timeMatch[2].toLowerCase() === 'pm' && hour !== 12) hour += 12;
      if (timeMatch[2].toLowerCase() === 'am' && hour === 12) hour = 0;
      mockData.preferred_time = `${hour.toString().padStart(2, '0')}:00`;
    } else if (input.includes('2 pm') || input.includes('2pm')) {
      mockData.preferred_time = "14:00";
    } else if (input.includes('morning')) {
      mockData.preferred_time = "09:00";
    } else if (input.includes('afternoon')) {
      mockData.preferred_time = "14:00";
    }
    
    // Set defaults
    mockData.duration_minutes = 60;
    mockData.participants = [];
    mockData.meeting_type = "meeting";
    mockData.priority = "medium";
    mockData.description = null;
    
    return {
      success: true,
      extracted_data: mockData,
      confidence_score: 0.7,
      reasoning: "Mock extraction - Gemini API not configured. Please set GEMINI_API_KEY for real AI processing."
    };
  }
}

export const geminiService = new GeminiService();
