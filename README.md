# Consulta CNPJ — ReceitaWS

Aplicação web para consulta de CNPJ na Receita Federal via [ReceitaWS](https://receitaws.com.br/api), com:

- **Busca manual** — um CNPJ por vez, com validação de dígitos verificadores antes de chamar a API.
- **Busca em lote** — cole uma lista vinda do Excel, o app respeita automaticamente o limite de **3 requisições por minuto** do tier gratuito.
- **Tabela de resultados** com filtro, contagem de sucessos/erros e exportação para `.xlsx`.

Stack: **Next.js 14** (App Router) + **Tailwind** + **SheetJS** (xlsx). Pensado para deploy no **Vercel**.

---

## Como funciona o rate limit

A ReceitaWS gratuita aceita 3 chamadas por minuto por IP. O componente de busca em lote usa uma **janela deslizante** (`lib/rateLimiter.js`):

- Mantém os timestamps das últimas chamadas.
- Antes de cada nova requisição, descarta os timestamps fora da janela de 60s.
- Se ainda há 3 timestamps dentro da janela, espera o mais antigo "expirar" + 1s de buffer.

Isso significa que as 3 primeiras CNPJs vão muito rápido, e a partir daí o app trava em ~20s entre chamadas. A UI mostra o que está sendo consultado, quanto tempo falta para a próxima janela e o ETA do lote.

> **Atenção:** o limite é por IP. Como em produção (Vercel) as requisições saem do IP da serverless function, o limite vale para a aplicação inteira, não por usuário. Se mais de uma pessoa usar simultaneamente, o limite é compartilhado. Para uso interno por uma equipe pequena, isso normalmente não é problema; se virar, o caminho é assinar o plano pago da ReceitaWS e usar o token (veja `.env.example`).

---

## Rodando localmente

Pré-requisitos: **Node.js 18+** e npm.

```bash
git clone <url-do-seu-repo>
cd consulta-cnpj
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

---

## Deploy no Vercel via GitHub

1. **Crie o repositório no GitHub** e suba este projeto:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: consulta CNPJ"
   git branch -M main
   git remote add origin git@github.com:seu-usuario/consulta-cnpj.git
   git push -u origin main
   ```

2. **No painel do Vercel** (https://vercel.com/new):
   - Clique em **Import Git Repository** e selecione o repositório.
   - O Vercel detecta o Next.js automaticamente — pode aceitar todos os defaults.
   - Não precisa configurar variáveis de ambiente para o tier gratuito da ReceitaWS.
   - Clique em **Deploy**.

3. Em ~1 minuto a aplicação está no ar em `https://<seu-projeto>.vercel.app`.

Cada `git push` para `main` dispara um novo deploy automático.

### Token pago da ReceitaWS (opcional)

Se um dia você assinar o plano pago, basta configurar a variável `RECEITAWS_TOKEN` em **Settings → Environment Variables** no Vercel. A API route (`app/api/cnpj/[cnpj]/route.js`) já injeta o `Authorization: Bearer <token>` automaticamente quando a variável existe.

---

## Estrutura do projeto

```
consulta-cnpj/
├── app/
│   ├── api/cnpj/[cnpj]/route.js   ← proxy para ReceitaWS (resolve CORS)
│   ├── components/
│   │   ├── ManualSearch.js        ← busca individual
│   │   ├── BulkSearch.js          ← busca em lote + rate limiter
│   │   └── ResultsTable.js        ← tabela + exportação XLSX
│   ├── globals.css                ← Tailwind + tipografia
│   ├── layout.js
│   └── page.js                    ← página principal
├── lib/
│   ├── cnpj.js                    ← sanitize, format, isValid, parseList
│   ├── rateLimiter.js             ← janela deslizante 3/min
│   └── exportXlsx.js              ← geração do arquivo .xlsx
├── package.json
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
└── jsconfig.json
```

---

## Por que Next.js e não Create React App / Vite?

Dois motivos práticos:

1. **CORS.** A ReceitaWS não permite chamadas diretas do navegador. Você *precisa* de um backend para fazer proxy. As **API Routes** do Next.js são exatamente isso, sem precisar manter um servidor separado.

2. **Vercel.** O Vercel é a empresa que mantém o Next.js — o stack é otimizado para esse deploy. Build, serverless functions, rotas dinâmicas e cache funcionam sem configuração.

Você ainda escreve React puro nos componentes — o Next.js só adiciona o roteamento e a parte de servidor.

---

## Campos exportados no XLSX

CNPJ, Status, Mensagem de erro, Razão social, Nome fantasia, Tipo, Porte, Natureza jurídica, Abertura, Capital social, Atividade principal, Atividades secundárias, Logradouro, Número, Complemento, Bairro, Município, UF, CEP, Telefone, Email, Data situação, Motivo situação, Situação especial, EFR, QSA, Última atualização.

Atividades secundárias e QSA são concatenados com `|` para caber em uma célula.

---

## Nota sobre a dependência `xlsx`

O projeto usa `xlsx@0.18.5` do registro npm. Essa é a última versão da SheetJS disponível no npm — ela funciona perfeitamente para o que essa app faz (gerar planilhas a partir de dados confiáveis vindos da ReceitaWS), e tem a vantagem de instalar em qualquer ambiente sem configuração extra.

Versões mais recentes (0.20+) só são distribuídas pelo CDN oficial da SheetJS. Se você quiser atualizar, troque a linha em `package.json`:

```json
"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"
```

As CVEs reportadas para 0.18.5 são relacionadas a *parsing* de arquivos `.xlsx` enviados por usuários, o que esta aplicação **não faz** (ela apenas escreve arquivos). Na prática o risco é nulo neste contexto, mas se o seu setor de TI bloqueia pacotes com CVEs no scan automatizado, atualize para o CDN.

