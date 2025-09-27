#!/usr/bin/env python3
"""
PERSISTENT Agent Negotiation - Real-world human-like negotiation
- Updates database when meetings are scheduled
- Explores multiple days
- Continuous negotiation until success or real failure
- Works like actual humans

Time: 2025-09-30 09:00   Title: Project Planning
"""

import asyncio
import sys
import os
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import uuid
import random

# Add agent directories to path
sys.path.append(os.path.join(os.path.dirname(__file__), '@agent1_pappu'))
sys.path.append(os.path.join(os.path.dirname(__file__), '@agent2_alice'))

from uagents.communication import send_message
from models import MeetingRequest, MeetingParticipant, NegotiationMessage, MessageType, TimeProposal

# Agent addresses
BOB_AGENT_ADDRESS = "agent1qfy2twzrw6ne43eufnzadxj0s3xpzlwd7vrgde5yrq46043kp8hpzpx6x75"  # Bob's agent
ALICE_AGENT_ADDRESS = "agent1qge95a5nqwjqgg0td05y9866jtjac7zf6g3908qjs330lm07kz8s799w9s8"  # Alice's agent

class PersistentNegotiation:
    """Real-world persistent negotiation system"""
    
    def __init__(self):
        self.negotiation_log = []
        self.meeting_request = None
        self.max_rounds = 20  # Allow more negotiation rounds
        self.current_round = 0
        self.db_manager = None
        self.calendar_service = None
        self.meeting_service = None
        self.negotiation_id = str(uuid.uuid4())
        self.scheduled_meeting = None
    
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
            print("✅ Database connected successfully")
            return True
        except Exception as e:
            print(f"❌ Database setup failed: {e}")
            return False
    
    def log_message(self, from_agent: str, to_agent: str, message_type: str, content: str):
        """Log a message exchange"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        log_entry = f"[{timestamp}] {from_agent} -> {to_agent}: {message_type} - {content}"
        self.negotiation_log.append(log_entry)
        print(f"📝 {log_entry}")
    
    async def create_meeting_request(self) -> MeetingRequest:
        """Create a meeting request with dynamic timing and duration like real humans"""
        now = datetime.now()
        
        # Dynamic meeting types and durations (like real world)
        meeting_types = [
            ("Quick Sync", "Brief project update", 15),
            ("Team Standup", "Daily team check-in", 30),
            ("Project Planning", "Discuss project timeline and deliverables", 60),
            ("Deep Dive", "Detailed technical discussion", 90),
            ("Client Meeting", "Important client presentation", 45),
            ("Brainstorming", "Creative ideation session", 75),
            ("Review Meeting", "Project review and feedback", 30),
            ("Strategy Session", "Long-term planning discussion", 120)
        ]
        
        # Randomly select meeting type
        title, description, duration = random.choice(meeting_types)
        
        # Randomize the initial request time and day
        hour_options = [9, 10, 11, 12, 13, 14, 15, 16, 17]
        initial_hour = random.choice(hour_options)
        day_offset = random.randint(0, 7)  # Check up to 7 days ahead
        
        # Start from today's date and add random offset
        base_date = now.replace(year=2025, month=9, day=27)  # Use database date as base
        preferred_date = base_date + timedelta(days=day_offset)
        
        meeting_request = MeetingRequest(
            id=str(uuid.uuid4()),
            title=title,
            description=description,
            duration_minutes=duration,
            participants=[
                MeetingParticipant(
                    user_id="bob",
                    agent_address=BOB_AGENT_ADDRESS,
                    name="Bob Smith",
                    email="bob@example.com"
                ),
                MeetingParticipant(
                    user_id="alice",
                    agent_address=ALICE_AGENT_ADDRESS,
                    name="Alice Johnson", 
                    email="alice@example.com"
                )
            ],
            # Dynamic timing based on meeting type
            preferred_start_time=preferred_date.replace(hour=initial_hour, minute=0, second=0, microsecond=0),
            preferred_end_time=preferred_date.replace(hour=initial_hour, minute=0, second=0, microsecond=0) + timedelta(minutes=duration),
            priority_level=random.randint(4, 8),  # Dynamic priority
            initiator_id="bob"
        )
        
        self.meeting_request = meeting_request
        return meeting_request
    
    async def send_meeting_request(self) -> bool:
        """Send the initial meeting request from Bob to Alice"""
        print("\n🤝 Starting PERSISTENT Agent Negotiation")
        print("=" * 50)
        
        # Create meeting request
        meeting_request = await self.create_meeting_request()
        
        print(f"📅 Meeting Request:")
        print(f"   Title: {meeting_request.title}")
        print(f"   Duration: {meeting_request.duration_minutes} minutes")
        print(f"   Preferred Time: {meeting_request.preferred_start_time.strftime('%Y-%m-%d %H:%M')}")
        print(f"   Initiator: Bob")
        print(f"   Participants: Bob, Alice")
        
        # Send meeting request from Bob to Alice
        print(f"\n📤 Bob sends meeting request to Alice...")
        self.log_message("Bob", "Alice", "MEETING_REQUEST", f"Request for {meeting_request.title}")
        
        try:
            await send_message(ALICE_AGENT_ADDRESS, meeting_request)
            print("✅ Meeting request sent successfully")
            return True
        except Exception as e:
            print(f"❌ Failed to send meeting request: {e}")
            return False
    
    async def find_available_time(self, user_id: str, duration_minutes: int, start_date: datetime, end_date: datetime) -> Optional[datetime]:
        """Find available time slots across multiple days with intelligent scheduling"""
        print(f"   🔍 Searching for {duration_minutes}-minute slots from {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")
        
        # Get user's existing schedule to understand patterns
        user_blocks = await self.calendar_service.get_user_calendar_blocks(user_id)
        print(f"   📅 Analyzing {len(user_blocks)} existing calendar blocks")
        
        current_date = start_date
        best_slots = []
        
        while current_date <= end_date:
            # Check each hour of the day with intelligent time slots
            for hour in range(8, 18):  # 8 AM to 6 PM
                for minute_offset in [0, 15, 30, 45]:  # Check quarter-hour slots
                    test_start = current_date.replace(hour=hour, minute=minute_offset, second=0, microsecond=0)
                    test_end = test_start + timedelta(minutes=duration_minutes)
                    
                    # Skip if it goes past 6 PM
                    if test_end.hour >= 18:
                        continue
                    
                    # Check for conflicts
                    conflicts = await self.calendar_service.check_time_conflict(user_id, test_start, test_end)
                    
                    if not conflicts:
                        # Calculate slot quality score (prefer certain times)
                        quality_score = self.calculate_slot_quality(test_start, user_id)
                        best_slots.append((test_start, quality_score))
                        print(f"   ✅ Found slot: {test_start.strftime('%Y-%m-%d %H:%M')} - {test_end.strftime('%H:%M')} (Quality: {quality_score})")
            
            # Move to next day
            current_date += timedelta(days=1)
        
        if best_slots:
            # Sort by quality score and return the best option
            best_slots.sort(key=lambda x: x[1], reverse=True)
            best_time = best_slots[0][0]
            print(f"   🎯 Selected best slot: {best_time.strftime('%Y-%m-%d %H:%M')}")
            return best_time
        
        print(f"   ❌ No available slots found in the date range")
        return None
    
    def calculate_slot_quality(self, time_slot: datetime, user_id: str) -> int:
        """Calculate quality score for a time slot (like real humans prefer certain times)"""
        score = 0
        
        # Prefer morning slots (9-11 AM)
        if 9 <= time_slot.hour <= 11:
            score += 10
        
        # Prefer afternoon slots (2-4 PM)
        elif 14 <= time_slot.hour <= 16:
            score += 8
        
        # Prefer early morning over late afternoon
        elif 8 <= time_slot.hour <= 9:
            score += 6
        elif 16 <= time_slot.hour <= 17:
            score += 4
        
        # Prefer round hours (9:00, 10:00, etc.)
        if time_slot.minute == 0:
            score += 5
        elif time_slot.minute == 30:
            score += 3
        
        # Prefer weekdays over weekends (if applicable)
        if time_slot.weekday() < 5:  # Monday-Friday
            score += 2
        
        return score
    
    async def alice_negotiates(self, proposed_time: datetime) -> Dict[str, Any]:
        """Alice's negotiation logic"""
        print(f"\n🧠 Alice analyzes proposal: {proposed_time.strftime('%Y-%m-%d %H:%M')}")
        
        # Check for conflicts
        proposed_end = proposed_time + timedelta(minutes=self.meeting_request.duration_minutes)
        conflicts = await self.calendar_service.check_time_conflict("alice", proposed_time, proposed_end)
        
        if conflicts:
            print(f"   ❌ Alice has conflicts:")
            for conflict in conflicts:
                print(f"      - {conflict['title']}: {conflict['start_time']} to {conflict['end_time']} (Priority: {conflict['priority']})")
            
            # Find alternative time (search next 7 days like real humans)
            search_start = proposed_time
            search_end = search_start + timedelta(days=7)
            
            alternative_time = await self.find_available_time("alice", self.meeting_request.duration_minutes, search_start, search_end)
            
            if alternative_time:
                return {
                    "action": "counter_proposal",
                    "time": alternative_time,
                    "reasoning": f"I have conflicts at {proposed_time.strftime('%H:%M')}. How about {alternative_time.strftime('%Y-%m-%d %H:%M')}?"
                }
            else:
                return {
                    "action": "reject",
                    "reasoning": "I don't have any available time slots in the next few days"
                }
        else:
            return {
                "action": "accept",
                "time": proposed_time,
                "reasoning": f"{proposed_time.strftime('%H:%M')} works perfectly for me!"
            }
    
    async def bob_negotiates(self, proposed_time: datetime) -> Dict[str, Any]:
        """Bob's negotiation logic"""
        print(f"\n🧠 Bob analyzes proposal: {proposed_time.strftime('%Y-%m-%d %H:%M')}")
        
        # Check for conflicts
        proposed_end = proposed_time + timedelta(minutes=self.meeting_request.duration_minutes)
        conflicts = await self.calendar_service.check_time_conflict("bob", proposed_time, proposed_end)
        
        if conflicts:
            print(f"   ❌ Bob has conflicts:")
            for conflict in conflicts:
                print(f"      - {conflict['title']}: {conflict['start_time']} to {conflict['end_time']} (Priority: {conflict['priority']})")
            
            # Find alternative time (search next 7 days like real humans)
            search_start = proposed_time
            search_end = search_start + timedelta(days=7)
            
            alternative_time = await self.find_available_time("bob", self.meeting_request.duration_minutes, search_start, search_end)
            
            if alternative_time:
                return {
                    "action": "counter_proposal",
                    "time": alternative_time,
                    "reasoning": f"I have conflicts at {proposed_time.strftime('%H:%M')}. How about {alternative_time.strftime('%Y-%m-%d %H:%M')}?"
                }
            else:
                return {
                    "action": "reject",
                    "reasoning": "I don't have any available time slots in the next few days"
                }
        else:
            return {
                "action": "accept",
                "time": proposed_time,
                "reasoning": f"{proposed_time.strftime('%H:%M')} works perfectly for me!"
            }
    
    async def schedule_meeting(self, meeting_time: datetime) -> bool:
        """Actually schedule the meeting in the database"""
        print(f"\n📅 Scheduling meeting for {meeting_time.strftime('%Y-%m-%d %H:%M')}")
        
        try:
            # Create meeting request in database
            meeting_id = await self.meeting_service.create_meeting_request(
                initiator_id="bob",
                title=self.meeting_request.title,
                description=self.meeting_request.description,
                duration_minutes=self.meeting_request.duration_minutes,
                preferred_start_time=meeting_time,
                preferred_end_time=meeting_time + timedelta(minutes=self.meeting_request.duration_minutes),
                priority_level=self.meeting_request.priority_level
            )
            
            # Add participants
            await self.meeting_service.add_meeting_participant(meeting_id, "bob", BOB_AGENT_ADDRESS)
            await self.meeting_service.add_meeting_participant(meeting_id, "alice", ALICE_AGENT_ADDRESS)
            
            # Update status to scheduled
            await self.meeting_service.update_meeting_status(meeting_id, "scheduled", meeting_time)
            
            # Add calendar blocks for both participants
            meeting_end = meeting_time + timedelta(minutes=self.meeting_request.duration_minutes)
            
            await self.calendar_service.add_calendar_block(
                "bob", 
                f"Meeting: {self.meeting_request.title}", 
                meeting_time, 
                meeting_end, 
                "busy", 
                8, 
                False
            )
            
            await self.calendar_service.add_calendar_block(
                "alice", 
                f"Meeting: {self.meeting_request.title}", 
                meeting_time, 
                meeting_end, 
                "busy", 
                8, 
                False
            )
            
            self.scheduled_meeting = {
                "id": meeting_id,
                "time": meeting_time,
                "title": self.meeting_request.title
            }
            
            print(f"✅ Meeting scheduled successfully!")
            print(f"   Meeting ID: {meeting_id}")
            print(f"   Time: {meeting_time.strftime('%Y-%m-%d %H:%M')}")
            print(f"   Duration: {self.meeting_request.duration_minutes} minutes")
            print(f"   Calendar blocks added for both participants")
            
            return True
            
        except Exception as e:
            print(f"❌ Failed to schedule meeting: {e}")
            return False
    
    async def run_persistent_negotiation(self) -> bool:
        """Run continuous negotiation until success or real failure"""
        print("🚀 Starting PERSISTENT Agent Negotiation")
        print("=" * 50)
        
        # Setup database
        if not await self.setup_database():
            return False
        
        # Send initial meeting request
        if not await self.send_meeting_request():
            return False
        
        # Wait a bit for the message to be processed
        await asyncio.sleep(2)
        
        # Start negotiation
        current_proposal = self.meeting_request.preferred_start_time
        current_negotiator = "alice"  # Alice responds first
        
        for round_num in range(1, self.max_rounds + 1):
            print(f"\n🔄 Negotiation Round {round_num}")
            print("-" * 30)
            
            if current_negotiator == "alice":
                # Alice's turn to respond
                alice_response = await self.alice_negotiates(current_proposal)
                
                if alice_response["action"] == "accept":
                    self.log_message("Alice", "Bob", "ACCEPTANCE", alice_response["reasoning"])
                    
                    # Schedule the meeting
                    if await self.schedule_meeting(current_proposal):
                        print(f"\n🎉 NEGOTIATION SUCCESSFUL!")
                        print(f"   Meeting scheduled for {current_proposal.strftime('%Y-%m-%d %H:%M')}")
                        print(f"   Duration: {self.meeting_request.duration_minutes} minutes")
                        print(f"   Database updated with new meeting")
                        return True
                    else:
                        print(f"❌ Failed to schedule meeting")
                        return False
                
                elif alice_response["action"] == "counter_proposal":
                    self.log_message("Alice", "Bob", "COUNTER_PROPOSAL", alice_response["reasoning"])
                    current_proposal = alice_response["time"]
                    current_negotiator = "bob"
                
                elif alice_response["action"] == "reject":
                    self.log_message("Alice", "Bob", "REJECTION", alice_response["reasoning"])
                    print(f"\n❌ Negotiation failed: Alice rejected")
                    return False
            
            else:
                # Bob's turn to respond
                bob_response = await self.bob_negotiates(current_proposal)
                
                if bob_response["action"] == "accept":
                    self.log_message("Bob", "Alice", "ACCEPTANCE", bob_response["reasoning"])
                    
                    # Schedule the meeting
                    if await self.schedule_meeting(current_proposal):
                        print(f"\n🎉 NEGOTIATION SUCCESSFUL!")
                        print(f"   Meeting scheduled for {current_proposal.strftime('%Y-%m-%d %H:%M')}")
                        print(f"   Duration: {self.meeting_request.duration_minutes} minutes")
                        print(f"   Database updated with new meeting")
                        return True
                    else:
                        print(f"❌ Failed to schedule meeting")
                        return False
                
                elif bob_response["action"] == "counter_proposal":
                    self.log_message("Bob", "Alice", "COUNTER_PROPOSAL", bob_response["reasoning"])
                    current_proposal = bob_response["time"]
                    current_negotiator = "alice"
                
                elif bob_response["action"] == "reject":
                    self.log_message("Bob", "Alice", "REJECTION", bob_response["reasoning"])
                    print(f"\n❌ Negotiation failed: Bob rejected")
                    return False
        
        print(f"\n❌ Negotiation failed: Maximum rounds ({self.max_rounds}) reached")
        return False
    
    def print_negotiation_summary(self):
        """Print the negotiation summary"""
        print(f"\n📊 PERSISTENT Negotiation Summary:")
        print("=" * 40)
        for log_entry in self.negotiation_log:
            print(f"   {log_entry}")
        
        if self.scheduled_meeting:
            print(f"\n🎯 Meeting Scheduled:")
            print(f"   ID: {self.scheduled_meeting['id']}")
            print(f"   Time: {self.scheduled_meeting['time'].strftime('%Y-%m-%d %H:%M')}")
            print(f"   Title: {self.scheduled_meeting['title']}")
        
        print(f"\n🎯 Key Features:")
        print("   ✅ Database persistence - meetings are actually scheduled")
        print("   ✅ Multi-day exploration - checks multiple days")
        print("   ✅ Continuous negotiation - keeps trying until success")
        print("   ✅ Real-world logic - works like humans")
        print("   ✅ Calendar updates - blocks time for both participants")

async def main():
    """Main test function"""
    print("🧪 DYNAMIC Agent Negotiation - Real-World Human Logic")
    print("=" * 60)
    print("This system will:")
    print("  1. Send a meeting request with DYNAMIC duration (15-120 mins)")
    print("  2. Negotiate continuously until success or real failure")
    print("  3. Explore multiple days (up to 7 days ahead)")
    print("  4. Use intelligent time slot selection")
    print("  5. Actually schedule meetings in the database")
    print("  6. Block calendar time for both participants")
    print("  7. Remember scheduled meetings for future runs")
    print("  8. Different results every time (like real humans)")
    print()
    
    # Run the persistent negotiation
    negotiation = PersistentNegotiation()
    success = await negotiation.run_persistent_negotiation()
    
    if success:
        negotiation.print_negotiation_summary()
        print("\n🎉 PERSISTENT negotiation completed successfully!")
        print("   Meeting is now scheduled in the database")
        print("   Next run will see this meeting as a conflict")
    else:
        print("\n❌ Persistent negotiation failed")
        print("   No meeting was scheduled")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n⏹️  Test interrupted by user")
    except Exception as e:
        print(f"\n❌ Test error: {e}")
        import traceback
        traceback.print_exc()
