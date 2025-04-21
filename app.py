"""
SalesGPT Twilio Integration - Entry Point

This is the main entry point for the SalesGPT Twilio integration.
It simply imports and runs the FastAPI application.
"""

import os
import sys
import logging
import uvicorn
from pathlib import Path
import dotenv

# Load environment variables
dotenv.load_dotenv()

if __name__ == "__main__":
    # Set up logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    logger = logging.getLogger(__name__)
    
    try:
        # Import the FastAPI app from app/main.py
        sys.path.append(os.path.dirname(os.path.abspath(__file__)))
        from app.main import app
        
        # Run the FastAPI application
        host = "0.0.0.0"  # Bind to all interfaces
        port = int(os.getenv("PORT", 3001))
        logger.info(f"Starting SalesGPT server on {host}:{port}")
        uvicorn.run(app, host=host, port=port, log_level="info")
    except Exception as e:
        logger.error(f"Error starting application: {e}")
        sys.exit(1)