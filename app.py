from flask import Flask, request, send_file, jsonify, send_from_directory
from flask_cors import CORS
from gtts import gTTS
from langdetect import detect, LangDetectException
import os
import uuid
import tempfile
import logging
import re
import time
from collections import defaultdict
from werkzeug.middleware.proxy_fix import ProxyFix

# Configurar aplicação Flask para produção
app = Flask(__name__, static_folder='static')

# Configurar CORS para produção
CORS(app, 
     origins=['*'],  # Em produção, especifique domínios específicos
     methods=['GET', 'POST'],
     allow_headers=['Content-Type', 'Accept'])

# Configurar middleware para proxies reversos
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)

# Configurar logging para produção
logging.basicConfig(
    level=logging.WARNING,  # Produção usa WARNING ao invés de INFO
    format='%(asctime)s %(levelname)s %(name)s: %(message)s'
)
logger = logging.getLogger(__name__)

# Rate limiting em produção
request_counts = defaultdict(list)
RATE_LIMIT = 15  # Aumentado para produção
RATE_WINDOW = 60  # 60 segundos

# Headers de segurança para produção
@app.after_request
def security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    return response

@app.route('/')
def serve_index():
    return send_from_directory('static', 'index.html')

@app.route('/health')
def health_check():
    """Endpoint de health check para produção"""
    return jsonify({'status': 'healthy', 'timestamp': int(time.time())})

def check_rate_limit(client_ip):
    """Verifica se o cliente excedeu o limite de requisições"""
    now = time.time()

    # Limpar requisições antigas
    request_counts[client_ip] = [
        req_time for req_time in request_counts[client_ip] 
        if now - req_time < RATE_WINDOW
    ]

    # Verificar limite
    if len(request_counts[client_ip]) >= RATE_LIMIT:
        return False

    # Adicionar nova requisição
    request_counts[client_ip].append(now)
    return True

@app.route('/api/speak', methods=['POST'])
def speak():
    # Verificar rate limiting
    client_ip = request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)
    if not check_rate_limit(client_ip):
        logger.warning(f"Rate limit excedido para IP: {client_ip}")
        return jsonify({'error': 'Rate limit exceeded. Please try again later.'}), 429

    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Invalid JSON data'}), 400

        text = data.get('text', '').strip()

        if not text:
            return jsonify({'error': 'No text provided'}), 400

        # Segurança: limitar tamanho do texto
        if len(text) > 5000:
            return jsonify({'error': 'Text too long. Maximum 5000 characters allowed.'}), 400

        # Segurança: sanitizar texto (remover caracteres especiais perigosos)
        text = re.sub(r'[^\w\s\.,!?;:\-\'"áàâãéèêíìîóòôõúùûçÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ]', '', text)

        if not text.strip():
            return jsonify({'error': 'No valid text content'}), 400

        # Detecção automática de idioma com fallback
        try:
            lang = detect(text)
            # Normalizar código de idioma para gTTS
            if lang == 'pt':
                lang = 'pt-br'
            elif lang not in ['en', 'es', 'fr', 'de', 'it', 'pt-br']:
                lang = 'pt-br'  # Fallback para idiomas não suportados
        except LangDetectException:
            lang = 'pt-br'

        # Usar diretório temporário portátil
        filename = f"speech_{uuid.uuid4().hex[:8]}.mp3"
        filepath = os.path.join(tempfile.gettempdir(), filename)

        # Gerar áudio com idioma detectado
        tts = gTTS(text=text, lang=lang, slow=False)
        tts.save(filepath)

        # Verificar se arquivo foi criado corretamente
        if not os.path.exists(filepath) or os.path.getsize(filepath) == 0:
            return jsonify({'error': 'Failed to generate audio file'}), 500

        def remove_file():
            try:
                if os.path.exists(filepath):
                    os.remove(filepath)
            except Exception:
                pass  # Falha silenciosa na remoção

        # Agendar remoção do arquivo após envio
        import atexit
        atexit.register(remove_file)

        return send_file(
            filepath, 
            mimetype='audio/mpeg', 
            as_attachment=False, 
            download_name="speech.mp3",
            conditional=True  # Suporte para range requests
        )

    except Exception as e:
        logger.error(f"Erro ao gerar áudio: {str(e)}, IP: {client_ip}")
        return jsonify({'error': 'Internal server error'}), 500

# Error handlers para produção
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    # Configuração para desenvolvimento local
    app.run(host='0.0.0.0', port=5000, debug=False)
else:
    # Configuração para produção (quando rodado via gunicorn)
    app.debug = False