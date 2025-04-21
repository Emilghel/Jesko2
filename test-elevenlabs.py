"""
Test script for ElevenLabs API integration

This script tests the text-to-speech functionality using the ElevenLabs API.
"""

import os
import sys
import logging
import dotenv
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
dotenv.load_dotenv()

# Check for API key
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
if not ELEVENLABS_API_KEY:
    logger.error("ELEVENLABS_API_KEY environment variable is not set.")
    sys.exit(1)

def text_to_speech_elevenlabs(text: str, voice_id: str = None) -> bytes:
    """
    Convert text to speech using ElevenLabs API.
    
    Args:
        text: The text to convert to speech
        voice_id: The ElevenLabs voice ID to use
        
    Returns:
        Audio data as bytes
    """
    try:
        import elevenlabs
        from elevenlabs import generate, save, Voice, VoiceSettings
        
        # Log API key status
        logger.info(f"Using ElevenLabs API key: {ELEVENLABS_API_KEY[:3]}...{ELEVENLABS_API_KEY[-3:]}")
        
        # Initialize API key
        elevenlabs.set_api_key(ELEVENLABS_API_KEY)
        
        # Get voice ID (use default if not specified)
        if not voice_id:
            # Use the "Daniel" voice for consistency
            voice_id = "Daniel"
            logger.info(f"Using default voice ID: {voice_id}")
        
        # Generate audio
        logger.info(f"Generating audio for text: {text[:50]}{'...' if len(text) > 50 else ''}")
        audio = generate(
            text=text,
            voice=voice_id,
            model="eleven_monolingual_v1"
        )
        
        return audio
    except ImportError as e:
        logger.error(f"Error importing ElevenLabs package: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Error generating speech with ElevenLabs: {str(e)}")
        return None

def save_audio_to_file(audio_data: bytes, filename: str) -> str:
    """
    Save audio data to a file and return the file path.
    
    Args:
        audio_data: Audio data as bytes
        filename: Name for the file
        
    Returns:
        Path to the saved audio file
    """
    try:
        from elevenlabs import save
        
        # Create directory if it doesn't exist
        output_dir = Path("static/audio")
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Save audio to file
        filepath = output_dir / filename
        save(audio_data, str(filepath))
        
        logger.info(f"Audio saved to: {filepath}")
        return str(filepath)
    except Exception as e:
        logger.error(f"Error saving audio to file: {str(e)}")
        return None

def test_elevenlabs():
    """Test ElevenLabs text-to-speech functionality."""
    
    logger.info("Starting ElevenLabs test...")
    
    # Test phrases
    test_texts = [
        "Hello! This is a test of the ElevenLabs text-to-speech API. How does it sound?",
        "WarmLeadNetwork AI offers cutting-edge AI communication tools for businesses.",
        "Our AI Video Magic feature can transform your static images into dynamic videos with just a few clicks."
    ]
    
    # Test each phrase
    for i, text in enumerate(test_texts):
        logger.info(f"Testing phrase {i+1}: {text[:30]}...")
        
        # Generate speech
        audio_data = text_to_speech_elevenlabs(text)
        
        if audio_data:
            # Save to file
            filename = f"test_elevenlabs_{i+1}.mp3"
            filepath = save_audio_to_file(audio_data, filename)
            
            if filepath:
                logger.info(f"Test {i+1} successful. Audio saved to: {filepath}")
            else:
                logger.error(f"Test {i+1} failed: Could not save audio file.")
                return False
        else:
            logger.error(f"Test {i+1} failed: Could not generate speech.")
            return False
    
    logger.info("All ElevenLabs tests completed successfully!")
    return True

if __name__ == "__main__":
    try:
        result = test_elevenlabs()
        sys.exit(0 if result else 1)
    except Exception as e:
        logger.error(f"Test failed with error: {e}")
        sys.exit(1)