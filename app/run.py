"""
SalesGPT FastAPI Server Entry Point

This is a simple entry point to run the FastAPI server for SalesGPT.
"""

import os
import sys
from pathlib import Path
import uvicorn
import dotenv

# Load environment variables
dotenv.load_dotenv()

if __name__ == "__main__":
    # Import and run app from main.py
    from main import app
    
    # Get the port from environment variable
    host = "0.0.0.0"  # Bind to all interfaces
    port = int(os.getenv("PORT", 3001))
    
    # Run the server
    uvicorn.run(app, host=host, port=port, log_level="info")