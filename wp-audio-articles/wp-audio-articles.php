<?php
/**
 * Plugin Name: WP Audio Articles
 * Plugin URI: https://tocanteen.com.br/
 * Description: Converts post content to audio with a Brazilian Portuguese text-to-speech player.
 * Version: 1.2.38
 * Author: Carlos Andre Rocha Miranda
 * Author URI: https://tocanteen.com.br/
 * Text Domain: wp-audio-articles
 * Domain Path: /languages
 * License: GPL-2.0+
 * License URI: http://www.gnu.org/licenses/gpl-2.0.txt
 */

// If this file is called directly, abort.
if (!defined('WPINC')) {
    die;
}

// Define plugin constants
define('WP_AUDIO_ARTICLES_VERSION', '1.2.38');
define('WP_AUDIO_ARTICLES_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('WP_AUDIO_ARTICLES_PLUGIN_URL', plugin_dir_url(__FILE__));
define('WP_AUDIO_ARTICLES_PLUGIN_FILE', __FILE__);

// Include the main plugin class
require_once WP_AUDIO_ARTICLES_PLUGIN_DIR . 'includes/class-wp-audio-articles.php';

// Begin execution of the plugin
function run_wp_audio_articles() {
    $plugin = new WP_Audio_Articles();
    $plugin->run();
}
run_wp_audio_articles();

// Load plugin textdomain
function wp_audio_articles_load_textdomain() {
    load_plugin_textdomain('wp-audio-articles', false, dirname(plugin_basename(__FILE__)) . '/languages');
}
add_action('plugins_loaded', 'wp_audio_articles_load_textdomain');

// Manipular ativação do plugin
register_activation_hook(__FILE__, 'wp_audio_articles_activate');

function wp_audio_articles_activate() {
    // Limpar informações de cache
    if (class_exists('WP_Audio_Articles')) {
        $plugin = new WP_Audio_Articles();
        $plugin->clear_plugin_cache();
    }
    
    // Criar flag de ativação recente
    set_transient('wp_audio_articles_activated', true, 30);
}

// Adicionar notificação após ativação
add_action('admin_notices', 'wp_audio_articles_activation_notice');

function wp_audio_articles_activation_notice() {
    // Verificar se o plugin foi ativado recentemente
    if (get_transient('wp_audio_articles_activated')) {
        ?>
        <div class="notice notice-success is-dismissible">
            <p><?php _e('WP Audio Articles has been activated. The cache has been cleared to ensure all updates are visible.', 'wp-audio-articles'); ?></p>
        </div>
        <?php
        // Remover o transiente para que a notificação não seja exibida novamente
        delete_transient('wp_audio_articles_activated');
    }
}

// Hook para salvar o conteúdo do post na API
add_action('save_post', 'wp_audio_articles_save_post_content', 10, 3);

function wp_audio_articles_save_post_content($post_id, $post, $update) {
    // Verificar se é uma atualização de post válida
    if (wp_is_post_revision($post_id) || wp_is_post_autosave($post_id)) {
        return;
    }
    
    // Verificar se é um post público
    if ($post->post_status !== 'publish' || $post->post_type !== 'post') {
        return;
    }
    
    // Limpar o cache específico para este post
    delete_transient('wp_audio_articles_post_' . $post_id);
}
