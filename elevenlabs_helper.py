"""
ElevenLabs integration helper module for SalesGPT API - Updated for v1.56.0+

This module provides simplified access to ElevenLabs functionality with proper error handling,
using the direct REST API when needed for compatibility.
"""

import os
import sys
import logging
import json
import requests
from pathlib import Path
from typing import Optional, Dict, Any, List

# Configure logger
logger = logging.getLogger("elevenlabs_helper")

# Global variables
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
elevenlabs_available = False

# Set a flag to ensure we only try to import once
_elevenlabs_import_attempted = False

def initialize_elevenlabs():
    """Initialize ElevenLabs API with proper error handling."""
    global elevenlabs_available, _elevenlabs_import_attempted, ELEVENLABS_API_KEY
    
    # Don't attempt to import multiple times
    if _elevenlabs_import_attempted:
        return elevenlabs_available
    
    _elevenlabs_import_attempted = True
    
    # Check if API key is available
    if not ELEVENLABS_API_KEY:
        logger.warning("No ElevenLabs API key found in environment variables")
        elevenlabs_available = False
        return False
    
    # Test API key with direct API call
    try:
        url = "https://api.elevenlabs.io/v1/voices"
        headers = {
            "Accept": "application/json",
            "xi-api-key": ELEVENLABS_API_KEY
        }
        
        logger.info(f"Testing API key with direct API call to {url}")
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            # Success - API key works
            logger.info("SUCCESS: ElevenLabs API key is valid and working!")
            voices_data = response.json()
            
            # Log available voices
            if "voices" in voices_data:
                voices = voices_data["voices"]
                logger.info(f"Found {len(voices)} voices")
                
                # Just log the first few voices to avoid log spam
                for i, voice in enumerate(voices[:5]):
                    voice_id = voice.get("voice_id", "unknown")
                    name = voice.get("name", "unnamed")
                    logger.info(f"{i+1}. {name} (ID: {voice_id})")
                
                if len(voices) > 5:
                    logger.info(f"... and {len(voices) - 5} more voices")
            
            elevenlabs_available = True
            return True
        else:
            logger.error(f"ElevenLabs API key check failed with status code {response.status_code}")
            logger.error(f"Response: {response.text}")
            elevenlabs_available = False
            return False
            
    except Exception as e:
        logger.error(f"Error testing ElevenLabs API key: {str(e)}")
        elevenlabs_available = False
        return False

def get_voice_id(voice_name: str = "Matthew") -> Optional[str]:
    """Get the voice ID for a given voice name."""
    try:
        url = "https://api.elevenlabs.io/v1/voices"
        headers = {
            "Accept": "application/json",
            "xi-api-key": ELEVENLABS_API_KEY
        }
        
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            voices_data = response.json()
            
            if "voices" in voices_data:
                voices = voices_data["voices"]
                
                # Look for voice with matching name (case-insensitive)
                for voice in voices:
                    if voice.get("name", "").lower() == voice_name.lower():
                        return voice.get("voice_id")
                
                # If we couldn't find the exact name, try to find a voice that contains the name
                for voice in voices:
                    if voice_name.lower() in voice.get("name", "").lower():
                        return voice.get("voice_id")
                
                # If we still couldn't find a match, use the first voice
                if voices:
                    logger.warning(f"Could not find voice '{voice_name}', using '{voices[0].get('name')}' instead")
                    return voices[0].get("voice_id")
            
        logger.error(f"Error getting voice ID: {response.status_code} - {response.text}")
        return None
    except Exception as e:
        logger.error(f"Error in get_voice_id: {str(e)}")
        return None

def generate_speech(text: str, voice_name: str = "Matthew", model: str = "eleven_monolingual_v1") -> Optional[bytes]:
    """Generate speech from text using ElevenLabs direct API."""
    global elevenlabs_available, ELEVENLABS_API_KEY
    
    # Initialize ElevenLabs if not already done
    if not elevenlabs_available and not initialize_elevenlabs():
        logger.warning("ElevenLabs not available, cannot generate speech")
        return None
    
    try:
        # Get the voice ID for the given voice name
        voice_id = get_voice_id(voice_name)
        if not voice_id:
            logger.error(f"Could not find voice ID for '{voice_name}'")
            return None
        
        logger.info(f"Generating speech with voice '{voice_name}' (ID: {voice_id}) and model '{model}'")
        
        # API endpoint
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
        
        # Headers
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": ELEVENLABS_API_KEY
        }
        
        # Request body
        body = {
            "text": text,
            "model_id": model,
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75
            }
        }
        
        # Make the request
        response = requests.post(url, json=body, headers=headers)
        
        if response.status_code == 200:
            logger.info("Successfully generated speech")
            return response.content
        else:
            logger.error(f"Error generating speech: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        logger.error(f"Error in generate_speech: {str(e)}")
        return None

def save_speech(audio_data: bytes, filepath: str) -> bool:
    """Save audio data to file."""
    if audio_data is None:
        logger.warning("No audio data to save")
        return False
    
    try:
        # Create directory if it doesn't exist
        directory = os.path.dirname(filepath)
        if directory and not os.path.exists(directory):
            os.makedirs(directory)
        
        # Write the audio data to the file
        with open(filepath, "wb") as f:
            f.write(audio_data)
            
        logger.info(f"Audio saved to {filepath}")
        return True
    except Exception as e:
        logger.error(f"Error saving audio to {filepath}: {str(e)}")
        return False

def is_available() -> bool:
    """Check if ElevenLabs is available."""
    global elevenlabs_available
    
    # Try to initialize if not already done
    if not elevenlabs_available:
        initialize_elevenlabs()
    
    return elevenlabs_available

# Initialize when module is imported
initialize_elevenlabs()