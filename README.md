# MCP Financeiro - API Multi-Empresas

Servidor API em Node.js + TypeScript + Hono para orquestrar integrações SGA (Hinova) e Chat Atomos em modelo SaaS multi-empresas.

## Pré-requisitos

- Node.js 18+
- Conta Supabase
- Tokens: token_erp (Hinova SGA), token_chat e token_canal (Atomos)

## Setup

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
```

### 3. Executar migrations no Supabase

No [Supabase Dashboard](https://supabase.com/dashboard) > SQL Editor, execute o conteúdo do arquivo:

`supabase/migrations/001_initial_schema.sql`

### 4. Iniciar o servidor

```bash
npm run dev
```

O servidor estará em `http://localhost:3000`.

## Endpoints

### POST /api/v1/clientes

Cadastra um cliente com todas as configurações em uma única chamada.

**Body:**

```json
{
  "nome": "Cliente X",
  "ativo": true,
  "token_erp": "...",
  "token_chat": "...",
  "token_canal": "...",
  "perfil_sistema": "SGA",
  "base_url": "https://api.hinova.com.br/api/sga/v2",
  "configuracoes_boleto": {
    "dias_antes_vencimento": 15,
    "dias_depois_vencimento": 5,
    "situacoes_envio_direto": ["ATIVO"],
    "situacoes_com_checagem_vencimento": ["INADIMPLENTE"],
    "dias_checagem_vencimento": 2
  },
  "configuracoes_respostas": {
    "response_sucesso": "Boleto e pix enviados! Vencimento: {{ data_vencimento }} Valor: {{ valor_boleto }}",
    "response_regularizacao_moto": "...",
    "response_regularizacao_veiculo": "...",
    "response_boleto_baixado": "..."
  },
  "configuracoes_revistoria": {
    "enviar_midia": true,
    "video_moto": "https://...",
    "video_carro": "https://..."
  }
}
```

### POST /api/v1/webhook

Recebe eventos do agente de IA (placa, telefone) e processa o fluxo de boleto.

**Body ou Header X-Client-Id:**

```json
{
  "placa": "NPU0901",
  "telefone": "83998700386",
  "client_id": "uuid-do-cliente"
}
```

**Response:** `{ "message": "..." }` - texto formatado para a LLM.

### PATCH /api/v1/clientes/:id/configuracoes

Atualiza configurações parciais de um cliente.

## Scripts

- `npm run dev` - Inicia em modo watch
- `npm run start` - Inicia em produção
- `npm run typecheck` - Verifica tipos TypeScript
