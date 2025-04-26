"""
SalesBot Class - A simplified interface for the SalesGPT agent
"""

import os
import json
import logging
from typing import Dict, List, Any, Optional, Tuple

from .agent import SalesGPT

logger = logging.getLogger(__name__)

class SalesBot:
    """
    A simplified wrapper for SalesGPT that manages sessions and provides
    an easy-to-use interface for the FastAPI application.
    """
    
    # Class-level storage for active sessions
    _sessions: Dict[str, Dict[str, Any]] = {}
    
    def __init__(
        self,
        model_name: str = "gpt-3.5-turbo",
        verbose: bool = False
    ):
        """
        Initialize the SalesBot.
        
        Args:
            model_name: The OpenAI model to use
            verbose: Whether to print detailed logs
        """
        self.model_name = model_name
        self.verbose = verbose
        
        # Base agent configuration
        self.default_config = {
            "name": "Jesko Sales Assistant",
            "role": "Sales Advisor",
            "personality": "professional, helpful, knowledgeable",
            "goals": [
                "Understand the customer's needs and requirements",
                "Provide valuable information about products/services",
                "Answer questions clearly and accurately",
                "Guide the customer toward making an informed decision",
                "Maintain a friendly and professional tone throughout"
            ],
            "temperature": 0.7
        }
    
    def create_session(
        self,
        session_id: str,
        agent_config: Optional[Dict[str, Any]] = None,
        product_catalog: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Create a new chat session with SalesGPT.
        
        Args:
            session_id: Unique identifier for the session
            agent_config: Optional configuration for the sales agent
            product_catalog: Optional product information
            conversation_history: Optional previous conversation messages
            
        Returns:
            Dict: Session information
        """
        # Use default config and update with provided config if any
        config = self.default_config.copy()
        if agent_config:
            config.update(agent_config)
        
        # Create a new SalesGPT instance
        agent = SalesGPT(
            agent_config=config,
            product_catalog=product_catalog,
            conversation_history=conversation_history,
            verbose=self.verbose,
            model_name=self.model_name
        )
        
        # Store session data
        self._sessions[session_id] = {
            "agent": agent,
            "config": config,
            "product_catalog": product_catalog or ""
        }
        
        return {
            "session_id": session_id,
            "agent_name": config.get("name"),
            "conversation_stage": agent.conversation_stage
        }
    
    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Get information about an existing session.
        
        Args:
            session_id: Unique identifier for the session
            
        Returns:
            Optional[Dict]: Session information or None if not found
        """
        if session_id not in self._sessions:
            return None
        
        session_data = self._sessions[session_id]
        agent = session_data["agent"]
        
        return {
            "session_id": session_id,
            "agent_name": session_data["config"].get("name"),
            "conversation_stage": agent.conversation_stage,
            "context": agent.save_context()
        }
    
    def chat(
        self,
        session_id: str,
        message: str
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Send a message to the sales agent and get a response.
        
        Args:
            session_id: The session identifier
            message: The human message to send
            
        Returns:
            Tuple[str, Dict]: AI response and updated session information
            
        Raises:
            ValueError: If the session doesn't exist
        """
        # Check if session exists
        if session_id not in self._sessions:
            # Create a new session with default settings
            logger.info(f"Creating new session {session_id} automatically")
            self.create_session(session_id)
        
        # Get the agent from the session
        agent = self._sessions[session_id]["agent"]
        
        # Generate response
        response, state = agent.step(message)
        
        # Return response and session info
        session_info = {
            "session_id": session_id,
            "conversation_stage": state["conversation_stage"]
        }
        
        return response, session_info
    
    def update_session(
        self,
        session_id: str,
        agent_config: Optional[Dict[str, Any]] = None,
        product_catalog: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Update an existing session with new configuration.
        
        Args:
            session_id: The session identifier
            agent_config: New agent configuration
            product_catalog: New product catalog
            
        Returns:
            Dict: Updated session information
            
        Raises:
            ValueError: If the session doesn't exist
        """
        # Check if session exists
        if session_id not in self._sessions:
            raise ValueError(f"Session {session_id} does not exist")
        
        session_data = self._sessions[session_id]
        agent = session_data["agent"]
        
        # Save current context
        current_context = agent.save_context()
        
        # Update config if provided
        if agent_config:
            session_data["config"].update(agent_config)
            agent.agent_config = session_data["config"]
        
        # Update product catalog if provided
        if product_catalog is not None:
            session_data["product_catalog"] = product_catalog
            agent.product_catalog = product_catalog
        
        # Reinitialize the agent with the updated configuration
        agent._initialize_chain()
        
        return {
            "session_id": session_id,
            "agent_name": session_data["config"].get("name"),
            "conversation_stage": agent.conversation_stage,
            "context": current_context
        }
    
    def delete_session(self, session_id: str) -> bool:
        """
        Delete a session.
        
        Args:
            session_id: The session identifier
            
        Returns:
            bool: True if session was deleted, False if it didn't exist
        """
        if session_id in self._sessions:
            del self._sessions[session_id]
            return True
        
        return False
    
    def get_all_sessions(self) -> List[str]:
        """
        Get all active session IDs.
        
        Returns:
            List[str]: List of active session IDs
        """
        return list(self._sessions.keys())
    
    def save_sessions_to_file(self, filename: str) -> None:
        """
        Save all active sessions to a file.
        
        Args:
            filename: Path to save the sessions
        """
        serialized_sessions = {}
        
        for session_id, session_data in self._sessions.items():
            agent = session_data["agent"]
            context = agent.save_context()
            
            serialized_sessions[session_id] = {
                "context": context,
                "config": session_data["config"],
                "product_catalog": session_data["product_catalog"]
            }
        
        with open(filename, "w") as f:
            json.dump(serialized_sessions, f, indent=2)
    
    def load_sessions_from_file(self, filename: str) -> int:
        """
        Load sessions from a file.
        
        Args:
            filename: Path to the sessions file
            
        Returns:
            int: Number of sessions loaded
        """
        if not os.path.exists(filename):
            return 0
        
        try:
            with open(filename, "r") as f:
                serialized_sessions = json.load(f)
            
            sessions_loaded = 0
            
            for session_id, session_data in serialized_sessions.items():
                context = session_data["context"]
                config = session_data.get("config", self.default_config)
                product_catalog = session_data.get("product_catalog", "")
                
                # Create a new session
                agent = SalesGPT(
                    agent_config=config,
                    product_catalog=product_catalog,
                    verbose=self.verbose,
                    model_name=self.model_name
                )
                
                # Load the context
                agent.load_context(context)
                
                # Store in sessions
                self._sessions[session_id] = {
                    "agent": agent,
                    "config": config,
                    "product_catalog": product_catalog
                }
                
                sessions_loaded += 1
            
            return sessions_loaded
        
        except Exception as e:
            logger.error(f"Error loading sessions from file: {e}")
            return 0