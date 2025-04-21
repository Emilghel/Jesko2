"""
Test script for SalesGPT

This script tests the basic functionality of the SalesGPT agent without the FastAPI server.
"""

import os
import sys
import logging
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Add the current directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load environment variables
load_dotenv()

# Check if OpenAI API key is set
if not os.getenv("OPENAI_API_KEY"):
    logger.error("OpenAI API key not found. Please set the OPENAI_API_KEY environment variable.")
    sys.exit(1)

try:
    # Import SalesGPT module
    from SalesGPT.salesgpt import SalesGPT
    from SalesGPT.salesbot import SalesBot
    
    # Simple test function
    def test_salesgpt():
        logger.info("Testing SalesGPT agent...")
        
        # Create agent configuration
        agent_config = {
            "name": "Test Sales Agent",
            "role": "Sales Representative",
            "personality": "friendly, helpful",
            "goals": ["Understand customer needs", "Provide information about products"],
            "temperature": 0.7
        }
        
        # Create a simple product catalog
        product_catalog = """
        Our product is a software solution that helps businesses automate tasks.
        Features include:
        - Task automation
        - Integration with other tools
        - Analytics dashboard
        Pricing starts at $99/month.
        """
        
        # Create the SalesGPT agent
        agent = SalesGPT(
            agent_config=agent_config,
            product_catalog=product_catalog,
            verbose=True,
            model_name=os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
        )
        
        # Test the agent with a message
        logger.info("Sending a test message to the agent...")
        response, state = agent.step("Tell me about your product.")
        
        logger.info(f"Agent response: {response}")
        logger.info(f"Conversation stage: {state['conversation_stage']}")
        
        return True
    
    # Run the test
    if __name__ == "__main__":
        success = test_salesgpt()
        if success:
            logger.info("Test completed successfully!")
            sys.exit(0)
        else:
            logger.error("Test failed!")
            sys.exit(1)
            
except ImportError as e:
    logger.error(f"Import error: {e}")
    logger.error("Make sure you have installed all the required packages.")
    sys.exit(1)
except Exception as e:
    logger.error(f"Error: {e}")
    sys.exit(1)