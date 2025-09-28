"""
Agent-to-agent communication protocol for meeting scheduling
"""
from uagents import Protocol
from models import (
    MeetingRequest, 
    NegotiationMessage, 
    TimeProposal, 
    MessageType,
    AgentResponse
)

# Create the scheduling negotiation protocol
scheduling_protocol = Protocol("SchedulingNegotiation", version="1.0.0")

@scheduling_protocol.on_message(model=MeetingRequest)
async def handle_meeting_request(ctx, sender: str, msg: MeetingRequest):
    """
    Handle incoming meeting requests from other agents
    """
    ctx.logger.info(f"Received meeting request from {sender}: {msg.title}")
    
    # Process the meeting request
    response = await process_meeting_request(ctx, sender, msg)
    
    # Send response back
    await ctx.send(sender, response)

@scheduling_protocol.on_message(model=NegotiationMessage)
async def handle_negotiation_message(ctx, sender: str, msg: NegotiationMessage):
    """
    Handle negotiation messages during meeting scheduling
    """
    ctx.logger.info(f"Received negotiation message from {sender}: {msg.message_type}")
    
    # Process the negotiation message
    response = await process_negotiation_message(ctx, sender, msg)
    
    # Send response back
    await ctx.send(sender, response)

@scheduling_protocol.on_message(model=TimeProposal)
async def handle_time_proposal(ctx, sender: str, msg: TimeProposal):
    """
    Handle time proposals from other agents
    """
    ctx.logger.info(f"Received time proposal from {sender}: {msg.proposed_time}")
    
    # Process the time proposal
    response = await process_time_proposal(ctx, sender, msg)
    
    # Send response back
    await ctx.send(sender, response)

@scheduling_protocol.on_message(model=AgentResponse)
async def handle_agent_response(ctx, sender: str, msg: AgentResponse):
    """
    Handle general agent responses
    """
    ctx.logger.info(f"Received agent response from {sender}: {msg.message}")
    
    # Process the response
    await process_agent_response(ctx, sender, msg)

async def process_meeting_request(ctx, sender: str, request: MeetingRequest) -> AgentResponse:
    """
    Process a meeting request and return appropriate response
    """
    try:
        # Check if this agent represents any of the participants
        agent_participants = [p for p in request.participants if p.agent_address == ctx.address]
        
        if not agent_participants:
            return AgentResponse(
                success=False,
                message="This agent does not represent any participants in this meeting",
                reasoning="Agent address does not match any participant agent addresses"
            )
        
        # Analyze the meeting request
        analysis = await analyze_meeting_request(ctx, request)
        
        if analysis["can_attend"]:
            # Propose a time if we can attend
            proposal = await generate_time_proposal(ctx, request, analysis)
            return AgentResponse(
                success=True,
                message="Meeting request received and analyzed",
                data={"analysis": analysis, "proposal": proposal.dict()},
                reasoning=proposal.reasoning
            )
        else:
            return AgentResponse(
                success=False,
                message="Cannot attend meeting due to conflicts",
                data={"analysis": analysis},
                reasoning=analysis["conflicts"][0] if analysis["conflicts"] else "No specific reason provided"
            )
            
    except Exception as e:
        ctx.logger.error(f"Error processing meeting request: {e}")
        return AgentResponse(
            success=False,
            message=f"Error processing meeting request: {str(e)}"
        )

async def process_negotiation_message(ctx, sender: str, message: NegotiationMessage) -> AgentResponse:
    """
    Process negotiation messages and respond appropriately
    """
    try:
        if message.message_type == MessageType.PROPOSAL:
            # Evaluate the proposal
            evaluation = await evaluate_time_proposal(ctx, message)
            return AgentResponse(
                success=True,
                message="Proposal evaluated",
                data={"evaluation": evaluation},
                reasoning=evaluation["reasoning"]
            )
        elif message.message_type == MessageType.ACCEPTANCE:
            return AgentResponse(
                success=True,
                message="Acceptance received",
                reasoning="Meeting time agreed upon"
            )
        elif message.message_type == MessageType.REJECTION:
            # Generate counter-proposal if possible
            counter_proposal = await generate_counter_proposal(ctx, message)
            return AgentResponse(
                success=True,
                message="Rejection received, counter-proposal generated",
                data={"counter_proposal": counter_proposal.dict() if counter_proposal else None},
                reasoning="Attempting to find alternative time"
            )
        else:
            return AgentResponse(
                success=True,
                message="Message processed",
                reasoning="General negotiation message handled"
            )
            
    except Exception as e:
        ctx.logger.error(f"Error processing negotiation message: {e}")
        return AgentResponse(
            success=False,
            message=f"Error processing negotiation message: {str(e)}"
        )

async def process_time_proposal(ctx, sender: str, proposal: TimeProposal) -> AgentResponse:
    """
    Process time proposals from other agents
    """
    try:
        # Evaluate the proposal
        evaluation = await evaluate_time_proposal(ctx, proposal)
        
        if evaluation["acceptable"]:
            return AgentResponse(
                success=True,
                message="Time proposal accepted",
                data={"evaluation": evaluation},
                reasoning="Proposed time works well for this agent's schedule"
            )
        else:
            # Generate counter-proposal
            counter_proposal = await generate_counter_proposal(ctx, proposal)
            return AgentResponse(
                success=False,
                message="Time proposal rejected, counter-proposal provided",
                data={"evaluation": evaluation, "counter_proposal": counter_proposal.dict() if counter_proposal else None},
                reasoning=evaluation["reasoning"]
            )
            
    except Exception as e:
        ctx.logger.error(f"Error processing time proposal: {e}")
        return AgentResponse(
            success=False,
            message=f"Error processing time proposal: {str(e)}"
        )

async def process_agent_response(ctx, sender: str, response: AgentResponse):
    """
    Process general agent responses
    """
    ctx.logger.info(f"Agent response from {sender}: {response.message}")
    
    if response.reasoning:
        ctx.logger.info(f"Reasoning: {response.reasoning}")
    
    # Store the response for future reference
    # This could be used to track negotiation history
    pass

# Placeholder functions that will be implemented in decision_engine.py
async def analyze_meeting_request(ctx, request: MeetingRequest) -> dict:
    """Analyze a meeting request for conflicts and availability"""
    # This will be implemented in decision_engine.py
    return {"can_attend": True, "conflicts": [], "available_times": []}

async def generate_time_proposal(ctx, request: MeetingRequest, analysis: dict):
    """Generate a time proposal for a meeting"""
    # This will be implemented in decision_engine.py
    from models import TimeProposal
    from datetime import datetime, timedelta
    
    return TimeProposal(
        proposed_time=datetime.now() + timedelta(hours=1),
        reasoning="Proposed time based on current availability",
        conflicts_resolved=[],
        trade_offs=[],
        confidence_score=0.8
    )

async def evaluate_time_proposal(ctx, proposal) -> dict:
    """Evaluate a time proposal"""
    # This will be implemented in decision_engine.py
    return {"acceptable": True, "reasoning": "Time works well"}

async def generate_counter_proposal(ctx, original_proposal):
    """Generate a counter-proposal"""
    # This will be implemented in decision_engine.py
    return None
