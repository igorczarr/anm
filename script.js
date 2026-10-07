document.addEventListener("DOMContentLoaded", () => {
    // Configuração do tempo mínimo do preloader (em milissegundos)
    const PRELOADER_MIN_TIME = 3500; // Tempo ajustado para exibir a animação completa de desenho do SVG
    
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

// Countdown Logic para os Palestrantes Ocultos
document.addEventListener("DOMContentLoaded", () => {
    const countdownElements = document.querySelectorAll('.countdown');
    
    if (countdownElements.length > 0) {
        // Pega a data do evento (ex: "Nov 17, 2026 19:00:00")
        const eventDateString = countdownElements[0].getAttribute('data-date');
        if (!eventDateString) return;

        const eventDate = new Date(eventDateString).getTime();

        const updateCountdown = () => {
            const now = new Date().getTime();
            const distance = eventDate - now;

            if (distance < 0) {
                countdownElements.forEach(el => {
                    if(!el.closest('.secret-card')) {
                        el.innerHTML = "REVELADO!";
                        el.style.color = "var(--text-primary)";
                        el.style.borderColor = "var(--text-primary)";
                    }
                });
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            const countdownText = `${days}D ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            countdownElements.forEach(el => {
                // Se for o card secreto, mantém o texto de mistério, senão mostra contagem
                if(!el.closest('.secret-card')) {
                    el.innerHTML = countdownText;
                }
            });
        };

        updateCountdown(); // Call immediately
        setInterval(updateCountdown, 1000); // Update every second
    }
});
