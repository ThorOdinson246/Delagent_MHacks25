#!/usr/bin/env python3
"""
Interactive Agent Negotiation System
- User inputs meeting preferences
- Agents negotiate to find best available slots
- Provides multiple options for user selection
- Minimal logging for clean interface
"""

import asyncio
import sys
import os
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
import uuid
import re

# Add agent directories to path
sys.path.append(os.path.join(os.path.dirname(__file__), '@agent1_pappu'))
sys.path.append(os.path.join(os.path.dirname(__file__), '@agent2_alice'))

# Agent addresses
PAPPU_AGENT_ADDRESS = "agent1qfy2twzrw6ne43eufnzadxj0s3xpzlwd7vrgde5yrq46043kp8hpzpx6x75"  # Pappu's agent
ALICE_AGENT_ADDRESS = "agent1qge95a5nqwjqgg0td05y9866jtjac7zf6g3908qjs330lm07kz8s799w9s8"  # Alice's agent

class InteractiveNegotiation:
    """Interactive negotiation system with user input"""
    
    def __init__(self):
        self.db_manager = None
        self.calendar_service = None
        self.meeting_service = None
        self.user_preferences = None
        self.available_slots = []
    
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
    
    def get_user_input(self) -> Dict[str, Any]:
        """Get meeting preferences from user"""
        print("\n📅 Meeting Scheduler")
        print("=" * 30)
        print("Please provide your meeting preferences:")
        print()
        
        # Get meeting title
        title = input("Meeting title: ").strip()
        if not title:
            title = "Meeting with Alice"
        
        # Determine if meeting is with AI agent or external person
        print("\n🤖 Meeting Type:")
        print("   1. With AI Agent (internal colleague - Alice)")
        print("   2. External Person (no AI agent)")
        while True:
            meeting_type = input("Select meeting type (1 or 2): ").strip()
            if meeting_type in ['1', '2']:
                break
            print("❌ Please enter 1 or 2")
        
        is_ai_agent_meeting = meeting_type == '1'
        
        # Get date input
        today = datetime.now().date()
        print(f"\n📅 Date (format: YYYY-MM-DD, e.g., 2025-09-30)")
        print(f"   Valid dates: {today.strftime('%Y-%m-%d')} to 2025-10-27 (weekdays only, no past dates)")

        while True:
            date_str = input("Preferred date: ").strip()
            try:
                preferred_date = datetime.strptime(date_str, "%Y-%m-%d")
                
                # Check if it's a weekend
                if preferred_date.weekday() >= 5:  # Weekend
                    day_name = preferred_date.strftime("%A")
                    print(f"❌ {day_name} is a weekend. Please select a weekday (Monday-Friday)")
                    continue
                
                # Check date range (no past dates, only future dates)
                today = datetime.now().date()
                if preferred_date.date() < today:
                    print(f"❌ Date cannot be in the past. Today is {today.strftime('%Y-%m-%d')}")
                    continue
                if preferred_date > datetime(2025, 10, 27):
                    print("❌ Date must be before 2025-10-27")
                    continue
                
                break
            except ValueError:
                print("❌ Invalid date format. Use YYYY-MM-DD (e.g., 2025-09-30)")
        
        # Get time input
        print("\n⏰ Time (format: HH:MM, e.g., 14:30)")
        print("   Valid times: 08:00 to 17:00 (business hours)")
        while True:
            time_str = input("Preferred time: ").strip()
            try:
                preferred_time = datetime.strptime(time_str, "%H:%M")
                if preferred_time.hour < 8 or preferred_time.hour >= 17:
                    print("❌ Time must be between 08:00 and 17:00")
                    continue
                break
            except ValueError:
                print("❌ Invalid time format. Use HH:MM")
        
        # Get duration input
        print("\n⏱️  Duration (in minutes)")
        print("   Valid durations: 15, 30, 45, 60, 90, 120")
        while True:
            duration_str = input("Meeting duration: ").strip()
            try:
                duration = int(duration_str)
                if duration not in [15, 30, 45, 60, 90, 120]:
                    print("❌ Duration must be 15, 30, 45, 60, 90, or 120 minutes")
                    continue
                break
            except ValueError:
                print("❌ Please enter a valid number")
        
        # Combine date and time
        preferred_datetime = preferred_date.replace(
            hour=preferred_time.hour, 
            minute=preferred_time.minute, 
            second=0, 
            microsecond=0
        )
        
        return {
            "title": title,
            "preferred_datetime": preferred_datetime,
            "duration_minutes": duration,
            "is_ai_agent_meeting": is_ai_agent_meeting
        }
    
    async def find_available_slots(self, user_prefs: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Find available time slots with proper AI agent negotiation"""
        preferred_time = user_prefs["preferred_datetime"]
        duration = user_prefs["duration_minutes"]
        is_ai_agent_meeting = user_prefs["is_ai_agent_meeting"]
        
        if is_ai_agent_meeting:
            return await self.negotiate_with_ai_agent(user_prefs)
        else:
            return await self.find_external_meeting_slots(user_prefs)
    
    async def negotiate_with_ai_agent(self, user_prefs: Dict[str, Any]) -> List[Dict[str, Any]]:
        """AI Agent negotiation between Pappu and Alice"""
        print(f"\n🤖 AI Agent Negotiation Starting...")
        print(f"   Pappu's Agent: Initiating meeting request")
        print(f"   Alice's Agent: Analyzing availability")
        
        preferred_time = user_prefs["preferred_datetime"]
        duration = user_prefs["duration_minutes"]
        
        # Check if preferred time is within business hours
        if preferred_time.hour >= 17 or preferred_time.hour < 8:
            print(f"   ⚠️  Pappu's Agent: {preferred_time.strftime('%H:%M')} is outside business hours (8:00-17:00)")
            print(f"   🔄 Pappu's Agent: Requesting alternative time negotiation")
        
        # Search window: 5 days before and after preferred date for better negotiation
        # But ensure we don't search before today or beyond database range
        today = datetime.now().date()
        db_end_date = datetime(2025, 10, 27).date()
        search_start = max(preferred_time - timedelta(days=5), datetime.combine(today, datetime.min.time()))
        search_end = min(preferred_time + timedelta(days=5), datetime.combine(db_end_date, datetime.max.time()))
        
        print(f"   🔍 Both agents: Searching 5 days before/after preferred date")
        
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
                        quality_score = self.calculate_slot_quality(test_start, preferred_time)
                        available_slots.append({
                            "start_time": test_start,
                            "end_time": test_end,
                            "quality_score": quality_score,
                            "duration_minutes": duration
                        })
            
            current_date += timedelta(days=1)
        
        # Sort by quality score (higher is better)
        available_slots.sort(key=lambda x: x["quality_score"], reverse=True)
        
        # AI Agent negotiation results
        if available_slots:
            best_slot = available_slots[0]
            print(f"   ✅ Alice's Agent: Found {len(available_slots)} available slots")
            print(f"   🎯 Best Option: {best_slot['start_time'].strftime('%A, %Y-%m-%d at %H:%M')} (Score: {best_slot['quality_score']})")
            print(f"   📋 Alice's Agent: Providing top 3 options for Pappu's consideration")
        else:
            print(f"   ❌ Alice's Agent: No available slots found in search window")
            print(f"   💬 Alice's Agent: Suggesting to expand search or reschedule")
        
        return available_slots[:3]  # Return top 3 options for AI agent negotiation
    
    async def find_external_meeting_slots(self, user_prefs: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Find slots for external meetings (only Pappu's schedule)"""
        print(f"\n👤 External Meeting Scheduling")
        print(f"   Pappu's Agent: Checking personal availability only")
        
        preferred_time = user_prefs["preferred_datetime"]
        duration = user_prefs["duration_minutes"]
        
        # Check if preferred time is within business hours
        if preferred_time.hour >= 17 or preferred_time.hour < 8:
            print(f"   ⚠️  Pappu's Agent: {preferred_time.strftime('%H:%M')} is outside business hours (8:00-17:00)")
            print(f"   🔄 Pappu's Agent: Finding alternative times")
        
        # Search window: 3 days before and after preferred date
        # But ensure we don't search before today or beyond database range
        today = datetime.now().date()
        db_end_date = datetime(2025, 10, 27).date()
        search_start = max(preferred_time - timedelta(days=3), datetime.combine(today, datetime.min.time()))
        search_end = min(preferred_time + timedelta(days=3), datetime.combine(db_end_date, datetime.max.time()))
        
        print(f"   🔍 Pappu's Agent: Searching 3 days before/after preferred date")
        
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
                        quality_score = self.calculate_slot_quality(test_start, preferred_time)
                        available_slots.append({
                            "start_time": test_start,
                            "end_time": test_end,
                            "quality_score": quality_score,
                            "duration_minutes": duration
                        })
            
            current_date += timedelta(days=1)
        
        # Sort by quality score (higher is better)
        available_slots.sort(key=lambda x: x["quality_score"], reverse=True)
        
        if available_slots:
            best_slot = available_slots[0]
            print(f"   ✅ Pappu's Agent: Found {len(available_slots)} available slots")
            print(f"   🎯 Best Option: {best_slot['start_time'].strftime('%A, %Y-%m-%d at %H:%M')} (Score: {best_slot['quality_score']})")
        else:
            print(f"   ❌ Pappu's Agent: No available slots found")
        
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
    
    def display_available_slots(self, slots: List[Dict[str, Any]], is_ai_agent_meeting: bool = True) -> str:
        """Display available time slots to user. Returns 'restart' if user wants to restart, None otherwise"""
        if not slots:
            if is_ai_agent_meeting:
                print("\n❌ AI Agent Negotiation: No available time slots found")
                print("   💬 Both agents suggest expanding search window or rescheduling")
            else:
                print("\n❌ External Meeting: No available time slots found")
                print("   💬 Pappu's agent suggests checking different dates")
            
            # Ask user if they want to restart
            while True:
                restart_choice = input("\n🔄 Would you like to restart with new preferences? (y/n): ").strip().lower()
                if restart_choice in ['y', 'yes']:
                    print("🔄 Restarting meeting scheduler...")
                    return "restart"
                elif restart_choice in ['n', 'no']:
                    return None
                else:
                    print("❌ Please enter 'y' for yes or 'n' for no")
            return None
        
        if is_ai_agent_meeting:
            print(f"\n🤖 AI Agent Negotiation Results:")
            print(f"   📋 Alice's Agent: Found {len(slots)} mutually available slots")
            print(f"   🎯 Pappu's Agent: Please select your preferred option")
        else:
            print(f"\n👤 External Meeting Results:")
            print(f"   📋 Pappu's Agent: Found {len(slots)} available slots")
            print(f"   🎯 Please select your preferred option")
        
        print("-" * 60)
        
        for i, slot in enumerate(slots, 1):
            start_time = slot["start_time"]
            end_time = slot["end_time"]
            quality = slot["quality_score"]
            
            # Add recommendation indicator
            if i == 1:
                recommendation = "⭐ RECOMMENDED"
            elif i == 2:
                recommendation = "🔄 ALTERNATIVE 1"
            elif i == 3:
                recommendation = "🔄 ALTERNATIVE 2"
            else:
                recommendation = ""
            
            print(f"{i}. {start_time.strftime('%A, %Y-%m-%d at %H:%M')} - {end_time.strftime('%H:%M')} {recommendation}")
            print(f"   Duration: {slot['duration_minutes']} minutes | Quality Score: {quality}")
            print()
    
    def get_user_selection(self, slots: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Get user's selection from available slots"""
        if not slots:
            return None
        
        while True:
            try:
                choice = input(f"Select a slot (1-{len(slots)}) or 'q' to quit: ").strip().lower()
                if choice == 'q':
                    return None
                
                choice_num = int(choice)
                if 1 <= choice_num <= len(slots):
                    return slots[choice_num - 1]
                else:
                    print(f"❌ Please enter a number between 1 and {len(slots)}")
            except ValueError:
                print("❌ Please enter a valid number or 'q' to quit")
    
    async def schedule_meeting(self, slot: Dict[str, Any], user_prefs: Dict[str, Any]) -> bool:
        """Schedule the selected meeting"""
        print(f"\n📅 Scheduling meeting...")
        
        try:
            # Create meeting request
            meeting_id = await self.meeting_service.create_meeting_request(
                initiator_id="bob",  # Pappu is represented as "bob" in the database
                title=user_prefs["title"],
                description=f"Meeting scheduled by user",
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
                f"Meeting: {user_prefs['title']}", 
                slot["start_time"], 
                slot["end_time"], 
                "busy", 
                8, 
                False
            )
            
            await self.calendar_service.add_calendar_block(
                "alice", 
                f"Meeting: {user_prefs['title']}", 
                slot["start_time"], 
                slot["end_time"], 
                "busy", 
                8, 
                False
            )
            
            print(f"✅ Meeting scheduled successfully!")
            print(f"   Meeting ID: {meeting_id}")
            print(f"   Time: {slot['start_time'].strftime('%A, %Y-%m-%d at %H:%M')}")
            print(f"   Duration: {slot['duration_minutes']} minutes")
            
            return True
            
        except Exception as e:
            print(f"❌ Failed to schedule meeting: {e}")
            return False
    
    async def run(self) -> bool:
        """Run the interactive negotiation system"""
        print("🤖 Interactive Agent Negotiation System")
        print("=" * 40)
        
        # Setup database
        if not await self.setup_database():
            return False
        
        while True:
            # Get user preferences
            self.user_preferences = self.get_user_input()
            
            # Find available slots
            self.available_slots = await self.find_available_slots(self.user_preferences)
            
            # Display options and check for restart request
            restart_signal = self.display_available_slots(self.available_slots, self.user_preferences["is_ai_agent_meeting"])
            
            if restart_signal == "restart":
                continue  # Restart the loop with new preferences
            
            if not self.available_slots:
                print("\n👋 Meeting scheduling cancelled")
                return False
            
            # Get user selection
            selected_slot = self.get_user_selection(self.available_slots)
            
            if selected_slot:
                # Schedule the meeting
                return await self.schedule_meeting(selected_slot, self.user_preferences)
            else:
                print("\n👋 Meeting scheduling cancelled")
                return False

async def main():
    """Main function"""
    negotiation = InteractiveNegotiation()
    success = await negotiation.run()
    
    if success:
        print("\n🎉 Meeting scheduled successfully!")
    else:
        print("\n❌ No meeting was scheduled")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n⏹️  Interrupted by user")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()