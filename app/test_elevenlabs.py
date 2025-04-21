#!/usr/bin/env python
"""
ElevenLabs Test API

This module provides a simple FastAPI app that tests ElevenLabs integration
"""

import os
import sys
import logging
import time
from typing import Dict, Optional
from pathlib import Path
from datetime import datetime

# FastAPI imports
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("elevenlabs_test_api")

# Import ElevenLabs helper
try:
    # First try to import from the app directory
    try:
        from app.elevenlabs_helper import initialize_elevenlabs, generate_speech, save_speech, is_available
        logger.info("Successfully imported elevenlabs_helper from app package")
    except ImportError:
        # Then try to import from the current directory
        from elevenlabs_helper import initialize_elevenlabs, generate_speech, save_speech, is_available
        logger.info("Successfully imported elevenlabs_helper from current directory")
except Exception as e:
    logger.error(f"Error importing ElevenLabs helper: {str(e)}")
    # Define fallback functions
    def is_available() -> bool:
        return False
    def generate_speech(text: str, voice_name: str = "Matthew") -> Optional[bytes]:
        return None
    def save_speech(audio_data: bytes, filepath: str) -> bool:
        return False
    def initialize_elevenlabs() -> bool:
        return False

# Set up output directory
AUDIO_DIR = Path("static/audio_test")
AUDIO_DIR.mkdir(exist_ok=True, parents=True)

# Create the FastAPI app
app = FastAPI(
    title="ElevenLabs Test API",
    description="API for testing ElevenLabs integration",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static directory
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": "ElevenLabs Test API",
        "version": "1.0.0",
        "status": "operational"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    elevenlabs_status = is_available()
    
    return {
        "status": "healthy",
        "elevenlabs_available": elevenlabs_status,
        "elevenlabs_api_key_exists": os.getenv("ELEVENLABS_API_KEY") is not None,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/test")
async def test_elevenlabs():
    """Test ElevenLabs integration."""
    try:
        # Initialize ElevenLabs
        elevenlabs_available = initialize_elevenlabs()
        
        if not elevenlabs_available:
            return {
                "status": "error",
                "message": "ElevenLabs API is not available"
            }
            
        # Generate test text
        test_text = "This is a test of the ElevenLabs voice synthesis API."
        
        # Generate speech
        logger.info(f"Generating speech for: {test_text}")
        audio_data = generate_speech(
            text=test_text,
            voice_name="Matthew"
        )
        
        if not audio_data:
            return {
                "status": "error",
                "message": "Failed to generate speech"
            }
            
        # Save to file
        timestamp = int(time.time())
        filename = f"test_{timestamp}.mp3"
        filepath = AUDIO_DIR / filename
        
        success = save_speech(audio_data, str(filepath))
        
        if not success:
            return {
                "status": "error",
                "message": f"Failed to save audio to {filepath}"
            }
            
        # Return success response
        return {
            "status": "success",
            "message": "Successfully generated and saved audio",
            "audio_url": f"/static/audio_test/{filename}",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error testing ElevenLabs: {str(e)}")
        return {
            "status": "error",
            "message": f"Error testing ElevenLabs: {str(e)}"
        }

# Run the app if executed directly
if __name__ == "__main__":
    import uvicorn
    
    # Run the server
    host = "0.0.0.0"
    port = 3002
    logger.info(f"Starting server on {host}:{port}")
    uvicorn.run(app, host=host, port=port, log_level="info")