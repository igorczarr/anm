# Manual de Operação da Mesa de Controle — ADMIN
## Arena de Debate A Nova Moeda — Economia da Solidão
**Instituição:** Universidade Estadual de Feira de Santana (UEFS)  
**Público Estimado:** 150 participantes | **Duração Total:** 131 minutos  
**Documento Operacional Oficial** — Versão 1.0

---

## 1. Visão Geral da Mesa de Comando

O sistema da Arena foi concebido para centralizar todas as variáveis operacionais em uma interface unificada, minimizando o trabalho manual e garantindo a sincronização em tempo real entre a organização, o telão público (**ARENA**) e os smartphones da plateia (**INTERAÇÃO**).

A mesa de comando é acessada via navegador em:
👉 **URL:** `/admin` (ou `https://seu-dominio.vercel.app/admin`)  
👉 **Login Inicial:** `admin@anm.uefs.br` | **Senha:** `arena2026!`

---

## 2. Checklist Pré-Evento

Execute este roteiro rigorosamente antes da abertura dos portões:

### T - 60 Minutos: Infraestrutura e Conexões
- [ ] Conectar o notebook principal da mesa de controle à rede cabeada ou Wi-Fi dedicado.
- [ ] Conectar o computador de projeção do auditório ao telão e abrir a URL `/arena` em tela cheia (`F11`).
- [ ] (Opcional) Conectar o monitor de retorno para os debatedores no palco na URL `/arena?modo=palco`.
- [ ] Fazer login no painel `/admin` e checar os indicadores de conexão no Dashboard:
  - **Servidor:** Operacional (Verde)
  - **Sincronização ARENA:** Conectado com heartbeat ativo
- [ ] Realizar um teste de som nos alto-falantes do operador para confirmar a reprodução dos bips dos alertas sonoros do cronômetro.

### T - 30 Minutos: Conferência de Conteúdo
- [ ] Acessar `/admin/cronograma` e confirmar a sequência das 6 pautas e palestrantes:
  - Pauta 1: Daniel (Provocadora: Janaína)
  - Pauta 2: Janaína (Provocadora: Dulcila)
  - Pauta 3: Denilson Carneiro (Provocador: Sérgio Passos)
  - *Intervalo técnico: 5 minutos*
  - Pauta 4: Sérgio Passos (Provocador: Denilson Carneiro)
  - Pauta 5: Dulcila (Provocador: Daniel)
  - Pauta 6: Daniel (Participação Coletiva)
- [ ] Acessar `/admin/votacoes` e confirmar as 6 perguntas das enquetes e suas alternativas.
- [ ] Acessar `/admin/participantes`, projetar o QR Code na tela de entrada ou imprimir os cartazes de acesso com a URL `/participar`.

### T - 10 Minutos: Preparação Final
- [ ] No telão ARENA, ativar o modo **Tela de Espera** (`WAITING`), exibindo o QR Code gigante e o tema do evento.
- [ ] Conectar pelo menos um smartphone da equipe em `/participar` para validar a recepção da tela de boas-vindas.

---

## 3. Gestão do Cronômetro e Fluxo de Palco

Acesse a aba **Operação ao Vivo** (`/admin/operacao`).

### Regras Fundamentais da Cronometria Centralizada
1. **O tempo é do servidor:** O relógio nunca depende da máquina do operador. Se você der refresh na página ou trocar de computador, o cronômetro mantém exatamente o mesmo tempo.
2. **Nunca há avanço automático ao chegar a zero:** Ao esgotar o tempo, o cronômetro passa para o estado `TEMPO ENCERRADO` em vermelho piscante e emite um alerta discreto. A decisão de encerrar a etapa ou conceder tempo extra é **exclusivamente humana**.

### Comandos da Mesa de Operação
- **Iniciar Evento / Etapa:** Inicia a contagem regressiva da etapa ativa e atualiza automaticamente o telão.
- **Pausar (`Espaço`):** Congela o cronômetro sem perder os milissegundos decorridos. O telão e o retorno de palco indicam pausa.
- **Retomar (`Espaço`):** Reinicia a contagem a partir do ponto exato onde parou.
- **+1 Min / -1 Min / +30s / -30s:** Ajusta a duração da etapa em tempo real. Cada ajuste é registrado na auditoria da sessão para o relatório pós-evento.
- **Próxima Etapa (`N` ou Botão Avançar):** Abre o modal de confirmação, encerra a etapa atual com registro do término efetivo e carrega a etapa seguinte no telão.
- **Pular Etapa:** Marca a etapa atual como pulada (`SKIPPED`) e passa imediatamente para a próxima.

### Alertas Visuais e Sonoros
| Tempo Restante | Efeito no Painel ADMIN | Efeito no Monitor de Palco | Som |
|---|---|---|---|
| **2:00** | Borda amarela / Badge Atenção | Destaque amarelo | Bip duplo suave |
| **0:30** | Borda laranja / Alerta Crítico | Dígitos laranjas | Bip triplo |
| **0:00** | Fundo vermelho piscante / "Tempo Encerrado" | Fundo vermelho em destaque | Tom contínuo de 2s |

---

## 4. Esteira de Curadoria de Perguntas

Acesse a aba **Perguntas e Curadoria** (`/admin/perguntas`).

O público envia perguntas pelo smartphone, associadas automaticamente à pauta ativa. **Nenhuma pergunta é projetada no telão sem autorização expressa do curador.**

### Fluxo de Estados da Pergunta
1. **Recebida (`RECEIVED`):** Pergunta recém-chegada. Aparece com destaque no topo da fila.
2. **Em Análise (`ANALYZING`):** Curador clica em "Avaliar" para sinalizar à equipe que está lendo.
3. **Aprovada (`APPROVED`):** Pergunta com relevância e clareza, apta para o debate.
4. **Rejeitada (`REJECTED`):** Pergunta fora de escopo, agressiva ou ilegível (o participante apenas vê "Não selecionada").
5. **Duplicada (`DUPLICATE`):** Pergunta que aborda o mesmo ângulo de outra já aprovada.
6. **Selecionada Principal (`SELECTED`):** Pergunta eleita para ser respondida pelos palestrantes no bloco "Voz da Plateia".
7. **Reserva:** Pergunta de backup caso haja tempo adicional.
8. **Exibida no Telão (`DISPLAYED`):** O curador clica em **"Exibir no Telão"** → O telão ARENA transiciona imediatamente para o modo `SELECTED_QUESTION` com a citação e autoria anônima.
9. **Respondida (`ANSWERED`):** Após a resposta do debatedor, o curador marca como respondida para fechar o ciclo.

---

## 5. Condução das Votações em Tempo Real

Acesse a aba **Votações** (`/admin/votacoes`).

Cada uma das 6 pautas possui uma enquete vinculada.

### Passo a Passo para Executar uma Votação
1. **Alinhamento com o Mediador:** Quando o mediador convidar a plateia para votar na pauta:
2. **Abrir Votação:** Clique no botão verde **"Abrir Votação"**:
   - O telão ARENA entra automaticamente no modo **Votação Aberta** (`POLL_OPEN`), exibindo a pergunta, alternativas e o QR Code.
   - O smartphone de todos os participantes conectados transiciona instantaneamente para a tela de voto.
   - *Nota de imparcialidade:* O telão oculta as barras parciais de votação para evitar o efeito manada. O painel ADMIN, porém, exibe o gráfico em tempo real para o operador.
3. **Tempo de Votação (60 a 90 segundos):** Acompanhe o contador de votos crescendo no painel. Os participantes podem trocar de alternativa livremente enquanto a votação estiver aberta.
4. **Encerrar e Projetar Resultado:** Clique em **"Encerrar e Projetar no Telão"**:
   - A votação é travada no banco (nenhum voto a mais é aceito).
   - O telão ARENA muda automaticamente para **Resultado da Votação** (`POLL_RESULTS`), exibindo as barras animadas com as porcentagens exatas e o total de votos válidos.
   - O mediador e os debatedores comentam o resultado projetado.

---

## 6. Avisos Operacionais e Mensagens de Tela

Caso a organização precise comunicar algo ao público sem interromper o som da plenária:
1. Acesse o menu rápido ou aba de Avisos.
2. Digite o título e mensagem (ex: *"Favor manter celulares no silencioso"* ou *"Veículo placa XYZ com faróis acesos"*).
3. Selecione a prioridade (`INFO` ou `ALERTA`) e clique em **"Enviar ao Telão"**.
4. Para retirar, clique em **"Ocultar Aviso"** ou avance para a próxima etapa.

---

## 7. Modo de Emergência

Caso ocorra um imprevisto grave (pane no palco, queda de transmissão ou evacuação temporária):
1. No cabeçalho do ADMIN, clique no botão vermelho **"Modo de Emergência"**.
2. Digite a mensagem técnica a ser exibida (ex: *"Breve intervalo técnico. Retornaremos em instantes."*).
3. Confirme a ativação:
   - O telão ARENA e os celulares dos participantes serão imediatamente congelados com uma tela de aviso sóbria e o logotipo oficial.
   - Os cronômetros são automaticamente pausados.
4. Ao restabelecer a normalidade, clique em **"Desativar Emergência"** para retomar o evento exatamente de onde parou.

---

## 8. Encerramento e Relatórios Pós-Evento

1. Ao concluir a Pauta 6 e o bloco de encerramento, clique em **"Encerrar Evento Oficialmente"**.
2. Acesse a aba **Relatórios** (`/admin/relatorios`):
   - Visualize os indicadores gerais: Total de participantes únicos, total de perguntas, taxa de aprovação, votos computados por pauta e aderência ao cronograma planejado vs. realizado.
   - Clique em **"Exportar Relatório PDF"** para gerar o documento formal diagramado com identidade visual do evento.
   - Clique em **"Exportar CSV"** ou **"Exportar XLSX"** para gerar a planilha completa para arquivo institucional e pesquisa da UEFS.
3. **Higienização LGPD:** Caso a organização deseje descartar os registros anônimos de conexões e IPs hasheados após a exportação dos relatórios, utilize a opção **"Limpeza de Dados Técnicos (LGPD)"** mediante confirmação de senha.
