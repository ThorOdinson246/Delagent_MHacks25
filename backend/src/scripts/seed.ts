import { PrismaClient } from '@prisma/client';
import { addDays, addHours, startOfDay } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create test users
  const alice = await prisma.user.create({
    data: {
      name: 'Alice Johnson',
      email: 'alice@example.com',
      timezone: 'America/New_York'
    }
  });

  const bob = await prisma.user.create({
    data: {
      name: 'Bob Smith',
      email: 'bob@example.com',
      timezone: 'America/Los_Angeles'
    }
  });

  console.log('✅ Created test users');

  // Create agents for users
  const aliceAgent = await prisma.agent.create({
    data: {
      userId: alice.id,
      name: 'Alice\'s Assistant',
      personality: 'Professional and punctual, prefers morning meetings',
      flexibility: 6,
      priorityData: JSON.stringify(['punctuality', 'preparation_time', 'work_life_balance']),
      config: JSON.stringify({
        preferredMeetingTimes: ['09:00-12:00', '14:00-16:00'],
        bufferTime: 15,
        maxDailyMeetings: 6
      }),
      status: 'IDLE',
      isActive: true
    }
  });

  const bobAgent = await prisma.agent.create({
    data: {
      userId: bob.id,
      name: 'Bob\'s Scheduler',
      personality: 'Flexible and collaborative, adapts to team needs',
      flexibility: 8,
      priorityData: JSON.stringify(['team_collaboration', 'flexibility', 'efficiency']),
      config: JSON.stringify({
        preferredMeetingTimes: ['10:00-12:00', '13:00-17:00'],
        bufferTime: 10,
        maxDailyMeetings: 8
      }),
      status: 'IDLE',
      isActive: true
    }
  });

  console.log('✅ Created AI agents');

  // Create some calendar blocks (existing commitments)
  const today = startOfDay(new Date());
  
  // Alice's calendar blocks
  await prisma.calendarBlock.createMany({
    data: [
      {
        userId: alice.id,
        title: 'Team Standup',
        startTime: addHours(today, 9), // 9 AM
        endTime: addHours(today, 9.5), // 9:30 AM
        blockType: 'BUSY',
        priority: 8,
        isFlexible: false,
        source: 'manual'
      },
      {
        userId: alice.id,
        title: 'Lunch Break',
        startTime: addHours(today, 12), // 12 PM
        endTime: addHours(today, 13), // 1 PM
        blockType: 'BREAK',
        priority: 5,
        isFlexible: true,
        source: 'manual'
      },
      {
        userId: alice.id,
        title: 'Client Call',
        startTime: addHours(addDays(today, 1), 14), // Tomorrow 2 PM
        endTime: addHours(addDays(today, 1), 15), // Tomorrow 3 PM
        blockType: 'BUSY',
        priority: 9,
        isFlexible: false,
        source: 'manual'
      }
    ]
  });

  // Bob's calendar blocks
  await prisma.calendarBlock.createMany({
    data: [
      {
        userId: bob.id,
        title: 'Code Review',
        startTime: addHours(today, 10), // 10 AM
        endTime: addHours(today, 11), // 11 AM
        blockType: 'BUSY',
        priority: 7,
        isFlexible: false,
        source: 'manual'
      },
      {
        userId: bob.id,
        title: 'Gym Time',
        startTime: addHours(today, 17), // 5 PM
        endTime: addHours(today, 18), // 6 PM
        blockType: 'BREAK',
        priority: 6,
        isFlexible: true,
        source: 'manual'
      },
      {
        userId: bob.id,
        title: 'Project Planning',
        startTime: addHours(addDays(today, 1), 10), // Tomorrow 10 AM
        endTime: addHours(addDays(today, 1), 12), // Tomorrow 12 PM
        blockType: 'BUSY',
        priority: 8,
        isFlexible: false,
        source: 'manual'
      }
    ]
  });

  console.log('✅ Created calendar blocks');

  // Create a sample meeting
  const meeting = await prisma.meeting.create({
    data: {
      title: 'Weekly Team Sync',
      description: 'Regular team synchronization meeting',
      organizerId: alice.id,
      preferredStartTime: addHours(addDays(today, 2), 14), // Day after tomorrow 2 PM
      preferredEndTime: addHours(addDays(today, 2), 15), // Day after tomorrow 3 PM
      durationMinutes: 60,
      status: 'PENDING',
      priority: 7
    }
  });

  // Add Bob as participant
  await prisma.meetingParticipant.create({
    data: {
      meetingId: meeting.id,
      userId: bob.id,
      status: 'INVITED'
    }
  });

  console.log('✅ Created sample meeting');

  // Create a sample voice interaction
  await prisma.voiceInteraction.create({
    data: {
      userId: alice.id,
      transcript: 'Schedule a meeting with Bob tomorrow at 2 PM for project discussion',
      extractedInfo: JSON.stringify({
        title: 'project discussion',
        preferred_date: addDays(today, 1).toISOString().split('T')[0],
        preferred_time: '14:00',
        duration_minutes: 60,
        participants: ['Bob']
      }),
      meetingRequest: JSON.stringify({
        title: 'project discussion',
        preferred_date: addDays(today, 1).toISOString().split('T')[0],
        preferred_time: '14:00',
        duration_minutes: 60
      }),
      processingTime: 1250,
      confidence: 0.92,
      responseText: 'I found a conflict with Bob\'s schedule. Let me suggest alternative times.'
    }
  });

  console.log('✅ Created sample voice interaction');

  // Create some system logs
  await prisma.systemLog.createMany({
    data: [
      {
        level: 'INFO',
        component: 'agent',
        message: 'Agent negotiation completed successfully',
        data: JSON.stringify({
          agentId: aliceAgent.id,
          meetingId: meeting.id,
          decision: 'accepted'
        })
      },
      {
        level: 'INFO',
        component: 'voice',
        message: 'Voice processing completed',
        data: JSON.stringify({
          processingTime: 1250,
          confidence: 0.92
        })
      },
      {
        level: 'DEBUG',
        component: 'api',
        message: 'API health check completed',
        data: JSON.stringify({
          endpoint: '/health',
          responseTime: 45
        })
      }
    ]
  });

  console.log('✅ Created system logs');

  console.log('🎉 Database seeding completed!');
  console.log(`
📊 Summary:
- Users: 2 (Alice, Bob)
- Agents: 2 
- Calendar blocks: 6
- Meetings: 1
- Voice interactions: 1
- System logs: 3

You can now start the server and test the APIs!
  `);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
