"""
Configuration settings for Alice's scheduling agent
"""
import os
from typing import Optional
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class AliceAgentConfig:
    """Configuration class for Alice's scheduling agent"""
    
    # Agent Identity
    AGENT_NAME: str = os.getenv("AGENT_NAME", "AliceAgent")
    AGENT_DESCRIPTION: str = os.getenv("AGENT_DESCRIPTION", "Alice's personal AI agent for meeting scheduling and negotiation")
    
    # Agent Seed (loaded from environment variable)
    AGENT_SEED: str = os.getenv("AGENT_SEED", "alice_agent_scheduling_meeting_negotiation_collaboration_focus_time_productivity")
    
    # Negotiation Settings
    DEFAULT_FLEXIBILITY_SCORE: int = int(os.getenv("DEFAULT_FLEXIBILITY_SCORE", "4"))
    DEFAULT_PRIORITY_LEVEL: int = int(os.getenv("DEFAULT_PRIORITY_LEVEL", "7"))
    MAX_NEGOTIATION_ROUNDS: int = 10
    
    # Time Settings
    DEFAULT_MEETING_DURATION: int = 60   # minutes
    BUFFER_TIME: int = 15                # minutes between meetings
    
    # Database Settings
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/agentschedule")
    API_BASE_URL: str = os.getenv("API_BASE_URL", "http://localhost:8000")
    
    # Alice's Personality
    PERSONALITY_TYPE: str = os.getenv("PERSONALITY_TYPE", "focused")
    
    @classmethod
    def get_agent_seed(cls) -> str:
        """Get the agent seed phrase"""
        return cls.AGENT_SEED
    
    @classmethod
    def set_agent_seed(cls, seed: str) -> None:
        """Set a new agent seed phrase"""
        cls.AGENT_SEED = seed
