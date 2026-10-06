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

    // Acessa a versão institucional para impressão
    console.log('Acessando a página de proposta...');
    await page.goto('http://localhost:3000/proposta-print.html', { waitUntil: 'networkidle0' });

    // Não precisamos injetar CSS de tela escura aqui, o HTML já foi feito para A4.
    console.log('Gerando o PDF...');
    await page.pdf({
      path: 'Proposta_Institucional_A_Nova_Moeda.pdf',
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
