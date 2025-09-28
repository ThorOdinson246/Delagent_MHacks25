#!/usr/bin/env python3
"""
API Endpoint for Agent Negotiation System
Returns meeting negotiation results in JSON format for frontend integration
"""

import asyncio
import sys
import os
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
import uuid
import re
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import json
import asyncio
from typing import List, Dict, Any
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add agent directories to path
sys.path.append(os.path.join(os.path.dirname(__file__), '@agent1_pappu'))
sys.path.append(os.path.join(os.path.dirname(__file__), '@agent2_alice'))

# Agent addresses
PAPPU_AGENT_ADDRESS = "agent1qfy2twzrw6ne43eufnzadxj0s3xpzlwd7vrgde5yrq46043kp8hpzpx6x75"  # Pappu's agent
ALICE_AGENT_ADDRESS = "agent1qge95a5nqwjqgg0td05y9866jtjac7zf6g3908qjs330lm07kz8s799w9s8"  # Alice's agent

# Pydantic models for API
class MeetingRequest(BaseModel):
    title: str
    preferred_date: str  # YYYY-MM-DD format
    preferred_time: str  # HH:MM format
    duration_minutes: int
    is_ai_agent_meeting: bool = True  # Default to AI agent meeting

class TimeSlot(BaseModel):
    start_time: str
    end_time: str
    duration_minutes: int
    quality_score: int
    day_of_week: str
    date_formatted: str
    time_formatted: str
    explanation: str

class NegotiationResult(BaseModel):
    success: bool
    meeting_request: MeetingRequest
    available_slots: List[TimeSlot]
    total_slots_found: int
    search_window: Dict[str, str]
    selected_slot: Optional[TimeSlot] = None
    meeting_id: Optional[str] = None
    message: str
    timestamp: str

class APINegotiation:
    """API version of the negotiation system"""
    
    def __init__(self):
        self.db_manager = None
        self.calendar_service = None
        self.meeting_service = None
    
    async def setup_database(self):
        """Setup database connection"""
        try:
            # Import Alice's database service
            # Use relative path from current script location
            script_dir = os.path.dirname(os.path.abspath(__file__))
            alice_agent_dir = os.path.join(script_dir, '@agent2_alice')
            sys.path.append(alice_agent_dir)
            from database import calendar_service, db_manager, meeting_service
            
            self.db_manager = db_manager
            self.calendar_service = calendar_service
            self.meeting_service = meeting_service
            
            # Connect to database
            await self.db_manager.connect()
            return True
        except Exception as e:
            print(f"❌ Database setup failed: {e}")
            return False
    
    def validate_input(self, request: MeetingRequest) -> Tuple[bool, str]:
        """Validate the meeting request input"""
        try:
            # Validate date
            preferred_date = datetime.strptime(request.preferred_date, "%Y-%m-%d")
            if preferred_date.weekday() >= 5:  # Weekend
                day_name = preferred_date.strftime("%A")
                return False, f"{day_name} is a weekend. Date must be a weekday (Monday-Friday)"
            # Check date range (no past dates, only future dates)
            today = datetime.now().date()
            if preferred_date.date() < today:
                return False, f"Date cannot be in the past. Today is {today.strftime('%Y-%m-%d')}"
            if preferred_date > datetime(2025, 10, 27):
                return False, "Date must be before 2025-10-27"
            
            # Validate time
            preferred_time = datetime.strptime(request.preferred_time, "%H:%M")
            if preferred_time.hour < 8 or preferred_time.hour >= 17:
                return False, "Time must be between 08:00 and 17:00"
            
            # Validate duration
            if request.duration_minutes not in [15, 30, 45, 60, 90, 120]:
                return False, "Duration must be 15, 30, 45, 60, 90, or 120 minutes"
            
            return True, "Valid input"
            
        except ValueError as e:
            return False, f"Invalid format: {str(e)}"
    
    async def find_available_slots(self, request: MeetingRequest) -> List[Dict[str, Any]]:
        """Find available time slots with proper AI agent negotiation"""
        preferred_date = datetime.strptime(request.preferred_date, "%Y-%m-%d")
        preferred_time = datetime.strptime(request.preferred_time, "%H:%M")
        preferred_datetime = preferred_date.replace(
            hour=preferred_time.hour, 
            minute=preferred_time.minute, 
            second=0, 
            microsecond=0
        )
        
        duration = request.duration_minutes
        
        if request.is_ai_agent_meeting:
            return await self.negotiate_with_ai_agent_api(preferred_datetime, duration)
        else:
            return await self.find_external_meeting_slots_api(preferred_datetime, duration)
    
    async def negotiate_with_ai_agent_api(self, preferred_datetime: datetime, duration: int) -> List[Dict[str, Any]]:
        """AI Agent negotiation between Pappu and Alice (API version)"""
        # Search window: 5 days before and after preferred date for better negotiation
        # But ensure we don't search before today or beyond database range
        today = datetime.now().date()
        db_end_date = datetime(2025, 10, 27).date()
        search_start = max(preferred_datetime - timedelta(days=5), datetime.combine(today, datetime.min.time()))
        search_end = min(preferred_datetime + timedelta(days=5), datetime.combine(db_end_date, datetime.max.time()))
        
        available_slots = []
        
        # Check each day in the search window
        current_date = search_start.date()
        end_date = search_end.date()
        
        while current_date <= end_date:
            # Skip weekends
            if current_date.weekday() >= 5:
                current_date += timedelta(days=1)
                continue
            
            # Check each hour from 8 AM to 5 PM
            for hour in range(8, 17):
                for minute in [0, 15, 30, 45]:
                    test_start = datetime.combine(current_date, datetime.min.time().replace(hour=hour, minute=minute))
                    test_end = test_start + timedelta(minutes=duration)
                    
                    # Skip if it goes past 5 PM
                    if test_end.hour >= 17:
                        continue
                    
                    # Check availability for both users
                    pappu_conflicts = await self.calendar_service.check_time_conflict("bob", test_start, test_end)
                    alice_conflicts = await self.calendar_service.check_time_conflict("alice", test_start, test_end)
                    
                    # Be more lenient - allow slots if conflicts are low priority or moveable
                    pappu_has_conflict = any(not conflict.get('is_moveable', False) and conflict.get('priority', 5) >= 7 for conflict in pappu_conflicts)
                    alice_has_conflict = any(not conflict.get('is_moveable', False) and conflict.get('priority', 5) >= 7 for conflict in alice_conflicts)
                    
                    if not pappu_has_conflict and not alice_has_conflict:
                        # Calculate quality score
                        quality_score = self.calculate_slot_quality(test_start, preferred_datetime)
                        
                        # Reduce quality score if there are any conflicts (even low priority ones)
                        if pappu_conflicts or alice_conflicts:
                            quality_score = max(10, quality_score - 20)
                        
                        available_slots.append({
                            "start_time": test_start,
                            "end_time": test_end,
                            "quality_score": quality_score,
                            "duration_minutes": duration
                        })
            
            current_date += timedelta(days=1)
        
        # Sort by quality score (higher is better)
        available_slots.sort(key=lambda x: x["quality_score"], reverse=True)
        
        # Generate dynamic explanations using Gemini
        for i, slot in enumerate(available_slots[:3]):
            slot["explanation"] = await self.generate_slot_explanation(slot, preferred_datetime, i)
        
        return available_slots[:3]  # Return top 3 options for AI agent negotiation
    
    async def find_external_meeting_slots_api(self, preferred_datetime: datetime, duration: int) -> List[Dict[str, Any]]:
        """Find slots for external meetings (only Pappu's schedule) - API version"""
        # Search window: 3 days before and after preferred date
        # But ensure we don't search before today or beyond database range
        today = datetime.now().date()
        db_end_date = datetime(2025, 10, 27).date()
        search_start = max(preferred_datetime - timedelta(days=3), datetime.combine(today, datetime.min.time()))
        search_end = min(preferred_datetime + timedelta(days=3), datetime.combine(db_end_date, datetime.max.time()))
        
        available_slots = []
        
        # Check each day in the search window
        current_date = search_start.date()
        end_date = search_end.date()
        
        while current_date <= end_date:
            # Skip weekends
            if current_date.weekday() >= 5:
                current_date += timedelta(days=1)
                continue
            
            # Check each hour from 8 AM to 5 PM
            for hour in range(8, 17):
                for minute in [0, 15, 30, 45]:
                    test_start = datetime.combine(current_date, datetime.min.time().replace(hour=hour, minute=minute))
                    test_end = test_start + timedelta(minutes=duration)
                    
                    # Skip if it goes past 5 PM
                    if test_end.hour >= 17:
                        continue
                    
                    # Check availability for Pappu only
                    pappu_conflicts = await self.calendar_service.check_time_conflict("bob", test_start, test_end)
                    
                    if not pappu_conflicts:
                        # Calculate quality score
                        quality_score = self.calculate_slot_quality(test_start, preferred_datetime)
                        available_slots.append({
                            "start_time": test_start,
                            "end_time": test_end,
                            "quality_score": quality_score,
                            "duration_minutes": duration
                        })
            
            current_date += timedelta(days=1)
        
        # Sort by quality score (higher is better)
        available_slots.sort(key=lambda x: x["quality_score"], reverse=True)
        
        # Generate dynamic explanations using Gemini
        for i, slot in enumerate(available_slots[:3]):
            slot["explanation"] = await self.generate_slot_explanation(slot, preferred_datetime, i)
        
        return available_slots[:3]  # Return top 3 options
    
    def calculate_slot_quality(self, slot_time: datetime, preferred_time: datetime) -> int:
        """Calculate quality score for a time slot"""
        score = 0
        
        # Prefer slots closer to preferred time
        time_diff = abs((slot_time - preferred_time).total_seconds() / 3600)  # hours
        if time_diff == 0:
            score += 100  # Exact match
        elif time_diff <= 1:
            score += 80   # Within 1 hour
        elif time_diff <= 2:
            score += 60   # Within 2 hours
        elif time_diff <= 4:
            score += 40   # Within 4 hours
        else:
            score += 20   # Further away
        
        # Prefer certain times of day
        if 9 <= slot_time.hour <= 11:  # Morning
            score += 10
        elif 14 <= slot_time.hour <= 16:  # Afternoon
            score += 8
        elif 8 <= slot_time.hour <= 9:  # Early morning
            score += 6
        elif 16 <= slot_time.hour <= 17:  # Late afternoon
            score += 4
        
        # Prefer round times
        if slot_time.minute == 0:
            score += 5
        elif slot_time.minute == 30:
            score += 3
        
        return score
    
    async def generate_slot_explanation(self, slot: Dict[str, Any], preferred_datetime: datetime, slot_index: int) -> str:
        """Generate dynamic explanation using Gemini AI while maintaining privacy"""
        try:
            # Configure Gemini with environment variable and latest model
            api_key = os.getenv('GEMINI_API_KEY')
            if not api_key:
                raise Exception("GEMINI_API_KEY not found in environment variables")
            
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-2.0-flash-exp')
            
            # Get conflicts for this time slot to understand why it's available/not available
            start_time = slot["start_time"]
            end_time = slot["end_time"]
            
            # Check conflicts for both users
            pappu_conflicts = await self.calendar_service.check_time_conflict("bob", start_time, end_time)
            alice_conflicts = await self.calendar_service.check_time_conflict("alice", start_time, end_time)
            
            # Prepare context for Gemini (without revealing specific names)
            conflicts_info = []
            if pappu_conflicts:
                for conflict in pappu_conflicts:
                    conflicts_info.append(f"Person A has: {conflict.get('block_type', 'meeting')} (priority: {conflict.get('priority', 5)})")
            if alice_conflicts:
                for conflict in alice_conflicts:
                    conflicts_info.append(f"Person B has: {conflict.get('block_type', 'meeting')} (priority: {conflict.get('priority', 5)})")
            
            # Create prompt for Gemini
            preferred_start = datetime.combine(preferred_datetime.date(), preferred_datetime.time())
            is_exact_match = slot["start_time"] == preferred_start
            
            prompt = f"""
            You are a scheduling assistant. Generate a brief, helpful explanation for a meeting time slot.
            
            Context:
            - Requested time: {preferred_datetime.strftime('%A, %B %d at %I:%M %p')}
            - Available slot: {start_time.strftime('%A, %B %d at %I:%M %p')} - {end_time.strftime('%I:%M %p')}
            - Slot quality score: {slot['quality_score']}
            - Slot position: {slot_index + 1} (1st, 2nd, or 3rd best option)
            - Exact time match: {is_exact_match}
            
            Current schedule conflicts:
            {conflicts_info if conflicts_info else "No conflicts found"}
            
            Generate a natural, helpful explanation (1-2 sentences) that:
            1. Explains why this time is suggested
            2. Maintains privacy (don't mention specific people or meeting titles)
            3. Is encouraging and professional
            4. Explains the reasoning without being too technical
            
            Examples of good explanations:
            - "This is your preferred time and it's available!"
            - "This time works well as it avoids existing commitments."
            - "This slot is available with minimal schedule conflicts."
            - "This alternative time fits well around current appointments."
            
            Generate explanation:
            """
            
            response = model.generate_content(prompt)
            explanation = response.text.strip()
            
            # Fallback to simple explanation if Gemini fails
            if not explanation or len(explanation) > 200:
                if is_exact_match:
                    explanation = "This is your preferred time and it's available!"
                elif slot_index == 0:
                    explanation = "This is the best available time close to your preference."
                else:
                    explanation = "This alternative time slot works well around existing commitments."
            
            return explanation
            
        except Exception as e:
            print(f"Error generating explanation with Gemini: {e}")
            # Fallback to simple explanations
            preferred_start = datetime.combine(preferred_datetime.date(), preferred_datetime.time())
            is_exact_match = slot["start_time"] == preferred_start
            
            if is_exact_match:
                return "This is your preferred time and it's available!"
            elif slot_index == 0:
                return "This is the best available time close to your preference."
            else:
                return "This alternative time slot works well around existing commitments."
    
    def format_slots_for_api(self, slots: List[Dict[str, Any]]) -> List[TimeSlot]:
        """Format slots for API response"""
        formatted_slots = []
        
        for slot in slots:
            start_time = slot["start_time"]
            end_time = slot["end_time"]
            
            formatted_slots.append(TimeSlot(
                start_time=start_time.isoformat(),
                end_time=end_time.isoformat(),
                duration_minutes=slot["duration_minutes"],
                quality_score=slot["quality_score"],
                day_of_week=start_time.strftime("%A"),
                date_formatted=start_time.strftime("%Y-%m-%d"),
                time_formatted=start_time.strftime("%H:%M"),
                explanation=slot.get("explanation", "Available time slot")
            ))
        
        return formatted_slots
    
    async def schedule_meeting(self, slot: Dict[str, Any], request: MeetingRequest) -> Tuple[bool, Optional[str]]:
        """Schedule the selected meeting"""
        try:
            # Create meeting request
            meeting_id = await self.meeting_service.create_meeting_request(
                initiator_id="bob",  # Pappu is represented as "bob" in the database
                title=request.title,
                description=f"Meeting scheduled via API",
                duration_minutes=slot["duration_minutes"],
                preferred_start_time=slot["start_time"],
                preferred_end_time=slot["end_time"],
                priority_level=7
            )
            
            # Add participants
            await self.meeting_service.add_meeting_participant(meeting_id, "bob", PAPPU_AGENT_ADDRESS)
            await self.meeting_service.add_meeting_participant(meeting_id, "alice", ALICE_AGENT_ADDRESS)
            
            # Update status to scheduled
            await self.meeting_service.update_meeting_status(meeting_id, "scheduled", slot["start_time"])
            
            # Add calendar blocks for both participants
            await self.calendar_service.add_calendar_block(
                "bob", 
                f"Meeting: {request.title}", 
                slot["start_time"], 
                slot["end_time"], 
                "busy", 
                8, 
                False
            )
            
            await self.calendar_service.add_calendar_block(
                "alice", 
                f"Meeting: {request.title}", 
                slot["start_time"], 
                slot["end_time"], 
                "busy", 
                8, 
                False
            )
            
            return True, meeting_id
            
        except Exception as e:
            print(f"❌ Failed to schedule meeting: {e}")
            return False, None

# Initialize FastAPI app
app = FastAPI(title="Agent Negotiation API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                # Remove disconnected connections
                self.active_connections.remove(connection)

manager = ConnectionManager()

# Global negotiation instance
negotiation = APINegotiation()

@app.on_event("startup")
async def startup_event():
    """Initialize database connection on startup"""
    await negotiation.setup_database()

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Agent Negotiation API",
        "version": "1.0.0",
        "endpoints": {
            "POST /negotiate": "Find available meeting slots",
            "POST /schedule": "Schedule a specific meeting slot",
            "GET /meetings": "Get all meetings from database",
            "GET /calendar/{user_id}": "Get calendar for user (bob/alice)",
            "GET /health": "Health check",
            "WS /ws": "Real-time WebSocket updates"
        }
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time updates
    """
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            # Echo back for testing
            await manager.send_personal_message(f"Echo: {data}", websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "database_connected": negotiation.db_manager is not None,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/meetings")
async def get_meetings():
    """Get all meetings from the database"""
    try:
        meetings = await negotiation.db_manager.execute_query("""
            SELECT id, title, duration_minutes, preferred_start_time, 
                   preferred_end_time, status, final_scheduled_time, created_at
            FROM meeting_requests 
            ORDER BY created_at DESC
        """)
        
        return {
            "success": True,
            "meetings": meetings,
            "total_meetings": len(meetings),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving meetings: {str(e)}")

@app.get("/calendar/{user_id}")
async def get_user_calendar(user_id: str):
    """Get calendar blocks for a specific user"""
    try:
        if user_id not in ['bob', 'alice']:
            raise HTTPException(status_code=400, detail="User ID must be 'bob' or 'alice'")
        
        blocks = await negotiation.calendar_service.get_user_calendar_blocks(user_id)
        
        return {
            "success": True,
            "user_id": user_id,
            "calendar_blocks": blocks,
            "total_blocks": len(blocks),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving calendar: {str(e)}")

@app.post("/negotiate", response_model=NegotiationResult)
async def negotiate_meeting(request: MeetingRequest):
    """
    Find available meeting slots based on user preferences
    """
    try:
        # Send initial negotiation message
        await manager.broadcast(json.dumps({
            "type": "negotiation_start",
            "message": f"🤖 Starting negotiation for '{request.title}'",
            "timestamp": datetime.now().isoformat()
        }))
        
        # Validate input
        is_valid, error_message = negotiation.validate_input(request)
        if not is_valid:
            await manager.broadcast(json.dumps({
                "type": "negotiation_error",
                "message": f"❌ Validation failed: {error_message}",
                "timestamp": datetime.now().isoformat()
            }))
            raise HTTPException(status_code=400, detail=error_message)
        
        # Send agent communication message
        if request.is_ai_agent_meeting:
            await manager.broadcast(json.dumps({
                "type": "agent_communication",
                "message": "🤖 Pappu's Agent: Initiating meeting request with Alice's Agent",
                "timestamp": datetime.now().isoformat()
            }))
        else:
            await manager.broadcast(json.dumps({
                "type": "agent_communication", 
                "message": "👤 Pappu's Agent: Checking personal availability for external meeting",
                "timestamp": datetime.now().isoformat()
            }))
        
        # Find available slots
        available_slots = await negotiation.find_available_slots(request)
        
        # Calculate search window
        preferred_date = datetime.strptime(request.preferred_date, "%Y-%m-%d")
        preferred_time = datetime.strptime(request.preferred_time, "%H:%M")
        preferred_datetime = preferred_date.replace(
            hour=preferred_time.hour, 
            minute=preferred_time.minute, 
            second=0, 
            microsecond=0
        )
        
        # Calculate search window based on meeting type
        today = datetime.now().date()
        db_end_date = datetime(2025, 10, 27).date()
        
        if request.is_ai_agent_meeting:
            search_start = max(preferred_datetime - timedelta(days=5), datetime.combine(today, datetime.min.time()))
            search_end = min(preferred_datetime + timedelta(days=5), datetime.combine(db_end_date, datetime.max.time()))
        else:
            search_start = max(preferred_datetime - timedelta(days=3), datetime.combine(today, datetime.min.time()))
            search_end = min(preferred_datetime + timedelta(days=3), datetime.combine(db_end_date, datetime.max.time()))
        
        # Handle case when no slots are found
        if not available_slots:
            await manager.broadcast(json.dumps({
                "type": "negotiation_result",
                "message": "❌ No available time slots found. Consider trying different dates or times.",
                "timestamp": datetime.now().isoformat()
            }))
            return NegotiationResult(
                success=False,
                meeting_request=request,
                available_slots=[],
                total_slots_found=0,
                search_window={
                    "start": search_start.isoformat(),
                    "end": search_end.isoformat()
                },
                selected_slot=None,
                meeting_id=None,
                message="No available time slots found. Consider trying different dates or times.",
                timestamp=datetime.now().isoformat()
            )
        
        formatted_slots = negotiation.format_slots_for_api(available_slots)
        
        # Send success message with slot details
        await manager.broadcast(json.dumps({
            "type": "negotiation_result",
            "message": f"✅ Found {len(formatted_slots)} available time slots",
            "slots": [slot.dict() for slot in formatted_slots] if formatted_slots else [],
            "timestamp": datetime.now().isoformat()
        }))
        
        return NegotiationResult(
            success=True,
            meeting_request=request,
            available_slots=formatted_slots,
            total_slots_found=len(formatted_slots),
            search_window={
                "start": search_start.isoformat(),
                "end": search_end.isoformat()
            },
            selected_slot=None,
            meeting_id=None,
            message=f"Found {len(formatted_slots)} available time slots",
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/schedule", response_model=NegotiationResult)
async def schedule_meeting(request: MeetingRequest, slot_index: int = 0):
    """
    Schedule a meeting using the specified slot index (0-based)
    """
    try:
        # Validate input
        is_valid, error_message = negotiation.validate_input(request)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_message)
        
        # Find available slots
        available_slots = await negotiation.find_available_slots(request)
        
        if not available_slots:
            return NegotiationResult(
                success=False,
                meeting_request=request,
                available_slots=[],
                total_slots_found=0,
                search_window={
                    "start": search_start.isoformat(),
                    "end": search_end.isoformat()
                },
                selected_slot=None,
                meeting_id=None,
                message="No available time slots found. Consider trying different dates or times.",
                timestamp=datetime.now().isoformat()
            )
        
        if slot_index >= len(available_slots):
            raise HTTPException(status_code=400, detail=f"Invalid slot index. Available slots: 0-{len(available_slots)-1}")
        
        # Get selected slot
        selected_slot_data = available_slots[slot_index]
        formatted_slots = negotiation.format_slots_for_api(available_slots)
        selected_slot = formatted_slots[slot_index]
        
        # Send scheduling message
        await manager.broadcast(json.dumps({
            "type": "scheduling_start",
            "message": f"📅 Scheduling meeting '{request.title}' for {selected_slot.date_formatted} at {selected_slot.time_formatted}",
            "timestamp": datetime.now().isoformat()
        }))
        
        # Schedule the meeting
        success, meeting_id = await negotiation.schedule_meeting(selected_slot_data, request)
        
        if success:
            # Send success message
            await manager.broadcast(json.dumps({
                "type": "meeting_scheduled",
                "message": f"✅ Meeting '{request.title}' scheduled successfully!",
                "meeting_id": meeting_id,
                "meeting_details": {
                    "title": request.title,
                    "date": selected_slot.date_formatted,
                    "time": selected_slot.time_formatted,
                    "duration": selected_slot.duration_minutes
                },
                "timestamp": datetime.now().isoformat()
            }))
            
            return NegotiationResult(
                success=True,
                meeting_request=request,
                available_slots=formatted_slots,
                total_slots_found=len(formatted_slots),
                search_window={},
                selected_slot=selected_slot,
                meeting_id=meeting_id,
                message="Meeting scheduled successfully",
                timestamp=datetime.now().isoformat()
            )
        else:
            await manager.broadcast(json.dumps({
                "type": "scheduling_error",
                "message": "❌ Failed to schedule meeting",
                "timestamp": datetime.now().isoformat()
            }))
            return NegotiationResult(
                success=False,
                meeting_request=request,
                available_slots=formatted_slots,
                total_slots_found=len(formatted_slots),
                search_window={},
                selected_slot=selected_slot,
                meeting_id=None,
                message="Failed to schedule meeting",
                timestamp=datetime.now().isoformat()
            )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# Add API prefix routes for frontend compatibility
@app.get("/api/health")
async def api_health_check():
    """API health check endpoint"""
    return await health_check()

@app.get("/api/meetings")
async def api_get_meetings():
    """API endpoint to get all meetings"""
    return await get_meetings()

@app.get("/api/calendar/{user_id}")
async def api_get_calendar(user_id: str):
    """API endpoint to get user calendar"""
    return await get_user_calendar(user_id)

@app.post("/api/negotiate")
async def api_negotiate(request: MeetingRequest):
    """API endpoint to negotiate meeting"""
    return await negotiate_meeting(request)

@app.post("/api/schedule")
async def api_schedule(request: MeetingRequest, slot_index: int = 0):
    """API endpoint to schedule meeting"""
    return await schedule_meeting(request, slot_index)

@app.post("/api/voice-command")
async def api_voice_command(request: dict):
    """API endpoint for voice commands"""
    try:
        transcript = request.get("transcript", "")
        action = request.get("action", "schedule")
        
        # Parse the voice command and create a meeting request
        # This is a simple implementation - you might want to use AI/NLP here
        
        # Get next weekday (Monday-Friday)
        today = datetime.now()
        days_ahead = 1
        while (today + timedelta(days=days_ahead)).weekday() > 4:  # 0=Monday, 6=Sunday
            days_ahead += 1
        next_weekday = today + timedelta(days=days_ahead)
        
        meeting_request = MeetingRequest(
            title="Voice Meeting",
            duration_minutes=60,
            preferred_date=next_weekday.strftime("%Y-%m-%d"),
            preferred_time="10:00",
            participants=["bob", "alice"],
            priority_level=5,
            is_flexible=True
        )
        
        # Process the meeting request
        result = await negotiate_meeting(meeting_request)
        
        return {
            "success": True,
            "message": "Voice command processed successfully",
            "meeting_request": meeting_request.dict(),
            "negotiation_result": result
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Error processing voice command: {str(e)}"
        }

@app.post("/api/stt")
async def api_speech_to_text(request: dict):
    """API endpoint for speech-to-text processing"""
    try:
        # This is a placeholder - you would implement actual STT here
        # For now, return a mock response
        return {
            "success": True,
            "transcript": "Mock transcript from voice input",
            "duration": 5.0,
            "language": "en"
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Error processing speech: {str(e)}"
        }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
