# WP Audio Articles - API Python + Plugin WordPress

Sistema completo de síntese de voz para artigos WordPress usando API Python com pyttsx3, otimizado para deploy no Render.com.

## 🌟 Características

- **API Python**: Síntese de voz de alta qualidade usando pyttsx3
- **Player WordPress**: Interface moderna com tema escuro
- **Cache inteligente**: Armazena áudios gerados para reutilização
- **Fallback automático**: Usa síntese local se a API estiver offline
- **Design responsivo**: Funciona em desktop e mobile
- **Deploy otimizado**: Pronto para Render.com

## 🚀 Deploy no Render.com

### 1. Preparar Repositório GitHub

1. Crie um novo repositório no GitHub
2. Faça upload de todos os arquivos da API Python:
   - `main.py`
   - `config.py`
   - `requirements.txt`
   - `render.yaml`
   - `Procfile`
   - `runtime.txt`
   - `.gitignore`

### 2. Deploy no Render.com

1. Acesse [render.com](https://render.com) e faça login
2. Clique em "New +" → "Web Service"
3. Conecte seu repositório GitHub
4. Configure:
   - **Name**: `wp-audio-articles-api`
   - **Environment**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python main.py`
   - **Plan**: Free (ou Starter para melhor performance)

### 3. Variáveis de Ambiente

Configure no Render.com:
```
WP_AUDIO_API_KEY=sua_chave_api_super_segura_aqui
DEBUG=false
MAX_CACHE_SIZE=30
MAX_TEXT_LENGTH=6000
PORT=10000
```

### 4. Plugin WordPress

1. Faça upload da pasta `wp-audio-articles` para `/wp-content/plugins/`
2. Ative o plugin no painel do WordPress
3. Vá em **Configurações** → **Audio Articles**
4. Configure:
   - **URL da API**: `https://seu-app.onrender.com/api`
   - **Chave da API**: A mesma configurada no Render.com

## 📱 Funcionalidades

### Player Principal
- **Design escuro**: Tema preto/cinza moderno
- **Controles completos**: Play/pause, progresso, velocidade
- **Configurações avançadas**: Menu dropdown organizado
- **Indicador de API**: Status da conexão em tempo real

### API Python
- **Síntese de alta qualidade**: pyttsx3 otimizado
- **Cache inteligente**: Reutilização de áudios
- **Tratamento de erros**: Logs estruturados
- **Health check**: Monitoramento de saúde

## 🔧 Endpoints da API

- `GET /` - Status da API
- `GET /api/health` - Verificação de saúde
- `GET /api/voices` - Listar vozes disponíveis
- `POST /api/synthesize` - Sintetizar texto para áudio
- `POST /api/stream` - Sintetizar e retornar URL
- `GET /api/download/{id}` - Download de áudio
- `POST /api/cache/clear` - Limpar cache
- `GET /api/cache/status` - Status do cache

## 🎨 Melhorias Implementadas

### Plugin WordPress
- ✅ Removido player suspenso/flutuante
- ✅ Tema escuro (preto/cinza)
- ✅ Menu de configurações reorganizado
- ✅ Correção de áudio infinito
- ✅ Melhor detecção de fim de áudio
- ✅ Interface responsiva

### API Python
- ✅ Melhor tratamento de erros
- ✅ Logs estruturados
- ✅ Cache thread-safe
- ✅ Validação de entrada
- ✅ Health checks
- ✅ Otimizado para Render.com

## 🔐 Segurança

- Chave API obrigatória em todos os endpoints
- Validação de entrada rigorosa
- Logs de tentativas de acesso inválido
- Limitação de tamanho de texto
- CORS configurado adequadamente

## 📊 Monitoramento

A API inclui:
- Health check endpoint (`/api/health`)
- Logs estruturados com níveis
- Métricas de cache
- Status de síntese
- Tratamento de exceções

## 🐛 Solução de Problemas

### API não conecta
- Verifique se o serviço está rodando no Render.com
- Confirme a URL da API (deve terminar com `/api`)
- Teste o endpoint `/api/health`

### Player não funciona
- Verifique console do navegador (F12)
- Confirme que está em uma página de post
- Teste com API offline (fallback local)

### Áudio não para
- Corrigido: implementado controle adequado de fim de áudio
- Timer global otimizado
- Detecção de `audio.ended`

## 📈 Performance

- **Cache**: Áudios reutilizados automaticamente
- **Compressão**: Arquivos WAV otimizados
- **Fallback**: Síntese local como backup
- **Lazy loading**: Recursos carregados sob demanda

## 🔄 Atualizações

Para atualizar:
1. Substitua os arquivos do plugin
2. Faça push das mudanças para o GitHub
3. Render.com fará deploy automático
4. Limpe cache se necessário

## 🏆 Estrutura de Arquivos

```
wp-audio-articles/
├── wp-audio-articles.php          # Plugin principal
├── includes/
│   └── class-wp-audio-articles.php # Classe principal
├── assets/
│   ├── css/
│   │   └── audio-player.css       # Estilos (tema escuro)
│   └── js/
│       ├── audio-player.js        # Player principal
│       └── admin.js               # Admin interface
└── README.txt                     # Documentação WordPress

API Python/
├── main.py                        # Aplicação Flask
├── config.py                      # Configurações
├── requirements.txt               # Dependências
├── render.yaml                    # Configuração Render.com
├── Procfile                       # Comando de start
├── runtime.txt                    # Versão Python
└── .gitignore                     # Arquivos ignorados
```

## 📞 Suporte

Para suporte:
1. Verifique logs do Render.com
2. Teste endpoint `/api/health`
3. Verifique console do navegador
4. Confirme configurações da API

---

**Desenvolvido para WordPress com síntese de voz de alta qualidade usando Python e deploy otimizado para Render.com.**