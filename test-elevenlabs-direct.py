#!/usr/bin/env python
"""
Direct ElevenLabs API Test

This script tests the ElevenLabs API directly to check if the API key works
and if the voice generation functions are working correctly.
"""

import os
import sys
import json
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("elevenlabs_test")

# Check environment variable
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
if not ELEVENLABS_API_KEY:
    logger.error("ELEVENLABS_API_KEY environment variable not found")
    sys.exit(1)

logger.info(f"Found ElevenLabs API key starting with: {ELEVENLABS_API_KEY[:4]}...")

try:
    import requests
    
    # Test API key directly with API request
    url = "https://api.elevenlabs.io/v1/voices"
    headers = {
        "Accept": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY
    }
    
    logger.info(f"Testing API key with direct API call to {url}")
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        # Success - API key works
        logger.info("SUCCESS: API key is valid and working!")
        voices_data = response.json()
        
        # Print available voices
        if "voices" in voices_data:
            voices = voices_data["voices"]
            logger.info(f"Found {len(voices)} voices:")
            for i, voice in enumerate(voices):
                voice_id = voice.get("voice_id", "unknown")
                name = voice.get("name", "unnamed")
                logger.info(f"{i+1}. {name} (ID: {voice_id})")
        
        # Try to generate a test audio file
        try:
            import elevenlabs
            from elevenlabs import generate, save, Voice, VoiceSettings
            
            logger.info("Successfully imported elevenlabs module")
            
            # Set API key
            elevenlabs.set_api_key(ELEVENLABS_API_KEY)
            logger.info("Successfully set API key in elevenlabs module")
            
            # Try to list voices
            logger.info("Listing voices using elevenlabs module...")
            all_voices = elevenlabs.voices()
            logger.info(f"Found {len(all_voices)} voices using elevenlabs module")
            for v in all_voices:
                logger.info(f"Voice: {v.name} (ID: {v.voice_id})")
            
            # Generate test audio
            logger.info("Generating test audio...")
            text = "Hello, this is a test of the ElevenLabs voice synthesis API."
            
            audio = generate(
                text=text,
                voice="Matthew",
                model="eleven_monolingual_v1"
            )
            
            # Save to file
            output_path = "test_audio.mp3"
            save(audio, output_path)
            
            logger.info(f"Successfully generated and saved audio to {output_path}")
            
        except ImportError as e:
            logger.error(f"Failed to import elevenlabs module: {str(e)}")
        except Exception as e:
            logger.error(f"Error using elevenlabs module: {str(e)}")
    
    else:
        # API key doesn't work
        logger.error(f"ERROR: API key check failed with status code {response.status_code}")
        logger.error(f"Response: {response.text}")

except ImportError:
    logger.error("Failed to import requests - please install with 'pip install requests'")
except Exception as e:
    logger.error(f"Unexpected error: {str(e)}")