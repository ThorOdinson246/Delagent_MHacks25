"""
Configuration settings for Charlie's scheduling agent
"""
import os
from typing import Optional
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class CharlieAgentConfig:
    """Configuration class for Charlie's scheduling agent"""
    
    # Agent Identity
    AGENT_NAME: str = "Charlie's Agent"
    AGENT_DESCRIPTION: str = "Strategic meeting coordinator focused on efficiency and team productivity"
    PERSONALITY: str = "analytical_optimizer"  # Focuses on finding the most efficient solutions
    
    # Agent Seed (loaded from environment variable)
    AGENT_SEED: str = os.getenv("CHARLIE_AGENT_SEED", "charlie_strategic_coordinator_seed_2024")
    
    # Negotiation Settings - Charlie is more strategic and efficiency-focused
    DEFAULT_FLEXIBILITY_SCORE: int = 7  # More flexible than Alice, strategic like Bob
    DEFAULT_PRIORITY_LEVEL: int = 6      # Balanced priority
    MAX_NEGOTIATION_ROUNDS: int = 15     # Willing to negotiate longer for optimal solutions
    
    # Time Settings - Charlie prefers efficient scheduling
    DEFAULT_MEETING_DURATION: int = 45   # Prefers shorter, focused meetings
    BUFFER_TIME: int = 10                # Minimal buffer for efficiency
    PREFERRED_MEETING_BLOCKS: int = 2    # Prefers to batch meetings
    
    # Charlie's scheduling preferences
    PREFERRED_HOURS = {
        "start": 9,   # Prefers starting at 9 AM
        "end": 16,    # Prefers ending by 4 PM
        "lunch": (12, 13)  # Protects lunch hour
    }
    
    # API Settings
    API_BASE_URL: str = "http://localhost:8000"
    
    @classmethod
    def get_agent_seed(cls) -> str:
        """Get the agent seed phrase"""
        return cls.AGENT_SEED
    
    @classmethod
    def set_agent_seed(cls, seed: str) -> None:
        """Set a new agent seed phrase"""
        cls.AGENT_SEED = seed
