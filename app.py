from flask import Flask, request, send_file, jsonify, send_from_directory
from flask_cors import CORS
from gtts import gTTS
import os
import uuid

app = Flask(__name__, static_folder='static')
CORS(app)

@app.route('/')
def serve_index():
    return send_from_directory('static', 'index.html')

@app.route('/api/speak', methods=['POST'])
def speak():
    data = request.get_json()
    text = data.get('text', '')
    if not text:
        return jsonify({'error': 'No text provided'}), 400

    try:
        filename = f"{uuid.uuid4()}.mp3"
        filepath = os.path.join("/tmp", filename)
        tts = gTTS(text)
        tts.save(filepath)
        return send_file(filepath, mimetype='audio/mpeg', as_attachment=True, download_name="speech.mp3")
    except Exception as e:
        return jsonify({'error': str(e)}), 500