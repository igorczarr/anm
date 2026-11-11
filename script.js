/**
 * A NOVA MOEDA — INTERACTIVE ENGINE v3.0
 * Preloader ágil, Theme Switcher (Dark/Light), Spotlight Cards,
 * Simulador Mobile da Arena em Tempo Real e Cronograma Interativo Oficial.
 */

document.addEventListener("DOMContentLoaded", () => {
    // 1. PRELOADER RÁPIDO E FLUIDO (650ms)
    const PRELOADER_MIN_TIME = 650;
    const preloader = document.getElementById("preloader");
    const mainContent =
        document.querySelector(".linkpage-container") ||
        document.querySelector(".content-container");

    const startTime = Date.now();

    const hidePreloader = () => {
        if (!preloader) return;
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, PRELOADER_MIN_TIME - elapsedTime);

        setTimeout(() => {
            preloader.style.opacity = "0";
            preloader.style.visibility = "hidden";
            if (mainContent) {
                mainContent.style.display = "flex";
            }
            setTimeout(() => {
                preloader.remove();
            }, 650);
        }, remainingTime);
    };

    if (document.readyState === "complete") {
        hidePreloader();
    } else {
        window.addEventListener("load", hidePreloader);
        setTimeout(hidePreloader, 1500); // Fallback de segurança
    }

    // 2. THEME SWITCHER (SINCRONIZADO COM O PADRÃO TALENT HUB)
    const savedTheme = localStorage.getItem("anm-theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);

    const themeButtons = document.querySelectorAll("[data-theme-toggle]");
    const updateThemeIcons = (theme) => {
        themeButtons.forEach((btn) => {
            btn.setAttribute(
                "title",
                theme === "dark" ? "Mudar para Modo Claro (Talent Hub)" : "Mudar para Modo Escuro (Arena)"
            );
            btn.innerHTML =
                theme === "dark"
                    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>'
                    : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';
        });
    };
    updateThemeIcons(savedTheme);

    themeButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            const current = document.documentElement.getAttribute("data-theme") || "dark";
            const next = current === "dark" ? "light" : "dark";
            document.documentElement.setAttribute("data-theme", next);
            localStorage.setItem("anm-theme", next);
            updateThemeIcons(next);
        });
    });

    // 3. BARRA DE PROGRESSO DE LEITURA & NAVBAR SCROLL
    const progressBar = document.querySelector(".scroll-progress-bar");
    const topNav = document.querySelector(".top-nav");

    window.addEventListener(
        "scroll",
        () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            if (progressBar && docHeight > 0) {
                const pct = Math.min(100, Math.max(0, (scrollTop / docHeight) * 100));
                progressBar.style.width = `${pct}%`;
            }
            if (topNav) {
                if (scrollTop > 40) {
                    topNav.classList.add("scrolled");
                } else {
                    topNav.classList.remove("scrolled");
                }
            }
        },
        { passive: true }
    );

    // 4. EFEITO SPOTLIGHT RADIAL NOS BENTO CARDS
    const spotlightCards = document.querySelectorAll(".bento-card, .paradox-card, .speaker-card, .takeaway-item, .tier-card");
    spotlightCards.forEach((card) => {
        card.addEventListener("mousemove", (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty("--mouse-x", `${x}px`);
            card.style.setProperty("--mouse-y", `${y}px`);
        });
    });

    // 5. FILTROS E ACORDEÃO DO CRONOGRAMA OFICIAL (19H00 ÀS 21H55)
    const filterButtons = document.querySelectorAll("[data-schedule-filter]");
    const timelineItems = document.querySelectorAll(".timeline-item");

    filterButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            const category = btn.getAttribute("data-schedule-filter");
            filterButtons.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");

            timelineItems.forEach((item) => {
                const itemCat = item.getAttribute("data-category");
                if (category === "all" || itemCat === category) {
                    item.style.display = "block";
                } else {
                    item.style.display = "none";
                }
            });
        });
    });

    timelineItems.forEach((item) => {
        item.addEventListener("click", (e) => {
            // Evita fechar se clicar num link interno
            if (e.target.closest("a") || e.target.closest("button")) return;
            item.classList.toggle("expanded");
            const hint = item.querySelector(".timeline-expand-hint span");
            if (hint) {
                hint.textContent = item.classList.contains("expanded")
                    ? "Ocultar detalhes"
                    : "Ver detalhes";
            }
        });
    });

    // Botão expandir/recolher todas as etapas do cronograma
    const toggleAllBtn = document.getElementById("toggle-all-schedule");
    if (toggleAllBtn) {
        let allExpanded = false;
        toggleAllBtn.addEventListener("click", () => {
            allExpanded = !allExpanded;
            timelineItems.forEach((item) => {
                if (allExpanded) {
                    item.classList.add("expanded");
                } else {
                    item.classList.remove("expanded");
                }
                const hint = item.querySelector(".timeline-expand-hint span");
                if (hint) {
                    hint.textContent = allExpanded ? "Ocultar detalhes" : "Ver detalhes";
                }
            });
            toggleAllBtn.textContent = allExpanded
                ? "Recolher todos os detalhes"
                : "Expandir todos os detalhes";
        });
    }

    // 6. SIMULADOR INTERATIVO DO PARTICIPANTE (MOBILE LIVE PREVIEW)
    const phoneTabs = document.querySelectorAll("[data-phone-tab]");
    const phonePanels = document.querySelectorAll("[data-phone-panel]");

    phoneTabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            const target = tab.getAttribute("data-phone-tab");
            phoneTabs.forEach((t) => t.classList.remove("active"));
            tab.classList.add("active");

            phonePanels.forEach((panel) => {
                if (panel.getAttribute("data-phone-panel") === target) {
                    panel.style.display = "block";
                } else {
                    panel.style.display = "none";
                }
            });
        });
    });

    // Votação simulada no mockup mobile
    const pollOptions = document.querySelectorAll(".poll-option-btn");
    const pollFeedback = document.getElementById("sim-poll-feedback");
    pollOptions.forEach((opt) => {
        opt.addEventListener("click", () => {
            pollOptions.forEach((o) => o.classList.remove("selected"));
            opt.classList.add("selected");
            if (pollFeedback) {
                pollFeedback.style.display = "block";
                pollFeedback.textContent =
                    "✓ Voto registrado em tempo real! Você pode alterar até as 20h55.";
            }
        });
    });

    // Envio de pergunta simulado no mockup mobile
    const simQuestionBtn = document.getElementById("sim-question-submit");
    const simQuestionInput = document.getElementById("sim-question-input");
    const simQuestionFeedback = document.getElementById("sim-question-feedback");
    if (simQuestionBtn && simQuestionInput && simQuestionFeedback) {
        simQuestionBtn.addEventListener("click", () => {
            const val = simQuestionInput.value.trim();
            if (!val) {
                simQuestionFeedback.style.display = "block";
                simQuestionFeedback.style.color = "#F59E0B";
                simQuestionFeedback.textContent = "Digite uma pergunta para simular o envio à curadoria.";
                return;
            }
            simQuestionFeedback.style.display = "block";
            simQuestionFeedback.style.color = "#10B981";
            simQuestionFeedback.textContent =
                "✓ Pergunta recebida! Nossa equipe de curadoria já está analisando para exibir no telão.";
            simQuestionInput.value = "";
        });
    }
});
