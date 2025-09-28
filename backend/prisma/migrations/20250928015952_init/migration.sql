-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "personality" TEXT NOT NULL,
    "flexibility" INTEGER NOT NULL DEFAULT 5,
    "priority_data" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'IDLE',
    "current_task" TEXT,
    "config" TEXT NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "agents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "meetings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "organizer_id" TEXT NOT NULL,
    "preferred_start_time" DATETIME,
    "preferred_end_time" DATETIME,
    "final_start_time" DATETIME,
    "final_end_time" DATETIME,
    "duration_minutes" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 5,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "scheduled_at" DATETIME,
    CONSTRAINT "meetings_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "meeting_participants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "meeting_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INVITED',
    "response" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "meeting_participants_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "meeting_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "time_slots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "meeting_id" TEXT NOT NULL,
    "start_time" DATETIME NOT NULL,
    "end_time" DATETIME NOT NULL,
    "quality_score" REAL NOT NULL,
    "day_of_week" TEXT NOT NULL,
    "conflicts_data" TEXT NOT NULL DEFAULT '[]',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "time_slots_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "negotiations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "meeting_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "current_round" INTEGER NOT NULL DEFAULT 1,
    "max_rounds" INTEGER NOT NULL DEFAULT 10,
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" DATETIME,
    "timeout_at" DATETIME NOT NULL,
    "final_decision" TEXT,
    "reasoning" TEXT,
    CONSTRAINT "negotiations_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "negotiation_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "negotiation_id" TEXT NOT NULL,
    "from_agent_id" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "message_type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "proposed_time" DATETIME,
    "reasoning" TEXT NOT NULL,
    "conflicts_data" TEXT NOT NULL DEFAULT '[]',
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "negotiation_messages_negotiation_id_fkey" FOREIGN KEY ("negotiation_id") REFERENCES "negotiations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "negotiation_messages_from_agent_id_fkey" FOREIGN KEY ("from_agent_id") REFERENCES "agents" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "calendar_blocks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "start_time" DATETIME NOT NULL,
    "end_time" DATETIME NOT NULL,
    "block_type" TEXT NOT NULL DEFAULT 'BUSY',
    "priority" INTEGER NOT NULL DEFAULT 5,
    "is_flexible" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT,
    "external_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "calendar_blocks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "voice_interactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "audio_url" TEXT,
    "transcript" TEXT NOT NULL,
    "extracted_info" TEXT NOT NULL DEFAULT '{}',
    "meeting_request" TEXT,
    "processing_time" INTEGER NOT NULL,
    "confidence" REAL NOT NULL,
    "response_text" TEXT,
    "tts_url" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "system_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "level" TEXT NOT NULL,
    "component" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" TEXT DEFAULT '{}',
    "error" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "agents_user_id_key" ON "agents"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "meeting_participants_meeting_id_user_id_key" ON "meeting_participants"("meeting_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "negotiations_meeting_id_key" ON "negotiations"("meeting_id");
