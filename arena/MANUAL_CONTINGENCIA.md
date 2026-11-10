# Plano de Contingência e Continuidade Operacional
## Arena de Debate A Nova Moeda — Economia da Solidão
**Instituição:** Universidade Estadual de Feira de Santana (UEFS)  
**Público:** 150 participantes | **Duração Programada:** 131 minutos  
**Documento de Segurança & Redundância Operacional** — Versão 1.0

---

## 1. Princípio Fundamental de Continuidade

> **"A tecnologia serve ao debate, e não o inverso."**  
> Em nenhuma circunstância o debate de 131 minutos será paralisado ou atrasado por instabilidades de rede, servidores ou hardware. Toda funcionalidade digital possui uma salvaguarda analógica equivalente previamente testada.

---

## 2. Matriz de Riscos e Planos de Contingência

| Risco | Probabilidade | Impacto | Mecanismo Digital | Salvaguarda Analógica |
|---|---|---|---|---|
| **Queda total de Internet** | Média | Alto | Snapshot em cache local | Roteiro impresso + Cronômetro físico + Votação por mãos |
| **Falha do Projetor / Telão** | Baixa | Alto | Hot-swap HDMI + Tela `/arena` | Monitor de retorno no palco + Mediação oral |
| **Pane no Laptop do ADMIN** | Baixa | Médio | Hot-standby em laptop reserva | Cronômetro de mão + Roteiro impresso |
| **Sobrecarga de Wi-Fi da Plateia** | Média | Baixo | Polling fallback 2s + Rate limit | Cartões físicos de perguntas + Votação por aclamação |
| **Queda de Energia Geral** | Baixa | Crítico | Nobreaks locais (30 min) | Auditório com iluminação natural / Megafone |

---

## 3. Protocolos Detalhados por Cenário

### Cenário 1: Queda de Conexão à Internet (Wi-Fi / 4G)
Se os participantes ou os computadores da organização perderem a conectividade com a nuvem (Vercel/Neon):

1. **Ação da Mesa de Controle:**
   - O operador avisa imediatamente o mediador no palco por sinal discreto ou mensageiro de palco.
   - O cronômetro exibido no notebook do operador continuará marcando o tempo decorrido da etapa com base no relógio de hardware local.
2. **Captação de Perguntas:**
   - A equipe de apoio da UEFS distribui imediatamente os **blocos de fichas impressas** (fornecidas no kit pré-evento) para as fileiras da plateia.
   - Os participantes escrevem perguntas de até 2 linhas e entregam aos monitores volantes.
   - Os monitores entregam as fichas físicas diretamente à bancada de curadoria. O curador seleciona a principal e entrega em mãos ao mediador.
3. **Votações das Pautas:**
   - O mediador lê a pergunta da enquete no microfone e apresenta as 3 alternativas.
   - Pede à plateia: *"Quem vota na Alternativa A, levante a mão"*. Os monitores estimam rapidamente a maioria e o mediador proclama o resultado do consenso da plenária.

---

### Cenário 2: Falha ou Congelamento do Telão da ARENA
Se a projeção do telão principal apagar, travar ou perder o sinal de vídeo:

1. **Ação em até 10 segundos:**
   - O técnico de projeção pressiona `Ctrl + F5` na aba do navegador `/arena`.
   - Se o navegador não responder, desconectar o cabo HDMI e conectar na porta HDMI secundária do notebook do operador.
2. **Garantia de Estado:**
   - A tela `/arena` recupera automaticamente o estado exato (`seq`, modo de tela e palestrante ativo) no primeiro milissegundo de reconexão via snapshot do servidor. Nenhuma informação é perdida.
3. **Se o projetor falhar fisicamente:**
   - O mediador assume a condução com apoio do roteiro impresso, anunciando verbalmente os tempos, pautas e nomes dos palestrantes até a substituição da lâmpada/projetor.

---

### Cenário 3: Travamento ou Pane do Notebook do Operador (ADMIN)
Se o computador principal da mesa sofrer pane de hardware ou travamento do sistema operacional:

1. **Laptop Reserva (Hot-Standby):**
   - Um segundo notebook da organização deve permanecer ligado durante todo o evento, conectado à rede e previamente autenticado na URL `/admin/operacao`.
2. **Assunção Imediata:**
   - O operador reserva assume o controle. Como o estado, o cronômetro, as perguntas e os votos estão gravados no PostgreSQL, o laptop de backup exibe imediatamente a situação em tempo real.
3. **Cronômetro de Mão de Backup:**
   - Enquanto o operador secundário assume (cerca de 15 a 30 segundos), o assistente de palco aciona o cronômetro digital físico de mão (ou aplicativo de cronômetro no celular do assistente) para garantir a continuidade da contagem da etapa sem interrupção.

---

### Cenário 4: Sobrecarga de Rede Móvel na Entrada / Votações
Se houver congestionamento temporário da antena de celular no auditório da UEFS:

1. **Para os Participantes:**
   - A interface mobile `/participar` possui fallback automático: se a conexão via SSE falhar, ela alterna automaticamente para requisições leves de polling a cada 2 segundos.
   - O formulário de envio de perguntas possui proteção contra duplo envio (`clientRequestId` único): se o participante clicar duas vezes, a pergunta nunca será duplicada no banco.
2. **Para a Votação:**
   - O operador estende o tempo de votação aberta no ADMIN de 60 para 90 segundos com o botão **"+30s"**, permitindo que mais conexões concluam o voto.

---

### Cenário 5: Acionamento do Modo de Emergência
Se ocorrer um incidente que exija interrupção temporária (ex: falha no sistema de som do auditório, necessidade de evacuação pontual ou atendimento médico):

1. **No Painel ADMIN:**
   - Clique no botão vermelho **"Modo de Emergência"**.
   - Mensagem padrão pré-cadastrada: *"Breve intervalo técnico. Retornaremos em instantes."*
   - O telão exibe o aviso em destaque institucional e todo o sistema entra em pausa segura.
2. **No Palco:**
   - O mediador solicita calma à plateia e aguarda a autorização da coordenação para retomar.
3. **Para Retomar:**
   - Clique em **"Desativar Emergência"**. O sistema descongela os cronômetros e o telão retorna exatamente para o modo em que estava.

---

## 4. Kit Físico Obrigatório na Mesa de Controle

Antes do início do evento, certifique-se de que a bancada de controle possui fisicamente:

- [ ] **3 vias impressas** do Roteiro Geral do Evento (131 minutos, 40 etapas, horários nominais).
- [ ] **2 cronômetros digitais físicos de mão** (com pilhas novas testadas).
- [ ] **100 fichas de papel pautadas** (formato A6) para submissão manual de perguntas em caso de pane de rede.
- [ ] **10 canetas esferográficas** para a equipe de apoio e plateia.
- [ ] **1 cabo HDMI reserva** de 5 metros e adaptadores USB-C/HDMI.
- [ ] **1 régua de tomadas com filtro de linha e nobreak** alimentando os notebooks da mesa.
- [ ] **1 modem 4G/5G portátil (hotspot móvel)** configurado e testado como rede reserva da organização.
