import os
import tempfile
from flask import Flask, render_template, request, jsonify
from openai import OpenAI

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # Limit upload size to 16MB

# Initialize OpenAI client with API key from environment variable
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/transcribe', methods=['POST'])
def transcribe():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    # Check if file is an allowed audio format
    allowed_extensions = {'mp3', 'wav', 'ogg', 'm4a'}
    if '.' not in file.filename or file.filename.rsplit('.', 1)[1].lower() not in allowed_extensions:
        return jsonify({"error": "File format not supported. Please upload MP3, WAV, OGG or M4A."}), 400
    
    try:
        # Create a temporary file to store the uploaded audio
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            file.save(temp_file.name)
            temp_file_path = temp_file.name
        
        # Send the audio file to OpenAI's Whisper API for transcription
        with open(temp_file_path, 'rb') as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file
            )
        
        # Remove the temporary file after transcription
        os.unlink(temp_file_path)
        
        # Return the transcription result
        return jsonify({
            "success": True,
            "transcription": transcript.text
        })
    
    except Exception as e:
        # Clean up temp file if it exists
        if 'temp_file_path' in locals():
            os.unlink(temp_file_path)
        
        return jsonify({
            "error": f"Transcription failed: {str(e)}"
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=81, debug=True)