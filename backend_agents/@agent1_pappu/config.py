"""
Configuration settings for the scheduling agent
"""
import os
from typing import Optional
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class AgentConfig:
    """Configuration class for the scheduling agent"""
    
    # Agent Identity
    AGENT_NAME: str = os.getenv("AGENT_NAME", "SchedulingAgent")
    AGENT_DESCRIPTION: str = os.getenv("AGENT_DESCRIPTION", "AI agent for autonomous meeting scheduling and negotiation")
    
    # Agent Seed (loaded from environment variable)
    AGENT_SEED: str = os.getenv("AGENT_SEED", "default_seed_phrase_please_set_in_env_file")
    
    # Negotiation Settings
    DEFAULT_FLEXIBILITY_SCORE: int = 5  # 1-10 scale
    DEFAULT_PRIORITY_LEVEL: int = 5      # 1-10 scale
    MAX_NEGOTIATION_ROUNDS: int = 10
    
    # Time Settings
    DEFAULT_MEETING_DURATION: int = 60   # minutes
    BUFFER_TIME: int = 15                # minutes between meetings
    
    # API Settings (for future backend integration)
    API_BASE_URL: str = "http://localhost:8000"
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/agentschedule"
    
    @classmethod
    def get_agent_seed(cls) -> str:
        """Get the agent seed phrase"""
        return cls.AGENT_SEED
    
    @classmethod
    def set_agent_seed(cls, seed: str) -> None:
        """Set a new agent seed phrase"""
        cls.AGENT_SEED = seed
