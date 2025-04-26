"""
Anthropic Claude API Client for SalesGPT

This module provides integration with Anthropic's Claude API for the SalesGPT agent,
allowing the use of Claude models instead of OpenAI models.
"""

import json
import os
import logging
import datetime
import requests
from typing import Dict, List, Any, Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ClaudeClient:
    """
    Client for interacting with Anthropic's Claude API.
    """
    
    def __init__(self, 
                 api_key: Optional[str] = None,
                 model: str = "claude-3-opus-20240229",
                 verbose: bool = False,
                 log_file: str = "claude_client.log"):
        """
        Initialize the Claude API client.
        
        Args:
            api_key: Anthropic API key (defaults to env var ANTHROPIC_API_KEY)
            model: Claude model to use (default: claude-3-opus-20240229)
            verbose: Whether to print verbose logs
            log_file: Path to log file for detailed event logging
        """
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError("No Anthropic API key provided. Set ANTHROPIC_API_KEY environment variable or pass it to the constructor.")
        
        self.model = model
        self.verbose = verbose
        self.log_file = log_file
        
        # API endpoints
        self.api_base = "https://api.anthropic.com"
        self.messages_endpoint = f"{self.api_base}/v1/messages"
        
        # Log initialization
        self._log_event("Initialized Claude client", {
            "model": self.model,
            "api_key_prefix": self.api_key[:7] if self.api_key and len(self.api_key) >= 8 else None,
            "api_key_length": len(self.api_key) if self.api_key else 0
        })
        
        if self.verbose:
            logger.info(f"Claude client initialized with model: {self.model}")
    
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
                "data": data
            }
            
            # Create a JSON string with the log entry
            log_str = json.dumps(log_entry)
            
            # Write to a file
            with open(self.log_file, "a") as f:
                f.write(f"{log_str}\n")
                
            if self.verbose:
                logger.info(f"Event logged: {event_name}")
        except Exception as e:
            # Don't let logging failures break the client
            logger.error(f"Error logging event: {str(e)}")
    
    def chat_completion(self, 
                       messages: List[Dict[str, str]], 
                       system_prompt: Optional[str] = None,
                       temperature: float = 0.7,
                       max_tokens: int = 1000,
                       top_p: float = 0.95) -> Dict[str, Any]:
        """
        Send a chat completion request to Claude API.
        
        Args:
            messages: List of message objects with role and content
            system_prompt: Optional system prompt to provide context
            temperature: Controls randomness (0-1)
            max_tokens: Maximum number of tokens to generate
            top_p: Controls diversity via nucleus sampling
            
        Returns:
            Claude API response as a dictionary
        """
        # Convert OpenAI message format to Claude format
        claude_messages = []
        for msg in messages:
            if msg["role"] == "system":
                # Skip system messages as they'll be handled separately
                continue
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
            # Ignore other roles like 'function' that Claude doesn't support
        
        # Prepare the request payload
        payload = {
            "model": self.model,
            "messages": claude_messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "top_p": top_p,
        }
        
        # Add system prompt if provided
        if system_prompt:
            payload["system"] = system_prompt
        
        # Add authorization headers
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        
        if self.verbose:
            logger.info(f"Sending request to Claude API with model: {self.model}")
            logger.info(f"Number of messages: {len(claude_messages)}")
        
        try:
            response = requests.post(
                self.messages_endpoint,
                headers=headers,
                json=payload,
                timeout=30
            )
            
            # Check if the request was successful
            if response.status_code == 200:
                if self.verbose:
                    logger.info("API request successful")
                
                # Convert response to be compatible with OpenAI format for easier integration
                claude_response = response.json()
                
                # Transform Claude response to match OpenAI format
                openai_compatible_response = {
                    "choices": [{
                        "message": {
                            "content": claude_response["content"][0]["text"]
                        }
                    }]
                }
                
                return openai_compatible_response
            else:
                error_message = f"API request failed with status {response.status_code}: {response.text}"
                logger.error(error_message)
                
                # Log detailed information about the error for debugging
                self._log_event("API request failed", {
                    "status_code": response.status_code,
                    "error_text": response.text,
                    "request_url": self.messages_endpoint,
                    "model": self.model,
                    "headers": {k: v for k, v in headers.items() if k != "x-api-key"},
                    "has_auth_header": "x-api-key" in headers,
                })
                
                # Handle various API errors with appropriate fallbacks
                if response.status_code == 401:
                    # Authentication error
                    logger.error("Claude API authentication failed - check your API key")
                elif response.status_code == 400:
                    # Bad request
                    logger.error("Claude API bad request - check message format")
                elif response.status_code == 429:
                    # Rate limit
                    logger.error("Claude API rate limit exceeded")
                
                # Generate a simple response for fallback
                return {
                    "choices": [{
                        "message": {
                            "content": "I'm sorry, I encountered an issue processing your request. How else can I assist you today?"
                        }
                    }]
                }
                
        except requests.exceptions.RequestException as e:
            error_message = f"Request failed: {str(e)}"
            logger.error(error_message)
            
            # Provide a fallback response
            return {
                "choices": [{
                    "message": {
                        "content": "I apologize, but I'm experiencing some technical difficulties at the moment. Please try again in a moment."
                    }
                }]
            }
            
    def extract_message_content(self, response: Dict[str, Any]) -> str:
        """
        Extract the message content from an API response.
        
        Compatible with the OpenAI-style response format we're using.
        """
        try:
            return response["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as e:
            error_message = f"Failed to extract message content: {str(e)}"
            logger.error(error_message)
            raise ValueError(error_message)