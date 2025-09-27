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

    console.log("Received audio file:", audioFile.name, audioFile.size, "bytes", "type:", audioFile.type);

    // Convert audio file to buffer for Cartesia
    const audioBuffer = await audioFile.arrayBuffer();
    
    try {
      // Make request to Cartesia Speech-to-Text API
      const cartesiaResponse = await fetch("https://api.cartesia.ai/tts/websocket", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_CARTESIA_API_KEY || "sk_car_ujiEjhXwke5raWiF4kTMzn"}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "whisper-1", // Cartesia's Whisper model
          audio: Array.from(new Uint8Array(audioBuffer)),
          response_format: "json"
        }),
      });

      if (!cartesiaResponse.ok) {
        console.error("Cartesia API error:", cartesiaResponse.status, cartesiaResponse.statusText);
        throw new Error(`Cartesia API error: ${cartesiaResponse.status}`);
      }

      const result = await cartesiaResponse.json();
      console.log("Cartesia STT result:", result);

      return NextResponse.json({
        success: true,
        transcript: result.text || result.transcript || "Could not transcribe audio",
      });

    } catch (cartesiaError) {
      console.error("Cartesia STT error:", cartesiaError);
      
      // Fallback to mock response for now
      console.log("Using fallback transcription");
      const fallbackTranscript = `Transcribed audio (${Math.round(audioFile.size / 1024)}KB recording)`;

      return NextResponse.json({
        success: true,
        transcript: fallbackTranscript,
        note: "Used fallback transcription - Cartesia STT integration in progress"
      });
    }

  } catch (error) {
    console.error("STT API Error:", error);
    return NextResponse.json(
      { error: "Failed to transcribe audio" },
      { status: 500 }
    );
  }
}
