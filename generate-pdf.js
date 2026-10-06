const puppeteer = require('puppeteer');

(async () => {
  try {
    console.log('Iniciando o navegador para gerar o PDF...');
    const browser = await puppeteer.launch({
      executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      headless: true
    });
    const page = await browser.newPage();
    
    // Configura o viewport para simular um desktop de alta resolução
    await page.setViewport({ width: 1440, height: 900 });

    // Acessa a página de patrocínio local
    console.log('Acessando a página de patrocínio...');
    await page.goto('http://localhost:3000/patrocinio', { waitUntil: 'networkidle0' });

    // Injeta CSS para desativar as animações do AOS e remover o preloader,
    // garantindo que todo o conteúdo apareça no PDF
    await page.addStyleTag({
        content: `
            #preloader { display: none !important; }
            [data-aos] { opacity: 1 !important; transform: none !important; transition: none !important; }
            body { 
                background-color: #000000 !important; 
                -webkit-print-color-adjust: exact !important; 
                print-color-adjust: exact !important; 
            }
            .top-nav { display: none !important; }
            .dynamic-section { page-break-inside: avoid; }
        `
    });

    console.log('Gerando o PDF...');
    await page.pdf({
      path: 'Proposta_A_Nova_Moeda.pdf',
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        bottom: '20px',
        left: '20px',
        right: '20px'
      }
    });

    await browser.close();
    console.log('PDF gerado com sucesso: Proposta_A_Nova_Moeda.pdf');
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
  }
})();
