"""
SalesGPT - A LangChain implementation of a Sales AI agent
"""

import re
import json
import logging
from typing import Dict, List, Any, Optional, Tuple

from langchain.memory import ConversationBufferMemory
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_core.prompts import MessagesPlaceholder
from langchain_openai import ChatOpenAI
from langchain_core.prompts.chat import (
    ChatPromptTemplate,
)
from langchain.chains import LLMChain

logger = logging.getLogger(__name__)

class SalesGPT:
    """
    A sales AI assistant that uses a LLM to determine the best next response.
    
    Features:
    - Contextual memory of the conversation
    - Product knowledge
    - Customizable agent profile/personality
    - Dynamic conversation stage tracking
    """
    
    def __init__(
        self,
        agent_config: Dict[str, Any],
        product_catalog: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        verbose: bool = False,
        model_name: str = "gpt-3.5-turbo",
    ):
        """
        Initialize the SalesGPT agent with a configuration.
        
        Args:
            agent_config: Configuration dictionary for the agent
            product_catalog: Optional string describing the product(s)
            conversation_history: Optional list of previous conversation messages
            verbose: Whether to print detailed logs
            model_name: The OpenAI model to use
        """
        self.agent_config = agent_config
        self.product_catalog = product_catalog or ""
        self.verbose = verbose
        self.model_name = model_name
        self.conversation_stage = "Introduction"
        
        # Initialize the LLM
        self.llm = ChatOpenAI(
            temperature=agent_config.get("temperature", 0.7), 
            model_name=model_name
        )
        
        # Initialize memory
        self.memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True
        )
        
        # Load conversation history if provided
        if conversation_history:
            self._load_conversation_history(conversation_history)
        
        # Initialize the conversation chain
        self._initialize_chain()
    
    def _load_conversation_history(self, conversation_history: List[Dict[str, str]]) -> None:
        """
        Load conversation history into memory.
        
        Args:
            conversation_history: List of message dictionaries with 'role' and 'content'
        """
        for message in conversation_history:
            role = message.get("role", "")
            content = message.get("content", "")
            
            if role.lower() == "human" or role.lower() == "user":
                self.memory.chat_memory.add_user_message(content)
            elif role.lower() == "ai" or role.lower() == "assistant":
                self.memory.chat_memory.add_ai_message(content)
            elif role.lower() == "system":
                # We don't add system messages to the chat history
                pass
    
    def _initialize_chain(self) -> None:
        """Initialize the LLM chain with prompt template"""
        
        # Format agent persona and conversation goals
        agent_name = self.agent_config.get("name", "AI Sales Assistant")
        agent_role = self.agent_config.get("role", "Sales Representative")
        agent_personality = self.agent_config.get("personality", "professional, friendly, helpful")
        agent_goals = self.agent_config.get("goals", ["Understand customer needs", "Explain product benefits"])
        
        # Convert goals to a bulleted string format
        goals_formatted = "\n".join([f"- {goal}" for goal in agent_goals])
        
        # System prompt that defines the agent behavior
        system_template = f"""
You are {agent_name}, a {agent_role} with a {agent_personality} personality.

GOALS:
{goals_formatted}

CONVERSATION STAGE: {self.conversation_stage}

YOUR PRODUCT KNOWLEDGE:
{self.product_catalog}

RULES:
1. Never admit you're an AI - maintain your persona as {agent_name} throughout the conversation
2. Do not be overly pushy or sales-y, focus on building rapport and understanding needs
3. Keep responses helpful, concise, and conversational
4. Keep track of the conversation stage and move it forward naturally
5. Only discuss your specific product offerings, don't make up new features
6. If customer questions are unrelated to your products or services, politely redirect
7. Use a warm, helpful tone that matches your personality traits
8. End your responses with a question to maintain conversation flow

You must respond according to the conversation history and the stage of the conversation.
If you don't know something, be honest about it and offer to connect the customer with more information.
        """
        
        # Create the prompt template
        prompt_template = ChatPromptTemplate.from_messages([
            SystemMessage(content=system_template),
            MessagesPlaceholder(variable_name="chat_history"),
            HumanMessage(content="{input}"),
        ])
        
        # Create the LLM chain
        self.chain = LLMChain(
            llm=self.llm,
            prompt=prompt_template,
            verbose=self.verbose,
            memory=self.memory
        )
    
    def _analyze_conversation_stage(self, conversation_history: List) -> str:
        """
        Determines the current conversation stage based on the history.
        
        Args:
            conversation_history: List of messages
            
        Returns:
            str: The current conversation stage
        """
        # Only update if we have enough history
        if len(conversation_history) < 2:
            return "Introduction"
            
        # Use a simpler prompt for the analysis
        stage_analyzer_prompt = f"""
Based on the conversation history below, determine the current stage of the sales conversation.
Choose from: Introduction, Discovery, Presentation, Handling Objections, Closing, or Follow-up.

Conversation History:
{conversation_history[-5:]}  # Only analyze the last 5 exchanges for efficiency

Current stage:
"""
        
        try:
            # Use more deterministic settings for the analyzer
            analyzer = ChatOpenAI(temperature=0, model_name=self.model_name)
            result = analyzer.invoke(stage_analyzer_prompt)
            
            # Extract the stage from the result
            stage_match = re.search(r"(Introduction|Discovery|Presentation|Handling Objections|Closing|Follow-up)", 
                                    result.content, 
                                    re.IGNORECASE)
            
            if stage_match:
                return stage_match.group(0)
            else:
                return self.conversation_stage  # keep current if no match
                
        except Exception as e:
            logger.error(f"Error analyzing conversation stage: {e}")
            return self.conversation_stage  # keep current on error
    
    def step(
        self,
        human_input: str,
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Generate the next response in the sales conversation.
        
        Args:
            human_input: The human input to respond to
            
        Returns:
            Tuple[str, Dict]: AI response text and conversation state
        """
        # Update conversation stage if needed
        conversation_history = self.memory.load_memory_variables({})["chat_history"]
        self.conversation_stage = self._analyze_conversation_stage(conversation_history)
        
        # Reinitialize the chain with updated stage
        self._initialize_chain()
        
        # Generate response
        response = self.chain.invoke({"input": human_input})
        ai_response = response.get("text", "")
        
        # Return the response and the current state
        return ai_response, {
            "conversation_stage": self.conversation_stage,
            "chat_history": self.memory.load_memory_variables({})["chat_history"],
        }
    
    def save_context(self) -> Dict[str, Any]:
        """
        Save the current conversation context.
        
        Returns:
            Dict: The current context including history and stage
        """
        memory_variables = self.memory.load_memory_variables({})
        conversation_history = memory_variables.get("chat_history", [])
        
        context = {
            "conversation_stage": self.conversation_stage,
            "conversation_history": [
                {"role": "system", "content": msg.content} if isinstance(msg, SystemMessage)
                else {"role": "human", "content": msg.content} if isinstance(msg, HumanMessage)
                else {"role": "ai", "content": msg.content} if isinstance(msg, AIMessage)
                else {"role": "unknown", "content": str(msg)}
                for msg in conversation_history
            ],
            "agent_config": self.agent_config,
            "product_catalog": self.product_catalog
        }
        
        return context
    
    def load_context(self, context: Dict[str, Any]) -> None:
        """
        Load a saved conversation context.
        
        Args:
            context: The context to load
        """
        # Load the various components
        self.conversation_stage = context.get("conversation_stage", "Introduction")
        self.agent_config = context.get("agent_config", self.agent_config)
        self.product_catalog = context.get("product_catalog", self.product_catalog)
        
        # Clear and reload memory
        self.memory.clear()
        conversation_history = context.get("conversation_history", [])
        if conversation_history:
            self._load_conversation_history(conversation_history)
        
        # Reinitialize the chain
        self._initialize_chain()