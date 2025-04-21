# SalesGPT FastAPI Server

This is a FastAPI server that integrates the JeskoSalesGPT agent with voice synthesis capabilities from ElevenLabs.

## Features

- 🤖 Conversational AI sales agent using LangChain and OpenAI
- 🔊 Text-to-speech using ElevenLabs API
- 🌐 RESTful API for integration with the main platform
- 🧠 Conversation history tracking and memory
- 🔄 Graceful error handling and fallbacks

## API Endpoints

The server exposes the following endpoints:

- `GET /` - Root endpoint with API information
- `GET /health` - Health check endpoint
- `POST /chat` - Chat with the sales agent
- `POST /voice` - Generate voice for a message

## Getting Started

### Prerequisites

- Python 3.8+
- OpenAI API key
- ElevenLabs API key (optional, for voice synthesis)

### Environment Variables

The following environment variables should be set:

- `OPENAI_API_KEY` - Your OpenAI API key
- `ELEVENLABS_API_KEY` - Your ElevenLabs API key (optional)
- `PORT` - The port to run the server on (default: 3001)

### Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Run the server
python main.py
```

## Chat API

### Request

```json
POST /chat
{
  "session_id": "unique-session-identifier",
  "message": "Hi, I'm interested in your AI services."
}
```

### Response

```json
{
  "session_id": "unique-session-identifier",
  "response": "Hello! I'd be happy to tell you about our AI services...",
  "audio_url": "/static/audio/unique-session-identifier_20250415123456.mp3"
}
```

## Voice API

### Request

```json
POST /voice
{
  "session_id": "unique-session-identifier",
  "message": "Text to convert to speech"
}
```

### Response

```json
{
  "audio_url": "/static/audio/unique-session-identifier_20250415123456.mp3"
}
```

## Integration with Express Server

This FastAPI server is designed to be used with the main Express server through a proxy middleware. The Express server forwards requests to `/api/salesgpt/*` to this FastAPI server.

## Customization

You can customize the sales agent by modifying the following parameters in the `get_or_create_agent` function:

- `product_catalog` - Information about your products
- `salesperson_name` - Name of the sales persona
- `salesperson_role` - Role of the sales persona
- `company_name` - Name of your company
- `company_business` - Description of your company's business