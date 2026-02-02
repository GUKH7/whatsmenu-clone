# WhatsMenu - Cardápio Digital (SaaS Multi-tenant)

Web App para restaurantes terem cardápios digitais personalizados. Arquitetura **tenant isolation**: cada restaurante tem slug único e clientes se cadastram por restaurante.

## Stack

- **Framework:** Next.js 14+ (App Router)
- **Linguagem:** TypeScript
- **Estilização:** Tailwind CSS (mobile-first)
- **Banco & Auth:** Supabase
- **Ícones:** Lucide-react

## Pré-requisitos

- Node.js 18+
- Conta [Supabase](https://supabase.com)

## Setup

1. **Instalar dependências**

   ```bash
   npm install
   ```

2. **Variáveis de ambiente**

   Copie o exemplo e preencha com os dados do seu projeto Supabase:

   ```bash
   cp .env.local.example .env.local
   ```

   Em `.env.local`:

   - `NEXT_PUBLIC_SUPABASE_URL`: URL do projeto (Settings → API)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: chave anon/public

3. **Schema no Supabase**

   No [SQL Editor](https://supabase.com/dashboard/project/_/sql) do seu projeto, execute o conteúdo de:

   `supabase/migrations/001_initial_schema.sql`

4. **Rodar em desenvolvimento**

   ```bash
   npm run dev
   ```

   Acesse [http://localhost:3000](http://localhost:3000).

## Estrutura do projeto

```
src/
├── app/              # App Router (pages, layout)
├── lib/
│   └── supabase/     # Cliente Supabase (browser + server) e tipos
supabase/
└── migrations/       # SQL inicial (restaurants, categories, products, customers)
```

## Rotas previstas (arquitetura)

- `/` – Landing
- `/[slug]` – Cardápio público do restaurante (ex: `/hamburgueria-do-ze`)
- Carrinho em localStorage → checkout → mensagem WhatsApp

## Scripts

| Comando   | Descrição           |
|----------|---------------------|
| `npm run dev`   | Servidor de desenvolvimento |
| `npm run build` | Build de produção   |
| `npm run start` | Servidor de produção |
| `npm run lint`  | ESLint              |
