# 🚀 FASE 7: AUTOMAÇÃO CI/CD - PLANO DETALHADO

**Objetivo:** Implementar pipeline CI/CD com GitHub Actions  
**Tempo estimado:** 2-3 horas  
**Status:** ✅ A INICIAR

---

## 📋 O QUE DIZ O PLANO DE AÇÃO

Conforme `action-plan.md`:

```
Fase 7: Automação CI/CD (Diferencial)

GitHub Actions: Criar o arquivo .github/workflows/ci.yml.

Pipeline: Configurar o workflow para ser disparado em push e pull requests 
para a branch master. O pipeline deverá subir o banco no Actions, rodar o lint, 
compilar o TypeScript e executar toda a suíte de testes.
```

---

## 🎯 ESCOPO DA FASE 7

### Etapas do Pipeline CI/CD

```
1. Checkout do código
2. Setup Node.js e npm
3. Instalar dependências
4. Lint (ESLint com erros)
5. Compilar TypeScript
6. Setup do PostgreSQL (via container)
7. Rodar migrations do Prisma
8. Testes unitários (Jest)
9. Testes E2E (Jest E2E)
10. Gerar coverage report
11. Upload de artefatos (opcional)
```

---

## 📊 ESTRUTURA DE PASSOS

```
PASSO 1: Preparar Estrutura
└─ Criar .github/workflows/

PASSO 2: Criar CI Workflow
├─ Setup Node.js
├─ Cache de dependências
├─ Lint
├─ Build
└─ Testes

PASSO 3: Configurar Database
├─ PostgreSQL Service Container
├─ Migrations Prisma
└─ Env vars para teste

PASSO 4: Testes
├─ Testes Unitários
├─ Testes E2E
└─ Coverage Report

PASSO 5: Deploy (Opcional)
└─ Análise de sucesso

RESULTADO: ✅ Fase 7 Completa
```

---

## 🔍 TAREFAS ESPECÍFICAS

### **TAREFA 1: Criar estrutura de diretórios**

```bash
mkdir -p .github/workflows
```

### **TAREFA 2: Criar arquivo ci.yml**

**Arquivo:** `.github/workflows/ci.yml`

**Descrição:** Define o workflow completo de CI/CD

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [master, main, develop]
  pull_request:
    branches: [master, main, develop]

env:
  NODE_VERSION: '20'
  DATABASE_URL: 'postgresql://root:rootpassword@localhost:5433/orders_db?schema=public'

jobs:
  test:
    runs-on: ubuntu-latest
    
    # PostgreSQL Service Container
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: root
          POSTGRES_PASSWORD: rootpassword
          POSTGRES_DB: orders_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5433:5432

    steps:
      # 1. Checkout
      - name: 📥 Checkout código
        uses: actions/checkout@v4

      # 2. Setup Node.js
      - name: 📦 Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      # 3. Instalar dependências
      - name: 📚 Instalar dependências
        run: npm ci

      # 4. Lint com erros na CI
      - name: 🔍 Lint (ESLint)
        run: npm run lint:ci
        env:
          CI: true

      # 5. Build TypeScript
      - name: 🔨 Compilar TypeScript
        run: npm run build

      # 6. Aguardar banco de dados
      - name: ⏳ Aguardar PostgreSQL
        run: |
          until pg_isready -h localhost -p 5433 -U root; do
            echo 'Aguardando banco de dados...'
            sleep 1
          done
        env:
          PGPASSWORD: rootpassword

      # 7. Executar migrations
      - name: 📋 Executar migrations Prisma
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ env.DATABASE_URL }}

      # 8. Testes Unitários
      - name: ✅ Testes Unitários
        run: npm run test -- --passWithNoTests
        env:
          NODE_ENV: test

      # 9. Testes E2E
      - name: 🧪 Testes E2E
        run: npm run test:e2e -- --passWithNoTests
        env:
          NODE_ENV: test

      # 10. Coverage Report (Opcional)
      - name: 📊 Gerar Coverage Report
        run: npm run test:cov
        env:
          NODE_ENV: test
        continue-on-error: true

      # 11. Upload Coverage (Opcional - Codecov)
      - name: 📤 Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          flags: unittests
          name: codecov-umbrella
        continue-on-error: true

      # 12. Sucesso
      - name: ✨ Pipeline Concluído
        run: echo "✅ CI/CD Pipeline executado com sucesso!"
```

---

### **TAREFA 3: Adicionar scripts de CI ao package.json**

**Verificar se existe:** `npm run lint:ci`

Se não existir, adicionar ao `package.json`:

```json
{
  "scripts": {
    "lint:ci": "eslint \"{src,apps,libs,test}/**/*.ts\" --max-warnings=0"
  }
}
```

---

### **TAREFA 4: Configurar ESLint para CI**

**Arquivo:** `eslint.config.mjs`

**Já existe a lógica?** Verificar se há:

```javascript
const isCI = !!process.env.CI;
```

Se não, adicionar configuração para modo CI estrito.

---

### **TAREFA 5: Verificar variáveis de ambiente**

**Arquivo:** `.env.example` (criar se não existir)

```env
DATABASE_URL="postgresql://root:rootpassword@localhost:5433/orders_db?schema=public"
NODE_ENV="development"
```

---

## 🧪 TESTE LOCAL DO WORKFLOW

Para testar o workflow localmente antes de fazer push:

```bash
# Instalar act (ferramenta para rodar GitHub Actions localmente)
brew install act

# Rodar o workflow localmente
act push -j test
```

---

## ✅ CHECKLIST DE TAREFAS

- [ ] Criar diretório `.github/workflows`
- [ ] Criar arquivo `.github/workflows/ci.yml`
- [ ] Adicionar script `lint:ci` ao package.json
- [ ] Verificar ESLint configurado para CI
- [ ] Criar `.env.example` com variáveis
- [ ] Testar workflow localmente com `act`
- [ ] Fazer push para GitHub
- [ ] Verificar execução no GitHub Actions
- [ ] Confirmar sucesso de todos os jobs
- [ ] Adicionar badge de status ao README

---

## 🎯 RESULTADO ESPERADO

Após completar:

✅ Pipeline executado em push/PR  
✅ Lint rodando com erro em CI  
✅ Testes unitários passando  
✅ Testes E2E passando  
✅ Coverage report gerado  
✅ Badge de status no README  
✅ Deployable na main  

**Score de conclusão Fase 7: 100%** 🎉

---

## 📈 PRÓXIMAS FASES

- **Fase 8:** Documentação Final (README, troubleshooting)
- **Fase 9:** Otimizações e Deploy em Produção

---

**Status Atual:**
- ✅ Fase 1-6 Concluídas
- 🚀 Fase 7 Pronta para Iniciar

