from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import pyttsx3
import io
import tempfile
import os
import hashlib
import threading
from functools import wraps
import time
import logging
import config

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins=["*"], methods=["GET", "POST", "OPTIONS"], allow_headers=["Content-Type", "X-API-Key"])

# Configurações da API
API_KEY = config.API_KEY
VOICE_CACHE = {}
MAX_CACHE_SIZE = config.MAX_CACHE_SIZE

# Lock para thread safety
cache_lock = threading.Lock()

def require_api_key(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        api_key = request.headers.get('X-API-Key')
        if not api_key or api_key != API_KEY:
            logger.warning(f"Invalid API key attempt: {api_key}")
            return jsonify({"error": "Invalid API key"}), 401
        return f(*args, **kwargs)
    return decorated_function

def get_text_hash(text, voice_id, rate, volume):
    """Gerar hash único para o texto e configurações"""
    content = f"{text}_{voice_id}_{rate}_{volume}"
    return hashlib.md5(content.encode()).hexdigest()

def synthesize_speech(text, voice_id=0, rate=200, volume=0.9):
    """Sintetizar voz usando pyttsx3 com melhor tratamento de erros"""
    temp_filename = None
    engine = None
    
    try:
        # Limitar tamanho do texto
        if len(text) > config.MAX_TEXT_LENGTH:
            text = text[:config.MAX_TEXT_LENGTH] + "..."
            logger.warning(f"Texto truncado para {config.MAX_TEXT_LENGTH} caracteres")
        
        engine = pyttsx3.init()
        
        # Configurar voz
        voices = engine.getProperty('voices')
        if voices and len(voices) > voice_id:
            engine.setProperty('voice', voices[voice_id].id)
            logger.info(f"Voz selecionada: {voices[voice_id].name}")
        
        # Configurar velocidade e volume
        engine.setProperty('rate', max(50, min(400, rate)))  # Limitar rate
        engine.setProperty('volume', max(0.1, min(1.0, volume)))  # Limitar volume
        
        # Criar arquivo temporário
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
        temp_filename = temp_file.name
        temp_file.close()
        
        # Sintetizar para arquivo
        engine.save_to_file(text, temp_filename)
        engine.runAndWait()
        
        # Verificar se o arquivo foi criado
        if os.path.exists(temp_filename) and os.path.getsize(temp_filename) > 0:
            logger.info(f"Áudio sintetizado com sucesso: {os.path.getsize(temp_filename)} bytes")
            return temp_filename
        else:
            logger.error("Arquivo de áudio não foi criado ou está vazio")
            return None
            
    except Exception as e:
        logger.error(f"Erro na síntese: {e}")
        if temp_filename and os.path.exists(temp_filename):
            try:
                os.remove(temp_filename)
            except:
                pass
        return None
    finally:
        if engine:
            try:
                engine.stop()
            except:
                pass

def cleanup_cache():
    """Limpar cache antigo para economizar espaço"""
    with cache_lock:
        if len(VOICE_CACHE) > MAX_CACHE_SIZE:
            # Remover os mais antigos
            sorted_cache = sorted(VOICE_CACHE.items(), key=lambda x: os.path.getctime(x[1]) if os.path.exists(x[1]) else 0)
            removed_count = 0
            
            for audio_id, file_path in sorted_cache[:len(VOICE_CACHE) - MAX_CACHE_SIZE]:
                try:
                    if os.path.exists(file_path):
                        os.remove(file_path)
                    del VOICE_CACHE[audio_id]
                    removed_count += 1
                except Exception as e:
                    logger.error(f"Erro ao remover cache {audio_id}: {e}")
            
            logger.info(f"Cache limpo: {removed_count} arquivos removidos")

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        "service": "WP Audio Articles TTS API",
        "version": "2.0.0",
        "status": "active",
        "cache_size": len(VOICE_CACHE)
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    """Verificação de saúde da API"""
    return jsonify({
        "status": "healthy",
        "cache_size": len(VOICE_CACHE),
        "version": "2.0.0",
        "max_text_length": config.MAX_TEXT_LENGTH
    })

@app.route('/api/voices', methods=['GET'])
@require_api_key
def get_voices():
    """Listar vozes disponíveis"""
    try:
        engine = pyttsx3.init()
        voices = engine.getProperty('voices')
        voice_list = []
        
        for i, voice in enumerate(voices):
            voice_info = {
                "id": i,
                "name": voice.name,
                "language": getattr(voice, 'languages', ['unknown'])[0] if hasattr(voice, 'languages') else 'unknown'
            }
            voice_list.append(voice_info)
        
        engine.stop()
        logger.info(f"Retornando {len(voice_list)} vozes disponíveis")
        return jsonify({"voices": voice_list})
    except Exception as e:
        logger.error(f"Erro ao listar vozes: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/synthesize', methods=['POST'])
@require_api_key
def synthesize():
    """Sintetizar texto para áudio"""
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({"error": "Text is required"}), 400
        
        text = data.get('text', '').strip()
        if not text:
            return jsonify({"error": "Text cannot be empty"}), 400
            
        voice_id = data.get('voice_id', 0)
        rate = data.get('rate', 200)
        volume = data.get('volume', 0.9)
        
        # Verificar cache
        text_hash = get_text_hash(text, voice_id, rate, volume)
        
        with cache_lock:
            if text_hash in VOICE_CACHE:
                cached_file = VOICE_CACHE[text_hash]
                if os.path.exists(cached_file):
                    logger.info(f"Retornando áudio do cache: {text_hash}")
                    return send_file(cached_file, as_attachment=True, download_name=f"audio_{text_hash}.wav")
                else:
                    # Remover entrada inválida do cache
                    del VOICE_CACHE[text_hash]
        
        # Sintetizar áudio
        logger.info(f"Sintetizando novo áudio: {len(text)} caracteres")
        audio_file = synthesize_speech(text, voice_id, rate, volume)
        
        if audio_file and os.path.exists(audio_file):
            # Adicionar ao cache
            with cache_lock:
                VOICE_CACHE[text_hash] = audio_file
                cleanup_cache()
            
            logger.info(f"Áudio sintetizado e adicionado ao cache: {text_hash}")
            return send_file(audio_file, as_attachment=True, download_name=f"audio_{text_hash}.wav")
        else:
            logger.error("Falha na síntese do áudio")
            return jsonify({"error": "Failed to synthesize audio"}), 500
            
    except Exception as e:
        logger.error(f"Erro na síntese: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/stream', methods=['POST'])
@require_api_key
def stream_synthesis():
    """Sintetizar e retornar URL para streaming"""
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({"error": "Text is required"}), 400
        
        text = data.get('text', '').strip()
        if not text:
            return jsonify({"error": "Text cannot be empty"}), 400
            
        voice_id = data.get('voice_id', 0)
        rate = data.get('rate', 200)
        volume = data.get('volume', 0.9)
        
        # Sintetizar áudio
        audio_file = synthesize_speech(text, voice_id, rate, volume)
        
        if audio_file and os.path.exists(audio_file):
            # Retornar informações do áudio
            file_size = os.path.getsize(audio_file)
            text_hash = get_text_hash(text, voice_id, rate, volume)
            
            # Adicionar ao cache
            with cache_lock:
                VOICE_CACHE[text_hash] = audio_file
                cleanup_cache()
            
            return jsonify({
                "audio_id": text_hash,
                "file_size": file_size,
                "download_url": f"/api/download/{text_hash}",
                "status": "ready"
            })
        else:
            return jsonify({"error": "Failed to synthesize audio"}), 500
            
    except Exception as e:
        logger.error(f"Erro no stream: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/download/<audio_id>', methods=['GET'])
@require_api_key
def download_audio(audio_id):
    """Download do áudio sintetizado"""
    with cache_lock:
        if audio_id in VOICE_CACHE:
            cached_file = VOICE_CACHE[audio_id]
            if os.path.exists(cached_file):
                return send_file(cached_file, as_attachment=True, download_name=f"audio_{audio_id}.wav")
            else:
                # Remover entrada inválida do cache
                del VOICE_CACHE[audio_id]
    
    return jsonify({"error": "Audio not found"}), 404

@app.route('/api/cache/clear', methods=['POST'])
@require_api_key
def clear_cache():
    """Limpar todo o cache"""
    try:
        removed_count = 0
        with cache_lock:
            for audio_id, file_path in VOICE_CACHE.items():
                if os.path.exists(file_path):
                    try:
                        os.remove(file_path)
                        removed_count += 1
                    except Exception as e:
                        logger.error(f"Erro ao remover arquivo {file_path}: {e}")
            
            VOICE_CACHE.clear()
        
        logger.info(f"Cache limpo: {removed_count} arquivos removidos")
        return jsonify({"message": f"Cache cleared successfully. {removed_count} files removed."})
    except Exception as e:
        logger.error(f"Erro ao limpar cache: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/cache/status', methods=['GET'])
@require_api_key
def cache_status():
    """Status do cache"""
    with cache_lock:
        cache_info = {
            "total_files": len(VOICE_CACHE),
            "max_cache_size": MAX_CACHE_SIZE,
            "files": []
        }
        
        for audio_id, file_path in VOICE_CACHE.items():
            if os.path.exists(file_path):
                file_size = os.path.getsize(file_path)
                cache_info["files"].append({
                    "id": audio_id,
                    "size": file_size,
                    "created": os.path.getctime(file_path)
                })
    
    return jsonify(cache_info)

# Tratamento de erros global
@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({"error": "Method not allowed"}), 405

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Erro interno do servidor: {error}")
    return jsonify({"error": "Internal server error"}), 500

if __name__ == '__main__':
    logger.info("🚀 Iniciando WP Audio Articles API v2.0...")
    logger.info(f"📡 Servidor rodando em http://{config.API_HOST}:{config.API_PORT}")
    logger.info(f"🔑 API Key configurada: {API_KEY[:10]}...")
    logger.info(f"💾 Cache máximo: {MAX_CACHE_SIZE} arquivos")
    logger.info(f"📝 Tamanho máximo de texto: {config.MAX_TEXT_LENGTH} caracteres")
    
    app.run(host=config.API_HOST, port=config.API_PORT, debug=config.DEBUG, threaded=True)