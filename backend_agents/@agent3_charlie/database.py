"""
Database operations for Charlie's agent
"""
import sqlite3
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import uuid

class CharlieCalendarService:
    """Calendar service for Charlie - focused on efficiency and strategic scheduling"""
    
    def __init__(self, db_manager):
        self.db = db_manager
    
    async def get_user_calendar_blocks(self, user_id: str = "charlie") -> List[Dict[str, Any]]:
        """Get calendar blocks for Charlie"""
        query = """
        SELECT id, user_id, title, start_time, end_time, block_type, 
               priority_level, is_flexible, created_at
        FROM calendar_blocks 
        WHERE user_id = ?
        ORDER BY start_time
        """
        return await self.db.execute_query(query, user_id)
    
    async def check_time_conflict(self, user_id: str, start_time: datetime, end_time: datetime) -> List[Dict[str, Any]]:
        """Check for scheduling conflicts for Charlie"""
        query = """
        SELECT id, title, start_time, end_time, block_type, priority_level, is_flexible
        FROM calendar_blocks 
        WHERE user_id = ? 
        AND (
            (start_time <= ? AND end_time > ?) OR
            (start_time < ? AND end_time >= ?) OR
            (start_time >= ? AND end_time <= ?)
        )
        ORDER BY start_time
        """
        return await self.db.execute_query(
            query, user_id, start_time, start_time, end_time, end_time, start_time, end_time
        )
    
    async def add_calendar_block(self, user_id: str, title: str, start_time: datetime, 
                               end_time: datetime, block_type: str = "busy", 
                               priority_level: int = 5, is_flexible: bool = False) -> str:
        """Add a calendar block for Charlie"""
        block_id = str(uuid.uuid4())
        command = """
        INSERT INTO calendar_blocks (id, user_id, title, start_time, end_time, 
                                   block_type, priority_level, is_flexible)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """
        success = await self.db.execute_command(
            command, block_id, user_id, title, start_time, end_time, 
            block_type, priority_level, is_flexible
        )
        return block_id if success else None
    
    async def find_optimal_meeting_times(self, duration_minutes: int, 
                                       preferred_start: datetime = None,
                                       search_days: int = 7) -> List[Dict[str, Any]]:
        """Find optimal meeting times based on Charlie's strategic preferences"""
        if not preferred_start:
            preferred_start = datetime.now().replace(hour=9, minute=0, second=0, microsecond=0)
        
        available_times = []
        current_time = preferred_start
        end_search = preferred_start + timedelta(days=search_days)
        
        while current_time < end_search:
            # Skip weekends
            if current_time.weekday() >= 5:
                current_time += timedelta(days=1)
                current_time = current_time.replace(hour=9, minute=0, second=0, microsecond=0)
                continue
            
            # Charlie's preferred hours: 9 AM to 4 PM, protecting lunch (12-1 PM)
            if current_time.hour < 9 or current_time.hour >= 16:
                current_time += timedelta(hours=1)
                continue
            
            # Protect lunch hour
            if 12 <= current_time.hour < 13:
                current_time = current_time.replace(hour=13, minute=0)
                continue
            
            end_time = current_time + timedelta(minutes=duration_minutes)
            
            # Check for conflicts
            conflicts = await self.check_time_conflict("charlie", current_time, end_time)
            
            if not conflicts:
                # Calculate efficiency score based on Charlie's preferences
                efficiency_score = self.calculate_efficiency_score(current_time, preferred_start)
                available_times.append({
                    "start_time": current_time,
                    "end_time": end_time,
                    "efficiency_score": efficiency_score,
                    "reasoning": self.generate_charlie_reasoning(current_time, conflicts)
                })
            
            # Move to next 15-minute slot
            current_time += timedelta(minutes=15)
        
        # Sort by efficiency score (higher is better)
        available_times.sort(key=lambda x: x["efficiency_score"], reverse=True)
        return available_times[:5]  # Return top 5 options
    
    def calculate_efficiency_score(self, slot_time: datetime, preferred_time: datetime) -> int:
        """Calculate efficiency score based on Charlie's strategic preferences"""
        score = 0
        
        # Prefer times close to preferred time
        time_diff = abs((slot_time - preferred_time).total_seconds() / 3600)
        if time_diff == 0:
            score += 100
        elif time_diff <= 1:
            score += 80
        elif time_diff <= 2:
            score += 60
        else:
            score += 40
        
        # Charlie's preferred time blocks (strategic batching)
        if 9 <= slot_time.hour <= 11:  # Morning focus block
            score += 15
        elif 14 <= slot_time.hour <= 16:  # Afternoon collaboration block
            score += 12
        elif 13 <= slot_time.hour <= 14:  # Post-lunch productivity
            score += 10
        
        # Prefer round times for efficiency
        if slot_time.minute == 0:
            score += 8
        elif slot_time.minute == 30:
            score += 5
        elif slot_time.minute == 15 or slot_time.minute == 45:
            score += 3
        
        # Bonus for mid-week (Tuesday-Thursday) - Charlie's peak productivity
        if 1 <= slot_time.weekday() <= 3:
            score += 5
        
        return score
    
    def generate_charlie_reasoning(self, slot_time: datetime, conflicts: List[Dict]) -> str:
        """Generate Charlie's strategic reasoning for time slot selection"""
        reasons = []
        
        if 9 <= slot_time.hour <= 11:
            reasons.append("optimal morning focus window")
        elif 14 <= slot_time.hour <= 16:
            reasons.append("strategic afternoon collaboration time")
        
        if slot_time.minute == 0:
            reasons.append("clean hour boundary for efficiency")
        
        if 1 <= slot_time.weekday() <= 3:
            reasons.append("peak productivity mid-week slot")
        
        if not conflicts:
            reasons.append("zero scheduling conflicts")
        
        if len(reasons) == 0:
            return "Available slot with acceptable efficiency metrics"
        
        return f"Strategic choice: {', '.join(reasons)}"
