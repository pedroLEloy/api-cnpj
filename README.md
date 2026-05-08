# Consulta CNPJ — Multi-fonte

Aplicação web para consulta de CNPJ na Receita Federal usando **duas fontes públicas em cascata**:

- **OpenCNPJ** (primária) — 100 req/min, dados do dump mensal da RFB.
- **ReceitaWS** (fallback) — 3 req/min, dado fresco direto do site da Receita.

Para cada consulta, o servidor tenta a OpenCNPJ primeiro. Se ela não tem o CNPJ (recém-criado, fora do dump) ou está fora do ar, cai automaticamente para a ReceitaWS. A tabela mostra qual fonte respondeu cada linha.

Inclui:

- **Busca manual** — um CNPJ por vez, com validação de dígitos verificadores antes de chamar a API.
- **Busca em lote** — cole uma lista vinda do Excel; respeita os 100 req/min da fonte primária.
- **Detecção visual de inválidos** — entradas com formato errado aparecem destacadas em vermelho com o motivo, sem ir pra API.
- **Tabela de resultados** com filtro, contagem de sucessos/erros, badge de fonte por linha e exportação para `.xlsx`.

Stack: **Next.js 14** (App Router) + **Tailwind** + **SheetJS** (xlsx).

---

## Por que duas fontes?

OpenCNPJ tem rate limit ~33x maior, mas usa dumps mensais — então CNPJs criados nos últimos 30 dias podem não estar lá, e mudanças recentes de situação (ex.: empresa que acabou de virar inapta) só aparecem no próximo dump. ReceitaWS consulta a Receita em tempo real, mas só permite 3/min.

A combinação dá:

- **Throughput alto** na maioria dos casos (OpenCNPJ resolve sozinha).
- **Frescor garantido** quando OpenCNPJ falha (ReceitaWS preenche).
- **Transparência** — cada resultado mostra qual fonte respondeu, então o analista sabe se o dado é do dump (até 30 dias defasado) ou em tempo real.

### Limitações

- OpenCNPJ é mantida por uma pessoa (projeto comunitário). Pode mudar limites ou ficar fora do ar; quando isso acontece, o fallback assume.
- OpenCNPJ não retorna o campo `porte` da empresa — se você precisa desse campo sempre, o ideal é forçar consulta na ReceitaWS para esses casos (não implementado nesta versão).

---

## Como funciona o rate limit

A busca em lote usa uma **janela deslizante** (`lib/rateLimiter.js`) configurada para 100 req/min — o limite da fonte primária. ReceitaWS não tem rate limiter cliente-side; quando ela é chamada (fallback) e estoura os 3/min, o servidor devolve erro 429 e a linha aparece como erro na tabela. O analista pode re-consultar essas CNPJs depois de um minuto.

> **Atenção:** os limites são por IP. No Vercel, todas as requisições saem do IP da serverless function, então o limite é compartilhado entre os usuários da app.

---

## Rodando localmente

```bash
git clone <url-do-seu-repo>
cd consulta-cnpj
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

---

## Deploy no Vercel via GitHub

1. Suba o projeto pro GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: consulta CNPJ multi-fonte"
   git branch -M main
   git remote add origin git@github.com:seu-usuario/consulta-cnpj.git
   git push -u origin main
   ```

2. Em https://vercel.com/new, importe o repositório. O Vercel detecta o Next.js automaticamente — pode aceitar todos os defaults. Não precisa configurar variáveis de ambiente.

3. Em ~1 minuto a aplicação está no ar em `https://<seu-projeto>.vercel.app`.

Cada `git push` para `main` dispara um novo deploy automático.

### Token pago da ReceitaWS (opcional)

Se assinar o plano pago, configure `RECEITAWS_TOKEN` em **Settings → Environment Variables**. O adapter `lib/adapters/receitaws.js` injeta o `Authorization: Bearer <token>` automaticamente.

---

## Estrutura do projeto

```
consulta-cnpj/
├── app/
│   ├── api/cnpj/[cnpj]/route.js   ← orquestra OpenCNPJ → ReceitaWS
│   ├── components/
│   │   ├── ManualSearch.js        ← busca individual
│   │   ├── BulkSearch.js          ← busca em lote + rate limiter 100/min
│   │   └── ResultsTable.js        ← tabela + badge de fonte + export
│   ├── globals.css                ← Tailwind + tipografia
│   ├── layout.js
│   └── page.js                    ← página principal
├── lib/
│   ├── adapters/
│   │   ├── opencnpj.js            ← fonte primária + normalização
│   │   └── receitaws.js           ← fonte fallback + normalização
│   ├── cnpj.js                    ← sanitize, format, isValid, analyzeList
│   ├── rateLimiter.js             ← janela deslizante
│   └── exportXlsx.js              ← geração do arquivo .xlsx
├── package.json, next.config.js, tailwind.config.js, postcss.config.js, jsconfig.json
```

### Formato canônico

Os dois adapters normalizam suas respostas para o mesmo schema (baseado nos nomes da ReceitaWS), com um campo extra `_source` indicando a origem:

```js
{
  cnpj, nome, fantasia, tipo, porte, abertura, natureza_juridica,
  capital_social, situacao, data_situacao, motivo_situacao,
  situacao_especial, data_situacao_especial,
  atividade_principal: [{ code, text }],
  atividades_secundarias: [{ code, text }],
  qsa: [{ nome, qual }],
  email, telefone, logradouro, numero, complemento, bairro,
  municipio, uf, cep, efr, ultima_atualizacao,
  _source: 'opencnpj' | 'receitaws',
}
```

---

## Campos exportados no XLSX

CNPJ, Status, **Fonte**, Mensagem de erro, Razão social, Nome fantasia, Tipo, Porte, Natureza jurídica, Abertura, Capital social, Atividade principal, Atividades secundárias, Logradouro, Número, Complemento, Bairro, Município, UF, CEP, Telefone, Email, Data situação, Motivo situação, Situação especial, EFR, QSA, Última atualização.

---

## Nota sobre a dependência `xlsx`

O projeto usa `xlsx@0.18.5` do registro npm. Funciona perfeitamente para gerar planilhas a partir de dados confiáveis (que é o caso aqui — só **escrevemos** XLSX, nunca lemos). As CVEs de 0.18.5 são relacionadas a *parsing* de arquivos enviados por usuários e não se aplicam a este caso de uso.

Se preferir a versão mais nova (0.20+), troque a linha em `package.json`:
```json
"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"
```
