<?php
/**
 * The main plugin class
 *
 * @since      1.0.0
 * @package    WP_Audio_Articles
 */

class WP_Audio_Articles {

    /**
     * Initialize the plugin
     */
    public function run() {
        // Register hooks
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_filter('the_content', array($this, 'add_audio_player_to_content'));
        add_action('wp_ajax_get_post_content_for_audio', array($this, 'get_post_content_for_audio'));
        add_action('wp_ajax_nopriv_get_post_content_for_audio', array($this, 'get_post_content_for_audio'));

        // Após ativação do plugin
        register_activation_hook(WP_AUDIO_ARTICLES_PLUGIN_FILE, array($this, 'plugin_activation'));

        // Admin actions
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'admin_init'));
        add_action('admin_enqueue_scripts', array($this, 'admin_enqueue_scripts'));
        add_action('wp_ajax_save_wp_audio_articles_config', array($this, 'save_configuration'));

        // Add theme colors
        add_action('wp_enqueue_scripts', array($this, 'add_theme_colors'));
    }

    /**
     * Ações realizadas na ativação do plugin
     */
    public function plugin_activation() {
        // Forçar atualização de informações de cache
        $this->clear_plugin_cache();
    }

    /**
     * Limpar cache do plugin
     */
    public function clear_plugin_cache() {
        // Limpar cache de objetos
        wp_cache_flush();

        // Limpar cache de transients
        global $wpdb;
        $wpdb->query("DELETE FROM $wpdb->options WHERE option_name LIKE '%_transient_%'");

        // Regenerar informações de recursos
        if (function_exists('wp_clean_plugins_cache')) {
            wp_clean_plugins_cache(false);
        }

        // Atualizar opções de versão
        update_option('wp_audio_articles_version', WP_AUDIO_ARTICLES_VERSION);
    }

    /**
     * Enqueue scripts and styles
     */
    public function enqueue_scripts() {
        // Only enqueue on single posts
        if (is_single()) {
            // Adicionar versão única para evitar cache
            $version = WP_AUDIO_ARTICLES_VERSION . '.' . time();

            wp_enqueue_style(
                'wp-audio-articles-css',
                WP_AUDIO_ARTICLES_PLUGIN_URL . 'assets/css/audio-player.css',
                array(),
                $version
            );

            wp_enqueue_script(
                'wp-audio-articles-js',
                WP_AUDIO_ARTICLES_PLUGIN_URL . 'assets/js/audio-player.js',
                array(),
                $version,
                true
            );

            // Configurações da API Python
            $api_url = defined('WP_AUDIO_ARTICLES_API_URL') ? WP_AUDIO_ARTICLES_API_URL : get_option('wp_audio_articles_api_url', '');
            $api_key = defined('WP_AUDIO_ARTICLES_API_KEY') ? WP_AUDIO_ARTICLES_API_KEY : get_option('wp_audio_articles_api_key', '');

            // Pass data to JavaScript
            wp_localize_script(
                'wp-audio-articles-js',
                'wpAudioArticles',
                array(
                    'ajaxurl' => admin_url('admin-ajax.php'),
                    'post_id' => get_the_ID(),
                    'nonce' => wp_create_nonce('wp_audio_articles_nonce'),
                    'language' => 'pt-BR',
                    'version' => $version,
                    'api_url' => $api_url,
                    'api_key' => $api_key
                )
            );
        }
    }

    /**
     * Add audio player to post content
     *
     * @param string $content Post content
     * @return string Modified content with audio player
     */
    public function add_audio_player_to_content($content) {
        // Only add to single post content
        if (!is_single()) {
            return $content;
        }

        $post = get_post();

        if (!$post) {
            return $content;
        }

        $author_name = get_the_author_meta('display_name', $post->post_author);
        $post_date = get_the_date('', $post->ID);

        // Create data attributes for the player
        $data_attrs = 'data-title="' . esc_attr($post->post_title) . '"';
        $data_attrs .= ' data-author="' . esc_attr($author_name) . '"';
        $data_attrs .= ' data-date="' . esc_attr($post_date) . '"';
        $data_attrs .= ' data-post-id="' . esc_attr($post->ID) . '"';
        $data_attrs .= ' data-version="' . esc_attr(WP_AUDIO_ARTICLES_VERSION) . '"';

        // Audio player HTML
        $player = '<div class="wp-audio-articles-player" ' . $data_attrs . '>';
        $player .= '  <div class="wp-audio-articles-first-row">';
        $player .= '    <button class="wp-audio-articles-play-button" aria-label="' . esc_attr__('Play audio', 'wp-audio-articles') . '">';
        $player .= '      <span class="play-icon">▶</span>';
        $player .= '      <span class="pause-icon">⏸</span>';
        $player .= '    </button>';
        $player .= '    <div class="wp-audio-articles-timer">00:00</div>';
        $player .= '  </div>';

        $player .= '  <div class="wp-audio-articles-progress-container">';
        $player .= '    <div class="wp-audio-articles-progress-bar"></div>';
        $player .= '  </div>';

        $player .= '  <div class="wp-audio-articles-speed-container">';
        $player .= '    <select class="wp-audio-articles-speed-selector">';
        $player .= '      <option value="0.25">0.25x</option>';
        $player .= '      <option value="0.5">0.5x</option>';
        $player .= '      <option value="0.75">0.75x</option>';
        $player .= '      <option value="1" selected>1x</option>';
        $player .= '      <option value="1.25">1.25x</option>';
        $player .= '      <option value="1.5">1.5x</option>';
        $player .= '      <option value="1.75">1.75x</option>';
        $player .= '      <option value="2">2x</option>';
        $player .= '    </select>';
        $player .= '    <select class="wp-audio-articles-voice-selector" style="display:none;">';
        $player .= '      <option value="0">Feminino 1</option>';
        $player .= '      <option value="1">Feminino 2</option>';
        $player .= '      <option value="2">Masculino 1</option>';
        $player .= '      <option value="3">Masculino 2</option>';
        $player .= '    </select>';
        $player .= '  </div>';
        $player .= '  <div class="wp-audio-articles-api-status" title="Status da API"></div>';
        $player .= '</div>';

        // Add player at the beginning of the content
        return $player . $content;
    }

    /**
     * AJAX handler to get post content for audio
     */
    public function get_post_content_for_audio() {
        // Check nonce
        if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'wp_audio_articles_nonce')) {
            wp_send_json_error(array('message' => 'Security check failed'));
        }

        // Get post ID
        $post_id = isset($_POST['post_id']) ? intval($_POST['post_id']) : 0;

        if (!$post_id) {
            wp_send_json_error(array('message' => 'Invalid post ID'));
        }

        // Get post data
        $post = get_post($post_id);

        if (!$post) {
            wp_send_json_error(array('message' => 'Post not found'));
        }

        // Get post information
        $title = $post->post_title;
        $author = get_the_author_meta('display_name', $post->post_author);
        $date = get_the_date('', $post->ID);

        // Get the post content and strip HTML tags
        $content = strip_tags($post->post_content);

        // Create the text to be spoken
        $text_to_speak = sprintf(
            '%s. %s. %s. %s',
            $title,
            __('By', 'wp-audio-articles') . ' ' . $author,
            __('Published on', 'wp-audio-articles') . ' ' . $date,
            $content
        );

        wp_send_json_success(array(
            'text' => $text_to_speak,
            'title' => $title,
            'author' => $author,
            'date' => $date,
            'post_id' => $post_id
        ));
    }

    /**
     * Adicionar cores do tema
     */
    public function add_theme_colors() {
        // Obter cores do tema atual
        $primary_color = get_theme_mod('primary_color', '#0073aa');
        $bg_color = get_theme_mod('background_color', '#ffffff');

        // Se background_color retornar apenas o hex sem #
        if ($bg_color && substr($bg_color, 0, 1) !== '#') {
            $bg_color = '#' . $bg_color;
        }

        // Cores personalizadas CSS
        $custom_css = "
        :root {
            --wp-audio-primary: {$primary_color};
            --wp-audio-primary-hover: " . $this->darken_color($primary_color, 20) . ";
            --wp-audio-primary-shadow: " . $this->hex_to_rgba($primary_color, 0.3) . ";
            --wp-audio-bg: {$bg_color};
            --wp-audio-border: " . $this->lighten_color($primary_color, 40) . ";
            --wp-audio-progress-bg: " . $this->lighten_color($primary_color, 50) . ";
            --wp-audio-shadow: " . $this->hex_to_rgba($primary_color, 0.1) . ";
        }
        ";

        wp_add_inline_style('wp-audio-articles-css', $custom_css);
    }

    /**
     * Escurecer cor
     */
    private function darken_color($color, $percent) {
        $color = ltrim($color, '#');
        $rgb = array_map('hexdec', str_split($color, 2));

        foreach ($rgb as &$value) {
            $value = max(0, min(255, $value - ($value * $percent / 100)));
        }

        return '#' . implode('', array_map(function($val) {
            return str_pad(dechex($val), 2, '0', STR_PAD_LEFT);
        }, $rgb));
    }

    /**
     * Clarear cor
     */
    private function lighten_color($color, $percent) {
        $color = ltrim($color, '#');
        $rgb = array_map('hexdec', str_split($color, 2));

        foreach ($rgb as &$value) {
            $value = max(0, min(255, $value + ((255 - $value) * $percent / 100)));
        }

        return '#' . implode('', array_map(function($val) {
            return str_pad(dechex($val), 2, '0', STR_PAD_LEFT);
        }, $rgb));
    }

    /**
     * Converter hex para rgba
     */
    private function hex_to_rgba($color, $alpha) {
        $color = ltrim($color, '#');
        $rgb = array_map('hexdec', str_split($color, 2));
        return 'rgba(' . implode(', ', $rgb) . ', ' . $alpha . ')';
    }

    /**
     * Adicionar menu de administração
     */
    public function add_admin_menu() {
        add_options_page(
            'WP Audio Articles',
            'Audio Articles',
            'manage_options',
            'wp-audio-articles',
            array($this, 'admin_page')
        );
    }

    /**
     * Inicializar configurações do admin
     */
    public function admin_init() {
        register_setting('wp_audio_articles_settings', 'wp_audio_articles_api_url');
        register_setting('wp_audio_articles_settings', 'wp_audio_articles_api_key');
        register_setting('wp_audio_articles_settings', 'wp_audio_articles_auto_config');
    }

    /**
     * Enqueue scripts do admin
     */
    public function admin_enqueue_scripts($hook) {
        if ($hook !== 'settings_page_wp-audio-articles') {
            return;
        }

        wp_enqueue_script('jquery');
        wp_enqueue_script(
            'wp-audio-articles-admin',
            WP_AUDIO_ARTICLES_PLUGIN_URL . 'assets/js/admin.js',
            array('jquery'),
            WP_AUDIO_ARTICLES_VERSION,
            true
        );

        wp_localize_script('wp-audio-articles-admin', 'wpAudioAdmin', array(
            'ajaxurl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('wp_audio_articles_config'),
            'wp_config_path' => ABSPATH . 'wp-config.php'
        ));
    }

    /**
     * Página de configuração
     */
    public function admin_page() {
        $api_url = get_option('wp_audio_articles_api_url', '');
        $api_key = get_option('wp_audio_articles_api_key', '');
        $auto_config = get_option('wp_audio_articles_auto_config', '1');
        
        // Verificar se as constantes estão definidas
        $using_constants = defined('WP_AUDIO_ARTICLES_API_URL') && defined('WP_AUDIO_ARTICLES_API_KEY');
        
        ?>
        <div class="wrap" style="background: white; padding: 20px; border: 2px solid #0073aa; border-radius: 8px; margin-top: 20px;">
            <h1 style="color: #0073aa; border-bottom: 2px solid #0073aa; padding-bottom: 10px;">
                🎵 Configurações do WP Audio Articles
            </h1>

            <div id="wp-audio-articles-status" style="margin: 20px 0;"></div>
            
            <?php if ($using_constants): ?>
            <div style="background: #d1ecf1; color: #0c5460; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                <h4 style="margin-top: 0;">ℹ️ Configuração via wp-config.php</h4>
                <p>As configurações estão sendo carregadas do arquivo wp-config.php:</p>
                <ul>
                    <li><strong>URL da API:</strong> <?php echo esc_html(WP_AUDIO_ARTICLES_API_URL); ?></li>
                    <li><strong>Chave da API:</strong> <?php echo esc_html(substr(WP_AUDIO_ARTICLES_API_KEY, 0, 10) . '...'); ?></li>
                </ul>
            </div>
            <?php endif; ?>

            <form method="post" action="options.php" id="wp-audio-articles-form">
                <?php settings_fields('wp_audio_articles_settings'); ?>
                <?php do_settings_sections('wp_audio_articles_settings'); ?>

                <table class="form-table" style="background: white;">
                    <tr>
                        <th scope="row" style="color: #333;">
                            <label for="wp_audio_articles_api_url">URL da API Python</label>
                        </th>
                        <td>
                            <input type="url" 
                                   id="wp_audio_articles_api_url" 
                                   name="wp_audio_articles_api_url" 
                                   value="<?php echo esc_attr($using_constants ? WP_AUDIO_ARTICLES_API_URL : $api_url); ?>" 
                                   class="regular-text" 
                                   placeholder="https://seu-projeto.onrender.com/api"
                                   <?php echo $using_constants ? 'readonly' : ''; ?>
                                   style="border: 1px solid #ccc; border-radius: 4px; padding: 8px;" />
                            <p class="description" style="color: #666;">
                                URL completa da sua API Python no Render.com (ex: https://seu-projeto.onrender.com/api)
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <th scope="row" style="color: #333;">
                            <label for="wp_audio_articles_api_key">Chave da API</label>
                        </th>
                        <td>
                            <input type="text" 
                                   id="wp_audio_articles_api_key" 
                                   name="wp_audio_articles_api_key" 
                                   value="<?php echo esc_attr($using_constants ? WP_AUDIO_ARTICLES_API_KEY : $api_key); ?>" 
                                   class="regular-text" 
                                   placeholder="wp_audio_articles_api_key_2024_render"
                                   <?php echo $using_constants ? 'readonly' : ''; ?>
                                   style="border: 1px solid #ccc; border-radius: 4px; padding: 8px;" />
                            <p class="description" style="color: #666;">
                                Chave de autenticação para acessar a API Python
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <th scope="row" style="color: #333;">
                            <label for="wp_audio_articles_auto_config">Configuração Automática</label>
                        </th>
                        <td>
                            <label>
                                <input type="checkbox" 
                                       id="wp_audio_articles_auto_config" 
                                       name="wp_audio_articles_auto_config" 
                                       value="1" 
                                       <?php checked($auto_config, '1'); ?>
                                       <?php echo $using_constants ? 'disabled' : ''; ?> />
                                Inserir automaticamente as configurações no wp-config.php
                            </label>
                            <p class="description" style="color: #666;">
                                <?php if ($using_constants): ?>
                                    <em>Desabilitado - configurações já estão no wp-config.php</em>
                                <?php else: ?>
                                    Se habilitado, as configurações serão automaticamente adicionadas ao arquivo wp-config.php
                                <?php endif; ?>
                            </p>
                        </td>
                    </tr>
                </table>

                <div style="margin-top: 20px;">
                    <?php if (!$using_constants): ?>
                        <?php submit_button('Salvar Configurações', 'primary', 'submit', true, array('style' => 'background: #0073aa; border-color: #0073aa;')); ?>
                    <?php endif; ?>
                    <button type="button" id="test-api-connection" class="button button-secondary" style="margin-left: 10px;">
                        Testar Conexão
                    </button>
                </div>
            </form>

            <div id="api-test-result" style="margin-top: 20px;"></div>

            <?php if (!$using_constants): ?>
            <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px;">
                <h3 style="color: #0073aa; margin-top: 0;">📋 Configuração Manual (se necessário)</h3>
                <p>Se a configuração automática estiver desabilitada, adicione as seguintes linhas ao seu arquivo <code>wp-config.php</code>:</p>
                <pre style="background: #282c34; color: #61dafb; padding: 15px; border-radius: 4px; overflow-x: auto;"><code id="manual-config-code">// WP Audio Articles Configuration
define('WP_AUDIO_ARTICLES_API_URL', '<?php echo esc_js($api_url ?: "https://seu-projeto.onrender.com/api"); ?>');
define('WP_AUDIO_ARTICLES_API_KEY', '<?php echo esc_js($api_key ?: "sua-chave-api"); ?>');</code></pre>
                <button type="button" id="copy-config" class="button button-small">Copiar Código</button>
            </div>
            <?php endif; ?>

            <div style="margin-top: 30px; padding: 20px; background: #e7f3ff; border: 1px solid #0073aa; border-radius: 4px;">
                <h4 style="margin-top: 0; color: #0073aa;">ℹ️ Informações</h4>
                <ul style="margin-bottom: 0;">
                    <li>Configure sua API Python no Render.com antes de usar este plugin</li>
                    <li>A URL da API deve terminar com <code>/api</code></li>
                    <li>Use uma chave de API forte para segurança</li>
                    <li>O plugin funciona com fallback local se a API estiver offline</li>
                    <li>Para melhor performance, use o plano pago do Render.com</li>
                </ul>
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107;">
                <h4 style="margin-top: 0; color: #856404;">🚀 Deploy no Render.com</h4>
                <ol style="margin-bottom: 0;">
                    <li>Crie um repositório no GitHub com os arquivos da API Python</li>
                    <li>Conecte o repositório no <a href="https://render.com" target="_blank">Render.com</a></li>
                    <li>Configure as variáveis de ambiente (WP_AUDIO_API_KEY, etc.)</li>
                    <li>Faça o deploy e copie a URL gerada</li>
                    <li>Configure a URL aqui no plugin (adicione /api no final)</li>
                </ol>
            </div>
        </div>
        <?php
    }

    /**
     * Salvar configuração via AJAX
     */
    public function save_configuration() {
        if (!wp_verify_nonce($_POST['nonce'], 'wp_audio_articles_config')) {
            wp_send_json_error('Nonce inválido');
        }

        if (!current_user_can('manage_options')) {
            wp_send_json_error('Permissões insuficientes');
        }

        $api_url = sanitize_url($_POST['api_url']);
        $api_key = sanitize_text_field($_POST['api_key']);
        $auto_config = isset($_POST['auto_config']) ? '1' : '0';

        // Salvar opções
        update_option('wp_audio_articles_api_url', $api_url);
        update_option('wp_audio_articles_api_key', $api_key);
        update_option('wp_audio_articles_auto_config', $auto_config);

        // Se configuração automática estiver habilitada, atualizar wp-config.php
        if ($auto_config === '1') {
            $this->update_wp_config($api_url, $api_key);
        }

        wp_send_json_success('Configurações salvas com sucesso!');
    }

    /**
     * Atualizar wp-config.php automaticamente
     */
    private function update_wp_config($api_url, $api_key) {
        $wp_config_path = ABSPATH . 'wp-config.php';

        if (!file_exists($wp_config_path) || !is_writable($wp_config_path)) {
            return false;
        }

        $wp_config_content = file_get_contents($wp_config_path);

        // Remover configurações antigas se existirem
        $wp_config_content = preg_replace(
            '/\/\*\s*WP Audio Articles Configuration\s*\*\/.*?\/\*\s*End WP Audio Articles Configuration\s*\*\//s',
            '',
            $wp_config_content
        );

        // Adicionar novas configurações
        $config_block = "\n/* WP Audio Articles Configuration */\n";
        $config_block .= "define('WP_AUDIO_ARTICLES_API_URL', '" . addslashes($api_url) . "');\n";
        $config_block .= "define('WP_AUDIO_ARTICLES_API_KEY', '" . addslashes($api_key) . "');\n";
        $config_block .= "/* End WP Audio Articles Configuration */\n";

        // Inserir antes de "/* That's all, stop editing! */"
        $wp_config_content = str_replace(
            "/* That's all, stop editing!",
            $config_block . "/* That's all, stop editing!",
            $wp_config_content
        );

        return file_put_contents($wp_config_path, $wp_config_content);
    }
}