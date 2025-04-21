#!/usr/bin/env python
"""
Simple test for ElevenLabs integration

This script directly imports and uses our custom ElevenLabs helper module
to test if it works correctly.
"""

import os
import sys
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("elevenlabs_test")

# First try to import from app directory
try:
    sys.path.append(".")
    sys.path.append("app")
    
    import elevenlabs_helper
    
    # Test if ElevenLabs is available
    available = elevenlabs_helper.is_available()
    logger.info(f"ElevenLabs available: {available}")
    
    if available:
        # Generate test speech
        logger.info("Generating test speech...")
        text = "This is a test of the ElevenLabs voice synthesis API."
        
        audio = elevenlabs_helper.generate_speech(text, voice_name="Matthew")
        
        if audio:
            logger.info(f"Successfully generated audio, size: {len(audio)} bytes")
            
            # Save to file
            output_path = "test_audio_simple.mp3"
            success = elevenlabs_helper.save_speech(audio, output_path)
            
            if success:
                logger.info(f"Successfully saved audio to {output_path}")
            else:
                logger.error("Failed to save audio")
        else:
            logger.error("Failed to generate audio")
    else:
        logger.error("ElevenLabs is not available")
        
except ImportError as e:
    logger.error(f"Failed to import elevenlabs_helper: {str(e)}")
except Exception as e:
    logger.error(f"Unexpected error: {str(e)}")