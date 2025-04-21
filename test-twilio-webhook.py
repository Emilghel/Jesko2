"""
Test script for Twilio webhook integration

This script simulates a Twilio webhook request to test the integration.
"""

import os
import requests
import logging
import dotenv
import uuid
from typing import Dict, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Load environment variables
dotenv.load_dotenv()

def test_twilio_audio_webhook(base_url: str = "http://localhost:8080") -> bool:
    """
    Test the Twilio audio webhook endpoint by simulating a Twilio request.
    
    Args:
        base_url: Base URL of the FastAPI server
        
    Returns:
        bool: True if the test passed, False otherwise
    """
    # Endpoint to test
    endpoint = f"{base_url}/twilio/audio"
    
    # Generate a random call SID to use as session ID
    call_sid = f"CA{uuid.uuid4().hex[:30]}"
    
    # Simulate a Twilio webhook request
    data = {
        "CallSid": call_sid,
        "From": "+15551234567",
        "To": os.getenv("TWILIO_PHONE_NUMBER", "+15557654321"),
        "Direction": "inbound"
    }
    
    logger.info(f"Testing Twilio audio webhook with call SID: {call_sid}")
    
    try:
        # Send the request
        response = requests.post(endpoint, data=data)
        
        if response.status_code == 200:
            logger.info("Successfully received response from Twilio audio webhook")
            # Check if the response is valid TwiML
            if "<?xml" in response.text and "<Response>" in response.text:
                logger.info("Response contains valid TwiML")
                logger.info(f"TwiML response: {response.text[:200]}...")
                return True
            else:
                logger.error("Response does not contain valid TwiML")
                logger.error(f"Received response: {response.text}")
                return False
        else:
            logger.error(f"Error from Twilio audio webhook: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        logger.error(f"Exception during Twilio audio webhook test: {e}")
        return False

def test_twilio_input_webhook(base_url: str = "http://localhost:8080") -> bool:
    """
    Test the Twilio input webhook endpoint by simulating a Twilio speech recognition request.
    
    Args:
        base_url: Base URL of the FastAPI server
        
    Returns:
        bool: True if the test passed, False otherwise
    """
    # Endpoint to test
    session_id = f"test-session-{uuid.uuid4().hex[:8]}"
    endpoint = f"{base_url}/twilio/input"
    
    # Simulate a Twilio webhook request with speech recognition result
    data = {
        "session_id": session_id,
        "SpeechResult": "Hello, I'm interested in learning more about your product.",
        "CallSid": f"CA{uuid.uuid4().hex[:30]}",
        "Confidence": "0.8"
    }
    
    logger.info(f"Testing Twilio input webhook with session ID: {session_id}")
    
    try:
        # Send the request
        response = requests.post(endpoint, data=data)
        
        if response.status_code == 200:
            logger.info("Successfully received response from Twilio input webhook")
            # Check if the response is valid TwiML
            if "<?xml" in response.text and "<Response>" in response.text:
                logger.info("Response contains valid TwiML")
                logger.info(f"TwiML response: {response.text[:200]}...")
                return True
            else:
                logger.error("Response does not contain valid TwiML")
                logger.error(f"Received response: {response.text}")
                return False
        else:
            logger.error(f"Error from Twilio input webhook: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        logger.error(f"Exception during Twilio input webhook test: {e}")
        return False

if __name__ == "__main__":
    logger.info("Starting Twilio webhook tests")
    
    # Check if we need to use a different base URL
    base_url = os.getenv("FASTAPI_URL", "http://localhost:8080")
    
    logger.info(f"Using base URL: {base_url}")
    
    # Test the Twilio audio webhook
    audio_result = test_twilio_audio_webhook(base_url)
    
    # Test the Twilio input webhook
    input_result = test_twilio_input_webhook(base_url)
    
    # Report results
    if audio_result and input_result:
        logger.info("All Twilio webhook tests passed!")
    elif audio_result:
        logger.warning("Twilio audio webhook test passed, but input webhook test failed")
    elif input_result:
        logger.warning("Twilio input webhook test passed, but audio webhook test failed")
    else:
        logger.error("All Twilio webhook tests failed")