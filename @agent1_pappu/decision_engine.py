"""
Decision engine for conflict resolution and scheduling logic
"""
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from models import (
    MeetingRequest, 
    CalendarBlock, 
    TimeProposal, 
    CalendarBlockType,
    NegotiationMessage,
    MessageType
)
import random

class DecisionEngine:
    """Engine for making scheduling decisions and resolving conflicts"""
    
    def __init__(self, agent_personality: str = "collaborative"):
        self.personality = agent_personality
        self.flexibility_score = 5  # 1-10 scale
        self.priority_threshold = 5  # Minimum priority to override conflicts
        
    async def analyze_meeting_request(self, ctx, request: MeetingRequest) -> Dict[str, Any]:
        """
        Analyze a meeting request for conflicts and availability
        """
        ctx.logger.info(f"Analyzing meeting request: {request.title}")
        
        # Get agent's calendar (simulated for now)
        calendar_blocks = await self._get_agent_calendar(ctx)
        
        # Check for conflicts
        conflicts = []
        available_times = []
        
        # Simulate calendar analysis
        if request.preferred_start_time:
            conflicts = await self._check_time_conflicts(
                request.preferred_start_time, 
                request.duration_minutes, 
                calendar_blocks
            )
            
            if not conflicts:
                available_times.append({
                    "start": request.preferred_start_time,
                    "end": request.preferred_start_time + timedelta(minutes=request.duration_minutes),
                    "confidence": 0.9
                })
        
        # Generate alternative times if preferred time has conflicts
        if conflicts:
            available_times = await self._find_alternative_times(
                request, calendar_blocks
            )
        
        can_attend = len(available_times) > 0 or self.flexibility_score >= 7
        
        return {
            "can_attend": can_attend,
            "conflicts": conflicts,
            "available_times": available_times,
            "flexibility": self.flexibility_score,
            "reasoning": self._generate_analysis_reasoning(conflicts, available_times)
        }
    
    async def generate_time_proposal(self, ctx, request: MeetingRequest, analysis: Dict[str, Any]):
        """
        Generate a time proposal for a meeting
        """
        ctx.logger.info(f"Generating time proposal for: {request.title}")
        
        if not analysis["available_times"]:
            # Generate a flexible proposal
            proposed_time = await self._generate_flexible_time(request)
            reasoning = "No ideal time found, proposing flexible alternative"
            conflicts_resolved = ["Flexible scheduling required"]
            trade_offs = ["May require moving other commitments"]
        else:
            # Use the best available time
            best_time = analysis["available_times"][0]
            proposed_time = best_time["start"]
            reasoning = f"Proposing optimal time with {best_time['confidence']:.1%} confidence"
            conflicts_resolved = []
            trade_offs = []
        
        confidence_score = self._calculate_confidence_score(analysis, proposed_time)
        
        return TimeProposal(
            proposed_time=proposed_time,
            reasoning=reasoning,
            conflicts_resolved=conflicts_resolved,
            trade_offs=trade_offs,
            confidence_score=confidence_score
        )
    
    async def evaluate_time_proposal(self, ctx, proposal) -> Dict[str, Any]:
        """
        Evaluate a time proposal from another agent
        """
        ctx.logger.info(f"Evaluating time proposal: {proposal.proposed_time}")
        
        # Get agent's calendar
        calendar_blocks = await self._get_agent_calendar(ctx)
        
        # Check for conflicts
        conflicts = await self._check_time_conflicts(
            proposal.proposed_time,
            60,  # Default duration
            calendar_blocks
        )
        
        # Determine acceptability based on personality and conflicts
        acceptable = self._determine_acceptability(conflicts, proposal)
        reasoning = self._generate_evaluation_reasoning(conflicts, proposal, acceptable)
        
        return {
            "acceptable": acceptable,
            "conflicts": conflicts,
            "reasoning": reasoning,
            "confidence": proposal.confidence_score,
            "suggestions": self._generate_suggestions(conflicts) if not acceptable else []
        }
    
    async def generate_counter_proposal(self, ctx, original_proposal) -> Optional[TimeProposal]:
        """
        Generate a counter-proposal when rejecting an original proposal
        """
        ctx.logger.info("Generating counter-proposal")
        
        # Get agent's calendar
        calendar_blocks = await self._get_agent_calendar(ctx)
        
        # Find alternative times
        alternatives = await self._find_alternative_times_near(
            original_proposal.proposed_time, 
            calendar_blocks
        )
        
        if not alternatives:
            return None
        
        # Select best alternative
        best_alternative = alternatives[0]
        
        return TimeProposal(
            proposed_time=best_alternative["start"],
            reasoning=f"Counter-proposal: {best_alternative['reasoning']}",
            conflicts_resolved=best_alternative.get("conflicts_resolved", []),
            trade_offs=best_alternative.get("trade_offs", []),
            confidence_score=best_alternative["confidence"]
        )
    
    async def _get_agent_calendar(self, ctx) -> List[CalendarBlock]:
        """
        Get the agent's calendar (simulated for now)
        """
        # Simulate some calendar blocks
        now = datetime.now()
        calendar_blocks = [
            CalendarBlock(
                id="block1",
                title="Focus Time",
                start_time=now + timedelta(hours=2),
                end_time=now + timedelta(hours=4),
                block_type=CalendarBlockType.FOCUS_TIME,
                priority=8,
                is_moveable=True
            ),
            CalendarBlock(
                id="block2",
                title="Team Meeting",
                start_time=now + timedelta(hours=6),
                end_time=now + timedelta(hours=7),
                block_type=CalendarBlockType.BUSY,
                priority=6,
                is_moveable=False
            )
        ]
        
        return calendar_blocks
    
    async def _check_time_conflicts(self, start_time: datetime, duration_minutes: int, calendar_blocks: List[CalendarBlock]) -> List[str]:
        """
        Check for conflicts with calendar blocks
        """
        end_time = start_time + timedelta(minutes=duration_minutes)
        conflicts = []
        
        for block in calendar_blocks:
            if (start_time < block.end_time and end_time > block.start_time):
                if block.block_type == CalendarBlockType.FOCUS_TIME and block.priority > self.priority_threshold:
                    conflicts.append(f"Conflicts with high-priority focus time: {block.title}")
                elif block.block_type == CalendarBlockType.BUSY and not block.is_moveable:
                    conflicts.append(f"Conflicts with fixed meeting: {block.title}")
                elif block.block_type == CalendarBlockType.FLEXIBLE:
                    conflicts.append(f"Conflicts with flexible block: {block.title}")
        
        return conflicts
    
    async def _find_alternative_times(self, request: MeetingRequest, calendar_blocks: List[CalendarBlock]) -> List[Dict[str, Any]]:
        """
        Find alternative times for a meeting
        """
        alternatives = []
        now = datetime.now()
        
        # Generate some alternative times
        for i in range(1, 5):
            alt_time = now + timedelta(hours=i*2)
            conflicts = await self._check_time_conflicts(alt_time, request.duration_minutes, calendar_blocks)
            
            if not conflicts:
                alternatives.append({
                    "start": alt_time,
                    "end": alt_time + timedelta(minutes=request.duration_minutes),
                    "confidence": 0.9 - (i * 0.1),
                    "reasoning": f"Alternative time {i} hours from now"
                })
        
        return alternatives
    
    async def _find_alternative_times_near(self, original_time: datetime, calendar_blocks: List[CalendarBlock]) -> List[Dict[str, Any]]:
        """
        Find alternative times near the original proposed time
        """
        alternatives = []
        
        # Try times 30 minutes before and after
        for offset in [-30, 30, -60, 60, -90, 90]:
            alt_time = original_time + timedelta(minutes=offset)
            conflicts = await self._check_time_conflicts(alt_time, 60, calendar_blocks)
            
            if not conflicts:
                alternatives.append({
                    "start": alt_time,
                    "confidence": 0.8 - abs(offset) * 0.01,
                    "reasoning": f"Alternative time {offset} minutes from original",
                    "conflicts_resolved": [],
                    "trade_offs": []
                })
        
        return sorted(alternatives, key=lambda x: x["confidence"], reverse=True)
    
    async def _generate_flexible_time(self, request: MeetingRequest) -> datetime:
        """
        Generate a flexible time when no ideal time is available
        """
        # Generate a time 2-4 hours from now
        hours_ahead = random.randint(2, 4)
        return datetime.now() + timedelta(hours=hours_ahead)
    
    def _calculate_confidence_score(self, analysis: Dict[str, Any], proposed_time: datetime) -> float:
        """
        Calculate confidence score for a proposal
        """
        base_confidence = 0.5
        
        # Increase confidence if no conflicts
        if not analysis["conflicts"]:
            base_confidence += 0.3
        
        # Increase confidence based on flexibility
        base_confidence += (self.flexibility_score / 10) * 0.2
        
        return min(base_confidence, 1.0)
    
    def _determine_acceptability(self, conflicts: List[str], proposal) -> bool:
        """
        Determine if a proposal is acceptable based on conflicts and personality
        """
        if not conflicts:
            return True
        
        # Check if conflicts are acceptable based on personality
        if self.personality == "collaborative":
            return len(conflicts) <= 1
        elif self.personality == "strict":
            return len(conflicts) == 0
        elif self.personality == "flexible":
            return len(conflicts) <= 2
        
        return False
    
    def _generate_analysis_reasoning(self, conflicts: List[str], available_times: List[Dict[str, Any]]) -> str:
        """
        Generate reasoning for analysis results
        """
        if not conflicts:
            return "No conflicts found with current schedule"
        elif available_times:
            return f"Found {len(available_times)} alternative times due to {len(conflicts)} conflicts"
        else:
            return f"Cannot attend due to {len(conflicts)} conflicts, but willing to negotiate"
    
    def _generate_evaluation_reasoning(self, conflicts: List[str], proposal, acceptable: bool) -> str:
        """
        Generate reasoning for proposal evaluation
        """
        if acceptable:
            return "Proposed time works well with current schedule"
        else:
            return f"Proposed time conflicts with: {', '.join(conflicts[:2])}"
    
    def _generate_suggestions(self, conflicts: List[str]) -> List[str]:
        """
        Generate suggestions for resolving conflicts
        """
        suggestions = []
        
        if any("focus time" in conflict.lower() for conflict in conflicts):
            suggestions.append("Consider moving focus time to accommodate meeting")
        
        if any("flexible" in conflict.lower() for conflict in conflicts):
            suggestions.append("Flexible block can be rescheduled")
        
        suggestions.append("Alternative times available 30-60 minutes before/after")
        
        return suggestions
