document.addEventListener("DOMContentLoaded", () => {
    // Configuração do tempo mínimo do preloader (em milissegundos)
    const PRELOADER_MIN_TIME = 2500; // Tempo aumentado para apreciar a logo
    
    const preloader = document.getElementById('preloader');
    const mainContent = document.querySelector('.linkpage-container') || document.querySelector('.content-container');
    
    if(!preloader) return; // Se não houver preloader, ignora

    const startTime = Date.now();

    window.addEventListener('load', () => {
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, PRELOADER_MIN_TIME - elapsedTime);

        setTimeout(() => {
            // Ocultar preloader com transição suave
            preloader.style.opacity = '0';
            preloader.style.visibility = 'hidden';
            
            // Mostrar conteúdo principal
            if(mainContent) {
                mainContent.style.display = 'flex';
            }
            
            // Remover o preloader do DOM após a transição
            setTimeout(() => {
                preloader.remove();
            }, 1500); // Aguarda a transição longa do old money
        }, remainingTime);
    });
});
