/**
 * WP Audio Articles JavaScript - Melhorado para Render.com
 * Text-to-speech player functionality for WordPress posts
 */
(function() {
    'use strict';

    // Configurações da API Python
    const API_CONFIG = {
        baseUrl: wpAudioArticles?.api_url || '',
        apiKey: wpAudioArticles?.api_key || '',
        timeout: 45000,
        retryAttempts: 3,
        retryDelay: 2000
    };
    
    // Vozes disponíveis (fallback)
    const DEFAULT_VOICES = [
        { id: 0, name: 'Feminino 1', gender: 'female', lang: 'pt-BR' },
        { id: 1, name: 'Feminino 2', gender: 'female', lang: 'pt-BR' },
        { id: 2, name: 'Masculino 1', gender: 'male', lang: 'pt-BR' },
        { id: 3, name: 'Masculino 2', gender: 'male', lang: 'pt-BR' }
    ];

    // Variáveis globais
    let speechSynth = null;
    let speechUtterance = null;
    let isPlaying = false;
    let audioPlayer = null;
    let playButton = null;
    let progressBar = null;
    let progressContainer = null;
    let speedSelector = null;
    let voiceSelector = null;
    let timerDisplay = null;
    let currentPosition = 0;
    let totalDuration = 0;
    let postContent = '';
    let postTitle = '';
    let postMeta = '';
    let currentAudio = null;
    let settingsDropdown = null;
    let settingsButton = null;
    let isMobileDevice = false;
    let globalTimerInterval = null;
    let apiStatus = 'checking';
    let currentPostId = null;
    let isAudioEnded = false;
    let availableVoices = DEFAULT_VOICES;
    
    // Configurações padrão do usuário
    const defaultPreferences = {
        playbackRate: 1,
        language: 'pt-BR',
        useApiTTS: true,
        voiceId: 0
    };
    
    // Preferências do usuário
    let userPreferences = { ...defaultPreferences };

    // Inicializar quando o documento estiver pronto
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🎵 WP Audio Articles - Inicializando...');
        checkMobileDevice();
        loadUserPreferences();
        initAudioPlayer();
        addSettingsMenu();
        checkApiStatus();
        
        // Fechar dropdown ao clicar fora
        document.addEventListener('click', function(event) {
            if (settingsDropdown && settingsDropdown.classList.contains('active')) {
                if (!settingsDropdown.contains(event.target) && !settingsButton.contains(event.target)) {
                    settingsDropdown.classList.remove('active');
                }
            }
        });
    });
    
    /**
     * Verificar status da API Python com retry melhorado
     */
    async function checkApiStatus() {
        console.log('🔍 Verificando status da API...');
        
        if (!API_CONFIG.baseUrl || !API_CONFIG.apiKey) {
            console.warn('⚠️ API não configurada');
            apiStatus = 'offline';
            updateApiStatusIndicator(false);
            return;
        }

        let attempts = 0;
        const maxAttempts = 3;
        
        while (attempts < maxAttempts) {
            try {
                console.log(`🔄 Tentativa ${attempts + 1} de conectar à API...`);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);
                
                // Testar endpoint de health
                const healthUrl = API_CONFIG.baseUrl.replace('/api', '') + '/api/health';
                console.log(`📡 Testando: ${healthUrl}`);
                
                const response = await fetch(healthUrl, {
                    method: 'GET',
                    headers: {
                        'X-API-Key': API_CONFIG.apiKey,
                        'Content-Type': 'application/json'
                    },
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('📊 Resposta da API:', data);
                    
                    if (data.status === 'healthy') {
                        apiStatus = 'online';
                        updateApiStatusIndicator(true);
                        await loadAvailableVoices();
                        console.log('✅ API Python conectada com sucesso!');
                        return;
                    }
                }
                
                throw new Error(`API retornou status ${response.status}: ${response.statusText}`);
                
            } catch (error) {
                attempts++;
                console.warn(`❌ Tentativa ${attempts} falhou:`, error.message);
                
                if (attempts < maxAttempts) {
                    const delay = API_CONFIG.retryDelay * attempts;
                    console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        console.warn('🔴 API Python não disponível após múltiplas tentativas');
        console.log('🔄 Usando fallback local (Web Speech API)');
        apiStatus = 'offline';
        updateApiStatusIndicator(false);
    }
    
    /**
     * Atualizar indicador de status da API
     */
    function updateApiStatusIndicator(isOnline) {
        const indicators = document.querySelectorAll('.wp-audio-articles-api-status');
        indicators.forEach(indicator => {
            if (isOnline) {
                indicator.classList.add('online');
                indicator.title = 'API Python conectada - Síntese de alta qualidade';
                console.log('🟢 Indicador API: Online');
            } else {
                indicator.classList.remove('online');
                indicator.title = 'API Python offline - Usando síntese local do navegador';
                console.log('🔴 Indicador API: Offline');
            }
        });
        
        updateVoiceSelectorVisibility(isOnline);
    }
    
    /**
     * Carregar vozes disponíveis da API
     */
    async function loadAvailableVoices() {
        try {
            console.log('🎤 Carregando vozes da API...');
            const response = await apiRequest('/voices');
            
            if (response.ok) {
                const data = await response.json();
                console.log('🎤 Vozes recebidas:', data);
                
                if (data.voices && data.voices.length > 0) {
                    availableVoices = data.voices;
                    updateVoiceOptions(data.voices);
                    console.log(`✅ ${data.voices.length} vozes carregadas da API`);
                } else {
                    console.log('⚠️ Nenhuma voz retornada, usando padrões');
                    availableVoices = DEFAULT_VOICES;
                    updateVoiceOptions(DEFAULT_VOICES);
                }
            }
        } catch (error) {
            console.warn('❌ Erro ao carregar vozes da API:', error);
            availableVoices = DEFAULT_VOICES;
            updateVoiceOptions(DEFAULT_VOICES);
        }
    }
    
    /**
     * Atualizar opções de voz nos seletores
     */
    function updateVoiceOptions(voices) {
        if (!voiceSelector) return;
        
        console.log('🔄 Atualizando opções de voz...');
        voiceSelector.innerHTML = '';
        
        voices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.id;
            option.textContent = voice.name;
            if (voice.id === userPreferences.voiceId) {
                option.selected = true;
            }
            voiceSelector.appendChild(option);
        });
        
        console.log(`✅ ${voices.length} vozes adicionadas ao seletor`);
    }
    
    /**
     * Atualizar visibilidade do seletor de vozes
     */
    function updateVoiceSelectorVisibility(isOnline) {
        if (!voiceSelector) return;
        
        if (isOnline && userPreferences.useApiTTS) {
            voiceSelector.style.display = 'block';
            console.log('👁️ Seletor de vozes: Visível');
        } else {
            voiceSelector.style.display = 'none';
            console.log('👁️ Seletor de vozes: Oculto');
        }
    }
    
    /**
     * Fazer requisição para a API Python com retry melhorado
     */
    async function apiRequest(endpoint, options = {}) {
        const url = `${API_CONFIG.baseUrl}${endpoint}`;
        console.log(`📡 API Request: ${options.method || 'GET'} ${url}`);
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_CONFIG.apiKey
            }
        };
        
        const finalOptions = { ...defaultOptions, ...options };
        
        let attempts = 0;
        while (attempts < API_CONFIG.retryAttempts) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
                
                const response = await fetch(url, {
                    ...finalOptions,
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                console.log(`📊 API Response: ${response.status} ${response.statusText}`);
                
                if (!response.ok) {
                    throw new Error(`API Error: ${response.status} - ${response.statusText}`);
                }
                
                return response;
                
            } catch (error) {
                attempts++;
                console.error(`❌ Tentativa ${attempts} falhou:`, error.message);
                
                if (attempts < API_CONFIG.retryAttempts) {
                    const delay = API_CONFIG.retryDelay * attempts;
                    console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    throw error;
                }
            }
        }
    }
    
    /**
     * Sintetizar texto usando API Python
     */
    async function synthesizeWithApi(text, voiceId = 0, rate = 200, volume = 0.9) {
        try {
            console.log(`🎤 Sintetizando com API: ${text.length} chars, voz=${voiceId}, rate=${rate}`);
            showLoadingState(true);
            
            const finalRate = Math.round(rate * parseFloat(speedSelector ? speedSelector.value : userPreferences.playbackRate));
            
            const response = await apiRequest('/synthesize', {
                method: 'POST',
                body: JSON.stringify({
                    text: text,
                    voice_id: voiceId,
                    rate: finalRate,
                    volume: volume
                })
            });
            
            if (response.ok) {
                console.log('✅ Áudio recebido da API');
                const audioBlob = await response.blob();
                const audioUrl = URL.createObjectURL(audioBlob);
                
                // Criar elemento de áudio
                const audio = new Audio(audioUrl);
                
                return new Promise((resolve, reject) => {
                    audio.onloadedmetadata = () => {
                        totalDuration = audio.duration;
                        console.log(`🎵 Áudio carregado: ${totalDuration.toFixed(2)}s`);
                        resolve(audio);
                    };
                    
                    audio.onerror = (e) => {
                        console.error('❌ Erro ao carregar áudio:', e);
                        reject(new Error('Erro ao carregar áudio da API'));
                    };
                    
                    // Timeout para carregamento
                    setTimeout(() => {
                        if (audio.readyState < 2) {
                            reject(new Error('Timeout no carregamento do áudio'));
                        }
                    }, 10000);
                });
            } else {
                throw new Error('Erro na síntese da API');
            }
        } catch (error) {
            console.error('❌ Erro na síntese com API:', error);
            throw error;
        } finally {
            showLoadingState(false);
        }
    }
    
    /**
     * Mostrar/ocultar estado de carregamento
     */
    function showLoadingState(show) {
        if (audioPlayer) {
            if (show) {
                audioPlayer.classList.add('loading');
                console.log('⏳ Estado de carregamento: Ativo');
            } else {
                audioPlayer.classList.remove('loading');
                console.log('✅ Estado de carregamento: Inativo');
            }
        }
    }
    
    /**
     * Verificar se é um dispositivo móvel
     */
    function checkMobileDevice() {
        const userAgent = navigator.userAgent.toLowerCase();
        isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
        
        if (isMobileDevice) {
            document.documentElement.classList.add('mobile-device');
            console.log('📱 Dispositivo móvel detectado');
        } else {
            console.log('💻 Dispositivo desktop detectado');
        }
    }
    
    /**
     * Adicionar botão e menu de configurações melhorado
     */
    function addSettingsMenu() {
        if (!audioPlayer) return;
        
        console.log('⚙️ Adicionando menu de configurações...');
        
        // Container de configurações
        const settingsContainer = document.createElement('div');
        settingsContainer.className = 'wp-audio-articles-settings';
        
        // Botão de configurações
        settingsButton = document.createElement('button');
        settingsButton.className = 'wp-audio-articles-settings-button';
        settingsButton.setAttribute('aria-label', 'Configurações');
        settingsButton.setAttribute('type', 'button');
        
        const settingsIcon = document.createElement('span');
        settingsIcon.className = 'wp-audio-articles-settings-icon';
        settingsButton.appendChild(settingsIcon);
        
        // Dropdown de configurações
        settingsDropdown = document.createElement('div');
        settingsDropdown.className = 'wp-audio-articles-settings-dropdown';
        
        // Grupo de configurações: Síntese
        const synthesisGroup = document.createElement('div');
        synthesisGroup.className = 'wp-audio-articles-settings-group';
        
        const synthesisTitle = document.createElement('div');
        synthesisTitle.className = 'wp-audio-articles-settings-title';
        synthesisTitle.textContent = 'Síntese de Voz';
        synthesisGroup.appendChild(synthesisTitle);
        
        // Usar API Python
        const apiOption = document.createElement('div');
        apiOption.className = 'wp-audio-articles-settings-option';
        
        const apiCheckbox = document.createElement('input');
        apiCheckbox.type = 'checkbox';
        apiCheckbox.id = 'wp-audio-settings-api';
        apiCheckbox.className = 'wp-audio-articles-settings-checkbox';
        apiCheckbox.checked = userPreferences.useApiTTS;
        
        const apiLabel = document.createElement('label');
        apiLabel.className = 'wp-audio-articles-settings-label';
        apiLabel.setAttribute('for', 'wp-audio-settings-api');
        apiLabel.textContent = 'Usar API Python (Melhor qualidade)';
        
        apiOption.appendChild(apiCheckbox);
        apiOption.appendChild(apiLabel);
        synthesisGroup.appendChild(apiOption);
        
        // Seletor de voz
        const voiceTitle = document.createElement('div');
        voiceTitle.className = 'wp-audio-articles-settings-label';
        voiceTitle.textContent = 'Voz:';
        voiceTitle.style.marginBottom = '6px';
        voiceTitle.style.marginTop = '12px';
        synthesisGroup.appendChild(voiceTitle);
        
        const voiceSelect = document.createElement('select');
        voiceSelect.className = 'wp-audio-articles-settings-select';
        voiceSelect.id = 'wp-audio-settings-voice';
        
        availableVoices.forEach(function(voice) {
            const option = document.createElement('option');
            option.value = voice.id;
            option.textContent = voice.name;
            if (voice.id === userPreferences.voiceId) {
                option.selected = true;
            }
            voiceSelect.appendChild(option);
        });
        
        synthesisGroup.appendChild(voiceSelect);
        
        // Event listener para seletor de voz
        voiceSelect.addEventListener('change', function() {
            userPreferences.voiceId = parseInt(this.value);
            saveUserPreferences();
            console.log(`🎤 Voz alterada para: ${this.value}`);
        });
        
        // Grupo de configurações: Reprodução
        const playbackGroup = document.createElement('div');
        playbackGroup.className = 'wp-audio-articles-settings-group';
        
        const playbackTitle = document.createElement('div');
        playbackTitle.className = 'wp-audio-articles-settings-title';
        playbackTitle.textContent = 'Reprodução';
        playbackGroup.appendChild(playbackTitle);
        
        // Velocidade padrão
        const speedTitle = document.createElement('div');
        speedTitle.className = 'wp-audio-articles-settings-label';
        speedTitle.textContent = 'Velocidade padrão:';
        speedTitle.style.marginBottom = '6px';
        playbackGroup.appendChild(speedTitle);
        
        const speedSelect = document.createElement('select');
        speedSelect.className = 'wp-audio-articles-settings-select';
        speedSelect.id = 'wp-audio-settings-speed';
        
        const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
        speeds.forEach(function(speed) {
            const option = document.createElement('option');
            option.value = speed;
            option.textContent = speed + 'x';
            if (speed === userPreferences.playbackRate) {
                option.selected = true;
            }
            speedSelect.appendChild(option);
        });
        
        playbackGroup.appendChild(speedSelect);
        
        // Adicionar grupos ao dropdown
        settingsDropdown.appendChild(synthesisGroup);
        settingsDropdown.appendChild(playbackGroup);
        
        // Adicionar eventos
        settingsButton.addEventListener('click', function(event) {
            event.stopPropagation();
            settingsDropdown.classList.toggle('active');
            console.log('⚙️ Menu de configurações:', settingsDropdown.classList.contains('active') ? 'Aberto' : 'Fechado');
        });
        
        // Salvar preferências ao alterar valores
        apiCheckbox.addEventListener('change', function() {
            userPreferences.useApiTTS = this.checked;
            saveUserPreferences();
            updateVoiceSelectorVisibility(apiStatus === 'online' && this.checked);
            console.log(`🔄 Usar API: ${this.checked}`);
        });
        
        speedSelect.addEventListener('change', function() {
            userPreferences.playbackRate = parseFloat(this.value);
            saveUserPreferences();
            
            if (speedSelector) {
                speedSelector.value = userPreferences.playbackRate;
            }
            
            if (isPlaying) {
                changePlaybackSpeed();
            }
            
            console.log(`⚡ Velocidade alterada para: ${this.value}x`);
        });
        
        // Montar a estrutura
        settingsContainer.appendChild(settingsButton);
        settingsContainer.appendChild(settingsDropdown);
        
        // Adicionar ao player
        audioPlayer.appendChild(settingsContainer);
        
        console.log('✅ Menu de configurações adicionado');
    }
    
    /**
     * Carregar preferências do usuário do armazenamento local
     */
    function loadUserPreferences() {
        const savedPreferences = localStorage.getItem('wp_audio_articles_userPreferences');
        if (savedPreferences) {
            try {
                const parsedPreferences = JSON.parse(savedPreferences);
                userPreferences = { ...defaultPreferences, ...parsedPreferences };
                console.log('✅ Preferências do usuário carregadas:', userPreferences);
            } catch (e) {
                console.error('❌ Erro ao carregar preferências do usuário:', e);
                userPreferences = { ...defaultPreferences };
            }
        } else {
            console.log('ℹ️ Usando preferências padrão');
        }
    }
    
    /**
     * Salvar preferências do usuário no armazenamento local
     */
    function saveUserPreferences() {
        try {
            localStorage.setItem('wp_audio_articles_userPreferences', JSON.stringify(userPreferences));
            console.log('💾 Preferências do usuário salvas:', userPreferences);
        } catch (e) {
            console.error('❌ Erro ao salvar preferências do usuário:', e);
        }
    }

    /**
     * Inicializar o player
     */
    function initAudioPlayer() {
        console.log('🎵 Inicializando player de áudio...');
        
        audioPlayer = document.querySelector('.wp-audio-articles-player');
        
        if (!audioPlayer) {
            console.error('❌ Player não encontrado no DOM');
            return;
        }
        
        playButton = audioPlayer.querySelector('.wp-audio-articles-play-button');
        progressBar = audioPlayer.querySelector('.wp-audio-articles-progress-bar');
        progressContainer = audioPlayer.querySelector('.wp-audio-articles-progress-container');
        speedSelector = audioPlayer.querySelector('.wp-audio-articles-speed-selector');
        voiceSelector = audioPlayer.querySelector('.wp-audio-articles-voice-selector');
        timerDisplay = audioPlayer.querySelector('.wp-audio-articles-timer');
        
        if (audioPlayer.hasAttribute('data-post-id')) {
            currentPostId = audioPlayer.getAttribute('data-post-id');
            console.log(`📄 Post ID: ${currentPostId}`);
        }
        
        if (speedSelector && userPreferences.playbackRate) {
            speedSelector.value = userPreferences.playbackRate;
        }

        loadContentAndSetupPlayer();
        console.log('✅ Player inicializado com sucesso');
    }

    /**
     * Carregar conteúdo e configurar o player
     */
    function loadContentAndSetupPlayer() {
        const fullText = loadPostContent();
        console.log(`📝 Conteúdo carregado: ${fullText.length} caracteres`);
        
        if (playButton) {
            playButton.addEventListener('click', function() {
                togglePlayPause();
            });
        }
        
        if (progressContainer) {
            progressContainer.addEventListener('click', function(e) {
                setProgress(e);
            });
        }
        
        if (speedSelector) {
            speedSelector.addEventListener('change', function() {
                changePlaybackSpeed();
            });
        }
        
        if (voiceSelector) {
            voiceSelector.addEventListener('change', function() {
                userPreferences.voiceId = parseInt(this.value);
                saveUserPreferences();
            });
        }
    }

    /**
     * Carregar conteúdo do post para sintetização
     */
    function loadPostContent() {
        if (audioPlayer) {
            if (audioPlayer.hasAttribute('data-title')) {
                postTitle = audioPlayer.getAttribute('data-title');
            } else {
                const titleElement = document.querySelector('.entry-title, .post-title, h1.title, article h1');
                if (titleElement) {
                    postTitle = titleElement.textContent.trim();
                }
            }
            
            if (audioPlayer.hasAttribute('data-author') && audioPlayer.hasAttribute('data-date')) {
                postMeta = 'Por ' + audioPlayer.getAttribute('data-author') + '. Publicado em ' + audioPlayer.getAttribute('data-date') + '.';
            }
            
            // Melhor seleção de conteúdo
            const contentSelectors = [
                '.entry-content p',
                '.post-content p', 
                'article .content p',
                '.post-content p',
                'article p',
                '.content p'
            ];
            
            let contentElements = [];
            for (const selector of contentSelectors) {
                contentElements = document.querySelectorAll(selector);
                if (contentElements.length > 0) break;
            }
            
            let textContent = [];
            
            contentElements.forEach(p => {
                if (!p.querySelector('.wp-audio-articles-player') && 
                    p.textContent.trim().length > 10 &&
                    !p.classList.contains('wp-audio-articles-player')) {
                    textContent.push(p.textContent.trim());
                }
            });
            
            postContent = textContent.join('. ');
        }
        
        const fullText = `${postTitle}. ${postMeta} ${postContent}`;
        return fullText;
    }

    /**
     * Alternar play/pause da síntese de voz
     */
    async function togglePlayPause() {
        if (isPlaying) {
            // Pausar áudio
            console.log("⏸️ Pausando áudio");
            if (currentAudio) {
                currentAudio.pause();
            } else if (speechSynth) {
                speechSynth.pause();
            }
            
            isPlaying = false;
            
            if (audioPlayer) {
                audioPlayer.classList.remove('playing');
            }
            
            stopGlobalTimer();
        } else {
            // Iniciar reprodução
            console.log("▶️ Iniciando reprodução");
            
            try {
                const fullText = loadPostContent();
                
                if (userPreferences.useApiTTS && apiStatus === 'online') {
                    console.log("🎤 Usando API Python para síntese");
                    // Usar API Python
                    currentAudio = await synthesizeWithApi(
                        fullText,
                        userPreferences.voiceId,
                        200,
                        0.9
                    );
                    
                    if (currentAudio) {
                        currentAudio.currentTime = currentPosition;
                        currentAudio.playbackRate = parseFloat(speedSelector ? speedSelector.value : userPreferences.playbackRate);
                        
                        currentAudio.addEventListener('play', function() {
                            console.log("🎵 Áudio iniciado");
                            startGlobalTimer();
                        });
                        
                        currentAudio.addEventListener('ended', function() {
                            console.log("🏁 Áudio finalizado");
                            resetPlayer();
                        });
                        
                        currentAudio.addEventListener('error', function(e) {
                            console.error("❌ Erro de áudio:", e);
                            displayErrorMessage('Erro na reprodução do áudio. Tentando síntese local...');
                            fallbackToLocalSynthesis(fullText);
                        });
                        
                        await currentAudio.play();
                    }
                } else {
                    console.log("🔊 Usando síntese local (Web Speech API)");
                    // Fallback para síntese local
                    await fallbackToLocalSynthesis(fullText);
                }
                
                isPlaying = true;
                isAudioEnded = false;
                
                if (audioPlayer) {
                    audioPlayer.classList.add('playing');
                }
                
            } catch (error) {
                console.error("❌ Erro na reprodução:", error);
                displayErrorMessage('Erro na síntese de voz. Tentando método alternativo...');
                
                // Fallback para síntese local
                await fallbackToLocalSynthesis(loadPostContent());
            }
        }
    }

    /**
     * Fallback para síntese local usando Web Speech API
     */
    async function fallbackToLocalSynthesis(text) {
        if (!('speechSynthesis' in window)) {
            displayErrorMessage('Seu navegador não suporta síntese de voz.');
            return;
        }
        
        console.log("🔊 Iniciando síntese local");
        speechSynth = window.speechSynthesis;
        
        // Cancelar qualquer síntese anterior
        speechSynth.cancel();
        
        speechUtterance = new SpeechSynthesisUtterance(text);
        
        speechUtterance.lang = userPreferences.language || 'pt-BR';
        speechUtterance.rate = parseFloat(speedSelector ? speedSelector.value : userPreferences.playbackRate);
        
        const voices = speechSynth.getVoices();
        let brVoice = voices.find(voice => voice.lang === 'pt-BR') ||
                     voices.find(voice => voice.lang.includes('pt-BR')) ||
                     voices.find(voice => voice.lang.startsWith('pt'));
        
        if (brVoice) {
            speechUtterance.voice = brVoice;
            console.log(`🎤 Voz local selecionada: ${brVoice.name}`);
        }
        
        // Estimar duração baseada no texto
        const wordsCount = text.split(/\s+/).length;
        const minutesToSpeak = wordsCount / (150 * speechUtterance.rate);
        totalDuration = minutesToSpeak * 60;
        
        speechUtterance.onstart = function() {
            console.log("🎵 Síntese local iniciada");
            startGlobalTimer();
        };
        
        speechUtterance.onend = function() {
            console.log("🏁 Síntese local finalizada");
            resetPlayer();
        };
        
        speechUtterance.onerror = function(event) {
            console.error("❌ Erro de síntese local:", event);
            displayErrorMessage('Ocorreu um erro na síntese de voz.');
            resetPlayer();
        };
        
        speechSynth.speak(speechUtterance);
    }

    /**
     * Parar áudio completamente
     */
    function stopAudio() {
        console.log("⏹️ Parando áudio completamente");
        
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
            currentAudio = null;
        }
        
        if (speechSynth) {
            speechSynth.cancel();
        }
        
        stopGlobalTimer();
        isPlaying = false;
        isAudioEnded = true;
    }

    /**
     * Mudar a velocidade de reprodução
     */
    function changePlaybackSpeed() {
        const selector = speedSelector;
        if (!selector) return;
        
        const newRate = parseFloat(selector.value);
        console.log(`⚡ Alterando velocidade para ${newRate}x`);
        
        if (currentAudio) {
            currentAudio.playbackRate = newRate;
        } else if (speechUtterance && speechSynth) {
            const wasSpeaking = isPlaying;
            
            speechSynth.cancel();
            
            speechUtterance.rate = newRate;
            
            if (wasSpeaking) {
                speechSynth.speak(speechUtterance);
                isPlaying = true;
                
                if (audioPlayer) {
                    audioPlayer.classList.add('playing');
                }
                
                startGlobalTimer();
            }
        }
    }

    /**
     * Definir progresso clicando na barra de progresso
     */
    function setProgress(e) {
        const container = progressContainer;
        if (!container) return;
        
        console.log("🎯 Alterando posição de reprodução");
        
        const rect = container.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        const percentage = Math.max(0, Math.min(1, clickX / width));
        
        const newPosition = percentage * totalDuration;
        
        if (currentAudio) {
            currentAudio.currentTime = newPosition;
            currentPosition = newPosition;
        } else if (speechSynth && speechUtterance) {
            // Para síntese local, reiniciar do começo (limitação da Web Speech API)
            speechSynth.cancel();
            currentPosition = 0;
            
            if (isPlaying) {
                speechSynth.speak(speechUtterance);
                startGlobalTimer();
            }
        }
        
        updateProgressBar();
    }

    /**
     * Iniciar um timer global para atualizar progresso
     */
    function startGlobalTimer() {
        if (globalTimerInterval) {
            clearInterval(globalTimerInterval);
        }
        
        console.log("⏱️ Iniciando timer global");
        
        globalTimerInterval = setInterval(function() {
            if (isPlaying && totalDuration > 0 && !isAudioEnded) {
                if (currentAudio) {
                    currentPosition = currentAudio.currentTime;
                    
                    // Verificar se o áudio terminou
                    if (currentAudio.ended || currentPosition >= totalDuration) {
                        console.log("🏁 Áudio terminou (detectado pelo timer)");
                        resetPlayer();
                        return;
                    }
                } else {
                    currentPosition += 0.1;
                }
                
                if (currentPosition >= totalDuration) {
                    console.log("🏁 Tempo limite atingido");
                    resetPlayer();
                    return;
                }
                
                updateProgressBar();
            }
        }, 100);
    }
    
    /**
     * Parar o timer global
     */
    function stopGlobalTimer() {
        if (globalTimerInterval) {
            clearInterval(globalTimerInterval);
            globalTimerInterval = null;
            console.log("⏹️ Timer global parado");
        }
    }

    /**
     * Atualizar barra de progresso e exibição do timer
     */
    function updateProgressBar() {
        const progressPercentage = totalDuration > 0 ? (currentPosition / totalDuration) * 100 : 0;
        
        if (progressBar) {
            progressBar.style.width = Math.max(0, Math.min(100, progressPercentage)) + '%';
        }
        
        if (timerDisplay) {
            timerDisplay.textContent = formatTime(currentPosition) + ' / ' + formatTime(totalDuration);
        }
    }

    /**
     * Formatar tempo no formato MM:SS
     */
    function formatTime(timeInSeconds) {
        if (!timeInSeconds || isNaN(timeInSeconds)) {
            return '00:00';
        }
        
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        return minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0');
    }

    /**
     * Resetar estado do player quando a reprodução termina
     */
    function resetPlayer() {
        console.log("🔄 Resetando player");
        
        isPlaying = false;
        isAudioEnded = true;
        
        if (audioPlayer) {
            audioPlayer.classList.remove('playing');
        }
        
        stopGlobalTimer();
        currentPosition = 0;
        
        if (currentAudio) {
            currentAudio = null;
        }
        
        updateProgressBar();
        console.log("✅ Player resetado com sucesso");
    }

    /**
     * Exibir mensagem de erro no player
     */
    function displayErrorMessage(message) {
        if (!audioPlayer) return;
        
        console.error("🚨 Exibindo mensagem de erro:", message);
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'wp-audio-articles-error';
        errorDiv.textContent = message;
        
        // Inserir erro temporariamente
        const originalContent = audioPlayer.innerHTML;
        audioPlayer.innerHTML = '';
        audioPlayer.appendChild(errorDiv);
        
        setTimeout(() => {
            audioPlayer.innerHTML = originalContent;
            // Reinicializar eventos
            initAudioPlayer();
        }, 4000);
    }
})();