#!/usr/bin/env python3
"""
Database setup script using SQLite (no PostgreSQL required)
Creates database with real schema and mock data for agent schedules
"""
import sqlite3
import asyncio
from datetime import datetime, timedelta
import sys
import os
import random
import uuid

# Database configuration
DATABASE_PATH = "/home/pappu/MHacks2025/agentschedule.db"

# SQL schema adapted for SQLite
SCHEMA_SQL = """
-- Core Users & Agent Management
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    agent_address TEXT UNIQUE,
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_agents (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    agent_name TEXT NOT NULL,
    personality_prompt TEXT,
    flexibility_score INTEGER DEFAULT 5,
    preferences TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Internal Calendar System
CREATE TABLE IF NOT EXISTS calendar_blocks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    block_type TEXT DEFAULT 'busy',
    priority INTEGER DEFAULT 5,
    is_moveable BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Meeting Management
CREATE TABLE IF NOT EXISTS meeting_requests (
    id TEXT PRIMARY KEY,
    initiator_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL,
    preferred_start_time TIMESTAMP,
    preferred_end_time TIMESTAMP,
    priority_level INTEGER DEFAULT 5,
    status TEXT DEFAULT 'negotiating',
    final_scheduled_time TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS meeting_participants (
    id TEXT PRIMARY KEY,
    meeting_request_id TEXT,
    user_id TEXT NOT NULL,
    agent_address TEXT,
    is_required BOOLEAN DEFAULT 1,
    status TEXT DEFAULT 'pending',
    constraints TEXT,
    UNIQUE(meeting_request_id, user_id)
);

-- Agent Negotiation Tracking
CREATE TABLE IF NOT EXISTS negotiation_sessions (
    id TEXT PRIMARY KEY,
    meeting_request_id TEXT,
    status TEXT DEFAULT 'active',
    current_round INTEGER DEFAULT 1,
    max_rounds INTEGER DEFAULT 10,
    best_proposal TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS negotiation_messages (
    id TEXT PRIMARY KEY,
    negotiation_session_id TEXT,
    from_agent_address TEXT NOT NULL,
    to_agent_address TEXT NOT NULL,
    message_type TEXT NOT NULL,
    proposed_time TIMESTAMP NULL,
    reasoning TEXT NOT NULL,
    conflicts_identified TEXT,
    round_number INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Voice Processing
CREATE TABLE IF NOT EXISTS voice_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    transcript TEXT,
    extracted_intent TEXT,
    status TEXT DEFAULT 'processing',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""

def generate_alice_daily_schedule(date, day_offset):
    """Generate realistic daily schedule for Alice (focused software engineer)"""
    blocks = []
    base_id = f"alice_{day_offset}_"
    
    # Alice's typical schedule patterns
    morning_focus_start = random.choice([8, 9, 9, 9])  # Usually 9 AM
    morning_focus_duration = random.choice([2, 3, 3, 4])  # 2-4 hours
    
    # Morning focus time (high priority, not moveable)
    blocks.append((
        f"{base_id}1", "alice", "Deep Work Session", 
        date.replace(hour=morning_focus_start, minute=0, second=0, microsecond=0),
        date.replace(hour=morning_focus_start + morning_focus_duration, minute=0, second=0, microsecond=0),
        "focus_time", 9, False
    ))
    
    # Lunch (fixed time)
    lunch_start = random.choice([12, 12, 13])  # Usually 12-1 PM
    blocks.append((
        f"{base_id}2", "alice", "Lunch Break",
        date.replace(hour=lunch_start, minute=0, second=0, microsecond=0),
        date.replace(hour=lunch_start + 1, minute=0, second=0, microsecond=0),
        "busy", 6, False
    ))
    
    # Afternoon work (varies by day)
    afternoon_start = lunch_start + 1
    if random.random() < 0.3:  # 30% chance of afternoon focus time
        blocks.append((
            f"{base_id}3", "alice", "Afternoon Focus",
            date.replace(hour=afternoon_start, minute=0, second=0, microsecond=0),
            date.replace(hour=afternoon_start + 2, minute=0, second=0, microsecond=0),
            "focus_time", 8, False
        ))
        afternoon_start += 2
    
    # Team meetings (varies)
    if random.random() < 0.4:  # 40% chance of team meeting
        meeting_duration = random.choice([30, 45, 60])
        meeting_end_hour = afternoon_start + (meeting_duration // 60)
        meeting_end_minute = meeting_duration % 60
        blocks.append((
            f"{base_id}4", "alice", "Team Meeting",
            date.replace(hour=afternoon_start, minute=0, second=0, microsecond=0),
            date.replace(hour=meeting_end_hour, minute=meeting_end_minute, second=0, microsecond=0),
            "busy", 7, False
        ))
        afternoon_start += 1
    
    # Code review or client call
    if random.random() < 0.3:  # 30% chance
        blocks.append((
            f"{base_id}5", "alice", "Code Review",
            date.replace(hour=afternoon_start, minute=0, second=0, microsecond=0),
            date.replace(hour=afternoon_start + 1, minute=0, second=0, microsecond=0),
            "busy", 6, False
        ))
    
    return blocks

def generate_bob_daily_schedule(date, day_offset):
    """Generate realistic daily schedule for Bob (collaborative project manager)"""
    blocks = []
    base_id = f"bob_{day_offset}_"
    
    # Bob's typical schedule patterns (more meetings, more flexible)
    morning_start = random.choice([8, 9, 9])  # Usually 9 AM
    
    # Morning planning/standup
    if random.random() < 0.6:  # 60% chance of morning meeting
        blocks.append((
            f"{base_id}1", "bob", "Daily Standup",
            date.replace(hour=morning_start, minute=0, second=0, microsecond=0),
            date.replace(hour=morning_start, minute=30, second=0, microsecond=0),
            "busy", 7, False
        ))
        morning_start += 1
    
    # Flexible work time (moveable)
    blocks.append((
        f"{base_id}2", "bob", "Flexible Work Time",
        date.replace(hour=morning_start, minute=0, second=0, microsecond=0),
        date.replace(hour=morning_start + 2, minute=0, second=0, microsecond=0),
        "flexible", 3, True
    ))
    
    # Lunch
    lunch_start = random.choice([12, 12, 13])
    blocks.append((
        f"{base_id}3", "bob", "Lunch",
        date.replace(hour=lunch_start, minute=0, second=0, microsecond=0),
        date.replace(hour=lunch_start + 1, minute=0, second=0, microsecond=0),
        "busy", 5, False
    ))
    
    # Afternoon meetings (Bob has more meetings)
    afternoon_start = lunch_start + 1
    meeting_count = random.randint(1, 3)  # 1-3 afternoon meetings
    
    for i in range(meeting_count):
        meeting_types = ["Client Call", "Project Review", "Team Sync", "Stakeholder Meeting", "Planning Session"]
        meeting_type = random.choice(meeting_types)
        meeting_duration = random.choice([30, 45, 60, 90])
        
        meeting_end_hour = afternoon_start + (meeting_duration // 60)
        meeting_end_minute = meeting_duration % 60
        blocks.append((
            f"{base_id}{4+i}", "bob", meeting_type,
            date.replace(hour=afternoon_start, minute=0, second=0, microsecond=0),
            date.replace(hour=meeting_end_hour, minute=meeting_end_minute, second=0, microsecond=0),
            "busy", random.randint(6, 8), False
        ))
        
        afternoon_start += (meeting_duration // 60) + 1
    
    # End of day flexible time
    if afternoon_start < 17:
        blocks.append((
            f"{base_id}{4+meeting_count}", "bob", "End of Day Tasks",
            date.replace(hour=afternoon_start, minute=0, second=0, microsecond=0),
            date.replace(hour=17, minute=0, second=0, microsecond=0),
            "flexible", 2, True
        ))
    
    return blocks

def setup_database():
    """Setup the SQLite database with schema and mock data"""
    print("🔧 Setting up SQLite database...")
    
    try:
        # Connect to SQLite database
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        print("✅ Connected to SQLite database")
        
        # Create schema
        cursor.executescript(SCHEMA_SQL)
        print("✅ Database schema created")
        
        # Clear existing data
        cursor.execute("DELETE FROM calendar_blocks")
        cursor.execute("DELETE FROM users")
        print("✅ Cleared existing data")
        
        # Insert users
        users_data = [
            ("alice", "Alice Johnson", "alice@example.com", "agent1qfy2twzrw6ne43eufnzadxj0s3xpzlwd7vrgde5yrq46043kp8hpzpx6x76"),
            ("bob", "Bob Smith", "bob@example.com", "agent1qfy2twzrw6ne43eufnzadxj0s3xpzlwd7vrgde5yrq46043kp8hpzpx6x75")
        ]
        
        for user_id, name, email, agent_address in users_data:
            cursor.execute("""
                INSERT INTO users (id, name, email, agent_address) 
                VALUES (?, ?, ?, ?)
            """, (user_id, name, email, agent_address))
        
        print("✅ Users created")
        
        # Create realistic schedules for both users for the next month
        now = datetime.now().replace(year=2025, month=9, day=27, hour=0, minute=0, second=0, microsecond=0)
        alice_calendar = []
        bob_calendar = []
        
        # Generate realistic schedules for 30 days
        for day in range(30):
            current_date = now + timedelta(days=day)
            day_of_week = current_date.weekday()  # 0=Monday, 6=Sunday
            
            # Skip weekends for work schedules
            if day_of_week >= 5:  # Saturday or Sunday
                continue
                
            # Alice's schedule (focused personality - software engineer)
            alice_blocks = generate_alice_daily_schedule(current_date, day)
            alice_calendar.extend(alice_blocks)
            
            # Bob's schedule (collaborative personality - project manager)
            bob_blocks = generate_bob_daily_schedule(current_date, day)
            bob_calendar.extend(bob_blocks)
        
        # Insert Alice's calendar blocks
        for block_id, user_id, title, start_time, end_time, block_type, priority, is_moveable in alice_calendar:
            cursor.execute("""
                INSERT INTO calendar_blocks (id, user_id, title, start_time, end_time, block_type, priority, is_moveable)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (block_id, user_id, title, start_time, end_time, block_type, priority, is_moveable))
        
        print(f"✅ Alice's calendar created ({len(alice_calendar)} blocks) - focused personality")
        
        # Insert Bob's calendar blocks
        for block_id, user_id, title, start_time, end_time, block_type, priority, is_moveable in bob_calendar:
            cursor.execute("""
                INSERT INTO calendar_blocks (id, user_id, title, start_time, end_time, block_type, priority, is_moveable)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (block_id, user_id, title, start_time, end_time, block_type, priority, is_moveable))
        
        print(f"✅ Bob's calendar created ({len(bob_calendar)} blocks) - collaborative personality")
        
        conn.commit()
        conn.close()
        print("✅ Database setup completed successfully!")
        
        # Print summary
        print("\n📊 Database Summary:")
        print("👤 Users: Alice (focused), Bob (collaborative)")
        print("📅 Alice's Schedule: Heavy focus time, protective of deep work")
        print("📅 Bob's Schedule: More flexible, collaborative approach")
        print("🤝 Test Meeting: Project Planning (90 min, initiated by Bob)")
        print(f"🗄️  Database Location: {DATABASE_PATH}")
        
        return True
        
    except Exception as e:
        print(f"❌ Database setup failed: {e}")
        return False

def show_database_contents():
    """Show the contents of the database"""
    print("\n🔍 Database Contents:")
    print("=" * 40)
    
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        # Show users
        print("\n👤 Users:")
        cursor.execute("SELECT id, name, email, agent_address FROM users")
        for row in cursor.fetchall():
            print(f"   {row[0]}: {row[1]} ({row[2]}) -> {row[3][:20]}...")
        
        # Show Alice's calendar
        print("\n📅 Alice's Calendar:")
        cursor.execute("""
            SELECT title, start_time, end_time, block_type, priority, is_moveable 
            FROM calendar_blocks WHERE user_id = 'alice' 
            ORDER BY start_time
        """)
        for row in cursor.fetchall():
            moveable = "Moveable" if row[5] else "Fixed"
            print(f"   {row[1][:16]} - {row[2][:16]}: {row[0]} ({row[3]}, Priority: {row[4]}, {moveable})")
        
        # Show Bob's calendar
        print("\n📅 Bob's Calendar:")
        cursor.execute("""
            SELECT title, start_time, end_time, block_type, priority, is_moveable 
            FROM calendar_blocks WHERE user_id = 'bob' 
            ORDER BY start_time
        """)
        for row in cursor.fetchall():
            moveable = "Moveable" if row[5] else "Fixed"
            print(f"   {row[1][:16]} - {row[2][:16]}: {row[0]} ({row[3]}, Priority: {row[4]}, {moveable})")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Error reading database: {e}")

def main():
    """Main function"""
    print("🗄️  AgentSchedule Database Setup (SQLite)")
    print("=" * 50)
    
    if setup_database():
        show_database_contents()
        
        print("\n🚀 Ready for agent negotiation!")
        print("   - Alice's agent: Focused personality, protective of focus time")
        print("   - Bob's agent: Collaborative personality, flexible scheduling")
        print("   - Real calendar data loaded for both agents")
        print(f"   - Database file: {DATABASE_PATH}")
    else:
        print("❌ Database setup failed")

if __name__ == "__main__":
    main()
