# API Plugin Speech (com gTTS)

Este projeto é uma API Flask que transforma texto em áudio usando Google Text-to-Speech (gTTS). Ele é ideal para integrar com um site WordPress, adicionando a funcionalidade de leitura de artigos.

## 🚀 Endpoints

- `POST /api/speak` — recebe um JSON com `{ "text": "..." }` e retorna um arquivo `.mp3` de áudio.

## 🧪 Teste Rápido

```bash
curl -X POST https://SEU-APP.onrender.com/api/speak \
     -H "Content-Type: application/json" \
     -d '{"text": "Olá mundo"}' --output fala.mp3
```

## 🛠️ Requisitos

- Python 3.10+
- `gTTS`, `Flask`, `gunicorn`, `Flask-CORS`

## 📦 Deploy no Render

1. Crie um novo serviço do tipo **Web Service** no Render
2. Escolha seu repositório (ou envie os arquivos ZIP)
3. Configure:
   - **Start Command:** `gunicorn app:app`
   - **Runtime:** Python 3.10 (via `runtime.txt`)
4. O Render detectará automaticamente os pacotes com base em `requirements.txt`

## ✅ Estrutura esperada

```
.
├── app.py
├── requirements.txt
├── runtime.txt
├── render.yaml
├── static/
│   └── index.html
```

---

## 🌐 Integração WordPress

Use o plugin WP [Audio Article Speech](../wp-audio-article-speech.zip) para conectar o seu site WordPress à esta API.

---

## 📄 Licença

MIT