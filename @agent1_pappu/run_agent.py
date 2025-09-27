#!/usr/bin/env python3
"""
Simple script to run the scheduling agent with proper setup
"""
import asyncio
import sys
import os
from uagents.setup import fund_agent_if_low

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from scheduling_agent import agent, AgentConfig
from agent_personalities import PersonalityFactory

def setup_agent():
    """Setup and fund the agent"""
    print("🔧 Setting up agent...")
    print("✅ Agent setup complete")

def print_startup_info():
    """Print startup information"""
    print("🤖 Scheduling Agent Startup")
    print("=" * 40)
    print(f"Agent Name: {AgentConfig.AGENT_NAME}")
    print(f"Agent Address: {agent.address}")
    
    print("\n📋 Available Personalities:")
    for personality in PersonalityFactory.get_available_personalities():
        print(f"  - {personality}")
    
    print("\n🔧 Available Commands:")
    print("  python run_agent.py                    # Start agent")
    print("  python run_agent.py --personality <type> # Start with specific personality")
    print("  python run_agent.py --help             # Show this help")
    
    print("\n🧪 Testing Commands:")
    print("  python test_agent.py --info            # Show agent info")
    print("  python test_agent.py --test            # Run basic tests")
    print("  python test_agent.py --comprehensive   # Run all tests")

def main():
    """Main function"""
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "--help":
            print_startup_info()
            return
        elif command == "--personality" and len(sys.argv) > 2:
            personality = sys.argv[2]
            if personality in PersonalityFactory.get_available_personalities():
                from scheduling_agent import change_agent_personality
                change_agent_personality(personality)
                print(f"✅ Agent personality set to: {personality}")
            else:
                print(f"❌ Unknown personality: {personality}")
                print(f"Available personalities: {PersonalityFactory.get_available_personalities()}")
                return
        else:
            print(f"❌ Unknown command: {command}")
            print("Use --help for available commands")
            return
    
    # Setup agent
    setup_agent()
    
    # Print startup info
    print_startup_info()
    
    print("\n🚀 Starting agent...")
    print("Press Ctrl+C to stop")
    print("=" * 40)
    
    try:
        # Start the agent
        agent.run()
    except KeyboardInterrupt:
        print("\n⏹️  Agent stopped by user")
    except Exception as e:
        print(f"\n❌ Agent error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n⏹️  Startup interrupted by user")
    except Exception as e:
        print(f"\n❌ Startup error: {e}")
        import traceback
        traceback.print_exc()
