"""
Test script for the Jesko SalesGPT implementation

This script tests basic functionality of the custom SalesGPT implementation.
"""

import os
import sys
import logging
import json
from pathlib import Path
import dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
dotenv.load_dotenv()

# Make sure OpenAI API key is set
if not os.getenv("OPENAI_API_KEY"):
    logger.error("OPENAI_API_KEY environment variable is not set.")
    sys.exit(1)

# Import the JeskoSalesGPT agent
try:
    from jesko_salesgpt import JeskoSalesGPT
    logger.info("Successfully imported JeskoSalesGPT")
except ImportError as e:
    logger.error(f"Error importing JeskoSalesGPT: {e}")
    sys.exit(1)

def test_salesgpt():
    """Test basic functionality of the JeskoSalesGPT agent."""
    
    logger.info("Initializing JeskoSalesGPT agent...")
    
    # Create the agent
    agent = JeskoSalesGPT(
        verbose=True,
        product_catalog="""
        WarmLeadNetwork AI offers the following products:
        
        1. AI Communication Platform - $99/month
           - AI-powered conversations with customers
           - Email, chat, and voice integration
           - Analytics and reporting
        
        2. Lead Management System - $79/month
           - Capture and organize leads
           - Automated follow-up sequences
           - CRM integration
        
        3. AI Video Magic - $149/month
           - Transform images into videos
           - Create social media shorts
           - Custom branding options
        """,
        salesperson_name="Jesko AI",
        salesperson_role="AI Sales Consultant",
        company_name="WarmLeadNetwork",
        company_business="provides AI-powered communication tools for businesses",
    )
    
    # Test a basic conversation
    logger.info("Starting test conversation...")
    
    messages = [
        "Hi there, I'm interested in your AI tools. What do you offer?",
        "How much does the AI Video Magic cost?",
        "Can I try it before I buy?",
        "Thank you for the information!"
    ]
    
    # Run the conversation
    for i, message in enumerate(messages):
        logger.info(f"User message {i+1}: {message}")
        
        response = agent.step(message)
        
        logger.info(f"Agent response {i+1}: {response}")
        
        # Optional: add a pause for readability
        # import time
        # time.sleep(1)
    
    logger.info("Conversation history:")
    for msg in agent.conversation_history:
        logger.info(f"{msg['role']}: {msg['content']}")
    
    logger.info("Test completed successfully!")
    return True

if __name__ == "__main__":
    try:
        result = test_salesgpt()
        sys.exit(0 if result else 1)
    except Exception as e:
        logger.error(f"Test failed with error: {e}")
        sys.exit(1)