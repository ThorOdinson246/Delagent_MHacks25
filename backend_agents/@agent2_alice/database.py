"""
Database connection and operations for the scheduling system
"""
import asyncio
import sqlite3
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import json
import os

class DatabaseManager:
    """Manages database connections and operations"""
    
    def __init__(self):
        self.connection = None
        # Use SQLite database instead of PostgreSQL
        self.database_path = "/home/pappu/MHacks2025/agentschedule.db"
    
    async def connect(self):
        """Connect to the database"""
        try:
            if os.path.exists(self.database_path):
                self.connection = sqlite3.connect(self.database_path)
                print("✅ Connected to SQLite database")
            else:
                print(f"❌ Database file not found: {self.database_path}")
                self.connection = None
        except Exception as e:
            print(f"❌ Database connection failed: {e}")
            self.connection = None
    
    async def disconnect(self):
        """Disconnect from the database"""
        if self.connection:
            self.connection.close()
            print("✅ Disconnected from database")
    
    async def execute_query(self, query: str, *args) -> List[Dict[str, Any]]:
        """Execute a query and return results"""
        if not self.connection:
            return []
        
        try:
            cursor = self.connection.cursor()
            cursor.execute(query, args)
            columns = [description[0] for description in cursor.description]
            rows = cursor.fetchall()
            return [dict(zip(columns, row)) for row in rows]
        except Exception as e:
            print(f"❌ Query execution failed: {e}")
            return []
    
    async def execute_command(self, command: str, *args) -> bool:
        """Execute a command (INSERT, UPDATE, DELETE)"""
        if not self.connection:
            return False
        
        try:
            cursor = self.connection.cursor()
            cursor.execute(command, args)
            self.connection.commit()
            return True
        except Exception as e:
            print(f"❌ Command execution failed: {e}")
            return False

class CalendarService:
    """Service for managing calendar data"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager
    
    async def get_user_calendar_blocks(self, user_id: str) -> List[Dict[str, Any]]:
        """Get calendar blocks for a user"""
        query = """
        SELECT id, title, start_time, end_time, block_type, priority, is_moveable
        FROM calendar_blocks 
        WHERE user_id = ?
        ORDER BY start_time
        """
        return await self.db.execute_query(query, user_id)
    
    async def add_calendar_block(self, user_id: str, title: str, start_time: datetime, 
                               end_time: datetime, block_type: str, priority: int = 5, 
                               is_moveable: bool = False) -> bool:
        """Add a new calendar block"""
        command = """
        INSERT INTO calendar_blocks (user_id, title, start_time, end_time, block_type, priority, is_moveable)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """
        return await self.db.execute_command(command, user_id, title, start_time, end_time, block_type, priority, is_moveable)
    
    async def check_time_conflict(self, user_id: str, start_time: datetime, end_time: datetime) -> List[Dict[str, Any]]:
        """Check for conflicts in a time range"""
        query = """
        SELECT id, title, start_time, end_time, block_type, priority, is_moveable
        FROM calendar_blocks 
        WHERE user_id = ? 
        AND start_time < ? 
        AND end_time > ?
        ORDER BY priority DESC
        """
        return await self.db.execute_query(query, user_id, end_time, start_time)
    
    async def find_available_times(self, user_id: str, duration_minutes: int, 
                                 start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
        """Find available time slots"""
        # This is a simplified version - in production you'd want more sophisticated logic
        available_times = []
        current_time = start_date
        
        while current_time < end_date:
            end_time = current_time + timedelta(minutes=duration_minutes)
            
            # Check for conflicts
            conflicts = await self.check_time_conflict(user_id, current_time, end_time)
            
            if not conflicts:
                available_times.append({
                    "start_time": current_time,
                    "end_time": end_time,
                    "confidence": 1.0
                })
            
            # Move to next hour
            current_time += timedelta(hours=1)
        
        return available_times

class MeetingService:
    """Service for managing meeting requests and negotiations"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager
    
    async def create_meeting_request(self, initiator_id: str, title: str, description: str,
                                   duration_minutes: int, preferred_start_time: datetime = None,
                                   preferred_end_time: datetime = None, priority_level: int = 5) -> str:
        """Create a new meeting request"""
        import uuid
        meeting_id = str(uuid.uuid4())
        command = """
        INSERT INTO meeting_requests (id, initiator_id, title, description, duration_minutes, 
                                    preferred_start_time, preferred_end_time, priority_level)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """
        success = await self.db.execute_command(command, meeting_id, initiator_id, title, description, 
                                           duration_minutes, preferred_start_time, 
                                           preferred_end_time, priority_level)
        return meeting_id if success else None
    
    async def add_meeting_participant(self, meeting_request_id: str, user_id: str, 
                                    agent_address: str, is_required: bool = True) -> bool:
        """Add a participant to a meeting request"""
        import uuid
        participant_id = str(uuid.uuid4())
        command = """
        INSERT INTO meeting_participants (id, meeting_request_id, user_id, agent_address, is_required)
        VALUES (?, ?, ?, ?, ?)
        """
        return await self.db.execute_command(command, participant_id, meeting_request_id, user_id, agent_address, is_required)
    
    async def get_meeting_request(self, meeting_id: str) -> Optional[Dict[str, Any]]:
        """Get meeting request details"""
        query = """
        SELECT * FROM meeting_requests WHERE id = ?
        """
        result = await self.db.execute_query(query, meeting_id)
        return result[0] if result else None
    
    async def get_meeting_participants(self, meeting_id: str) -> List[Dict[str, Any]]:
        """Get participants for a meeting"""
        query = """
        SELECT * FROM meeting_participants WHERE meeting_request_id = ?
        """
        return await self.db.execute_query(query, meeting_id)
    
    async def update_meeting_status(self, meeting_id: str, status: str, final_scheduled_time: datetime = None) -> bool:
        """Update meeting status"""
        command = """
        UPDATE meeting_requests 
        SET status = ?, final_scheduled_time = ?
        WHERE id = ?
        """
        return await self.db.execute_command(command, status, final_scheduled_time, meeting_id)

# Global database manager instance
db_manager = DatabaseManager()
calendar_service = CalendarService(db_manager)
meeting_service = MeetingService(db_manager)
