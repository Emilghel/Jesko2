# Jesko AI Platform

An advanced AI-powered communication and workflow automation platform that enables intelligent interaction management through sophisticated AI integrations.

## Core Features

- **AI Video Magic**: Transform static images into videos with text prompts using Runway API
- **AI Clip Studio**: Generate short-form social media clips from long-form content
- **Audio Transcription**: Transcribe audio files with OpenAI Whisper API
- **Leads Management**: Organize contact information and import leads from various sources
- **AI Agent Calling**: Enable AI agents to make automated sales calls using Twilio
- **Knowledge Base**: Provide AI agents with domain-specific information
- **Calendar Integration**: Allow AI agents to schedule appointments directly
- **SalesGPT Integration**: AI-powered sales conversations with voice capabilities

## SalesGPT Twilio Integration

The SalesGPT Twilio Integration combines several powerful technologies:

1. **SalesGPT**: A LangChain-based AI sales agent framework
2. **ElevenLabs**: High-quality voice synthesis
3. **Twilio**: Telephony and voice call management

### Key Features

- Chat with a sales AI agent via API endpoints
- Convert text responses to speech using ElevenLabs
- Handle incoming and outgoing Twilio phone calls
- Maintain conversation context across interactions
- Customize agent personality and product knowledge

### Getting Started

1. Install the required dependencies:
   ```
   pip install fastapi uvicorn pydantic python-dotenv openai langchain requests pydub elevenlabs
   ```

2. Set up environment variables in `app/.env`:
   ```
   OPENAI_API_KEY=your_openai_key
   ELEVENLABS_API_KEY=your_elevenlabs_key
   TWILIO_ACCOUNT_SID=your_twilio_sid
   TWILIO_AUTH_TOKEN=your_twilio_token
   TWILIO_PHONE_NUMBER=your_twilio_number
   ```

3. Run the FastAPI server:
   ```
   python app.py
   ```

4. The server will be available at http://localhost:8000

### API Endpoints

- **GET /** - HTML landing page with instructions
- **POST /chat** - Chat with the sales agent
- **POST /voice** - Generate text response and convert to speech
- **POST /twilio/audio** - Generate TwiML for Twilio to play audio
- **POST /twilio/input** - Handle speech input from Twilio

### Twilio Configuration

To use the Twilio integration, set up a webhook in your Twilio phone number configuration:

1. **Voice Configuration** → **A Call Comes In**
2. Set the webhook URL to `https://your-server.com/twilio/audio`
3. Method: `POST`

### Customization

You can customize the sales agent's behavior by modifying:

- Agent name, role, and personality traits
- Product catalog and feature descriptions
- Voice settings for ElevenLabs TTS
- Conversation goals and stage tracking

## Credits

- OpenAI API for text generation capabilities
- ElevenLabs for voice synthesis technology
- Twilio for telephony services
- LangChain for providing the framework components