"""
Main scheduling agent implementation using Fetch.AI uAgents framework
"""
import asyncio
from datetime import datetime, timedelta
from uagents import Agent, Context
from uagents.setup import fund_agent_if_low

from config import AgentConfig
from models import (
    MeetingRequest, 
    NegotiationMessage, 
    TimeProposal, 
    AgentResponse,
    MeetingParticipant,
    MessageType
)
from negotiation_protocol import scheduling_protocol
from decision_engine import DecisionEngine
from agent_personalities import PersonalityFactory

# Create the main scheduling agent
agent = Agent(
    name=AgentConfig.AGENT_NAME,
    seed=AgentConfig.get_agent_seed(),
    port=8001,
    endpoint=["http://127.0.0.1:8001/submit"]
)

# The scheduling protocol is automatically included when imported

# Initialize decision engine with collaborative personality by default
decision_engine = PersonalityFactory.create_decision_engine("collaborative")

@agent.on_event("startup")
async def startup(ctx: Context):
    """Agent startup event"""
    ctx.logger.info(f"🚀 {AgentConfig.AGENT_NAME} started successfully!")
    ctx.logger.info(f"Agent address: {agent.address}")
    ctx.logger.info(f"Agent personality: {decision_engine.personality}")
    ctx.logger.info(f"Flexibility score: {decision_engine.flexibility_score}")
    
    # Fund the agent if needed
    try:
        await fund_agent_if_low(agent.wallet.address())
        ctx.logger.info("✅ Agent funded successfully")
    except Exception as e:
        ctx.logger.warning(f"⚠️  Could not fund agent: {e}")
        ctx.logger.info("   Agent will still run, but may have limited functionality")

@agent.on_interval(period=30.0)
async def periodic_status(ctx: Context):
    """Periodic status update"""
    ctx.logger.info(f"Agent {agent.address} is active and ready for scheduling requests")

@agent.on_message(model=MeetingRequest)
async def handle_meeting_request(ctx: Context, sender: str, msg: MeetingRequest):
    """
    Handle incoming meeting requests
    """
    ctx.logger.info(f"📅 Received meeting request from {sender}")
    ctx.logger.info(f"Meeting: {msg.title}")
    ctx.logger.info(f"Duration: {msg.duration_minutes} minutes")
    ctx.logger.info(f"Participants: {len(msg.participants)}")
    
    try:
        # Analyze the meeting request
        analysis = await decision_engine.analyze_meeting_request(ctx, msg)
        
        ctx.logger.info(f"Analysis result: Can attend = {analysis['can_attend']}")
        ctx.logger.info(f"Conflicts found: {len(analysis['conflicts'])}")
        ctx.logger.info(f"Available times: {len(analysis['available_times'])}")
        
        if analysis['can_attend']:
            # Generate a time proposal
            proposal = await decision_engine.generate_time_proposal(ctx, msg, analysis)
            
            ctx.logger.info(f"✅ Generated proposal: {proposal.proposed_time}")
            ctx.logger.info(f"Confidence: {proposal.confidence_score:.2f}")
            ctx.logger.info(f"Reasoning: {proposal.reasoning}")
            
            # Send positive response with proposal
            response = AgentResponse(
                success=True,
                message=f"Meeting request analyzed successfully. I can attend!",
                data={
                    "analysis": analysis,
                    "proposal": proposal.dict(),
                    "agent_personality": decision_engine.personality,
                    "flexibility_score": decision_engine.flexibility_score
                },
                reasoning=proposal.reasoning
            )
        else:
            # Send negative response with reasoning
            response = AgentResponse(
                success=False,
                message="Cannot attend meeting due to schedule conflicts",
                data={
                    "analysis": analysis,
                    "agent_personality": decision_engine.personality,
                    "flexibility_score": decision_engine.flexibility_score
                },
                reasoning=analysis['reasoning']
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

@agent.on_message(model=NegotiationMessage)
async def handle_negotiation_message(ctx: Context, sender: str, msg: NegotiationMessage):
    """
    Handle negotiation messages during meeting scheduling
    """
    ctx.logger.info(f"💬 Received negotiation message from {sender}")
    ctx.logger.info(f"Message type: {msg.message_type}")
    ctx.logger.info(f"Round: {msg.round_number}")
    ctx.logger.info(f"Reasoning: {msg.reasoning}")
    
    try:
        if msg.message_type == MessageType.PROPOSAL:
            # Evaluate the proposal
            evaluation = await decision_engine.evaluate_time_proposal(ctx, msg)
            
            ctx.logger.info(f"Proposal evaluation: Acceptable = {evaluation['acceptable']}")
            
            if evaluation['acceptable']:
                # Accept the proposal
                response = AgentResponse(
                    success=True,
                    message="✅ Proposal accepted!",
                    data={"evaluation": evaluation},
                    reasoning=evaluation['reasoning']
                )
            else:
                # Generate counter-proposal
                counter_proposal = await decision_engine.generate_counter_proposal(ctx, msg)
                
                if counter_proposal:
                    ctx.logger.info(f"🔄 Generated counter-proposal: {counter_proposal.proposed_time}")
                    
                    response = AgentResponse(
                        success=False,
                        message="❌ Proposal rejected, but here's a counter-proposal",
                        data={
                            "evaluation": evaluation,
                            "counter_proposal": counter_proposal.dict()
                        },
                        reasoning=evaluation['reasoning']
                    )
                else:
                    response = AgentResponse(
                        success=False,
                        message="❌ Proposal rejected, no alternatives available",
                        data={"evaluation": evaluation},
                        reasoning=evaluation['reasoning']
                    )
        
        elif msg.message_type == MessageType.ACCEPTANCE:
            response = AgentResponse(
                success=True,
                message="✅ Acceptance received! Meeting confirmed.",
                reasoning="All parties have agreed on the meeting time"
            )
        
        elif msg.message_type == MessageType.REJECTION:
            # Generate counter-proposal
            counter_proposal = await decision_engine.generate_counter_proposal(ctx, msg)
            
            if counter_proposal:
                response = AgentResponse(
                    success=True,
                    message="🔄 Rejection received, here's a counter-proposal",
                    data={"counter_proposal": counter_proposal.dict()},
                    reasoning="Attempting to find alternative time"
                )
            else:
                response = AgentResponse(
                    success=False,
                    message="❌ Rejection received, no alternatives available",
                    reasoning="Unable to find alternative time"
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

@agent.on_message(model=TimeProposal)
async def handle_time_proposal(ctx: Context, sender: str, msg: TimeProposal):
    """
    Handle time proposals from other agents
    """
    ctx.logger.info(f"⏰ Received time proposal from {sender}")
    ctx.logger.info(f"Proposed time: {msg.proposed_time}")
    ctx.logger.info(f"Confidence: {msg.confidence_score:.2f}")
    ctx.logger.info(f"Reasoning: {msg.reasoning}")
    
    try:
        # Evaluate the proposal
        evaluation = await decision_engine.evaluate_time_proposal(ctx, msg)
        
        ctx.logger.info(f"Proposal evaluation: Acceptable = {evaluation['acceptable']}")
        
        if evaluation['acceptable']:
            response = AgentResponse(
                success=True,
                message="✅ Time proposal accepted!",
                data={"evaluation": evaluation},
                reasoning=evaluation['reasoning']
            )
        else:
            # Generate counter-proposal
            counter_proposal = await decision_engine.generate_counter_proposal(ctx, msg)
            
            if counter_proposal:
                ctx.logger.info(f"🔄 Generated counter-proposal: {counter_proposal.proposed_time}")
                
                response = AgentResponse(
                    success=False,
                    message="❌ Time proposal rejected, here's a counter-proposal",
                    data={
                        "evaluation": evaluation,
                        "counter_proposal": counter_proposal.dict()
                    },
                    reasoning=evaluation['reasoning']
                )
            else:
                response = AgentResponse(
                    success=False,
                    message="❌ Time proposal rejected, no alternatives available",
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

@agent.on_message(model=AgentResponse)
async def handle_agent_response(ctx: Context, sender: str, msg: AgentResponse):
    """
    Handle general agent responses
    """
    ctx.logger.info(f"📨 Received agent response from {sender}")
    ctx.logger.info(f"Success: {msg.success}")
    ctx.logger.info(f"Message: {msg.message}")
    
    if msg.reasoning:
        ctx.logger.info(f"Reasoning: {msg.reasoning}")
    
    # Store the response for future reference
    # This could be used to track negotiation history
    pass

# Utility functions for testing and interaction
def create_test_meeting_request() -> MeetingRequest:
    """Create a test meeting request for testing purposes"""
    return MeetingRequest(
        id="test-meeting-001",
        title="Test Meeting",
        description="A test meeting for agent functionality",
        duration_minutes=60,
        participants=[
            MeetingParticipant(
                user_id="user1",
                agent_address="agent1",
                name="Test User 1",
                email="user1@test.com"
            ),
            MeetingParticipant(
                user_id="user2", 
                agent_address="agent2",
                name="Test User 2",
                email="user2@test.com"
            )
        ],
        preferred_start_time=datetime.now() + timedelta(hours=2),
        preferred_end_time=datetime.now() + timedelta(hours=6),
        priority_level=5,
        initiator_id="user1"
    )

def change_agent_personality(personality_type: str):
    """Change the agent's personality"""
    global decision_engine
    decision_engine = PersonalityFactory.create_decision_engine(personality_type)
    print(f"Agent personality changed to: {personality_type}")

if __name__ == "__main__":
    print("🤖 Starting Scheduling Agent...")
    print(f"Agent Name: {AgentConfig.AGENT_NAME}")
    print(f"Agent Address: {agent.address}")
    print(f"Personality: {decision_engine.personality}")
    print(f"Flexibility Score: {decision_engine.flexibility_score}")
    print("\nAvailable personalities:")
    for personality in PersonalityFactory.get_available_personalities():
        print(f"  - {personality}")
    
    print("\n🚀 Starting agent...")
    agent.run()
