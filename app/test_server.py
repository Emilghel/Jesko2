"""
Simple FastAPI server to test if port binding works correctly.
"""

import os
import sys
import logging
from fastapi import FastAPI
import uvicorn

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Initialize the application
app = FastAPI(
    title="Test Server",
    description="Simple test server to verify port binding",
    version="1.0.0",
)

@app.get("/")
def get_root():
    """Serve a simple HTML page with instructions."""
    return {"message": "Test server is running!"}

@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}

@app.on_event("startup")
async def startup_event():
    """Initialize the application on startup."""
    logger.info("Starting test FastAPI server")

if __name__ == "__main__":
    # Run the server
    host = "0.0.0.0"  # Bind to all interfaces
    port = int(os.getenv("PORT", 3001))  # Using port 3001 instead of 8080
    logger.info(f"Starting server on {host}:{port}")
    uvicorn.run(app, host=host, port=port, log_level="info")