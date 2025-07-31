from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import pyttsx3
import tempfile
import os
import hashlib
import threading
from functools import wraps
import time
import logging
import sys

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configuração CORS mais permissiva para WordPress
CORS(app, 
     origins=["*"], 
     methods=["GET", "POST", "OPTIONS"], 
     allow_headers=["Content-Type", "X-API-Key", "Authorization"],
     supports_credentials=True)

# Configurações da API - Render.com compatível
API_KEY = os.environ.get('WP_AUDIO_API_KEY', 'wp_audio_articles_api_key_2024_render_secure')
API_HOST = '0.0.0.0'
API_PORT = int(os.environ.get('PORT', 10000))
DEBUG = os.environ.get('DEBUG', 'false').lower() == 'true'
MAX_CACHE_SIZE = int(os.environ.get('MAX_CACHE_SIZE', 20))
MAX_TEXT_LENGTH = int(os.environ.get('MAX_TEXT_LENGTH', 5000))

# Cache e controle de threads
VOICE_CACHE = {}
cache_lock = threading.Lock()

def require_api_key(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Verificar múltiplas formas de autenticação
        api_key = request.headers.get('X-API-Key') or request.headers.get('Authorization')
        
        if api_key and api_key.startswith('Bearer '):
            api_key = api_key[7:]  # Remove 'Bearer '
            
        if not api_key or api_key != API_KEY:
            logger.warning(f"Tentativa de acesso com chave inválida: {api_key[:10] if api_key else 'None'}...")
            return jsonify({
                "error": "Invalid API key",
                "message": "Chave de API inválida ou ausente"
            }), 401
            
        return f(*args, **kwargs)
    return decorated_function

def get_text_hash(text, voice_id=0, rate=200, volume=0.9):
    """Gerar hash único para cache"""
    content = f"{text[:100]}_{voice_id}_{rate}_{volume}"
    return hashlib.md5(content.encode('utf-8')).hexdigest()

def init_tts_engine():
    """Inicializar engine TTS com tratamento de erro"""
    try:
        engine = pyttsx3.init()
        
        # Configurar propriedades básicas
        voices = engine.getProperty('voices')
        if voices:
            # Preferir vozes femininas em português
            pt_voices = [v for v in voices if 'pt' in v.id.lower() or 'brazil' in v.id.lower()]
            if pt_voices:
                engine.setProperty('voice', pt_voices[0].id)
                logger.info(f"Voz selecionada: {pt_voices[0].name}")
            else:
                logger.info("Usando voz padrão do sistema")
        
        engine.setProperty('rate', 180)
        engine.setProperty('volume', 0.9)
        
        return engine
    except Exception as e:
        logger.error(f"Erro ao inicializar TTS engine: {e}")
        return None

def synthesize_speech(text, voice_id=0, rate=200, volume=0.9):
    """Sintetizar voz com melhor tratamento de erros"""
    if not text or len(text.strip()) == 0:
        raise ValueError("Texto vazio")
    
    # Limitar tamanho do texto
    if len(text) > MAX_TEXT_LENGTH:
        text = text[:MAX_TEXT_LENGTH] + "..."
        logger.warning(f"Texto truncado para {MAX_TEXT_LENGTH} caracteres")
    
    temp_filename = None
    engine = None
    
    try:
        logger.info(f"Iniciando síntese de {len(text)} caracteres")
        
        engine = init_tts_engine()
        if not engine:
            raise Exception("Não foi possível inicializar o engine TTS")
        
        # Configurar velocidade baseada no parâmetro
        final_rate = max(50, min(400, int(rate)))
        engine.setProperty('rate', final_rate)
        engine.setProperty('volume', max(0.1, min(1.0, float(volume))))
        
        # Criar arquivo temporário
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.wav', dir='/tmp')
        temp_filename = temp_file.name
        temp_file.close()
        
        logger.info(f"Arquivo temporário: {temp_filename}")
        
        # Sintetizar para arquivo
        engine.save_to_file(text, temp_filename)
        engine.runAndWait()
        
        # Verificar se arquivo foi criado
        if os.path.exists(temp_filename):
            file_size = os.path.getsize(temp_filename)
            if file_size > 0:
                logger.info(f"Áudio sintetizado: {file_size} bytes")
                return temp_filename
            else:
                logger.error("Arquivo de áudio vazio")
                raise Exception("Arquivo de áudio vazio")
        else:
            logger.error("Arquivo de áudio não foi criado")
            raise Exception("Arquivo de áudio não foi criado")
            
    except Exception as e:
        logger.error(f"Erro na síntese: {str(e)}")
        if temp_filename and os.path.exists(temp_filename):
            try:
                os.remove(temp_filename)
            except:
                pass
        raise e
    finally:
        if engine:
            try:
                engine.stop()
            except:
                pass

def cleanup_cache():
    """Limpar cache antigo"""
    with cache_lock:
        if len(VOICE_CACHE) > MAX_CACHE_SIZE:
            # Remover arquivos mais antigos
            items_to_remove = len(VOICE_CACHE) - MAX_CACHE_SIZE
            sorted_items = sorted(VOICE_CACHE.items(), 
                                key=lambda x: os.path.getctime(x[1]) if os.path.exists(x[1]) else 0)
            
            for i in range(items_to_remove):
                audio_id, file_path = sorted_items[i]
                try:
                    if os.path.exists(file_path):
                        os.remove(file_path)
                    del VOICE_CACHE[audio_id]
                    logger.info(f"Cache removido: {audio_id}")
                except Exception as e:
                    logger.error(f"Erro ao remover cache {audio_id}: {e}")

# Rotas da API

@app.route('/', methods=['GET'])
def home():
    """Endpoint raiz - informações da API"""
    return jsonify({
        "service": "WP Audio Articles TTS API",
        "version": "2.1.0",
        "status": "online",
        "platform": "Render.com",
        "cache_size": len(VOICE_CACHE),
        "endpoints": {
            "health": "/api/health",
            "voices": "/api/voices", 
            "synthesize": "/api/synthesize",
            "stream": "/api/stream",
            "download": "/api/download/{id}",
            "cache_clear": "/api/cache/clear",
            "cache_status": "/api/cache/status"
        }
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check para Render.com"""
    try:
        # Testar TTS engine
        engine = init_tts_engine()
        tts_status = "ok" if engine else "error"
        if engine:
            engine.stop()
            
        return jsonify({
            "status": "healthy",
            "version": "2.1.0",
            "platform": "Render.com",
            "tts_engine": tts_status,
            "cache_size": len(VOICE_CACHE),
            "max_text_length": MAX_TEXT_LENGTH,
            "timestamp": time.time()
        }), 200
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({
            "status": "unhealthy",
            "error": str(e)
        }), 500

@app.route('/api/voices', methods=['GET'])
@require_api_key
def get_voices():
    """Listar vozes disponíveis"""
    try:
        engine = init_tts_engine()
        if not engine:
            return jsonify({"error": "TTS engine não disponível"}), 500
            
        voices = engine.getProperty('voices')
        voice_list = []
        
        if voices:
            for i, voice in enumerate(voices[:10]):  # Limitar a 10 vozes
                voice_info = {
                    "id": i,
                    "name": getattr(voice, 'name', f'Voice {i}'),
                    "language": getattr(voice, 'languages', ['pt-BR'])[0] if hasattr(voice, 'languages') else 'pt-BR',
                    "gender": "female" if i % 2 == 0 else "male"
                }
                voice_list.append(voice_info)
        else:
            # Vozes padrão se não conseguir detectar
            voice_list = [
                {"id": 0, "name": "Feminino 1", "language": "pt-BR", "gender": "female"},
                {"id": 1, "name": "Feminino 2", "language": "pt-BR", "gender": "female"},
                {"id": 2, "name": "Masculino 1", "language": "pt-BR", "gender": "male"},
                {"id": 3, "name": "Masculino 2", "language": "pt-BR", "gender": "male"}
            ]
        
        engine.stop()
        logger.info(f"Retornando {len(voice_list)} vozes")
        
        return jsonify({
            "voices": voice_list,
            "total": len(voice_list)
        })
        
    except Exception as e:
        logger.error(f"Erro ao listar vozes: {e}")
        return jsonify({"error": f"Erro ao listar vozes: {str(e)}"}), 500

@app.route('/api/synthesize', methods=['POST', 'OPTIONS'])
@require_api_key
def synthesize():
    """Sintetizar texto para áudio"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "JSON inválido"}), 400
            
        text = data.get('text', '').strip()
        if not text:
            return jsonify({"error": "Texto é obrigatório"}), 400
            
        voice_id = data.get('voice_id', 0)
        rate = data.get('rate', 200)
        volume = data.get('volume', 0.9)
        
        logger.info(f"Requisição de síntese: {len(text)} chars, voice={voice_id}, rate={rate}")
        
        # Verificar cache
        text_hash = get_text_hash(text, voice_id, rate, volume)
        
        with cache_lock:
            if text_hash in VOICE_CACHE:
                cached_file = VOICE_CACHE[text_hash]
                if os.path.exists(cached_file):
                    logger.info(f"Retornando do cache: {text_hash}")
                    return send_file(
                        cached_file, 
                        as_attachment=True, 
                        download_name=f"audio_{text_hash}.wav",
                        mimetype='audio/wav'
                    )
                else:
                    del VOICE_CACHE[text_hash]
        
        # Sintetizar novo áudio
        audio_file = synthesize_speech(text, voice_id, rate, volume)
        
        if audio_file and os.path.exists(audio_file):
            # Adicionar ao cache
            with cache_lock:
                VOICE_CACHE[text_hash] = audio_file
                cleanup_cache()
            
            logger.info(f"Áudio sintetizado e cacheado: {text_hash}")
            return send_file(
                audio_file, 
                as_attachment=True, 
                download_name=f"audio_{text_hash}.wav",
                mimetype='audio/wav'
            )
        else:
            return jsonify({"error": "Falha na síntese do áudio"}), 500
            
    except ValueError as e:
        logger.error(f"Erro de validação: {e}")
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(f"Erro na síntese: {e}")
        return jsonify({"error": f"Erro interno: {str(e)}"}), 500

@app.route('/api/stream', methods=['POST', 'OPTIONS'])
@require_api_key  
def stream_synthesis():
    """Sintetizar e retornar informações para streaming"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "JSON inválido"}), 400
            
        text = data.get('text', '').strip()
        if not text:
            return jsonify({"error": "Texto é obrigatório"}), 400
            
        voice_id = data.get('voice_id', 0)
        rate = data.get('rate', 200)
        volume = data.get('volume', 0.9)
        
        # Sintetizar áudio
        audio_file = synthesize_speech(text, voice_id, rate, volume)
        
        if audio_file and os.path.exists(audio_file):
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
                "status": "ready",
                "duration_estimate": len(text.split()) / 2.5  # Estimativa em segundos
            })
        else:
            return jsonify({"error": "Falha na síntese do áudio"}), 500
            
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
                return send_file(
                    cached_file, 
                    as_attachment=True, 
                    download_name=f"audio_{audio_id}.wav",
                    mimetype='audio/wav'
                )
            else:
                del VOICE_CACHE[audio_id]
    
    return jsonify({"error": "Áudio não encontrado"}), 404

@app.route('/api/cache/clear', methods=['POST'])
@require_api_key
def clear_cache():
    """Limpar todo o cache"""
    try:
        removed_count = 0
        with cache_lock:
            for audio_id, file_path in list(VOICE_CACHE.items()):
                if os.path.exists(file_path):
                    try:
                        os.remove(file_path)
                        removed_count += 1
                    except Exception as e:
                        logger.error(f"Erro ao remover {file_path}: {e}")
                del VOICE_CACHE[audio_id]
        
        logger.info(f"Cache limpo: {removed_count} arquivos removidos")
        return jsonify({
            "message": f"Cache limpo com sucesso. {removed_count} arquivos removidos.",
            "removed_count": removed_count
        })
    except Exception as e:
        logger.error(f"Erro ao limpar cache: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/cache/status', methods=['GET'])
@require_api_key
def cache_status():
    """Status do cache"""
    try:
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
    except Exception as e:
        logger.error(f"Erro ao obter status do cache: {e}")
        return jsonify({"error": str(e)}), 500

# Tratamento de erros global
@app.errorhandler(404)
def not_found(error):
    return jsonify({
        "error": "Endpoint não encontrado",
        "available_endpoints": ["/", "/api/health", "/api/voices", "/api/synthesize"]
    }), 404

@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({"error": "Método não permitido"}), 405

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Erro interno: {error}")
    return jsonify({"error": "Erro interno do servidor"}), 500

# Middleware para log de requisições
@app.before_request
def log_request_info():
    logger.info(f"{request.method} {request.url} - {request.remote_addr}")

@app.after_request
def log_response_info(response):
    logger.info(f"Response: {response.status_code}")
    return response

if __name__ == '__main__':
    logger.info("🚀 Iniciando WP Audio Articles API v2.1 para Render.com")
    logger.info(f"📡 Host: {API_HOST}:{API_PORT}")
    logger.info(f"🔑 API Key: {API_KEY[:10]}...")
    logger.info(f"💾 Cache máximo: {MAX_CACHE_SIZE} arquivos")
    logger.info(f"📝 Texto máximo: {MAX_TEXT_LENGTH} caracteres")
    logger.info(f"🐛 Debug: {DEBUG}")
    
    # Testar TTS engine na inicialização
    try:
        test_engine = init_tts_engine()
        if test_engine:
            logger.info("✅ TTS Engine inicializado com sucesso")
            test_engine.stop()
        else:
            logger.warning("⚠️ TTS Engine com problemas")
    except Exception as e:
        logger.error(f"❌ Erro no TTS Engine: {e}")
    
    app.run(
        host=API_HOST, 
        port=API_PORT, 
        debug=DEBUG,
        threaded=True,
        use_reloader=False  # Importante para Render.com
    )