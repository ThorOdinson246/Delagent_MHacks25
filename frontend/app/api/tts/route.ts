import { CartesiaClient } from "@cartesia/cartesia-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json(
        { error: "Text is required and cannot be empty" },
        { status: 400 }
      );
    }

    // Initialize Cartesia client
    const client = new CartesiaClient({
      apiKey: "sk_car_ujiEjhXwke5raWiF4kTMzn",
    });

    // Make the TTS API call
    const response = await client.tts.bytes({
      modelId: "sonic-2",
      voice: {
        mode: "id",
        id: "694f9389-aac1-45b6-b726-9d9369183238",
      },
      outputFormat: {
        container: "wav",
        encoding: "pcm_f32le",
        sampleRate: 44100,
      },
      transcript: text,
    });

    // Return the audio data as a blob
    return new NextResponse(response, {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': response.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error("TTS API Error:", error);
    return NextResponse.json(
      { error: "Failed to convert text to speech" },
      { status: 500 }
    );
  }
}
