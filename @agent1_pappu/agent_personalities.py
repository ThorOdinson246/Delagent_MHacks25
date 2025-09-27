"""
Different agent personalities for negotiation styles
"""
from typing import Dict, Any
from decision_engine import DecisionEngine

class AgentPersonality:
    """Base class for agent personalities"""
    
    def __init__(self):
        self.name = "default"
        self.flexibility_score = 5
        self.priority_threshold = 5
        self.negotiation_style = "collaborative"
        self.response_templates = {}
    
    def get_negotiation_style(self) -> str:
        return self.negotiation_style
    
    def get_flexibility_score(self) -> int:
        return self.flexibility_score
    
    def get_priority_threshold(self) -> int:
        return self.priority_threshold
    
    def generate_reasoning(self, context: Dict[str, Any]) -> str:
        """Generate personality-specific reasoning"""
        return "Standard reasoning provided"

class CollaborativePersonality(AgentPersonality):
    """Collaborative agent that prioritizes group harmony"""
    
    def __init__(self):
        super().__init__()
        self.name = "collaborative"
        self.flexibility_score = 7
        self.priority_threshold = 6
        self.negotiation_style = "collaborative"
        self.response_templates = {
            "acceptance": "I'm happy to accommodate this time. Let's make this work for everyone!",
            "rejection": "I understand this time doesn't work for everyone. Let me suggest an alternative that might work better for the group.",
            "proposal": "I've found a time that should work well for everyone. What do you think?",
            "counter_proposal": "I appreciate your proposal. Here's an alternative that might be even better for the team."
        }
    
    def generate_reasoning(self, context: Dict[str, Any]) -> str:
        """Generate collaborative reasoning"""
        if context.get("action") == "accept":
            return "This time works well and I want to ensure everyone can participate effectively."
        elif context.get("action") == "reject":
            return "I'm concerned this time might not work for everyone. Let's find a better solution together."
        elif context.get("action") == "propose":
            return "I've considered everyone's schedule and found a time that balances all our needs."
        else:
            return "I'm focused on finding a solution that works for the entire team."

class StrictPersonality(AgentPersonality):
    """Strict agent that prioritizes schedule integrity"""
    
    def __init__(self):
        super().__init__()
        self.name = "strict"
        self.flexibility_score = 3
        self.priority_threshold = 8
        self.negotiation_style = "strict"
        self.response_templates = {
            "acceptance": "This time fits within my schedule constraints. Accepted.",
            "rejection": "This time conflicts with my existing commitments. I cannot accommodate this request.",
            "proposal": "Based on my schedule analysis, this is the optimal time. No alternatives available.",
            "counter_proposal": "My schedule is fixed. Here are the only available times I can offer."
        }
    
    def generate_reasoning(self, context: Dict[str, Any]) -> str:
        """Generate strict reasoning"""
        if context.get("action") == "accept":
            return "This time aligns with my schedule requirements and priorities."
        elif context.get("action") == "reject":
            return "This time conflicts with high-priority commitments that cannot be moved."
        elif context.get("action") == "propose":
            return "This is the only time that fits my schedule constraints and priorities."
        else:
            return "My schedule is highly structured and has limited flexibility."

class FlexiblePersonality(AgentPersonality):
    """Flexible agent that adapts easily to changes"""
    
    def __init__(self):
        super().__init__()
        self.name = "flexible"
        self.flexibility_score = 9
        self.priority_threshold = 3
        self.negotiation_style = "flexible"
        self.response_templates = {
            "acceptance": "Sure! I can make that work. I'm pretty flexible with my schedule.",
            "rejection": "That time is a bit tricky, but I'm sure we can find something that works!",
            "proposal": "I'm open to most times. Here's what I think would work best.",
            "counter_proposal": "No worries! I can adjust my schedule. Here's an alternative that might be easier for everyone."
        }
    
    def generate_reasoning(self, context: Dict[str, Any]) -> str:
        """Generate flexible reasoning"""
        if context.get("action") == "accept":
            return "I can easily adjust my schedule to accommodate this time."
        elif context.get("action") == "reject":
            return "This time is a bit challenging, but I'm confident we can find a better alternative."
        elif context.get("action") == "propose":
            return "I'm flexible with timing, so I've picked something that should work for everyone."
        else:
            return "I'm happy to be flexible and find a time that works for everyone."

class FocusedPersonality(AgentPersonality):
    """Focused agent that protects deep work time"""
    
    def __init__(self):
        super().__init__()
        self.name = "focused"
        self.flexibility_score = 4
        self.priority_threshold = 7
        self.negotiation_style = "focused"
        self.response_templates = {
            "acceptance": "This time works well and doesn't interfere with my focus periods.",
            "rejection": "This time conflicts with my focus time. I need to protect my deep work periods.",
            "proposal": "I've found a time that respects everyone's focus time and productivity needs.",
            "counter_proposal": "I need to protect my focus time. Here's an alternative that works better for productivity."
        }
    
    def generate_reasoning(self, context: Dict[str, Any]) -> str:
        """Generate focus-oriented reasoning"""
        if context.get("action") == "accept":
            return "This time works well and doesn't interfere with my focus periods."
        elif context.get("action") == "reject":
            return "This time conflicts with my focus time, which is essential for my productivity."
        elif context.get("action") == "propose":
            return "I've considered everyone's focus time and found a time that maximizes productivity."
        else:
            return "I prioritize protecting focus time for optimal productivity."

class PersonalityFactory:
    """Factory for creating agent personalities"""
    
    PERSONALITIES = {
        "collaborative": CollaborativePersonality,
        "strict": StrictPersonality,
        "flexible": FlexiblePersonality,
        "focused": FocusedPersonality
    }
    
    @classmethod
    def create_personality(cls, personality_type: str) -> AgentPersonality:
        """Create a personality instance"""
        if personality_type not in cls.PERSONALITIES:
            personality_type = "collaborative"  # Default fallback
        
        return cls.PERSONALITIES[personality_type]()
    
    @classmethod
    def get_available_personalities(cls) -> list:
        """Get list of available personality types"""
        return list(cls.PERSONALITIES.keys())
    
    @classmethod
    def create_decision_engine(cls, personality_type: str) -> DecisionEngine:
        """Create a decision engine with specific personality"""
        personality = cls.create_personality(personality_type)
        engine = DecisionEngine(personality_type)
        engine.flexibility_score = personality.get_flexibility_score()
        engine.priority_threshold = personality.get_priority_threshold()
        return engine

# Example usage and personality descriptions
PERSONALITY_DESCRIPTIONS = {
    "collaborative": {
        "description": "Prioritizes group harmony and team success",
        "traits": ["High flexibility", "Team-oriented", "Compromising"],
        "best_for": "Team meetings, collaborative projects"
    },
    "strict": {
        "description": "Maintains strict schedule integrity",
        "traits": ["Low flexibility", "Schedule-focused", "Direct"],
        "best_for": "Important deadlines, client meetings"
    },
    "flexible": {
        "description": "Adapts easily to schedule changes",
        "traits": ["Very high flexibility", "Adaptable", "Easy-going"],
        "best_for": "Casual meetings, flexible projects"
    },
    "focused": {
        "description": "Protects deep work and focus time",
        "traits": ["Medium flexibility", "Productivity-focused", "Protective"],
        "best_for": "Individual contributors, creative work"
    }
}
