"""
LangChain-based SalesGPT Agent Implementation

This module contains an alternative implementation of the SalesGPT agent
that uses LangChain directly with the OpenAI library, which has better
compatibility with different API key permission structures.
"""

import os
import json
import logging
import uuid
from typing import Any, Dict, List, Optional, Union

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import necessary libraries
try:
    from langchain_openai import ChatOpenAI
    from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
    HAS_LANGCHAIN = True
except ImportError:
    logger.warning("LangChain imports failed. Fallback mechanisms will be used.")
    HAS_LANGCHAIN = False

class LangChainSalesGPT:
    """
    A sales agent implementation using LangChain and OpenAI directly.
    
    This implementation avoids the permissions issues by using the LangChain
    wrapper around OpenAI, which handles API key permissions more gracefully.
    """
    
    def __init__(
        self,
        verbose: bool = False,
        product_catalog: Optional[str] = None,
        salesperson_name: str = "AI Sales Assistant",
        salesperson_role: str = "Sales Associate",
        company_name: str = "WarmLeadNetwork AI",
        company_business: str = "AI-powered communication platform",
        conversation_history: Optional[List[Dict[str, str]]] = None,
        conversation_stage: str = "Introduction",
        use_tools: bool = False,
        agent_id: Optional[int] = None,
    ):
        """
        Initialize the LangChainSalesGPT agent.
        
        Args:
            verbose: Whether to log detailed information
            product_catalog: Optional catalog of products to reference
            salesperson_name: Name of the sales persona
            salesperson_role: Role of the sales persona
            company_name: Name of the company represented
            company_business: Description of the company's business
            conversation_history: Previous conversation messages
            conversation_stage: Current stage of the sales conversation
            use_tools: Whether to use tools/plugins
            agent_id: Optional ID for the agent instance
        """
        self.verbose = verbose
        self.product_catalog = product_catalog
        self.salesperson_name = salesperson_name
        self.salesperson_role = salesperson_role
        self.company_name = company_name
        self.company_business = company_business
        self.conversation_stage = conversation_stage
        self.use_tools = use_tools
        self.agent_id = agent_id
        
        # Initialize conversation history
        self.conversation_history = conversation_history or []
        
        # Create a unique ID for this agent instance
        self.agent_id = agent_id or str(uuid.uuid4())
        
        if self.verbose:
            logger.info(f"Initialized LangChainSalesGPT agent {self.agent_id}")
            
        # Set up the LangChain OpenAI chat model with more compatible initialization
        if HAS_LANGCHAIN:
            try:
                # Try to initialize with OpenAI key from environment
                api_key = os.getenv("OPENAI_API_KEY")
                if not api_key:
                    # Try to read directly from .env file
                    try:
                        with open(".env") as f:
                            for line in f:
                                if line.strip().startswith("OPENAI_API_KEY="):
                                    api_key = line.strip().split("=", 1)[1].strip()
                                    break
                    except Exception as e:
                        logger.error(f"Error reading .env file: {str(e)}")
                
                # Initialize the chat model with fallback options
                self.chat_model = ChatOpenAI(
                    model_name="gpt-3.5-turbo",  # Use 3.5-turbo for wider compatibility
                    temperature=0.7,
                    api_key=api_key,
                    max_tokens=500
                )
                logger.info("Successfully initialized ChatOpenAI with LangChain")
            except Exception as e:
                logger.error(f"Error initializing ChatOpenAI: {str(e)}")
                self.chat_model = None
        else:
            self.chat_model = None
            logger.warning("LangChain not available. Agent will use fallback methods.")
    
    def _create_system_prompt(self) -> str:
        """Create the system prompt for the sales agent."""
        system_prompt = f"""
        You are {self.salesperson_name}, a {self.salesperson_role} at {self.company_name}. 
        {self.company_name} specializes in {self.company_business}.
        
        Your goal is to have a natural conversation with potential customers to 
        understand their needs and explain how {self.company_name} can help them.
        
        Be friendly, professional, and informative. Ask questions to understand 
        the prospect's needs before pitching solutions.
        
        Current conversation stage: {self.conversation_stage}
        """
        
        # Add product catalog information if available
        if self.product_catalog:
            system_prompt += f"\n\nHere's information about our products and services:\n{self.product_catalog}\n"
        
        return system_prompt
    
    def step(self, human_input: str) -> str:
        """
        Process a step in the conversation.
        
        Args:
            human_input: The human's message
            
        Returns:
            The agent's response
        """
        try:
            if self.verbose:
                logger.info(f"Processing input: {human_input[:50]}...")
            
            if not HAS_LANGCHAIN or not self.chat_model:
                # Fallback response if LangChain is not available
                logger.warning("Using fallback response because LangChain is not available")
                return (
                    "I apologize, but our AI system is experiencing technical difficulties. "
                    "Please contact our support team for assistance."
                )
            
            # Create the system message
            system_message = SystemMessage(content=self._create_system_prompt())
            
            # Convert conversation history to LangChain message format
            messages = [system_message]
            
            # Add conversation history
            for message in self.conversation_history:
                if message["role"] == "user":
                    messages.append(HumanMessage(content=message["content"]))
                elif message["role"] == "assistant":
                    messages.append(AIMessage(content=message["content"]))
            
            # Add the current human input
            messages.append(HumanMessage(content=human_input))
            
            if self.verbose:
                logger.info(f"Sending request with {len(messages)} messages")
                logger.info(f"Using model: gpt-3.5-turbo")
            
            # Get response from LangChain
            response = self.chat_model.invoke(messages)
            
            if self.verbose:
                logger.info(f"Received response: {response.content[:50]}...")
            
            # Extract the content from the response
            assistant_response = response.content
            
            # Update conversation history
            self.conversation_history.append({"role": "user", "content": human_input})
            self.conversation_history.append({"role": "assistant", "content": assistant_response})
            
            return assistant_response
        
        except Exception as e:
            logger.error(f"Error in conversation step: {str(e)}")
            
            # Provide detailed error information for debugging
            if "401" in str(e):
                logger.error("Authentication error: Please check your API key and permissions")
            elif "404" in str(e):
                logger.error("Model not found: The specified model may not be available for your account")
            elif "429" in str(e):
                logger.error("Rate limit exceeded: Your account has hit rate limits")
            
            import traceback
            logger.error(f"Full stack trace: {traceback.format_exc()}")
            
            # Provide a fallback response in case of errors
            fallback_response = (
                "I apologize, but I'm experiencing some technical difficulties at the moment. "
                "Let me try to address your question or concern. "
                "Could you please repeat or rephrase your message?"
            )
            
            # Still update conversation history with fallback response
            self.conversation_history.append({"role": "user", "content": human_input})
            self.conversation_history.append({"role": "assistant", "content": fallback_response})
            
            return fallback_response