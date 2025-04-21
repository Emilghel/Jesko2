"""
SalesGPT FastAPI Server

This server provides API endpoints for interacting with the SalesGPT sales conversation agent.
It handles chat interactions and voice synthesis using ElevenLabs.
"""

import os
import sys
import json
import logging
import tempfile
import uuid
from pathlib import Path
from typing import Dict, List, Optional, Union

# Add project root to path for imports
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

# FastAPI imports
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, Header, Query
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import dotenv
import uvicorn
from datetime import datetime
from starlette.responses import StreamingResponse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Initialize environment variables
dotenv.load_dotenv()

# Check for OpenAI API key and add it to environment if found in .env
openai_api_key = os.getenv("OPENAI_API_KEY")
if not openai_api_key:
    # Try to read from .env file directly
    try:
        with open(".env") as f:
            for line in f:
                if line.strip().startswith("OPENAI_API_KEY="):
                    key = line.strip().split("=", 1)[1].strip()
                    if key and key != "your-openai-api-key":
                        os.environ["OPENAI_API_KEY"] = key
                        logger.info(f"Loaded OpenAI API key from .env file: {key[:5]}...{key[-4:]}")
    except Exception as e:
        logger.error(f"Error reading .env file: {str(e)}")

# Double-check if we have the key now
if not os.getenv("OPENAI_API_KEY"):
    logger.warning("OpenAI API key not found in environment variables or .env file")
else:
    logger.info(f"Using OpenAI API key: {os.getenv('OPENAI_API_KEY')[:5]}...{os.getenv('OPENAI_API_KEY')[-4:]}")

# Import Langchain components
from langchain_core.messages import HumanMessage, AIMessage

# Import SalesGPT agent with multiple fallback options
try:
    # First try our completely standalone implementation
    from jesko_salesgpt.standalone_agent import StandaloneSalesGPT
    logger.info("Using StandaloneSalesGPT - direct API access without dependencies")
    SalesGPTClass = StandaloneSalesGPT
except ImportError:
    logger.warning("StandaloneSalesGPT not available, trying alternative implementations")
    try:
        # Next try LangChain-based implementation
        from jesko_salesgpt.langchain_agent import LangChainSalesGPT
        logger.info("Using LangChainSalesGPT - better API key compatibility")
        SalesGPTClass = LangChainSalesGPT
    except ImportError:
        logger.warning("LangChainSalesGPT not available, trying additional alternatives")
        try:
            # Try to import from jesko_salesgpt as third option
            from jesko_salesgpt.agent import JeskoSalesGPT
            logger.info("Using JeskoSalesGPT")
            SalesGPTClass = JeskoSalesGPT
        except ImportError:
            try:
                # Fall back to original SalesGPT if needed
                from SalesGPT import SalesGPT
                logger.info("Using original SalesGPT")
                SalesGPTClass = SalesGPT
            except ImportError:
                logger.error("Failed to import any SalesGPT implementation")
                SalesGPTClass = None

# Import the custom ElevenLabs helper module
try:
    # First try to import from the app directory
    try:
        from app.elevenlabs_helper import initialize_elevenlabs, generate_speech, save_speech, is_available
        logger.info("Successfully imported elevenlabs_helper from app package")
    except ImportError:
        # Then try to import from the current directory
        from elevenlabs_helper import initialize_elevenlabs, generate_speech, save_speech, is_available
        logger.info("Successfully imported elevenlabs_helper from current directory")

    # Initialize ElevenLabs and check if it's available
    elevenlabs_available = initialize_elevenlabs()
    
    if elevenlabs_available:
        logger.info("Successfully initialized ElevenLabs API with helper module")
    else:
        logger.warning("Failed to initialize ElevenLabs API with helper module")
except ImportError as e:
    logger.error(f"Error importing ElevenLabs helper module: {str(e)}")
    elevenlabs_available = False

# Define static directory for audio files
STATIC_DIR = Path("static")
STATIC_DIR.mkdir(exist_ok=True)
AUDIO_DIR = STATIC_DIR / "audio"
AUDIO_DIR.mkdir(exist_ok=True)

# Initialize the FastAPI application
app = FastAPI(
    title="SalesGPT API",
    description="API for interacting with SalesGPT sales conversation agent",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files directory
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Initialize session storage for conversations
sessions: Dict[str, SalesGPTClass] = {}
conversation_history: Dict[str, List[Dict[str, str]]] = {}

# Define request/response models
class ChatRequest(BaseModel):
    session_id: str = Field(..., description="Unique identifier for the conversation session")
    message: str = Field(..., description="Human message to the sales agent")
    agent_id: Optional[int] = Field(None, description="ID of the agent to use for this conversation")

class ChatResponse(BaseModel):
    session_id: str = Field(..., description="Session identifier")
    response: str = Field(..., description="AI sales agent response")
    audio_url: Optional[str] = Field(None, description="URL to the audio response if available")

class VoiceRequest(BaseModel):
    session_id: str = Field(..., description="Session identifier")
    message: str = Field(..., description="Text to convert to voice")
    agent_id: Optional[int] = Field(None, description="ID of the agent to use for this conversation")

class VoiceResponse(BaseModel):
    audio_url: str = Field(..., description="URL to the generated audio file")

# Helper functions
def get_or_create_agent(session_id: str, agent_id: Optional[int] = None) -> SalesGPTClass:
    """Get an existing agent or create a new one for the session."""
    # Create a composite key that includes the agent_id if provided
    cache_key = f"{session_id}_{agent_id}" if agent_id else session_id
    
    if cache_key in sessions:
        return sessions[cache_key]
    
    if not SalesGPTClass:
        raise HTTPException(status_code=503, detail="SalesGPT agent is not available")
    
    # Initialize a new agent
    try:
        # Configure the sales agent
        # You can customize these parameters based on agent_id if provided
        # For now, we'll use the same configuration for all agents
        config = {
            "verbose": True,
            "product_catalog": None,
            "salesperson_name": f"AI Sales Assistant {agent_id if agent_id else 'Default'}",
            "salesperson_role": "Sales Associate",
            "company_name": "WarmLeadNetwork AI",
            "company_business": "AI-powered communication platform",
            "conversation_history": [],
            "conversation_stage": "Introduction",
            "use_tools": False,
            "agent_id": agent_id,  # Pass the agent_id to our new implementation
        }
        
        logger.info(f"Creating new agent for session {session_id} with agent_id {agent_id}")
        agent = SalesGPTClass(**config)
        sessions[cache_key] = agent
        conversation_history[cache_key] = []
        
        return agent
    except Exception as e:
        logger.error(f"Error creating SalesGPT agent: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create sales agent: {str(e)}")

def generate_audio(text: str, session_id: str) -> Optional[str]:
    """Generate audio from text using ElevenLabs helper module."""
    # Use the helper module's is_available() function 
    if not is_available():
        logger.warning("ElevenLabs not available for voice synthesis")
        return None
    
    try:
        # Create filename with session_id for organization
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        filename = f"{session_id}_{timestamp}.mp3"
        filepath = AUDIO_DIR / filename
        
        # Use the helper module to generate speech
        logger.info(f"Generating speech with text: {text[:50]}...")
        audio = generate_speech(
            text=text,
            voice_name="Matthew",  # Match the voice used in TwiML for consistency
            model="eleven_monolingual_v1"
        )
        
        if audio is None:
            logger.error("Failed to generate audio with elevenlabs_helper")
            return None
            
        # Save the audio to a file
        success = save_speech(audio, str(filepath))
        
        if not success:
            logger.error(f"Failed to save audio to {filepath}")
            return None
            
        logger.info(f"Successfully generated and saved audio to {filepath}")
        
        # Return URL to audio file
        return f"/static/audio/{filename}"
    except Exception as e:
        logger.error(f"Error generating audio: {str(e)}")
        return None

# API Routes
@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": "SalesGPT API",
        "version": "1.0.0",
        "description": "API for interacting with SalesGPT sales conversation agent",
        "status": "operational",
        "endpoints": [
            "/chat - Chat with the sales agent",
            "/voice - Generate voice for a message",
            "/health - Health check"
        ]
    }

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    # Use the helper's is_available function to check ElevenLabs availability
    elevenlabs_status = is_available()
    
    status = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "salesgpt_available": SalesGPTClass is not None,
        "elevenlabs_available": elevenlabs_status,
        "active_sessions": len(sessions),
        "elevenlabs_api_key": os.getenv("ELEVENLABS_API_KEY") is not None
    }
    return status

@app.get("/elevenlabs-test")
async def elevenlabs_test():
    """Test endpoint for ElevenLabs integration."""
    try:
        # Check if ElevenLabs is available
        elevenlabs_status = is_available()
        
        # Get detailed information about initialization
        test_result = {
            "elevenlabs_available": elevenlabs_status,
            "elevenlabs_api_key_exists": os.getenv("ELEVENLABS_API_KEY") is not None,
            "timestamp": datetime.now().isoformat()
        }
        
        # If ElevenLabs is available, try to generate test audio
        if elevenlabs_status:
            logger.info("ElevenLabs is available, attempting to generate test audio")
            
            # Generate a test message
            test_text = "This is a test of the ElevenLabs voice synthesis integration."
            
            # Try to generate speech
            try:
                audio_data = generate_speech(
                    text=test_text,
                    voice_name="Matthew"
                )
                
                test_result["audio_generation"] = audio_data is not None
                
                # If audio was generated, try to save it
                if audio_data:
                    logger.info("Audio data generated successfully, saving to file")
                    
                    # Create a unique filename
                    filename = f"test_{datetime.now().strftime('%Y%m%d%H%M%S')}.mp3"
                    filepath = AUDIO_DIR / filename
                    
                    # Save the audio
                    success = save_speech(audio_data, str(filepath))
                    
                    test_result["audio_saved"] = success
                    test_result["audio_filepath"] = str(filepath) if success else None
                    test_result["audio_url"] = f"/static/audio/{filename}" if success else None
                else:
                    logger.error("Audio data generation failed")
                    test_result["audio_generation"] = False
            except Exception as e:
                logger.error(f"Error generating speech: {str(e)}")
                test_result["audio_generation_error"] = str(e)
        
        return test_result
    except Exception as e:
        logger.error(f"Error in ElevenLabs test: {str(e)}")
        return {
            "error": str(e),
            "elevenlabs_available": False
        }

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Process a chat message and return the agent's response."""
    session_id = request.session_id
    human_message = request.message
    agent_id = request.agent_id
    
    # Log the request for debugging
    logger.info(f"Chat request received: session_id={session_id}, agent_id={agent_id}, message={human_message[:30]}...")
    
    try:
        # Get or create the agent for this session with the specified agent_id
        agent = get_or_create_agent(session_id, agent_id)
        
        # Create a composite key for conversation history that includes agent_id
        history_key = f"{session_id}_{agent_id}" if agent_id else session_id
        
        # Update conversation history
        if history_key not in conversation_history:
            conversation_history[history_key] = []
        
        conversation_history[history_key].append({
            "role": "user",
            "content": human_message
        })
        
        # Get response from agent
        logger.info(f"Getting response from agent for session {session_id} with agent_id {agent_id}")
        response = agent.step(human_message)
        logger.info(f"Agent response: {response[:50]}...")
        
        conversation_history[history_key].append({
            "role": "assistant",
            "content": response
        })
        
        # Generate audio for the response
        logger.info(f"Generating audio for response in session {session_id}")
        audio_url = generate_audio(response, history_key)
        
        return ChatResponse(
            session_id=session_id,
            response=response,
            audio_url=audio_url
        )
    except Exception as e:
        logger.error(f"Error in chat: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing chat: {str(e)}")

@app.post("/voice", response_model=VoiceResponse)
async def voice(request: VoiceRequest):
    """Generate voice for a given text message."""
    if not is_available():
        raise HTTPException(status_code=503, detail="Voice synthesis is not available")
    
    # Log the request for debugging
    logger.info(f"Voice request received: session_id={request.session_id}, agent_id={request.agent_id}, message={request.message[:30]}...")
    
    try:
        # Use agent_id in the key if provided
        history_key = f"{request.session_id}_{request.agent_id}" if request.agent_id else request.session_id
        
        audio_url = generate_audio(request.message, history_key)
        
        if not audio_url:
            raise HTTPException(status_code=500, detail="Failed to generate audio")
        
        return VoiceResponse(audio_url=audio_url)
    except Exception as e:
        logger.error(f"Error generating voice: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating voice: {str(e)}")

@app.on_event("startup")
async def startup_event():
    """Initialize the application on startup."""
    logger.info("Starting SalesGPT FastAPI server")
    
    # Check for required API keys
    if not os.getenv("OPENAI_API_KEY"):
        logger.warning("No OpenAI API key found. Some functionality may be limited.")

if __name__ == "__main__":
    # Run the server
    host = "0.0.0.0"  # Bind to all interfaces
    port = int(os.getenv("PORT", 3001))
    logger.info(f"Starting server on {host}:{port}")
    uvicorn.run(app, host=host, port=port, log_level="info")