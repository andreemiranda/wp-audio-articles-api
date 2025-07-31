=== WP Audio Articles ===
Contributors: carlosmiranda
Donate link: https://tocanteen.com.br/
Tags: audio, tts, accessibility, text-to-speech, portuguese, brazilian
Requires at least: 5.0
Tested up to: 6.5
Stable tag: 1.2.41
Requires PHP: 7.2
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html

Converte conteúdo de artigos em áudio utilizando tecnologia de síntese de voz em Português Brasileiro, com funcionalidades avançadas de reprodução.

== Description ==

O WP Audio Articles é um plugin para WordPress que melhora a acessibilidade do seu site convertendo automaticamente os artigos de blog em áudio usando tecnologia de texto para fala (TTS) em Português Brasileiro. 

Este plugin oferece uma experiência de usuário completa, permitindo que os visitantes do site ouçam o conteúdo dos artigos sem interrupções, mesmo ao navegar entre diferentes páginas.

= Características Principais =

* **Síntese de voz em Português Brasileiro**: Detecta e utiliza automaticamente vozes disponíveis em português brasileiro.
* **Player de áudio completo**: Interface intuitiva com controles de play/pause, barra de progresso e seletor de velocidade.
* **Reprodução contínua entre páginas**: Continue ouvindo o artigo enquanto navega pelo site com o player flutuante.
* **Layout responsivo**: Experiência otimizada tanto em desktops quanto em dispositivos móveis.
* **Preferências do usuário**: Configurações personalizáveis para velocidade de reprodução e comportamento do player.
* **Desempenho otimizado**: Processamento em chunks para prevenir cortes na reprodução de textos longos.

= Funcionalidades Técnicas =

* Utiliza a Web Speech API para síntese de voz diretamente no navegador do usuário
* Implementa detecção avançada de vozes em português brasileiro
* Sistema de persistência para navegação entre páginas sem interrupções
* Armazenamento local de preferências do usuário
* Mecanismo de keep-alive para evitar que a síntese de voz seja interrompida

== Installation ==

1. Faça o upload do plugin para o diretório `/wp-content/plugins/`, ou instale diretamente pela área de Plugins do WordPress.
2. Ative o plugin através do menu 'Plugins' no WordPress.
3. O player de áudio será automaticamente adicionado aos seus posts.

== Frequently Asked Questions ==

= O plugin funciona em qualquer navegador? =

O plugin utiliza a Web Speech API, que é suportada pela maioria dos navegadores modernos (Chrome, Edge, Firefox, Safari). No entanto, a qualidade e disponibilidade das vozes em português brasileiro pode variar dependendo do navegador e sistema operacional.

= É necessário alguma configuração adicional? =

Não, o plugin funciona automaticamente após a instalação. O player de áudio será adicionado a todos os posts, e qualquer configuração pode ser ajustada pelo usuário diretamente no player.

= O plugin afeta o desempenho do site? =

Não, a síntese de voz acontece no lado do cliente (navegador do usuário), não no servidor. Isso significa que não há impacto significativo no desempenho do seu site.

== Screenshots ==

1. Player de áudio em desktop
2. Player de áudio em dispositivos móveis
3. Player flutuante durante navegação
4. Menu de configurações

== Changelog ==

= 1.2.39 =
* Reorganizado o sistema de preferências para um menu dropdown mais intuitivo
* Melhorado o layout do player flutuante para maior consistência
* Corrigidos problemas de compatibilidade com temas

= 1.2.38 =
* Implementada reprodução persistente de áudio entre páginas
* Adicionado sistema de preferências do usuário
* Corrigido layout para dispositivos móveis

= 1.2.0 =
* Adicionado suporte para detecção melhorada de vozes em português brasileiro
* Implementado sistema de processamento em chunks para prevenir cortes na reprodução
* Adicionado mecanismo de keep-alive para manter a síntese de voz ativa

= 1.0.0 =
* Versão inicial

== Upgrade Notice ==

= 1.2.39 =
Esta atualização traz melhorias significativas na usabilidade, com um novo sistema de preferências e melhoras no layout do player flutuante.

= 1.2.38 =
Atualização recomendada! Adiciona a funcionalidade de reprodução persistente entre páginas e preferências do usuário.

