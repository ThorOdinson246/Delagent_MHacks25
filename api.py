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
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn

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

class TimeSlot(BaseModel):
    start_time: str
    end_time: str
    duration_minutes: int
    quality_score: int
    day_of_week: str
    date_formatted: str
    time_formatted: str

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
            sys.path.append('/home/pappu/MHacks2025/@agent2_alice')
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
                return False, "Date must be a weekday (Monday-Friday)"
            if preferred_date < datetime(2025, 9, 27) or preferred_date > datetime(2025, 10, 26):
                return False, "Date must be between 2025-09-27 and 2025-10-26"
            
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
        """Find available time slots for both users"""
        preferred_date = datetime.strptime(request.preferred_date, "%Y-%m-%d")
        preferred_time = datetime.strptime(request.preferred_time, "%H:%M")
        preferred_datetime = preferred_date.replace(
            hour=preferred_time.hour, 
            minute=preferred_time.minute, 
            second=0, 
            microsecond=0
        )
        
        duration = request.duration_minutes
        
        # Search window: 3 days before and after preferred date
        search_start = preferred_datetime - timedelta(days=3)
        search_end = preferred_datetime + timedelta(days=3)
        
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
                    
                    if not pappu_conflicts and not alice_conflicts:
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
        
        return available_slots[:5]  # Return top 5 options
    
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
                time_formatted=start_time.strftime("%H:%M")
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
            "GET /health": "Health check"
        }
    }

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
        # Validate input
        is_valid, error_message = negotiation.validate_input(request)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_message)
        
        # Find available slots
        available_slots = await negotiation.find_available_slots(request)
        formatted_slots = negotiation.format_slots_for_api(available_slots)
        
        # Calculate search window
        preferred_date = datetime.strptime(request.preferred_date, "%Y-%m-%d")
        preferred_time = datetime.strptime(request.preferred_time, "%H:%M")
        preferred_datetime = preferred_date.replace(
            hour=preferred_time.hour, 
            minute=preferred_time.minute, 
            second=0, 
            microsecond=0
        )
        
        search_start = preferred_datetime - timedelta(days=3)
        search_end = preferred_datetime + timedelta(days=3)
        
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
                search_window={},
                selected_slot=None,
                meeting_id=None,
                message="No available time slots found",
                timestamp=datetime.now().isoformat()
            )
        
        if slot_index >= len(available_slots):
            raise HTTPException(status_code=400, detail=f"Invalid slot index. Available slots: 0-{len(available_slots)-1}")
        
        # Get selected slot
        selected_slot_data = available_slots[slot_index]
        formatted_slots = negotiation.format_slots_for_api(available_slots)
        selected_slot = formatted_slots[slot_index]
        
        # Schedule the meeting
        success, meeting_id = await negotiation.schedule_meeting(selected_slot_data, request)
        
        if success:
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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
