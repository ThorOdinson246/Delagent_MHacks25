"""
Alice's scheduling agent with real database integration
"""
import asyncio
from datetime import datetime, timedelta
from uagents import Agent, Context
from uagents.setup import fund_agent_if_low

from config import AliceAgentConfig
from models import (
    MeetingRequest, 
    NegotiationMessage, 
    TimeProposal, 
    AgentResponse,
    MeetingParticipant,
    MessageType
)
from decision_engine import AliceDecisionEngine
from database import db_manager, calendar_service, meeting_service

# Create Alice's agent
alice_agent = Agent(
    name=AliceAgentConfig.AGENT_NAME,
    seed=AliceAgentConfig.get_agent_seed(),
    port=8002,
    endpoint=["http://127.0.0.1:8002/submit"]
)

# Initialize decision engine with Alice's focused personality
decision_engine = AliceDecisionEngine(AliceAgentConfig.PERSONALITY_TYPE)

@alice_agent.on_event("startup")
async def startup(ctx: Context):
    """Agent startup event"""
    ctx.logger.info(f"🚀 {AliceAgentConfig.AGENT_NAME} started successfully!")
    ctx.logger.info(f"Agent address: {alice_agent.address}")
    ctx.logger.info(f"Agent personality: {decision_engine.personality}")
    ctx.logger.info(f"Flexibility score: {decision_engine.flexibility_score}")
    
    # Connect to database
    await db_manager.connect()
    
    # Fund the agent if needed
    try:
        await fund_agent_if_low(alice_agent.wallet.address())
        ctx.logger.info("✅ Agent funded successfully")
    except Exception as e:
        ctx.logger.warning(f"⚠️  Could not fund agent: {e}")
        ctx.logger.info("   Agent will still run, but may have limited functionality")

@alice_agent.on_interval(period=30.0)
async def periodic_status(ctx: Context):
    """Periodic status update"""
    ctx.logger.info(f"Alice's agent {alice_agent.address} is active and ready for scheduling requests")

@alice_agent.on_message(model=MeetingRequest)
async def handle_meeting_request(ctx: Context, sender: str, msg: MeetingRequest):
    """
    Handle incoming meeting requests
    """
    ctx.logger.info(f"📅 Alice received meeting request from {sender}")
    ctx.logger.info(f"Meeting: {msg.title}")
    ctx.logger.info(f"Duration: {msg.duration_minutes} minutes")
    ctx.logger.info(f"Participants: {len(msg.participants)}")
    
    try:
        # Analyze the meeting request using real calendar data
        analysis = await decision_engine.analyze_meeting_request(ctx, msg)
        
        ctx.logger.info(f"Analysis result: Can attend = {analysis.can_attend}")
        ctx.logger.info(f"Conflicts found: {len(analysis.conflicts)}")
        ctx.logger.info(f"Available times: {len(analysis.available_times)}")
        ctx.logger.info(f"Reasoning: {analysis.reasoning}")
        
        if analysis.can_attend:
            # Generate a time proposal based on real schedule
            proposal = await decision_engine.generate_time_proposal(ctx, msg, analysis)
            
            ctx.logger.info(f"✅ Alice generated proposal: {proposal.proposed_time}")
            ctx.logger.info(f"Confidence: {proposal.confidence_score:.2f}")
            ctx.logger.info(f"Reasoning: {proposal.reasoning}")
            
            # Send positive response with proposal
            response = AgentResponse(
                success=True,
                message=f"Alice can attend the meeting! Here's my proposal.",
                data={
                    "analysis": analysis.dict(),
                    "proposal": proposal.dict(),
                    "agent_personality": decision_engine.personality,
                    "flexibility_score": decision_engine.flexibility_score,
                    "user_id": decision_engine.user_id
                },
                reasoning=proposal.reasoning
            )
        else:
            # Send negative response with reasoning
            response = AgentResponse(
                success=False,
                message="Alice cannot attend due to schedule conflicts",
                data={
                    "analysis": analysis.dict(),
                    "agent_personality": decision_engine.personality,
                    "flexibility_score": decision_engine.flexibility_score,
                    "user_id": decision_engine.user_id
                },
                reasoning=analysis.reasoning
            )
        
        # Send response back to sender
        await ctx.send(sender, response)
        
    except Exception as e:
        ctx.logger.error(f"❌ Error processing meeting request: {e}")
        
        error_response = AgentResponse(
            success=False,
            message=f"Error processing meeting request: {str(e)}",
            reasoning="Internal error occurred during processing"
        )
        
        await ctx.send(sender, error_response)

@alice_agent.on_message(model=NegotiationMessage)
async def handle_negotiation_message(ctx: Context, sender: str, msg: NegotiationMessage):
    """
    Handle negotiation messages during meeting scheduling
    """
    ctx.logger.info(f"💬 Alice received negotiation message from {sender}")
    ctx.logger.info(f"Message type: {msg.message_type}")
    ctx.logger.info(f"Round: {msg.round_number}")
    ctx.logger.info(f"Reasoning: {msg.reasoning}")
    
    try:
        if msg.message_type == MessageType.PROPOSAL:
            # Evaluate the proposal using real schedule data
            evaluation = await decision_engine.evaluate_time_proposal(ctx, msg)
            
            ctx.logger.info(f"Proposal evaluation: Acceptable = {evaluation['acceptable']}")
            ctx.logger.info(f"Evaluation reasoning: {evaluation['reasoning']}")
            
            if evaluation['acceptable']:
                # Accept the proposal
                response = AgentResponse(
                    success=True,
                    message="✅ Alice accepts the proposal!",
                    data={"evaluation": evaluation},
                    reasoning=evaluation['reasoning']
                )
            else:
                # Generate counter-proposal using real schedule
                counter_proposal = await decision_engine.generate_counter_proposal(ctx, msg)
                
                if counter_proposal:
                    ctx.logger.info(f"🔄 Alice generated counter-proposal: {counter_proposal.proposed_time}")
                    ctx.logger.info(f"Counter-proposal reasoning: {counter_proposal.reasoning}")
                    
                    response = AgentResponse(
                        success=False,
                        message="❌ Alice rejects proposal, but here's a counter-proposal",
                        data={
                            "evaluation": evaluation,
                            "counter_proposal": counter_proposal.dict()
                        },
                        reasoning=evaluation['reasoning']
                    )
                else:
                    response = AgentResponse(
                        success=False,
                        message="❌ Alice rejects proposal, no alternatives available",
                        data={"evaluation": evaluation},
                        reasoning=evaluation['reasoning']
                    )
        
        elif msg.message_type == MessageType.ACCEPTANCE:
            response = AgentResponse(
                success=True,
                message="✅ Alice received acceptance! Meeting confirmed.",
                reasoning="All parties have agreed on the meeting time"
            )
        
        elif msg.message_type == MessageType.REJECTION:
            # Generate counter-proposal
            counter_proposal = await decision_engine.generate_counter_proposal(ctx, msg)
            
            if counter_proposal:
                response = AgentResponse(
                    success=True,
                    message="🔄 Alice received rejection, here's a counter-proposal",
                    data={"counter_proposal": counter_proposal.dict()},
                    reasoning="Attempting to find alternative time that works for Alice"
                )
            else:
                response = AgentResponse(
                    success=False,
                    message="❌ Alice received rejection, no alternatives available",
                    reasoning="Unable to find alternative time that works with Alice's schedule"
                )
        
        else:
            response = AgentResponse(
                success=True,
                message="Message processed",
                reasoning="General negotiation message handled"
            )
        
        # Send response back
        await ctx.send(sender, response)
        
    except Exception as e:
        ctx.logger.error(f"❌ Error processing negotiation message: {e}")
        
        error_response = AgentResponse(
            success=False,
            message=f"Error processing negotiation message: {str(e)}",
            reasoning="Internal error occurred during processing"
        )
        
        await ctx.send(sender, error_response)

@alice_agent.on_message(model=TimeProposal)
async def handle_time_proposal(ctx: Context, sender: str, msg: TimeProposal):
    """
    Handle time proposals from other agents
    """
    ctx.logger.info(f"⏰ Alice received time proposal from {sender}")
    ctx.logger.info(f"Proposed time: {msg.proposed_time}")
    ctx.logger.info(f"Confidence: {msg.confidence_score:.2f}")
    ctx.logger.info(f"Reasoning: {msg.reasoning}")
    
    try:
        # Evaluate the proposal using real schedule data
        evaluation = await decision_engine.evaluate_time_proposal(ctx, msg)
        
        ctx.logger.info(f"Proposal evaluation: Acceptable = {evaluation['acceptable']}")
        ctx.logger.info(f"Evaluation reasoning: {evaluation['reasoning']}")
        
        if evaluation['acceptable']:
            response = AgentResponse(
                success=True,
                message="✅ Alice accepts the time proposal!",
                data={"evaluation": evaluation},
                reasoning=evaluation['reasoning']
            )
        else:
            # Generate counter-proposal using real schedule
            counter_proposal = await decision_engine.generate_counter_proposal(ctx, msg)
            
            if counter_proposal:
                ctx.logger.info(f"🔄 Alice generated counter-proposal: {counter_proposal.proposed_time}")
                
                response = AgentResponse(
                    success=False,
                    message="❌ Alice rejects time proposal, here's a counter-proposal",
                    data={
                        "evaluation": evaluation,
                        "counter_proposal": counter_proposal.dict()
                    },
                    reasoning=evaluation['reasoning']
                )
            else:
                response = AgentResponse(
                    success=False,
                    message="❌ Alice rejects time proposal, no alternatives available",
                    data={"evaluation": evaluation},
                    reasoning=evaluation['reasoning']
                )
        
        # Send response back
        await ctx.send(sender, response)
        
    except Exception as e:
        ctx.logger.error(f"❌ Error processing time proposal: {e}")
        
        error_response = AgentResponse(
            success=False,
            message=f"Error processing time proposal: {str(e)}",
            reasoning="Internal error occurred during processing"
        )
        
        await ctx.send(sender, error_response)

@alice_agent.on_message(model=AgentResponse)
async def handle_agent_response(ctx: Context, sender: str, msg: AgentResponse):
    """
    Handle general agent responses
    """
    ctx.logger.info(f"📨 Alice received agent response from {sender}")
    ctx.logger.info(f"Success: {msg.success}")
    ctx.logger.info(f"Message: {msg.message}")
    
    if msg.reasoning:
        ctx.logger.info(f"Reasoning: {msg.reasoning}")

# Utility functions
def create_test_meeting_request() -> MeetingRequest:
    """Create a test meeting request for testing purposes"""
    return MeetingRequest(
        id="test-meeting-002",
        title="Project Planning Meeting",
        description="Weekly project planning and review",
        duration_minutes=90,
        participants=[
            MeetingParticipant(
                user_id="alice",
                agent_address=alice_agent.address,
                name="Alice",
                email="alice@example.com"
            ),
            MeetingParticipant(
                user_id="bob", 
                agent_address="agent1qfy2twzrw6ne43eufnzadxj0s3xpzlwd7vrgde5yrq46043kp8hpzpx6x75",
                name="Bob",
                email="bob@example.com"
            )
        ],
        preferred_start_time=datetime.now() + timedelta(hours=3),
        preferred_end_time=datetime.now() + timedelta(hours=8),
        priority_level=6,
        initiator_id="bob"
    )

if __name__ == "__main__":
    print("🤖 Starting Alice's Scheduling Agent...")
    print(f"Agent Name: {AliceAgentConfig.AGENT_NAME}")
    print(f"Agent Address: {alice_agent.address}")
    print(f"Personality: {decision_engine.personality}")
    print(f"Flexibility Score: {decision_engine.flexibility_score}")
    print(f"User ID: {decision_engine.user_id}")
    
    print("\n🚀 Starting agent...")
    alice_agent.run()
