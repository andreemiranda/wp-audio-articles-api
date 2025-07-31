# WP Audio Articles - Plugin WordPress + API Python

Sistema completo de síntese de voz para artigos WordPress usando API Python com pyttsx3, **otimizado para deploy no Render.com**.

## 🌟 Características

- **API Python robusta**: Síntese de voz de alta qualidade usando pyttsx3
- **Player WordPress moderno**: Interface com tema escuro elegante
- **Cache inteligente**: Armazena áudios gerados para reutilização
- **Fallback automático**: Usa síntese local se a API estiver offline
- **Design responsivo**: Funciona perfeitamente em desktop e mobile
- **Deploy otimizado**: Pronto para produção no Render.com

## 🚀 Deploy no Render.com

### 1. Preparar Repositório GitHub

1. Crie um novo repositório no GitHub
2. Faça upload de todos os arquivos da API Python:
   - `main.py`
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
MAX_CACHE_SIZE=20
MAX_TEXT_LENGTH=5000
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
- **Design escuro elegante**: Tema preto/cinza com gradientes
- **Controles completos**: Play/pause, progresso, velocidade
- **Menu de configurações**: Dropdown organizado com todas as opções
- **Indicador de API**: Status da conexão em tempo real
- **Barra de progresso interativa**: Clique para navegar no áudio

### API Python
- **Síntese de alta qualidade**: pyttsx3 otimizado para Render.com
- **Cache thread-safe**: Reutilização inteligente de áudios
- **Logs estruturados**: Monitoramento completo
- **Health checks**: Endpoint para verificação de saúde
- **Tratamento de erros robusto**: Retry automático e fallbacks

## 🔧 Endpoints da API

- `GET /` - Informações da API
- `GET /api/health` - Verificação de saúde (usado pelo Render.com)
- `GET /api/voices` - Listar vozes disponíveis
- `POST /api/synthesize` - Sintetizar texto para áudio
- `POST /api/stream` - Sintetizar e retornar informações
- `GET /api/download/{id}` - Download de áudio específico
- `POST /api/cache/clear` - Limpar cache
- `GET /api/cache/status` - Status do cache

## 🎨 Melhorias Implementadas

### Plugin WordPress
- ✅ **Removido player suspenso/flutuante** completamente
- ✅ **Tema escuro moderno** (preto/cinza) com gradientes
- ✅ **Menu de configurações reorganizado** - todos elementos dentro do container
- ✅ **Correção de áudio infinito** - detecção adequada de fim
- ✅ **Melhor detecção de fim de áudio** com timer otimizado
- ✅ **Interface responsiva** para todos os dispositivos

### API Python
- ✅ **Otimizada para Render.com** com configurações específicas
- ✅ **Logs estruturados** com diferentes níveis
- ✅ **Cache thread-safe** com limpeza automática
- ✅ **Validação de entrada** rigorosa
- ✅ **Health checks** para monitoramento
- ✅ **CORS configurado** adequadamente para WordPress

## 🔐 Segurança

- Chave API obrigatória em todos os endpoints protegidos
- Validação de entrada rigorosa em todos os parâmetros
- Logs de tentativas de acesso inválido
- Limitação de tamanho de texto para prevenir abuso
- CORS configurado adequadamente para WordPress

## 📊 Monitoramento

A API inclui:
- Health check endpoint (`/api/health`) para Render.com
- Logs estruturados com níveis (INFO, WARNING, ERROR)
- Métricas de cache em tempo real
- Status de síntese detalhado
- Tratamento de exceções em todos os níveis

## 🐛 Solução de Problemas

### API não conecta
- Verifique se o serviço está rodando no Render.com
- Confirme a URL da API (deve terminar com `/api`)
- Teste o endpoint `/api/health` diretamente
- Verifique os logs no dashboard do Render.com

### Player não funciona
- Abra o console do navegador (F12) para ver erros
- Confirme que está em uma página de post/artigo
- Teste com API offline (fallback local deve funcionar)
- Verifique se a chave da API está correta

### Áudio não para
- **Corrigido**: implementado controle adequado de fim de áudio
- Timer global otimizado com detecção de `audio.ended`
- Reset automático do player quando termina

## 📈 Performance

- **Cache inteligente**: Áudios reutilizados automaticamente
- **Compressão**: Arquivos WAV otimizados
- **Fallback robusto**: Síntese local como backup
- **Lazy loading**: Recursos carregados sob demanda
- **Thread-safe**: Operações seguras em ambiente multi-thread

## 🔄 Atualizações

Para atualizar:
1. Substitua os arquivos do plugin no WordPress
2. Faça push das mudanças para o GitHub
3. Render.com fará deploy automático
4. Limpe cache se necessário (`/api/cache/clear`)

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
├── requirements.txt               # Dependências Python
├── render.yaml                    # Configuração Render.com
├── Procfile                       # Comando de start
├── runtime.txt                    # Versão Python
├── .gitignore                     # Arquivos ignorados
└── README.md                      # Esta documentação
```

## 🔧 Configuração Avançada

### Via wp-config.php (Recomendado)
```php
// WP Audio Articles Configuration
define('WP_AUDIO_ARTICLES_API_URL', 'https://seu-app.onrender.com/api');
define('WP_AUDIO_ARTICLES_API_KEY', 'sua_chave_api_super_segura');
```

### Via Interface Admin
1. Vá em **Configurações** → **Audio Articles**
2. Configure URL da API e chave
3. Teste a conexão
4. Salve as configurações

## 📞 Suporte

Para suporte:
1. Verifique logs do Render.com no dashboard
2. Teste endpoint `/api/health` diretamente
3. Verifique console do navegador (F12)
4. Confirme configurações da API no WordPress

## 🎯 Próximas Melhorias

- [ ] Suporte a múltiplos idiomas
- [ ] Interface de administração mais avançada
- [ ] Estatísticas de uso
- [ ] Integração com CDN
- [ ] Suporte a áudio em diferentes formatos

---

**Desenvolvido para WordPress com síntese de voz de alta qualidade usando Python e deploy otimizado para Render.com.**

### 🏷️ Versão: 2.1.0
### 📅 Última atualização: 2024
### 👨‍💻 Compatibilidade: WordPress 5.0+, Python 3.11+, Render.com