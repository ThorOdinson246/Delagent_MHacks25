#!/usr/bin/env python3
"""
Simple usage example for Cartesia TTS
"""

import os
from a import cartesia_tts

# Set your API key (or use environment variable)
# os.environ["CARTESIA_API_KEY"] = "your_api_key_here"

def main():
    print("🎵 Cartesia TTS - Quick Example")
    print("=" * 35)
    
    # Check API key
    if not os.getenv("CARTESIA_API_KEY"):
        print("❌ Please set your API key:")
        print("   export CARTESIA_API_KEY='your_api_key_here'")
        print("   (Get it from: https://play.cartesia.ai/)")
        return
    
    # Example 1: Simple usage
    print("\n🗣️  Example 1: Simple text")
    success = cartesia_tts("Hello! This is a simple test.", "hello.wav")
    
    if success:
        print("🎉 Success! You can now play 'hello.wav'")
    
    # Example 2: Custom text
    print("\n🗣️  Example 2: Custom message")
    my_text = input("Enter text to convert to speech: ").strip()
    
    if my_text:
        success = cartesia_tts(my_text, "custom.wav")
        if success:
            print("🎉 Success! Check 'custom.wav'")

if __name__ == "__main__":
    main()
