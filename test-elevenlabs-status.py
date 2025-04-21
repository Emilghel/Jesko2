"""
Test script to check ElevenLabs API key and voice availability

This script verifies the ElevenLabs API connection and lists available voices.
"""

import os
import sys
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Check if ElevenLabs API key is set
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
if not ELEVENLABS_API_KEY:
    print("Error: ELEVENLABS_API_KEY not found in environment variables")
    sys.exit(1)

print(f"ElevenLabs API Key found: {ELEVENLABS_API_KEY[:4]}{'*' * (len(ELEVENLABS_API_KEY) - 8)}{ELEVENLABS_API_KEY[-4:]}")

try:
    from elevenlabs import voices, set_api_key
    
    # Set API key
    set_api_key(ELEVENLABS_API_KEY)
    
    # Get available voices
    available_voices = voices()
    
    # Print voice information
    print(f"\nFound {len(available_voices)} available voices:")
    for i, voice in enumerate(available_voices):
        print(f"{i+1}. {voice.name} (ID: {voice.voice_id})")
    
    # Print a success message
    print("\nElevenLabs API integration is working correctly!")
    
except ImportError:
    print("Error: elevenlabs module not found. Please install with 'pip install elevenlabs'")
    sys.exit(1)
except Exception as e:
    print(f"Error connecting to ElevenLabs API: {str(e)}")
    sys.exit(1)