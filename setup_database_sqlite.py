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
        
        # Create Alice's calendar (focused personality - lots of focus time)
        now = datetime.now()
        alice_calendar = [
            # Today
            ("alice_1", "alice", "Morning Focus Time", now.replace(hour=9, minute=0, second=0, microsecond=0), 
             now.replace(hour=11, minute=0, second=0, microsecond=0), "focus_time", 9, False),
            ("alice_2", "alice", "Lunch Break", now.replace(hour=12, minute=0, second=0, microsecond=0), 
             now.replace(hour=13, minute=0, second=0, microsecond=0), "busy", 6, False),
            ("alice_3", "alice", "Afternoon Focus Time", now.replace(hour=14, minute=0, second=0, microsecond=0), 
             now.replace(hour=16, minute=0, second=0, microsecond=0), "focus_time", 8, False),
            ("alice_4", "alice", "Team Standup", now.replace(hour=16, minute=30, second=0, microsecond=0), 
             now.replace(hour=17, minute=0, second=0, microsecond=0), "busy", 7, False),
            
            # Tomorrow
            ("alice_5", "alice", "Deep Work Session", (now + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0), 
             (now + timedelta(days=1)).replace(hour=12, minute=0, second=0, microsecond=0), "focus_time", 9, False),
            ("alice_6", "alice", "Client Call", (now + timedelta(days=1)).replace(hour=14, minute=0, second=0, microsecond=0), 
             (now + timedelta(days=1)).replace(hour=15, minute=0, second=0, microsecond=0), "busy", 8, False),
            ("alice_7", "alice", "Flexible Time", (now + timedelta(days=1)).replace(hour=15, minute=30, second=0, microsecond=0), 
             (now + timedelta(days=1)).replace(hour=17, minute=0, second=0, microsecond=0), "flexible", 4, True),
            
            # Day after tomorrow
            ("alice_8", "alice", "Morning Focus", (now + timedelta(days=2)).replace(hour=9, minute=0, second=0, microsecond=0), 
             (now + timedelta(days=2)).replace(hour=11, minute=0, second=0, microsecond=0), "focus_time", 9, False),
            ("alice_9", "alice", "Project Review", (now + timedelta(days=2)).replace(hour=14, minute=0, second=0, microsecond=0), 
             (now + timedelta(days=2)).replace(hour=15, minute=30, second=0, microsecond=0), "busy", 7, False),
        ]
        
        for block_id, user_id, title, start_time, end_time, block_type, priority, is_moveable in alice_calendar:
            cursor.execute("""
                INSERT INTO calendar_blocks (id, user_id, title, start_time, end_time, block_type, priority, is_moveable)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (block_id, user_id, title, start_time, end_time, block_type, priority, is_moveable))
        
        print("✅ Alice's calendar created (focused personality)")
        
        # Create Bob's calendar (collaborative personality - more flexible)
        bob_calendar = [
            # Today
            ("bob_1", "bob", "Team Meeting", now.replace(hour=10, minute=0, second=0, microsecond=0), 
             now.replace(hour=11, minute=0, second=0, microsecond=0), "busy", 6, False),
            ("bob_2", "bob", "Lunch", now.replace(hour=12, minute=0, second=0, microsecond=0), 
             now.replace(hour=13, minute=0, second=0, microsecond=0), "busy", 5, False),
            ("bob_3", "bob", "Flexible Work Time", now.replace(hour=13, minute=30, second=0, microsecond=0), 
             now.replace(hour=15, minute=0, second=0, microsecond=0), "flexible", 3, True),
            ("bob_4", "bob", "Client Presentation", now.replace(hour=15, minute=30, second=0, microsecond=0), 
             now.replace(hour=16, minute=30, second=0, microsecond=0), "busy", 8, False),
            
            # Tomorrow
            ("bob_5", "bob", "Flexible Morning", (now + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0), 
             (now + timedelta(days=1)).replace(hour=11, minute=0, second=0, microsecond=0), "flexible", 2, True),
            ("bob_6", "bob", "Project Sync", (now + timedelta(days=1)).replace(hour=11, minute=30, second=0, microsecond=0), 
             (now + timedelta(days=1)).replace(hour=12, minute=30, second=0, microsecond=0), "busy", 6, False),
            ("bob_7", "bob", "Open Time", (now + timedelta(days=1)).replace(hour=14, minute=0, second=0, microsecond=0), 
             (now + timedelta(days=1)).replace(hour=17, minute=0, second=0, microsecond=0), "available", 1, True),
            
            # Day after tomorrow
            ("bob_8", "bob", "Weekly Planning", (now + timedelta(days=2)).replace(hour=9, minute=0, second=0, microsecond=0), 
             (now + timedelta(days=2)).replace(hour=10, minute=0, second=0, microsecond=0), "busy", 7, False),
            ("bob_9", "bob", "Flexible Afternoon", (now + timedelta(days=2)).replace(hour=10, minute=30, second=0, microsecond=0), 
             (now + timedelta(days=2)).replace(hour=17, minute=0, second=0, microsecond=0), "flexible", 2, True),
        ]
        
        for block_id, user_id, title, start_time, end_time, block_type, priority, is_moveable in bob_calendar:
            cursor.execute("""
                INSERT INTO calendar_blocks (id, user_id, title, start_time, end_time, block_type, priority, is_moveable)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (block_id, user_id, title, start_time, end_time, block_type, priority, is_moveable))
        
        print("✅ Bob's calendar created (collaborative personality)")
        
        # Create a test meeting request
        meeting_id = "test-meeting-001"
        cursor.execute("""
            INSERT INTO meeting_requests (id, initiator_id, title, description, duration_minutes, 
                                        preferred_start_time, preferred_end_time, priority_level)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (meeting_id, "bob", "Project Planning Meeting", "Weekly project planning and review", 90,
        now + timedelta(hours=2), now + timedelta(hours=6), 6))
        
        # Add participants
        cursor.execute("""
            INSERT INTO meeting_participants (id, meeting_request_id, user_id, agent_address, is_required)
            VALUES (?, ?, ?, ?, ?)
        """, ("participant_1", meeting_id, "bob", "agent1qfy2twzrw6ne43eufnzadxj0s3xpzlwd7vrgde5yrq46043kp8hpzpx6x75", True))
        
        cursor.execute("""
            INSERT INTO meeting_participants (id, meeting_request_id, user_id, agent_address, is_required)
            VALUES (?, ?, ?, ?, ?)
        """, ("participant_2", meeting_id, "alice", "agent1qfy2twzrw6ne43eufnzadxj0s3xpzlwd7vrgde5yrq46043kp8hpzpx6x76", True))
        
        print("✅ Test meeting request created")
        
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
