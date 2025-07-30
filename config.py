"""
Configurações da API WP Audio Articles - Otimizada para Render.com
"""

import os

# Configurações da API
API_KEY = os.environ.get('WP_AUDIO_API_KEY', 'wp_audio_articles_api_key_2024_prod_secure')
API_HOST = '0.0.0.0'
API_PORT = int(os.environ.get('PORT', 10000))  # Render.com usa porta 10000 por padrão
DEBUG = os.environ.get('DEBUG', 'False').lower() == 'true'

# Configurações de áudio
DEFAULT_VOICE_ID = 0
DEFAULT_RATE = 200
DEFAULT_VOLUME = 0.9

# Configurações de cache
CACHE_ENABLED = True
MAX_CACHE_SIZE = int(os.environ.get('MAX_CACHE_SIZE', 50))  # Reduzido para Render.com

# Configurações de síntese
MAX_TEXT_LENGTH = int(os.environ.get('MAX_TEXT_LENGTH', 8000))  # Máximo de caracteres por requisição
CHUNK_SIZE = 1000  # Tamanho dos chunks para texto longo

# Configurações específicas para Render.com
RENDER_EXTERNAL_URL = os.environ.get('RENDER_EXTERNAL_URL', '')
ALLOWED_ORIGINS = os.environ.get('ALLOWED_ORIGINS', '*').split(',')

# Configuração de produção - logs estruturados
import logging

if DEBUG:
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    print(f"""
🎵 WP Audio Articles API v2.0
================================
Environment: {'Development' if DEBUG else 'Production'}
API Key: {API_KEY[:10]}...
Host: {API_HOST}
Port: {API_PORT}
Debug: {DEBUG}
Cache: {'Enabled' if CACHE_ENABLED else 'Disabled'}
Max Cache Size: {MAX_CACHE_SIZE}
Max Text Length: {MAX_TEXT_LENGTH}
Render URL: {RENDER_EXTERNAL_URL or 'Not set'}
================================
""")
else:
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )