"""
Data models for Alice's scheduling agent system
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel, Field
from enum import Enum

class MeetingStatus(str, Enum):
    """Meeting request status"""
    NEGOTIATING = "negotiating"
    AGREED = "agreed"
    SCHEDULED = "scheduled"
    FAILED = "failed"

class MessageType(str, Enum):
    """Negotiation message types"""
    PROPOSAL = "proposal"
    COUNTER_PROPOSAL = "counter_proposal"
    ACCEPTANCE = "acceptance"
    REJECTION = "rejection"
    REASONING = "reasoning"

class CalendarBlockType(str, Enum):
    """Calendar block types"""
    BUSY = "busy"
    FOCUS_TIME = "focus_time"
    FLEXIBLE = "flexible"
    AVAILABLE = "available"

class CalendarBlock(BaseModel):
    """Represents a calendar time block"""
    id: str
    user_id: str
    title: str
    start_time: datetime
    end_time: datetime
    block_type: CalendarBlockType = CalendarBlockType.BUSY
    priority: int = Field(default=5, ge=1, le=10)
    is_moveable: bool = False

class MeetingParticipant(BaseModel):
    """Represents a meeting participant"""
    user_id: str
    agent_address: str
    name: str
    email: str
    is_required: bool = True
    constraints: Optional[Dict[str, Any]] = None

class MeetingRequest(BaseModel):
    """Represents a meeting request"""
    id: str
    title: str
    description: Optional[str] = None
    duration_minutes: int = 60
    participants: List[MeetingParticipant]
    preferred_start_time: Optional[datetime] = None
    preferred_end_time: Optional[datetime] = None
    priority_level: int = Field(default=5, ge=1, le=10)
    status: MeetingStatus = MeetingStatus.NEGOTIATING
    initiator_id: str

class NegotiationMessage(BaseModel):
    """Message between agents during negotiation"""
    id: str
    from_agent: str
    to_agent: str
    message_type: MessageType
    meeting_request_id: str
    proposed_time: Optional[datetime] = None
    reasoning: str
    conflicts_identified: Optional[List[str]] = None
    round_number: int
    timestamp: datetime = Field(default_factory=datetime.now)

class TimeProposal(BaseModel):
    """A time proposal with reasoning"""
    proposed_time: datetime
    reasoning: str
    conflicts_resolved: List[str]
    trade_offs: List[str]
    confidence_score: float = Field(ge=0.0, le=1.0)

class NegotiationSession(BaseModel):
    """Represents an active negotiation session"""
    id: str
    meeting_request_id: str
    participants: List[str]  # Agent addresses
    current_round: int = 1
    max_rounds: int = 10
    status: str = "active"
    best_proposal: Optional[TimeProposal] = None
    messages: List[NegotiationMessage] = []
    started_at: datetime = Field(default_factory=datetime.now)

class AgentResponse(BaseModel):
    """Standard response format from agents"""
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
    reasoning: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)

class ScheduleAnalysis(BaseModel):
    """Analysis of a user's schedule"""
    user_id: str
    can_attend: bool
    conflicts: List[str]
    available_times: List[Dict[str, Any]]
    flexibility_score: int
    reasoning: str
    analysis_timestamp: datetime = Field(default_factory=datetime.now)
