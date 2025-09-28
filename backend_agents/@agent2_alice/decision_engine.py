"""
Decision engine for Alice's agent with real database integration
"""
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from models import (
    MeetingRequest, 
    CalendarBlock, 
    TimeProposal, 
    CalendarBlockType,
    NegotiationMessage,
    MessageType,
    ScheduleAnalysis
)
from database import calendar_service
import random

class AliceDecisionEngine:
    """Decision engine for Alice's agent with real schedule data"""
    
    def __init__(self, agent_personality: str = "focused"):
        self.personality = agent_personality
        self.flexibility_score = 4  # Alice is focused, lower flexibility
        self.priority_threshold = 7  # High priority threshold for focus time
        self.user_id = "alice"  # Alice's user ID
        
    async def analyze_meeting_request(self, ctx, request: MeetingRequest) -> ScheduleAnalysis:
        """
        Analyze a meeting request using real calendar data
        """
        ctx.logger.info(f"Analyzing meeting request: {request.title}")
        
        # Get Alice's real calendar from database
        calendar_blocks = await calendar_service.get_user_calendar_blocks(self.user_id)
        ctx.logger.info(f"Retrieved {len(calendar_blocks)} calendar blocks for Alice")
        
        # Check for conflicts with preferred time
        conflicts = []
        available_times = []
        
        if request.preferred_start_time:
            end_time = request.preferred_start_time + timedelta(minutes=request.duration_minutes)
            conflicts = await self._check_time_conflicts(
                request.preferred_start_time, 
                end_time, 
                calendar_blocks
            )
            
            if not conflicts:
                available_times.append({
                    "start": request.preferred_start_time,
                    "end": end_time,
                    "confidence": 0.9,
                    "reasoning": "Preferred time is available"
                })
        
        # If preferred time has conflicts, find alternatives
        if conflicts:
            available_times = await self._find_alternative_times(
                request, calendar_blocks
            )
        
        # Determine if Alice can attend based on her personality
        can_attend = self._determine_attendance(conflicts, available_times)
        
        reasoning = self._generate_analysis_reasoning(conflicts, available_times, can_attend)
        
        return ScheduleAnalysis(
            user_id=self.user_id,
            can_attend=can_attend,
            conflicts=conflicts,
            available_times=available_times,
            flexibility_score=self.flexibility_score,
            reasoning=reasoning
        )
    
    async def generate_time_proposal(self, ctx, request: MeetingRequest, analysis: ScheduleAnalysis):
        """
        Generate a time proposal based on real schedule analysis
        """
        ctx.logger.info(f"Generating time proposal for: {request.title}")
        
        if not analysis.available_times:
            # No ideal time found - generate a flexible proposal
            proposed_time = await self._generate_flexible_time(request, analysis)
            reasoning = "No ideal time found in Alice's schedule. Proposing alternative that requires moving focus time."
            conflicts_resolved = ["Will need to reschedule focus time"]
            trade_offs = ["Focus time will be disrupted", "May impact productivity"]
        else:
            # Use the best available time
            best_time = analysis.available_times[0]
            proposed_time = best_time["start"]
            reasoning = f"Proposing optimal time: {proposed_time.strftime('%Y-%m-%d %H:%M')}. {best_time.get('reasoning', '')}"
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
        Evaluate a time proposal from another agent using real schedule data
        """
        ctx.logger.info(f"Evaluating time proposal: {proposal.proposed_time}")
        
        # Get Alice's real calendar
        calendar_blocks = await calendar_service.get_user_calendar_blocks(self.user_id)
        
        # Check for conflicts
        end_time = proposal.proposed_time + timedelta(minutes=60)  # Default 1 hour
        conflicts = await self._check_time_conflicts(
            proposal.proposed_time, 
            end_time, 
            calendar_blocks
        )
        
        # Determine acceptability based on Alice's focused personality
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
        ctx.logger.info("Generating counter-proposal for Alice")
        
        # Get Alice's real calendar
        calendar_blocks = await calendar_service.get_user_calendar_blocks(self.user_id)
        
        # Find alternative times near the original proposal
        alternatives = await self._find_alternative_times_near(
            original_proposal.proposed_time, 
            calendar_blocks
        )
        
        if not alternatives:
            return None
        
        # Select best alternative that protects focus time
        best_alternative = alternatives[0]
        
        return TimeProposal(
            proposed_time=best_alternative["start"],
            reasoning=f"Counter-proposal: {best_alternative['reasoning']}",
            conflicts_resolved=best_alternative.get("conflicts_resolved", []),
            trade_offs=best_alternative.get("trade_offs", []),
            confidence_score=best_alternative["confidence"]
        )
    
    async def _check_time_conflicts(self, start_time: datetime, end_time: datetime, calendar_blocks: List[Dict[str, Any]]) -> List[str]:
        """
        Check for conflicts with calendar blocks
        """
        conflicts = []
        
        for block in calendar_blocks:
            block_start = block['start_time']
            block_end = block['end_time']
            
            if (start_time < block_end and end_time > block_start):
                if block['block_type'] == 'focus_time' and block['priority'] > self.priority_threshold:
                    conflicts.append(f"Conflicts with high-priority focus time: {block['title']}")
                elif block['block_type'] == 'busy' and not block['is_moveable']:
                    conflicts.append(f"Conflicts with fixed meeting: {block['title']}")
                elif block['block_type'] == 'flexible':
                    conflicts.append(f"Conflicts with flexible block: {block['title']}")
        
        return conflicts
    
    async def _find_alternative_times(self, request: MeetingRequest, calendar_blocks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Find alternative times for a meeting
        """
        alternatives = []
        
        # Look for times in the next 7 days
        start_date = datetime.now()
        end_date = start_date + timedelta(days=7)
        
        current_time = start_date.replace(hour=9, minute=0, second=0, microsecond=0)  # Start at 9 AM
        
        while current_time < end_date:
            # Skip weekends for Alice (she prefers weekdays)
            if current_time.weekday() >= 5:  # Saturday = 5, Sunday = 6
                current_time += timedelta(days=1)
                current_time = current_time.replace(hour=9, minute=0, second=0, microsecond=0)
                continue
            
            # Skip lunch time (12-1 PM)
            if 12 <= current_time.hour < 13:
                current_time += timedelta(hours=1)
                continue
            
            end_time = current_time + timedelta(minutes=request.duration_minutes)
            conflicts = await self._check_time_conflicts(current_time, end_time, calendar_blocks)
            
            if not conflicts:
                confidence = 0.8
                reasoning = f"Available weekday slot at {current_time.strftime('%A %H:%M')}"
                
                # Higher confidence for morning slots (Alice prefers mornings)
                if 9 <= current_time.hour < 12:
                    confidence = 0.9
                    reasoning += " (morning slot - preferred)"
                
                alternatives.append({
                    "start": current_time,
                    "end": end_time,
                    "confidence": confidence,
                    "reasoning": reasoning
                })
            
            # Move to next hour
            current_time += timedelta(hours=1)
        
        return sorted(alternatives, key=lambda x: x["confidence"], reverse=True)
    
    async def _find_alternative_times_near(self, original_time: datetime, calendar_blocks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Find alternative times near the original proposed time
        """
        alternatives = []
        
        # Try times 30 minutes before and after, then 1 hour before and after
        for offset in [-30, 30, -60, 60, -90, 90]:
            alt_time = original_time + timedelta(minutes=offset)
            end_time = alt_time + timedelta(minutes=60)
            conflicts = await self._check_time_conflicts(alt_time, end_time, calendar_blocks)
            
            if not conflicts:
                confidence = 0.8 - abs(offset) * 0.01
                reasoning = f"Alternative time {offset} minutes from original"
                
                alternatives.append({
                    "start": alt_time,
                    "confidence": confidence,
                    "reasoning": reasoning,
                    "conflicts_resolved": [],
                    "trade_offs": []
                })
        
        return sorted(alternatives, key=lambda x: x["confidence"], reverse=True)
    
    async def _generate_flexible_time(self, request: MeetingRequest, analysis: ScheduleAnalysis) -> datetime:
        """
        Generate a flexible time when no ideal time is available
        """
        # Generate a time 2-4 hours from now, preferring morning hours
        hours_ahead = random.randint(2, 4)
        proposed_time = datetime.now() + timedelta(hours=hours_ahead)
        
        # Adjust to morning hours if possible (9 AM - 12 PM)
        if proposed_time.hour < 9:
            proposed_time = proposed_time.replace(hour=9, minute=0, second=0, microsecond=0)
        elif proposed_time.hour > 12:
            proposed_time = proposed_time.replace(hour=11, minute=0, second=0, microsecond=0)
        
        return proposed_time
    
    def _calculate_confidence_score(self, analysis: ScheduleAnalysis, proposed_time: datetime) -> float:
        """
        Calculate confidence score for a proposal
        """
        base_confidence = 0.5
        
        # Increase confidence if no conflicts
        if not analysis.conflicts:
            base_confidence += 0.3
        
        # Increase confidence based on flexibility
        base_confidence += (self.flexibility_score / 10) * 0.2
        
        # Higher confidence for morning hours (Alice's preference)
        if 9 <= proposed_time.hour < 12:
            base_confidence += 0.1
        
        return min(base_confidence, 1.0)
    
    def _determine_attendance(self, conflicts: List[str], available_times: List[Dict[str, Any]]) -> bool:
        """
        Determine if Alice can attend based on her focused personality
        """
        if not conflicts:
            return True
        
        # Alice is focused - she's less flexible about conflicts
        focus_time_conflicts = [c for c in conflicts if "focus time" in c.lower()]
        if focus_time_conflicts:
            return False  # Alice won't compromise on focus time
        
        # If there are available alternatives, she might attend
        return len(available_times) > 0
    
    def _determine_acceptability(self, conflicts: List[str], proposal) -> bool:
        """
        Determine if a proposal is acceptable based on Alice's focused personality
        """
        if not conflicts:
            return True
        
        # Alice is very protective of her focus time
        focus_time_conflicts = [c for c in conflicts if "focus time" in c.lower()]
        if focus_time_conflicts:
            return False
        
        # She's more flexible with other types of conflicts
        return len(conflicts) <= 1
    
    def _generate_analysis_reasoning(self, conflicts: List[str], available_times: List[Dict[str, Any]], can_attend: bool) -> str:
        """
        Generate reasoning for analysis results
        """
        if not conflicts:
            return "No conflicts found with Alice's current schedule"
        elif can_attend and available_times:
            return f"Found {len(available_times)} alternative times. Alice can attend but prefers to protect focus time."
        elif not can_attend:
            return f"Cannot attend due to focus time conflicts. Alice prioritizes deep work periods."
        else:
            return f"Limited availability due to {len(conflicts)} conflicts, but willing to negotiate"
    
    def _generate_evaluation_reasoning(self, conflicts: List[str], proposal, acceptable: bool) -> str:
        """
        Generate reasoning for proposal evaluation
        """
        if acceptable:
            return "Proposed time works well with Alice's schedule and respects her focus time"
        else:
            focus_conflicts = [c for c in conflicts if "focus time" in c.lower()]
            if focus_conflicts:
                return f"Proposed time conflicts with focus time: {focus_conflicts[0]}. Alice cannot compromise on deep work periods."
            else:
                return f"Proposed time conflicts with: {', '.join(conflicts[:2])}. Alice needs alternative time."
    
    def _generate_suggestions(self, conflicts: List[str]) -> List[str]:
        """
        Generate suggestions for resolving conflicts
        """
        suggestions = []
        
        if any("focus time" in conflict.lower() for conflict in conflicts):
            suggestions.append("Alice cannot move focus time - it's essential for productivity")
        
        if any("flexible" in conflict.lower() for conflict in conflicts):
            suggestions.append("Flexible blocks can be rescheduled if needed")
        
        suggestions.append("Alice prefers morning time slots (9 AM - 12 PM)")
        suggestions.append("Alternative times available 30-60 minutes before/after")
        
        return suggestions
