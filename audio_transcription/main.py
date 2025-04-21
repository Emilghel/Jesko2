import os
import tempfile
import logging
import sys
from flask import Flask, render_template, request, jsonify, Response
from openai import OpenAI
from flask_cors import CORS

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger('transcription_service')

app = Flask(__name__)
CORS(app, supports_credentials=True)  # Enable CORS with credentials support
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024  # Limit upload size to 32MB

# Check OpenAI API key
openai_api_key = os.environ.get("OPENAI_API_KEY")
if not openai_api_key:
    logger.error("OPENAI_API_KEY environment variable is not set or is empty! Transcription will not work.")
    # For security, we don't print the actual key, just a check
    logger.info("API key status: NOT AVAILABLE")
else:
    # Just log that we have a key (don't show the actual key)
    logger.info("API key status: AVAILABLE")

# Initialize OpenAI client with API key from environment variable
client = OpenAI(api_key=openai_api_key)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint for the API"""
    return jsonify({"status": "healthy", "service": "whisper-transcription"})

@app.route('/', methods=['POST'])
@app.route('/transcribe', methods=['POST'])
@app.route('/api', methods=['POST'])
@app.route('/api/transcribe', methods=['POST'])
@app.route('/api/transcription/process', methods=['POST']) 
def transcribe():
    # First, check API key status
    if not openai_api_key:
        logger.error("Transcription failed: OpenAI API key is not set!")
        return jsonify({
            "error": "Transcription service is not properly configured. Missing API key."
        }), 500

    if 'file' not in request.files:
        logger.warning("No file part in request")
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    logger.info(f"Received file: {file.filename}, size: {file.content_length or 'unknown'} bytes")
    
    if file.filename == '':
        logger.warning("Empty filename submitted")
        return jsonify({"error": "No selected file"}), 400
    
    # Check if file is an allowed audio/video format
    allowed_extensions = {'mp3', 'wav', 'ogg', 'm4a', 'mp4', 'mov', 'avi', 'webm'}
    
    # Get file extension, default to empty string if not present
    file_ext = ''
    if '.' in file.filename:
        file_ext = file.filename.rsplit('.', 1)[1].lower()
    
    if file_ext not in allowed_extensions:
        logger.warning(f"Unsupported file format: {file_ext}")
        return jsonify({
            "error": f"File format {file_ext} not supported. Please upload MP3, WAV, OGG, M4A, MP4, MOV, AVI or WEBM."
        }), 400
    
    temp_file_path = None
    
    try:
        # Create a temporary file to store the uploaded audio
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            file.save(temp_file.name)
            temp_file_path = temp_file.name
            logger.info(f"File saved to temp location: {temp_file_path}")
        
        # Check if temp file is valid
        filesize = os.path.getsize(temp_file_path)
        if filesize == 0:
            logger.error("Uploaded file has zero size")
            return jsonify({"error": "Uploaded file is empty"}), 400
        
        logger.info(f"Processing file ({filesize} bytes) with OpenAI Whisper API")
        
        # Send the audio file to OpenAI's Whisper API for transcription
        with open(temp_file_path, 'rb') as audio_file:
            try:
                logger.info("Sending request to OpenAI transcription API")
                transcript = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file
                )
                logger.info("OpenAI API request successful")
            except Exception as api_err:
                logger.error(f"OpenAI API error: {str(api_err)}")
                raise
        
        # Log success
        transcript_text = transcript.text
        logger.info(f"Transcription successful - {len(transcript_text)} characters")
        
        # Remove the temporary file after transcription
        os.unlink(temp_file_path)
        logger.info("Temporary file deleted")
        
        # Return the transcription result
        return jsonify({
            "success": True,
            "text": transcript_text
        })
    
    except Exception as e:
        logger.error(f"Transcription failed: {str(e)}", exc_info=True)
        
        # Clean up temp file if it exists
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
                logger.info("Cleaned up temporary file after error")
            except Exception as clean_err:
                logger.error(f"Failed to clean up temp file: {str(clean_err)}")
        
        return jsonify({
            "error": f"Transcription failed: {str(e)}"
        }), 500

@app.route('/api/transcribe', methods=['POST'])
def api_transcribe():
    """API endpoint for transcription that can be called from the main application"""
    return transcribe()

@app.route('/embedded', methods=['GET'])
def embedded():
    """Return the embedded version of the app that can be loaded in an iframe"""
    return render_template('embedded.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=81, debug=True)