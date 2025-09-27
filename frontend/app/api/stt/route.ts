import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: "Audio file is required" },
        { status: 400 }
      );
    }

    // For now, let's use a simple mock response
    // We'll integrate with Cartesia STT API later once we confirm the right endpoint
    console.log("Received audio file:", audioFile.name, audioFile.size, "bytes");

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock transcription for testing
    const mockTranscript = "This is a test transcription from the audio recording.";

    return NextResponse.json({
      success: true,
      transcript: mockTranscript,
    });

  } catch (error) {
    console.error("STT API Error:", error);
    return NextResponse.json(
      { error: "Failed to transcribe audio" },
      { status: 500 }
    );
  }
}
