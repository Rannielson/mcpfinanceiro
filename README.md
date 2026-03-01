# MCP Financeiro - API Multi-Empresas

API em Node.js + TypeScript + Hono para orquestrar integrações **SGA (Hinova)** e **Chat Atomos** em modelo SaaS multi-empresas. Consulta boletos por placa, envia PIX/PDF ou mensagem de regularização (revistoria) conforme configuração por cliente.

---

## Base URL

| Ambiente | URL |
|----------|-----|
| **Produção** | `https://mcpfinanceiro-production.up.railway.app` |
| **Local** | `http://localhost:3000` |

Use a base URL desejada nos exemplos de cURL abaixo.

---

## Pré-requisitos

- Node.js 18+
- Conta Supabase
- Tokens por cliente: **token_erp** (Hinova SGA), **token_chat** e **token_canal** (Atomos)

---

## Setup

### 1. Instalar dependências

```bash
npm install
```

### 2. Variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
```

### 3. Migrations no Supabase

No [Supabase Dashboard](https://supabase.com/dashboard) > **SQL Editor**, execute em ordem:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rename_base_url_sga_to_base_url.sql` (se existir)
3. `supabase/migrations/003_situacoes_envio_direto_e_checagem.sql`
4. `supabase/migrations/004_intervalo_max_50.sql`

### 4. Iniciar o servidor

```bash
npm run dev
```

---

## Endpoints e cURL

### Health check

**GET /** — Verifica se a API está no ar.

```bash
curl -s https://mcpfinanceiro-production.up.railway.app/
```

**Resposta (200):**

```json
{"status":"ok","service":"mcpfinanceiro"}
```

---

### Cadastrar cliente

**POST** `/api/v1/clientes` — Cadastra um cliente com todas as configurações (boleto, respostas, revistoria).

**Body (JSON):**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `nome` | string | sim | Nome do cliente |
| `ativo` | boolean | não | Default `true` |
| `token_erp` | string | sim | Token Hinova SGA |
| `token_chat` | string | sim | Token Chat Atomos |
| `token_canal` | string | sim | Token do canal Atomos |
| `perfil_sistema` | "SGA" \| "SOUTH" | não | Default `"SGA"` |
| `base_url` | string (URL) | não | Default `https://api.hinova.com.br/api/sga/v2` |
| `configuracoes_boleto` | object | sim | Ver tabela abaixo |
| `configuracoes_respostas` | object | sim | Ver tabela abaixo |
| `configuracoes_revistoria` | object | sim | Ver tabela abaixo |

**configuracoes_boleto:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `dias_antes_vencimento` | number | Dias antes do vencimento para buscar boleto (0–60) |
| `dias_depois_vencimento` | number | Dias depois do vencimento (0–60). Soma com `dias_antes` ≤ 50 |
| `situacoes_envio_direto` | string[] | Ex.: `["ATIVO"]` — envia PIX/PDF direto |
| `situacoes_com_checagem_vencimento` | string[] | Ex.: `["INADIMPLENTE"]` — checa dias após vencimento |
| `dias_checagem_vencimento` | number | Se passar desse número de dias após vencimento, retorna regularização |

**configuracoes_respostas:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `response_sucesso` | string | Mensagem quando boleto/PIX enviados. Use `{{data_vencimento}}` e `{{valor_boleto}}` |
| `response_regularizacao_moto` | string | Mensagem de regularização para moto |
| `response_regularizacao_veiculo` | string | Mensagem de regularização para carro |
| `response_boleto_baixado` | string | Mensagem quando boleto já está baixado |

**configuracoes_revistoria:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `enviar_midia` | boolean | Se `true`, envia vídeo de regularização (quando houver URL) |
| `video_moto` | string (URL) ou null | URL do vídeo para moto |
| `video_carro` | string (URL) ou null | URL do vídeo para carro |

**cURL — Cadastrar cliente:**

```bash
curl -X POST https://mcpfinanceiro-production.up.railway.app/api/v1/clientes \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Meu Cliente",
    "ativo": true,
    "token_erp": "SEU_TOKEN_ERP",
    "token_chat": "SEU_TOKEN_CHAT",
    "token_canal": "SEU_TOKEN_CANAL",
    "perfil_sistema": "SGA",
    "base_url": "https://api.hinova.com.br/api/sga/v2",
    "configuracoes_boleto": {
      "dias_antes_vencimento": 30,
      "dias_depois_vencimento": 20,
      "situacoes_envio_direto": ["ATIVO"],
      "situacoes_com_checagem_vencimento": ["INADIMPLENTE"],
      "dias_checagem_vencimento": 5
    },
    "configuracoes_respostas": {
      "response_sucesso": "Boleto e pix enviados! Data: {{data_vencimento}}, Valor: {{valor_boleto}}",
      "response_regularizacao_moto": "Estamos enviando o vídeo modelo para regularização.",
      "response_regularizacao_veiculo": "Estamos enviando o vídeo modelo para regularização.",
      "response_boleto_baixado": "Boleto já foi baixado."
    },
    "configuracoes_revistoria": {
      "enviar_midia": false,
      "video_moto": null,
      "video_carro": null
    }
  }'
```

**Resposta (201):**

```json
{"id":"uuid-do-cliente","message":"Cliente criado com sucesso"}
```

**Resposta (400):** `{"error":"mensagem"}` (validação ou banco).

---

### Atualizar configurações do cliente

**PATCH** `/api/v1/clientes/:id/configuracoes` — Atualiza apenas as configurações enviadas (parcial). `:id` = UUID do cliente.

**Body (JSON):** qualquer combinação de:

- `configuracoes_boleto` — mesmos campos do cadastro (todos opcionais no PATCH)
- `configuracoes_respostas` — mesmos campos (opcionais)
- `configuracoes_revistoria` — mesmos campos (opcionais)

**Regra:** `dias_antes_vencimento + dias_depois_vencimento` ≤ 50.

**cURL — Ajustar apenas boleto (ex.: 30 dias antes, 20 depois):**

```bash
curl -X PATCH https://mcpfinanceiro-production.up.railway.app/api/v1/clientes/SEU_CLIENTE_UUID/configuracoes \
  -H "Content-Type: application/json" \
  -d '{
    "configuracoes_boleto": {
      "dias_antes_vencimento": 30,
      "dias_depois_vencimento": 20
    }
  }'
```

**cURL — Ajustar apenas revistoria (ativar envio de vídeo):**

```bash
curl -X PATCH https://mcpfinanceiro-production.up.railway.app/api/v1/clientes/SEU_CLIENTE_UUID/configuracoes \
  -H "Content-Type: application/json" \
  -d '{
    "configuracoes_revistoria": {
      "enviar_midia": true,
      "video_moto": "https://exemplo.com/video-moto.mp4",
      "video_carro": "https://exemplo.com/video-carro.mp4"
    }
  }'
```

**Resposta (200):**

```json
{"message":"Configurações atualizadas com sucesso"}
```

**Resposta (404):** `{"error":"Cliente não encontrado"}`.

---

### Webhook — Processar boleto por placa

**POST** `/api/v1/webhook` — Recebe placa e telefone, consulta SGA, envia PIX/PDF ou retorna mensagem de regularização/revistoria. Resposta é um texto para o agente de IA (ex.: LLM).

**Body (JSON):**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `placa` | string | sim | Placa do veículo |
| `telefone` | string | sim | Telefone (com DDD, só números ou formatado) |
| `client_id` | string (UUID) | não* | ID do cliente. *Obrigatório no body ou no header `X-Client-Id` |

**cURL — Com client_id no body:**

```bash
curl -X POST https://mcpfinanceiro-production.up.railway.app/api/v1/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "placa": "ABC1D23",
    "telefone": "5581999999999",
    "client_id": "SEU_CLIENTE_UUID"
  }'
```

**cURL — Com client_id no header (recomendado para integração com agente):**

```bash
curl -X POST https://mcpfinanceiro-production.up.railway.app/api/v1/webhook \
  -H "Content-Type: application/json" \
  -H "X-Client-Id: SEU_CLIENTE_UUID" \
  -d '{"placa":"ABC1D23","telefone":"5581999999999"}'
```

**Resposta (200):**

```json
{"message":"Boleto e pix enviados! Data: 20/02/2026, Valor: R$ 150,00"}
```

ou, em caso de regularização (revistoria):

```json
{"message":"Isto é imprescindível: Acione a habilidade de Pendência de Revistoria quando identificar inadimplência no veículo.\n\nEstamos enviando o vídeo modelo para regularização."}
```

Outras mensagens possíveis: `"Veículo não encontrado."`, `"Boleto já foi baixado."`, `"Cliente não encontrado ou inativo."`, ou mensagem de erro da API SGA.

**Resposta (400):** `{"error":"client_id é obrigatório (body ou header X-Client-Id)"}` ou erros de validação (placa/telefone).

---

## Resumo das regras de negócio

- **Janela de boletos:** entre `(hoje - dias_antes_vencimento)` e `(hoje + dias_depois_vencimento)`. Soma máxima 50 dias.
- **Envio direto:** se a situação do veículo estiver em `situacoes_envio_direto`, envia PIX e link do boleto e retorna `response_sucesso`.
- **Checagem de vencimento:** se a situação estiver em `situacoes_com_checagem_vencimento` e o boleto estiver vencido há mais de `dias_checagem_vencimento` dias, retorna mensagem de regularização (com prefixo de instrução para a IA).
- **Revistoria:** em fluxos de regularização, a resposta inclui um prefixo fixo para o agente de IA (“Pendência de Revistoria”). Se `enviar_midia` estiver ativo e houver `video_moto`/`video_carro`, o vídeo é enviado pelo Atomos (sem texto junto ao vídeo).

---

## Scripts

| Comando | Descrição |
|--------|-----------|
| `npm run dev` | Inicia em modo watch (desenvolvimento) |
| `npm run start` | Inicia em produção |
| `npm run build` | Compila TypeScript |
| `npm run typecheck` | Verifica tipos sem gerar arquivos |
