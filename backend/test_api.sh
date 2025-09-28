#!/bin/bash

# API Test Script for Meeting Scheduler Backend
echo "Testing Meeting Scheduler API on http://localhost:3002"
echo "=================================================="

BASE_URL="http://localhost:3002/api"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=${4:-200}
    
    echo -e "\n${YELLOW}Testing:${NC} $method $endpoint"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "%{http_code}" "$BASE_URL$endpoint")
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "%{http_code}" -X POST \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL$endpoint")
    fi
    
    # Extract status code (last 3 characters)
    status_code="${response: -3}"
    # Extract body (everything except last 3 characters)
    body="${response%???}"
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ Status: $status_code${NC}"
        # Pretty print JSON if possible
        if command -v jq &> /dev/null && [[ $body == "{"* ]]; then
            echo "$body" | jq . 2>/dev/null || echo "$body"
        else
            echo "$body"
        fi
    else
        echo -e "${RED}✗ Status: $status_code (expected $expected_status)${NC}"
        echo "$body"
    fi
}

# Test Health endpoint
test_endpoint "GET" "/health"

# Test Agents endpoint
test_endpoint "GET" "/agents"

# Test Meetings endpoint  
test_endpoint "GET" "/meetings"

# Test Calendar endpoint
test_endpoint "GET" "/calendar"

# Test Voice Processing endpoint (with sample data)
voice_data='{
    "transcript": "Schedule a meeting with the team for next Tuesday at 2 PM",
    "user_id": "cmg3232xu0000xafxrru38zte",
    "session_id": "test_session_123"
}'
test_endpoint "POST" "/voice/process" "$voice_data"

# Test Meeting Creation endpoint
meeting_data='{
    "title": "API Test Meeting",
    "description": "Testing meeting creation via API",
    "organizerId": "cmg3232xu0000xafxrru38zte", 
    "preferredStartTime": "2025-09-30T14:00:00.000Z",
    "preferredEndTime": "2025-09-30T15:00:00.000Z",
    "durationMinutes": 60,
    "participants": ["cmg3232y10001xafxgv95oiwz"],
    "priority": 5
}'
test_endpoint "POST" "/meetings" "$meeting_data" "201"

# Test Negotiation endpoint
negotiation_data='{
    "meeting_request": {
        "title": "Negotiation Test Meeting",
        "preferred_date": "2025-10-01",
        "preferred_time": "15:00", 
        "duration_minutes": 90,
        "participants": ["cmg3232xu0000xafxrru38zte", "cmg3232y10001xafxgv95oiwz"],
        "priority": "high"
    }
}'
test_endpoint "POST" "/negotiate/start" "$negotiation_data"

echo -e "\n${GREEN}API testing completed!${NC}"
