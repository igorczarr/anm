# A Nova Moeda — Sistema de Gestão e Interação da Arena

> Plataforma web integrada de comando operacional e interação em tempo real desenvolvida para a **Arena de Debate "A Nova Moeda — Economia da Solidão"**, realizada na **Universidade Estadual de Feira de Santana (UEFS)** para um público estimado de 150 participantes e 131 minutos de programação.

---

## 🏛️ Visão Geral da Arquitetura

O sistema é construído sobre três interfaces sincronizadas em tempo real a partir de uma única fonte de dados no PostgreSQL (Neon), sem exigir instalação ou download pelos participantes:

1. **ADMIN (`/admin`):** Centro de comando de uso restrito à organização e equipe técnica. Fornece 9 módulos: Dashboard com cronômetro em destaque, Operação ao Vivo com atalhos de palco e alertas sonoros, Cronograma dinâmico de 40 etapas, Curadoria de Perguntas com esteira de 8 estados, Gestão de Votações com auditoria em tempo real, Monitor de Conexões e QR Code, Relatórios Analíticos com exportação PDF/CSV/XLSX, Configurações do Evento e Gestão de Acessos RBAC.
2. **ARENA (`/arena` e `/arena?modo=palco`):** Interface pública projetada no telão principal do auditório (16:9, alta visibilidade a 15 metros) e monitor de retorno do palco com cronômetro ampliado. Opera em 13 modos visuais estritos governados pelo estado do servidor.
3. **INTERAÇÃO (`/participar`):** Aplicação mobile-first acessada pela plateia via leitura de QR Code. Permite envio de perguntas anônimas (com limite configurável de 400 caracteres e cota por pauta), votações dinâmicas instantâneas com alteração de voto em tempo real, acompanhamento das participações e aviso de privacidade LGPD (sem coleta de dados pessoais).

---

## 🛠️ Stack Tecnológica

- **Framework Web:** [Next.js 16.4.5](https://nextjs.org/) (App Router, Turbopack, React 19)
- **Linguagem:** TypeScript 5
- **Estilização & Design System:** Tailwind CSS 4 com tipografia institucional (*Montserrat* executiva e *Playfair Display* editorial) e paleta cromática de alta elegância (`#030A06`, `#14532D`, `#D5C5AA`).
- **ORM & Banco de Dados:** [Prisma 6.19.3](https://www.prisma.io/) com PostgreSQL (schema isolado `arena` no Neon Serverless).
- **Tempo Real & Sincronização:** Server-Sent Events (`/api/stream`) com versionamento estrito (`seq`) e fallback resiliente por polling atômico a cada 2 segundos (`/api/state?since=<seq>`).
- **Cronometria Centralizada:** Cálculo de tempo restante referenciado 100% no servidor com sincronização por carimbo de data/hora (`serverNow`), auditando pausas, acréscimos e tempos excedidos.
- **Segurança & Sessão:** Sessões anônimas assinadas com HMAC-SHA256 em cookies `httpOnly`, rate limiting em memória, sanitização contra XSS e bloqueio de concorrência com transações ACID no banco.
- **Geração de Relatórios:** Motores nativos de exportação em PDF vetorial, CSV com UTF-8 BOM e planilhas XLSX (Spreadsheet XML 2003).

---

## 📁 Estrutura de Diretórios

```
anm/arena/
├── app/
│   ├── (admin)/admin/
│   │   ├── page.tsx                     # Dashboard da central de comando
│   │   ├── operacao/page.tsx            # Mesa de operação ao vivo e palco
│   │   ├── cronograma/page.tsx          # Gestão do cronograma e etapas
│   │   ├── perguntas/page.tsx           # Mesa de curadoria e moderação
│   │   ├── votacoes/page.tsx            # Gestão e acompanhamento das votações
│   │   ├── participantes/page.tsx       # Monitor de conexões e projeção de QR
│   │   ├── relatorios/page.tsx          # Relatórios consolidados e exportações
│   │   ├── configuracoes/page.tsx       # Parâmetros gerais e regras de envio
│   │   ├── acessos/page.tsx             # Controle de usuários e papéis RBAC
│   │   ├── login/page.tsx               # Autenticação administrativa restrita
│   │   └── layout.tsx                   # Layout com navegação administrativa
│   ├── arena/page.tsx                   # Telão público de projeção e modo palco
│   ├── participar/page.tsx              # Interface mobile do participante
│   ├── actions/                         # Server Actions para mutações protegidas
│   │   ├── live-operation.ts            # Controle de etapas, cronômetro e modos
│   │   ├── curation-and-polls.ts        # Moderação de perguntas e enquetes
│   │   └── compliance.ts                # Higienização de dados pós-evento (LGPD)
│   ├── api/                             # Endpoints HTTP da API pública e admin
│   │   ├── state/route.ts               # Snapshot atômico de sincronização
│   │   ├── stream/route.ts              # Stream SSE para eventos em tempo real
│   │   ├── qr/route.ts                  # Gerador de QR Code em SVG vetorial
│   │   ├── participant/                 # Endpoints mobile do participante
│   │   │   ├── session/route.ts         # Provisão de sessão anônima
│   │   │   ├── me/route.ts              # Status das perguntas e voto da sessão
│   │   │   ├── question/route.ts        # Submissão idempotente de perguntas
│   │   │   └── vote/route.ts            # Votação transacionada em tempo real
│   │   └── admin/                       # Endpoints administrativos
│   │       ├── curation/route.ts        # Fila de curadoria com filtros
│   │       └── reports/                 # Exportação nos formatos PDF, CSV e XLSX
├── components/                          # Componentes reutilizáveis
│   ├── arena-screen.tsx                 # Renderizador dos 13 modos visuais do telão
│   ├── live-control-desk.tsx            # Console tátil do operador de palco
│   ├── curation-desk.tsx                # Quadro Kanban e lista de curadoria
│   ├── polls-desk.tsx                   # Painel de acompanhamento de enquetes
│   ├── layout-chrome.tsx                # Gestor de casca e exibição sem cabeçalhos
│   └── ui/                              # Elementos visuais (botões, cards, badges)
├── lib/                                 # Lógica de negócio e utilitários
│   ├── prisma.ts                        # Cliente Prisma com retry automático
│   ├── events.ts                        # Definições de eventos, tipos e cronômetro
│   ├── live-state.ts                    # Snapshot unificado e atomicidade de estado
│   ├── timer-engine.ts                  # Motor de cronometria no servidor
│   ├── session.ts                       # Assinatura de tokens e cookies seguros
│   ├── admin-auth.ts                    # Validação de credenciais e permissões RBAC
│   ├── participant.ts                   # Gestão de sessões anônimas e limites
│   ├── question-status.ts               # Mapeamento dos 8 estados de moderação
│   ├── pdf-generator.ts                 # Gerador nativo de PDF, CSV e XLSX
│   └── reports.ts                       # Métricas e cálculos consolidados
├── prisma/
│   ├── schema.prisma                    # 16 modelos relacionais e enums do sistema
│   └── seed.ts                          # Carga inicial oficial (pautas, etapas, enquetes)
├── scripts/
│   └── rehearsal-sim.ts                 # Script de ensaio técnico acelerado (150 bots)
└── public/                              # Ativos estáticos, fontes e imagens
```

---

## 🚀 Instalação e Execução Local

### Pré-requisitos
- Node.js 20+ ou 22+
- npm ou yarn
- Banco de dados PostgreSQL (ou Neon DB configurado)

### 1. Clonar e Instalar Dependências
```bash
cd anm/arena
npm install
```

### 2. Configurar Variáveis de Ambiente
Crie ou verifique o arquivo `.env` na raiz de `anm/arena/`:
```env
# Banco de dados Neon com schema isolado para a Arena
DATABASE_URL="postgresql://user:password@ep-cool-fog-123456.us-east-2.aws.neon.tech/neondb?sslmode=require&schema=arena"
DIRECT_URL="postgresql://user:password@ep-cool-fog-123456.us-east-2.aws.neon.tech/neondb?sslmode=require&schema=arena"

# Segredo para assinatura de cookies e tokens de sessão
ADMIN_SESSION_SECRET="anm-arena-secret-key-2026-economia-da-solidao-uefs"

# Ambiente
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Sincronizar Banco de Dados e Carga Inicial (Seed)
```bash
# Aplica os 16 modelos ao schema arena no Postgres
npm run db:push

# Executa o seed com as 6 pautas oficiais, 40 etapas operacionais e 6 enquetes
npm run db:seed
```

### 4. Executar Servidor de Desenvolvimento
```bash
npm run dev
```

Acesse:
- **Painel Administrativo:** [http://localhost:3000/admin](http://localhost:3000/admin) (Login inicial: `admin@anm.uefs.br` / `arena2026!`)
- **Telão Público (ARENA):** [http://localhost:3000/arena](http://localhost:3000/arena)
- **Monitor de Retorno do Palco:** [http://localhost:3000/arena?modo=palco](http://localhost:3000/arena?modo=palco)
- **Interface da Plateia (Mobile):** [http://localhost:3000/participar](http://localhost:3000/participar)

---

## 🧪 Ensaio Técnico e Simulação Acelerada

Para rodar o teste completo de validação com 150 participantes simultâneos, submissão de perguntas, curadoria, votações em tempo real e geração de relatórios:
```bash
npm run test:sim
```

---

## 📦 Build e Deploy na Vercel

```bash
# Validar compilação de produção
npm run build

# Iniciar em produção local
npm run start
```

Ao realizar o deploy na **Vercel**:
1. Configure o Root Directory como `anm/arena`.
2. Adicione as variáveis de ambiente (`DATABASE_URL`, `DIRECT_URL`, `ADMIN_SESSION_SECRET`, `NEXT_PUBLIC_APP_URL`).
3. O sistema utiliza SSE e fallback de polling atômico a cada 2 segundos, compatível com a infraestrutura serverless da Vercel.
