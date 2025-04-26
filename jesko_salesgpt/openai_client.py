"""
OpenAI Client Module for JeskoSalesGPT

This module provides robust API access to OpenAI services, ensuring compatibility
with different API key formats and scope restrictions.
"""

import os
import logging
import json
import requests
from typing import List, Dict, Any, Optional

# Configure logging
logger = logging.getLogger(__name__)

class OpenAIClient:
    """
    A robust OpenAI client that handles various API key formats and restrictions.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the OpenAI client with an optional API key.
        
        Args:
            api_key: OpenAI API key (if None, will try to get from environment)
        """
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        
        if not self.api_key:
            raise ValueError("OpenAI API key is required but not provided")
        
        logger.info(f"OpenAI client initialized with API key: {self.api_key[:5]}...{self.api_key[-4:]}")
        
        # Log the API key initialization
        # Note: We're skipping initial validation to avoid startup issues
        # The key will be validated on first use
    
    def chat_completion(
        self, 
        messages: List[Dict[str, str]], 
        model: str = "gpt-3.5-turbo",  # Default to gpt-3.5-turbo for better compatibility
        temperature: float = 0.7,
        max_tokens: int = 500,
        top_p: float = 0.9
    ) -> Dict[str, Any]:
        """
        Send a request to the OpenAI Chat Completions API.
        
        Args:
            messages: List of message objects
            model: Model name to use (default: gpt-3.5-turbo)
            temperature: Temperature parameter (default: 0.7)
            max_tokens: Maximum tokens to generate (default: 500)
            top_p: Top-p parameter (default: 0.9)
            
        Returns:
            Dict containing the API response
            
        Raises:
            Exception: If the API request fails
        """
        # Log request details
        logger.info(f"Sending request to OpenAI Chat Completions API with model: {model}")
        logger.info(f"Request contains {len(messages)} messages")
        
        # Prepare API endpoint and headers
        api_url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        
        # Prepare payload
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "top_p": top_p,
            "max_tokens": max_tokens
        }
        
        try:
            # Make the API request
            response = requests.post(
                api_url,
                headers=headers,
                json=payload,
                timeout=30  # 30 second timeout
            )
            
            # Check response status
            if response.status_code == 200:
                logger.info(f"API call successful with status code: {response.status_code}")
                return response.json()
            else:
                # Handle error cases
                error_message = f"API request failed with status {response.status_code}: {response.text}"
                logger.error(error_message)
                
                # Check for specific error types
                if response.status_code == 401:
                    logger.error("Authentication error: Please check your API key and permissions")
                elif response.status_code == 404:
                    logger.error("Model not found: The specified model may not be available for your account")
                elif response.status_code == 429:
                    logger.error("Rate limit exceeded: Your account has hit rate limits")
                
                # If we have permission issues with the current model, try a different one
                if "insufficient permissions" in response.text.lower() or "missing scopes" in response.text.lower():
                    if model == "gpt-4":
                        logger.warning("Insufficient permissions for gpt-4, trying gpt-3.5-turbo instead")
                        return self.chat_completion(
                            messages=messages,
                            model="gpt-3.5-turbo",
                            temperature=temperature,
                            max_tokens=max_tokens,
                            top_p=top_p
                        )
                
                # Otherwise, raise the exception
                raise Exception(error_message)
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Request exception: {str(e)}")
            raise Exception(f"API request failed due to network error: {str(e)}")
    
    def verify_api_key(self) -> bool:
        """
        Verify that the provided API key is valid and has appropriate permissions.
        
        This method will make a simple test request to verify the API key works properly.
        It will first try with GPT-4, and if that fails, it will try with GPT-3.5-turbo.
        
        Returns:
            True if the API key is valid and has appropriate permissions, False otherwise
        """
        logger.info("Verifying OpenAI API key...")
        
        # First try a lightweight call to the models endpoint to check API key validity
        models_url = "https://api.openai.com/v1/models"
        headers = {
            "Authorization": f"Bearer {self.api_key}"
        }
        
        try:
            models_response = requests.get(
                models_url,
                headers=headers,
                timeout=10
            )
            
            if models_response.status_code == 200:
                logger.info("API key is valid. Successfully retrieved models list.")
                model_data = models_response.json()
                available_models = [model["id"] for model in model_data["data"] if "gpt" in model["id"].lower()]
                logger.info(f"Available GPT models: {', '.join(available_models[:5])}{'...' if len(available_models) > 5 else ''}")
            else:
                logger.error(f"API key validation failed: {models_response.status_code} - {models_response.text}")
                return False
            
            # Now attempt a minimal chat request with GPT-4 to verify permissions
            api_url = "https://api.openai.com/v1/chat/completions"
            headers["Content-Type"] = "application/json"
            payload = {
                "model": "gpt-4",
                "messages": [{"role": "user", "content": "Hello"}],
                "max_tokens": 5
            }
            
            response = requests.post(
                api_url,
                headers=headers,
                json=payload,
                timeout=10
            )
            
            if response.status_code == 200:
                logger.info("GPT-4 API key verification successful.")
                return True
            else:
                logger.warning(f"GPT-4 verification failed: {response.status_code} - {response.text}")
                
                # If GPT-4 fails, try with GPT-3.5-turbo
                if "missing scopes" in response.text.lower() or "insufficient permissions" in response.text.lower():
                    logger.warning("Trying verification with GPT-3.5-turbo instead...")
                    payload["model"] = "gpt-3.5-turbo"
                    response = requests.post(
                        api_url,
                        headers=headers,
                        json=payload,
                        timeout=10
                    )
                    
                    if response.status_code == 200:
                        logger.info("GPT-3.5-turbo API key verification successful.")
                        logger.warning("Note: Your API key works with GPT-3.5-turbo but not with GPT-4.")
                        return True
                    else:
                        logger.error(f"GPT-3.5-turbo verification also failed: {response.status_code} - {response.text}")
                        return False
                
                return False
                
        except Exception as e:
            logger.error(f"Error during API key verification: {str(e)}")
            return False
    
    def extract_message_content(self, response: Dict[str, Any]) -> str:
        """
        Extract the message content from an API response.
        
        Args:
            response: API response dictionary
            
        Returns:
            The text content of the generated message
        """
        try:
            return response["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as e:
            logger.error(f"Failed to extract message content: {str(e)}")
            logger.error(f"Response structure: {json.dumps(response)}")
            raise Exception(f"Failed to extract message content from API response: {str(e)}")