"""
Standalone SalesGPT Agent Implementation

This module contains a completely standalone implementation of the SalesGPT agent
that uses only requests to communicate with the OpenAI API, avoiding any dependencies
on the OpenAI Python library or LangChain which might have permission issues.
"""

import os
import json
import logging
import uuid
import requests
import datetime
from typing import Any, Dict, List, Optional, Union

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class StandaloneSalesGPT:
    """
    A sales agent implementation using direct HTTP requests to OpenAI.
    
    This implementation avoids all OpenAI libraries and permission issues
    by making direct HTTP requests with minimal dependencies.
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
        use_claude: bool = True,  # Default to Claude if available
    ):
        """
        Initialize the StandaloneSalesGPT agent.
        
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
        
        # Initialize conversation history
        self.conversation_history = conversation_history or []
        
        # Create a unique ID for this agent instance
        self.agent_id = agent_id or str(uuid.uuid4())
        
        # Get API key from environment
        self.api_key = self._get_api_key()
        
        # Set up detailed logging
        self.log_file = f"standalone_agent_{self.agent_id}.log"
        
        # Now log initial information
        self._log_event("Agent initialized", {
            "agent_id": self.agent_id,
            "salesperson_name": self.salesperson_name,
            "company_name": self.company_name,
            "api_key_exists": self.api_key is not None,
            "api_key_prefix": self.api_key[:7] if self.api_key else None
        })
        
        if self.verbose:
            logger.info(f"Initialized StandaloneSalesGPT agent {self.agent_id}")
            if self.api_key:
                logger.info(f"Using API key: {self.api_key[:5]}...{self.api_key[-4:]}")
            else:
                logger.warning("No API key found")
    
    def _get_api_key(self) -> Optional[str]:
        """Get the API key from environment variables or .env file."""
        # Use Anthropic API key by default (Claude)
        api_key = os.getenv("ANTHROPIC_API_KEY")
        
        # If Anthropic key is found, set a flag that we're using Claude
        if api_key:
            self.use_claude = True
            self.model = "claude-3-opus-20240229"  # Use Claude 3 Opus by default
            if self.verbose:
                logger.info(f"Using Anthropic Claude API with key: {api_key[:5]}...{api_key[-4:] if len(api_key) > 8 else ''}")
            return api_key
        
        # If not found, fall back to OpenAI API key
        self.use_claude = False
        api_key = os.getenv("OPENAI_API_KEY")
        
        # If still not found, try reading from .env file
        if not api_key:
            try:
                with open(".env") as f:
                    for line in f:
                        if line.strip().startswith("OPENAI_API_KEY="):
                            api_key = line.strip().split("=", 1)[1].strip().strip('"').strip("'")
                            break
            except Exception as e:
                logger.error(f"Error reading .env file: {str(e)}")
        
        return api_key
    
    def _create_system_prompt(self) -> str:
        """Create the system prompt for the sales agent."""
        system_prompt = f"""
        You are {self.salesperson_name}, a {self.salesperson_role} at {self.company_name}. 
        {self.company_name} specializes in {self.company_business}.
        
        WarmLeadNetwork AI offers a comprehensive suite of AI-powered communication solutions:
        
        1. AI Video Magic - Transform static images into dynamic videos with custom motion based on text prompts
        2. AI Clip Studio - Convert long-form videos into engaging short-form clips optimized for social media
        3. Audio Transcription - Accurately transcribe audio files into searchable text
        4. Sales Agent Automation - AI agents that can make calls, qualify leads, and schedule appointments
        5. Knowledge Base Integration - Train AI on your company's specific knowledge for accurate responses
        6. Real-time Analytics - Track performance metrics for all communication channels
        7. Partner Dashboard - Complete management of partner accounts, campaigns, and analytics
        
        Pricing is based on a coin system:
        - Video features cost 15 coins per use
        - Audio transcription costs 10 coins per use
        - Making calls costs 5 coins per call
        
        Your goal is to have a specific, detailed conversation with potential customers. Avoid generic responses.
        Be friendly but direct, and ask targeted questions to understand their specific business needs.
        
        When they ask questions, provide detailed answers about our specific features and capabilities.
        Use concrete examples of how our tools work. Reference specific metrics and benefits when possible.
        
        Current conversation stage: {self.conversation_stage}
        """
        
        # Add product catalog information if available
        if self.product_catalog:
            system_prompt += f"\n\nHere's more detailed information about our products and services:\n{self.product_catalog}\n"
        
        return system_prompt
    
    def chat_completion(
        self, 
        messages: List[Dict[str, str]],
        model: str = "gpt-3.5-turbo",
        temperature: float = 0.7,
        max_tokens: int = 500,
        top_p: float = 0.9
    ) -> Dict[str, Any]:
        """
        Send a request to either Claude or OpenAI API depending on configuration.
        
        Args:
            messages: List of message objects (role, content)
            model: Model to use (default depends on API provider)
            temperature: Temperature parameter (default: 0.7)
            max_tokens: Maximum tokens to generate (default: 500)
            top_p: Top-p parameter (default: 0.9)
            
        Returns:
            The API response dictionary (in OpenAI-compatible format)
        """
        if not self.api_key:
            raise ValueError("API key is required")
        
        # Check if we should use Claude API
        if hasattr(self, 'use_claude') and self.use_claude:
            return self._claude_chat_completion(messages, model, temperature, max_tokens, top_p)
        else:
            return self._openai_chat_completion(messages, model, temperature, max_tokens, top_p)
    
    def _claude_chat_completion(
        self, 
        messages: List[Dict[str, str]],
        model: str = "claude-3-opus-20240229",
        temperature: float = 0.8,  # Slightly higher temperature for more detailed responses
        max_tokens: int = 1000,    # Increased max tokens for longer, more detailed responses
        top_p: float = 0.95        # Slightly higher top_p for more creative responses
    ) -> Dict[str, Any]:
        """
        Send a request to the Anthropic Claude API.
        """
        # Claude API endpoint
        api_url = "https://api.anthropic.com/v1/messages"
        
        # Set up headers for Claude API
        headers = {
            "Content-Type": "application/json",
            "X-API-Key": self.api_key,
            "anthropic-version": "2023-06-01"
        }
        
        # Extract system message if present
        system_content = None
        claude_messages = []
        
        for msg in messages:
            if msg["role"] == "system":
                system_content = msg["content"]
            elif msg["role"] == "user":
                claude_messages.append({
                    "role": "user",
                    "content": msg["content"]
                })
            elif msg["role"] == "assistant":
                claude_messages.append({
                    "role": "assistant",
                    "content": msg["content"]
                })
            # Claude doesn't support function messages, so we'll skip those
        
        # Prepare Claude API payload
        payload = {
            "model": model,
            "messages": claude_messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "top_p": top_p
        }
        
        # Add system prompt if available
        if system_content:
            payload["system"] = system_content
        
        if self.verbose:
            logger.info(f"Sending request to Claude API with model: {model}")
            logger.info(f"Number of messages: {len(claude_messages)}")
            if system_content:
                logger.info(f"System prompt: {system_content[:50]}...")
        
        try:
            # Make the request to Claude API
            response = requests.post(
                api_url,
                headers=headers,
                json=payload,
                timeout=30
            )
            
            # Check if the request was successful
            if response.status_code == 200:
                if self.verbose:
                    logger.info("Claude API request successful")
                
                # Convert Claude response to OpenAI format for compatibility
                claude_data = response.json()
                
                # Create OpenAI-compatible response format
                openai_compatible = {
                    "choices": [{
                        "message": {
                            "content": claude_data["content"][0]["text"]
                        }
                    }]
                }
                
                return openai_compatible
                
            else:
                error_message = f"Claude API request failed with status {response.status_code}: {response.text}"
                logger.error(error_message)
                
                # Log detailed information about the error for debugging
                self._log_event("Claude API request failed", {
                    "status_code": response.status_code,
                    "error_text": response.text,
                    "request_url": api_url,
                    "model": model
                })
                
                # Create a fallback response
                return {
                    "choices": [{
                        "message": {
                            "content": f"Hello! I'm {self.salesperson_name} from {self.company_name}. I specialize in {self.company_business}. How can I assist you today?"
                        }
                    }]
                }
        
        except Exception as e:
            error_message = f"Claude API request failed: {str(e)}"
            logger.error(error_message)
            
            # Create a fallback response for any errors
            return {
                "choices": [{
                    "message": {
                        "content": f"Hello! I'm {self.salesperson_name} from {self.company_name}. I specialize in {self.company_business}. How can I assist you today?"
                    }
                }]
            }
    
    def _openai_chat_completion(
        self, 
        messages: List[Dict[str, str]],
        model: str = "gpt-3.5-turbo",
        temperature: float = 0.7,
        max_tokens: int = 500,
        top_p: float = 0.9
    ) -> Dict[str, Any]:
        """
        Send a request directly to the OpenAI Chat Completions API.
        """        
        api_url = "https://api.openai.com/v1/chat/completions"
        # Make sure we're using the right headers for the API key format
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        
        # Add OpenAI-specific headers that might help with admin keys
        # The OpenAI-Organization header is needed for organization-based API keys
        org_id = os.getenv("OPENAI_ORG_ID", "")
        if org_id:
            headers["OpenAI-Organization"] = org_id
            
        # For OAuth2-like keys with special 'sk-admin-' prefix
        if self.api_key and self.api_key.startswith("sk-admin-"):
            # Log the special key pattern for debugging
            self._log_event("Using admin API key format", {
                "key_prefix": self.api_key[:9] if self.api_key and len(self.api_key) >= 9 else self.api_key,
                "key_length": len(self.api_key) if self.api_key else 0
            })
            
            # Try adding additional OAuth2-style headers that might help with admin keys
            project_id = os.getenv("OPENAI_PROJECT_ID")
            if project_id:
                headers["OpenAI-Project"] = project_id
                
            # Add header that might be needed for organization-restricted keys
            headers["OpenAI-Auth-Type"] = "bearer"
        
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "top_p": top_p
        }
        
        if self.verbose:
            logger.info(f"Sending request to OpenAI API with model: {model}")
            logger.info(f"Number of messages: {len(messages)}")
        
        try:
            response = requests.post(
                api_url,
                headers=headers,
                json=payload,
                timeout=30
            )
            
            # Check if the request was successful
            if response.status_code == 200:
                if self.verbose:
                    logger.info("API request successful")
                return response.json()
            else:
                error_message = f"API request failed with status {response.status_code}: {response.text}"
                logger.error(error_message)
                
                # Log detailed information about the error for debugging
                self._log_event("API request failed", {
                    "status_code": response.status_code,
                    "error_text": response.text,
                    "request_url": api_url,
                    "model": model,
                    "headers": {k: v for k, v in headers.items() if k != "Authorization"},
                    "has_auth_header": "Authorization" in headers,
                    "api_key_prefix": self.api_key[:9] if self.api_key and len(self.api_key) >= 9 else None,
                    "api_key_format": "admin" if self.api_key and self.api_key.startswith("sk-admin-") else "standard" if self.api_key and self.api_key.startswith("sk-") else "unknown"
                })
                
                # Handle various API errors with appropriate fallbacks
                # Missing scope issues with admin-prefixed keys
                if ("missing scopes" in response.text.lower() or 
                    "insufficient permissions" in response.text.lower() or
                    response.status_code == 401):
                    
                    # Always fall back to gpt-3.5-turbo which has fewer permission requirements
                    if model != "gpt-3.5-turbo":
                        logger.warning(f"Falling back to gpt-3.5-turbo due to permissions issue with {model}")
                        return self._openai_chat_completion(
                            messages=messages,
                            model="gpt-3.5-turbo",
                            temperature=temperature,
                            max_tokens=max_tokens,
                            top_p=top_p
                        )
                    else:
                        # If we're already using gpt-3.5-turbo and still hitting an issue,
                        # try to generate a simulated response directly
                        logger.warning("Permission issues even with gpt-3.5-turbo, using simulated response")
                        
                        # Extract the last user message for context
                        last_user_message = ""
                        for msg in reversed(messages):
                            if msg["role"] == "user":
                                last_user_message = msg["content"]
                                break
                        
                        # Generate a simple, contextual response
                        return {
                            "choices": [{
                                "message": {
                                    "content": f"I understand you're asking about {last_user_message[:30]}... As an AI Sales Assistant at WarmLeadNetwork AI, I specialize in helping with communication platform solutions. Could you tell me more about your specific needs so I can better assist you?"
                                }
                            }]
                        }
                
                # Otherwise, just raise an exception
                raise ValueError(error_message)
        
        except requests.exceptions.RequestException as e:
            error_message = f"Request failed: {str(e)}"
            logger.error(error_message)
            raise ValueError(error_message)
    
    def _log_event(self, event_name: str, data: Dict[str, Any]) -> None:
        """
        Log an event with associated data to a file for debugging.
        
        Args:
            event_name: Name of the event
            data: Dictionary containing event-related data
        """
        try:
            timestamp = datetime.datetime.now().isoformat()
            log_entry = {
                "timestamp": timestamp,
                "event": event_name,
                "agent_id": getattr(self, "agent_id", "unknown"),
                "data": data
            }
            
            # Create a JSON string with the log entry
            log_str = json.dumps(log_entry)
            
            # Write to a file
            with open(getattr(self, "log_file", "standalone_agent.log"), "a") as f:
                f.write(f"{log_str}\n")
                
            if self.verbose:
                logger.info(f"Event logged: {event_name}")
        except Exception as e:
            # Don't let logging failures break the agent
            logger.error(f"Error logging event: {str(e)}")
    
    def extract_message_content(self, response: Dict[str, Any]) -> str:
        """Extract the message content from an API response."""
        try:
            return response["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as e:
            error_message = f"Failed to extract message content: {str(e)}"
            logger.error(error_message)
            raise ValueError(error_message)
    
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
            
            # Create the messages array with system message first
            messages = [
                {"role": "system", "content": self._create_system_prompt()}
            ]
            
            # Add conversation history
            for message in self.conversation_history:
                messages.append(message)
            
            # Add the current human input
            messages.append({"role": "user", "content": human_input})
            
            # Log this conversation step
            self._log_event("Conversation step", {
                "direction": "incoming",
                "message": human_input[:100] + ("..." if len(human_input) > 100 else ""),
                "history_length": len(self.conversation_history)
            })
            
            # Try to get a response from the API
            try:
                # Use Claude model if configured, otherwise fallback to OpenAI
                model = self.model if hasattr(self, 'use_claude') and self.use_claude else "gpt-3.5-turbo"
                response = self.chat_completion(
                    messages=messages,
                    model=model
                )
                
                # Extract the response content
                assistant_response = self.extract_message_content(response)
                
                # Update conversation history
                self.conversation_history.append({"role": "user", "content": human_input})
                self.conversation_history.append({"role": "assistant", "content": assistant_response})
                
                # Log the assistant's response
                self._log_event("Conversation step", {
                    "direction": "outgoing",
                    "message": assistant_response[:100] + ("..." if len(assistant_response) > 100 else ""),
                    "model_used": model,
                    "history_length": len(self.conversation_history) + 2
                })
                
                if self.verbose:
                    logger.info(f"Response: {assistant_response[:50]}...")
                
                return assistant_response
                
            except Exception as e:
                # Log the error but don't re-raise it
                logger.error(f"Error during API call: {str(e)}")
                
                # Provide a hardcoded response about our company
                hardcoded_response = (
                    f"Hello! I'm {self.salesperson_name}, a {self.salesperson_role} at {self.company_name}. "
                    f"We specialize in {self.company_business}. "
                    f"How can I help you today?"
                )
                
                # Update conversation history
                self.conversation_history.append({"role": "user", "content": human_input})
                self.conversation_history.append({"role": "assistant", "content": hardcoded_response})
                
                return hardcoded_response
                
        except Exception as e:
            logger.error(f"Error in conversation step: {str(e)}")
            
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