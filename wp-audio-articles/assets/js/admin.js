
/**
 * JavaScript para página de configuração do WP Audio Articles
 */
jQuery(document).ready(function($) {
    
    // Testar conexão com API
    $('#test-api-connection').on('click', function() {
        const $button = $(this);
        const $result = $('#api-test-result');
        const apiUrl = $('#wp_audio_articles_api_url').val();
        const apiKey = $('#wp_audio_articles_api_key').val();
        
        if (!apiUrl || !apiKey) {
            $result.html('<div style="background: #ffebee; color: #c62828; padding: 10px; border-radius: 4px;">❌ Por favor, preencha a URL da API e a chave antes de testar.</div>');
            return;
        }
        
        $button.prop('disabled', true).text('Testando...');
        $result.html('<div style="background: #fff3cd; color: #856404; padding: 10px; border-radius: 4px;">🔄 Testando conexão com a API...</div>');
        
        // Testar endpoint básico
        $.ajax({
            url: apiUrl.replace('/api', '') + '/',
            method: 'GET',
            timeout: 10000,
            headers: {
                'X-API-Key': apiKey
            }
        }).done(function(response) {
            if (response && (response.service || response.status)) {
                $result.html('<div style="background: #d4edda; color: #155724; padding: 10px; border-radius: 4px;">✅ Conexão com a API estabelecida com sucesso!</div>');
                
                // Testar endpoint de vozes
                testVoicesEndpoint(apiUrl, apiKey, $result);
            } else {
                $result.html('<div style="background: #f8d7da; color: #721c24; padding: 10px; border-radius: 4px;">⚠️ API respondeu, mas formato inesperado.</div>');
            }
        }).fail(function(xhr, status, error) {
            let errorMsg = 'Erro desconhecido';
            
            if (status === 'timeout') {
                errorMsg = 'Timeout - API não respondeu a tempo';
            } else if (xhr.status === 404) {
                errorMsg = 'API não encontrada (404)';
            } else if (xhr.status === 401) {
                errorMsg = 'Chave de API inválida (401)';
            } else if (xhr.status === 0) {
                errorMsg = 'Não foi possível conectar - verifique a URL';
            } else {
                errorMsg = `HTTP ${xhr.status}: ${error}`;
            }
            
            $result.html(`<div style="background: #f8d7da; color: #721c24; padding: 10px; border-radius: 4px;">❌ Falha na conexão: ${errorMsg}</div>`);
        }).always(function() {
            $button.prop('disabled', false).text('Testar Conexão');
        });
    });
    
    // Testar endpoint de vozes
    function testVoicesEndpoint(apiUrl, apiKey, $result) {
        $.ajax({
            url: apiUrl + '/voices',
            method: 'GET',
            timeout: 5000,
            headers: {
                'X-API-Key': apiKey
            }
        }).done(function(response) {
            if (response && response.voices) {
                const voiceCount = response.voices.length;
                $result.append(`<div style="background: #d1ecf1; color: #0c5460; padding: 10px; border-radius: 4px; margin-top: 10px;">🔊 Encontradas ${voiceCount} vozes disponíveis na API.</div>`);
            }
        }).fail(function() {
            $result.append('<div style="background: #fff3cd; color: #856404; padding: 10px; border-radius: 4px; margin-top: 10px;">⚠️ Endpoint básico OK, mas endpoint de vozes não acessível.</div>');
        });
    }
    
    // Copiar código de configuração
    $('#copy-config').on('click', function() {
        const $code = $('#manual-config-code');
        const textArea = document.createElement('textarea');
        textArea.value = $code.text();
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        $(this).text('Copiado!').prop('disabled', true);
        setTimeout(() => {
            $(this).text('Copiar Código').prop('disabled', false);
        }, 2000);
    });
    
    // Atualizar código manual quando campos mudarem
    $('#wp_audio_articles_api_url, #wp_audio_articles_api_key').on('input', function() {
        const apiUrl = $('#wp_audio_articles_api_url').val() || 'https://seu-projeto.replit.dev/api';
        const apiKey = $('#wp_audio_articles_api_key').val() || 'sua-chave-api';
        
        const code = `// WP Audio Articles Configuration
define('WP_AUDIO_ARTICLES_API_URL', '${apiUrl}');
define('WP_AUDIO_ARTICLES_API_KEY', '${apiKey}');`;
        
        $('#manual-config-code').text(code);
    });
    
    // Interceptar formulário para configuração automática
    $('#wp-audio-articles-form').on('submit', function(e) {
        const autoConfig = $('#wp_audio_articles_auto_config').is(':checked');
        
        if (autoConfig) {
            e.preventDefault();
            
            const formData = {
                action: 'wp_audio_articles_save_config',
                nonce: wpAudioAdmin.nonce,
                api_url: $('#wp_audio_articles_api_url').val(),
                api_key: $('#wp_audio_articles_api_key').val(),
                auto_config: autoConfig ? '1' : '0'
            };
            
            $.post(wpAudioAdmin.ajaxurl, formData)
                .done(function(response) {
                    if (response.success) {
                        $('#wp-audio-articles-status').html('<div class="notice notice-success"><p>✅ ' + response.data + '</p></div>');
                        
                        // Salvar via formulário normal também
                        setTimeout(() => {
                            $('#wp-audio-articles-form')[0].submit();
                        }, 1000);
                    } else {
                        $('#wp-audio-articles-status').html('<div class="notice notice-error"><p>❌ Erro: ' + response.data + '</p></div>');
                    }
                })
                .fail(function() {
                    $('#wp-audio-articles-status').html('<div class="notice notice-error"><p>❌ Erro na comunicação com o servidor.</p></div>');
                });
        }
    });
    
    // Mostrar status inicial
    const currentApiUrl = $('#wp_audio_articles_api_url').val();
    const currentApiKey = $('#wp_audio_articles_api_key').val();
    
    if (currentApiUrl && currentApiKey) {
        $('#wp-audio-articles-status').html('<div style="background: #d1ecf1; color: #0c5460; padding: 10px; border-radius: 4px;">ℹ️ Configuração encontrada. Teste a conexão para verificar se está funcionando.</div>');
    } else {
        $('#wp-audio-articles-status').html('<div style="background: #fff3cd; color: #856404; padding: 10px; border-radius: 4px;">⚠️ Configure a URL da API e a chave para começar a usar o plugin.</div>');
    }
});
