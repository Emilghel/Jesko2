"""
JeskoSalesGPT Agent Implementation

This module contains the implementation of the JeskoSalesGPT agent, which is a
specialized version of SalesGPT adapted for the WarmLeadNetwork AI platform.

Updated to use OpenAI API directly for more reliable results.
"""

import os
import logging
from typing import List, Dict, Any, Optional, Union

# Import our custom OpenAI client
from jesko_salesgpt.openai_client import OpenAIClient

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class JeskoSalesGPT:
    """
    A specialized sales agent implementation for WarmLeadNetwork AI.
    
    This agent is designed to handle sales conversations in a more controlled
    manner, with better error handling and integration with the platform's features.
    
    This implementation uses the OpenAI API directly to avoid authentication issues.
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
        Initialize the JeskoSalesGPT agent.
        
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
        
        # Get OpenAI API key from environment
        self.openai_api_key = os.environ.get("OPENAI_API_KEY")
        if not self.openai_api_key:
            logger.error("OPENAI_API_KEY not found in environment variables")
            raise ValueError("OPENAI_API_KEY not provided")
            
        logger.info(f"Using OpenAI API key: {self.openai_api_key[:5]}...{self.openai_api_key[-4:]}")
        
        # Initialize our custom OpenAI client
        self.openai_client = OpenAIClient(self.openai_api_key)
        
        # Generate system prompt
        self.system_prompt = self._create_system_prompt()
        
        if self.verbose:
            logger.info(f"Initialized JeskoSalesGPT with agent_id: {self.agent_id}")
    
    def _create_system_prompt(self) -> str:
        """Create the system prompt for the sales agent."""
        
        # System message with agent's persona and guidelines
        system_prompt = f"""
        You are {self.salesperson_name}, a {self.salesperson_role} at {self.company_name}. 
        {self.company_name} {self.company_business}.
        
        Your goal is to understand the customer's needs and explain how our products can help them.
        Be friendly, professional, and helpful. Answer questions honestly and if you don't know something,
        admit it and offer to find out more information.
        
        Current conversation stage: {self.conversation_stage}
        
        Guidelines:
        - Keep responses concise and clear
        - Focus on understanding the customer's specific needs before pitching
        - Talk about benefits, not just features
        - Use a friendly, conversational tone
        - Never make up information about products or services
        - If a question is outside your knowledge, admit it and offer to connect the customer with someone who can help
        
        Remember that you're representing {self.company_name}, so maintain professionalism at all times.
        """
        
        # Add product catalog information if available
        if self.product_catalog:
            system_prompt += f"\n\nProduct information:\n{self.product_catalog}\n"
            
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
            # Prepare conversation history in the format required by OpenAI
            messages = [{"role": "system", "content": self.system_prompt}]
            
            # Add previous conversation history
            for message in self.conversation_history:
                messages.append(message)
                
            # Add the new user message
            messages.append({"role": "user", "content": human_input})
            
            if self.verbose:
                logger.info(f"Sending request to OpenAI API with {len(messages)} messages")
                logger.info(f"Using model: gpt-3.5-turbo")
            
            # Use our custom OpenAI client to handle API call and potential errors
            try:
                # Start with gpt-3.5-turbo to ensure we get a response
                response = self.openai_client.chat_completion(
                    messages=messages,
                    model="gpt-3.5-turbo",  # Start with a model that has fewer permission requirements
                    temperature=0.7,
                    max_tokens=500,
                    top_p=0.9
                )
                
                # Extract the response text
                assistant_response = self.openai_client.extract_message_content(response)
                logger.info("Successfully received and extracted response content")
                
            except Exception as api_error:
                logger.error(f"Error during OpenAI API call: {str(api_error)}")
                raise  # Re-raise to be caught by the outer try/except
            
            # Append to conversation history
            self.conversation_history.append({"role": "user", "content": human_input})
            self.conversation_history.append({"role": "assistant", "content": assistant_response})
            
            if self.verbose:
                logger.info(f"Received response from OpenAI API: {assistant_response[:50]}...")
                
            return assistant_response
        
        except Exception as e:
            logger.error(f"Error in agent step: {str(e)}")
            
            # Provide detailed error information for debugging
            if "401" in str(e):
                logger.error("Authentication error: Please check your API key and permissions")
            elif "404" in str(e):
                logger.error("Model not found: The specified model may not be available for your account")
            elif "429" in str(e):
                logger.error("Rate limit exceeded: Your account has hit rate limits")
            elif "insufficient permissions" in str(e).lower() or "missing scopes" in str(e).lower():
                logger.error("API key permission issue: The API key lacks the required scopes for this model")
            
            import traceback
            logger.error(f"Full stack trace: {traceback.format_exc()}")
                
            # Provide a fallback response in case of errors
            fallback_response = (
                "I apologize, but I'm experiencing some technical difficulties at the moment. "
                "Let me try to address your question or concern. "
                "Could you please repeat or rephrase your message?"
            )
            self.conversation_history.append({"role": "user", "content": human_input})
            self.conversation_history.append({"role": "assistant", "content": fallback_response})
            return fallback_response