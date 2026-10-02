document.addEventListener("DOMContentLoaded", () => {
    // Configuração do tempo mínimo do preloader (em milissegundos)
    // Isso garante que a animação seja vista, mesmo em conexões rápidas.
    const PRELOADER_MIN_TIME = 2000;
    
    const preloader = document.getElementById('preloader');
    const mainContent = document.querySelector('.linkpage-container');
    
    const startTime = Date.now();

    window.addEventListener('load', () => {
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, PRELOADER_MIN_TIME - elapsedTime);

        setTimeout(() => {
            // Ocultar preloader
            preloader.style.opacity = '0';
            preloader.style.visibility = 'hidden';
            
            // Mostrar conteúdo principal
            mainContent.style.display = 'flex';
            
            // Remover o preloader do DOM após a transição
            setTimeout(() => {
                preloader.remove();
            }, 800);
        }, remainingTime);
    });
});
