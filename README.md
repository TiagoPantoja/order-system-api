<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<h1 align="center">Order System</h1>

<p align="center">
  <strong>Sistema de Gestao de Pedidos</strong>
</p>

<p align="center">
  <!-- Substituir <OWNER>/<REPO> pelos valores reais quando fazer push -->
  <a href="https://github.com/seu-usuario/order-system-api/actions/workflows/ci.yml" target="_blank">
    <img src="https://github.com/seu-usuario/order-system-api/actions/workflows/ci.yml/badge.svg" alt="CI/CD Status" />
  </a>
  <a href="https://nodejs.org/" target="_blank">
    <img src="https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen?logo=node.js" alt="Node.js" />
  </a>
  <a href="https://www.typescriptlang.org/" target="_blank">
    <img src="https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript" alt="TypeScript" />
  </a>
  <a href="LICENSE" target="_blank">
    <img src="https://img.shields.io/badge/license-MIT-green" alt="License" />
  </a>
</p>

---

## Descricao do Projeto

Uma **API GraphQL de sistema de gestao de pedidos** construida com:
- **NestJS** framework para Node.js
- **TypeScript** com tipagem estatica
- **Prisma**, ORM para PostgreSQL
- **PostgreSQL**, banco de dados relacional
- **GraphQL Apollo** server para API flexivel
- **Docker** para ambiente de desenvolvimento e testes

Alem disso, a API possui controle de concorrencia para evitar overselling de produtos usando **Atomic WHERE Validation**, validacao atomica no banco de dados sem bloqueios.

## Inicio Rapido do Projeto

Siga um dos fluxos abaixo para iniciar o projeto: com Docker (recomendado) ou localmente sem Docker.

### Requisitos
- Docker & Docker Compose
- Node.js 20+ e npm

---

### 1) Usando Docker (recomendado)

Opcao Rapida — subir API e banco em containers (recomendado)

```bash
# 1. Copiar o exemplo de env
cp .env.example .env

# 2. Subir os servicos em background para construir a imagem
docker compose up -d --build

# 3. Dentro do container da API: instalar deps, gerar Prisma client e aplicar migrations
docker compose run --rm api sh -c "npm install && npx prisma generate && npx prisma migrate deploy"
```

Opcao para desenvolvimento local com hot-reload (subir so o DB em container)

```bash
# 1. Copiar o exemplo de env
cp .env.example .env

# 2. Subir apenas o Postgres
docker compose up -d db

# 3. No host: instalar deps, gerar Prisma client e aplicar migrations
npm install
npx prisma generate
npx prisma migrate deploy

# 4. Rodar API localmente (hot-reload)
npm run start:dev
```

Abra: http://localhost:3000/graphql

---

### 2) Sem Docker (rodando tudo localmente)

```bash
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate deploy
npm run start:dev
```

Abra: http://localhost:3000/graphql

---

### 3) Testes

```bash
# Testes Unitarios
npm run test

# Testes E2E (DB precisa estar rodando: `docker compose up -d db`)
npm run test:e2e
```

---

## Comandos Disponiveis

### Desenvolvimento
```bash
npm run start          # Iniciar servidor
npm run start:dev      # Modo watch (desenvolvimento)
```

### Testes
```bash
npm run test           # Testes unitarios
npm run test:watch    # Testes em modo watch
npm run test:cov      # Testes com coverage
npm run test:e2e      # Testes E2E
```

### Banco de dados
```bash
npx prisma studio         # Visualizador do Prisma
npx prisma migrate dev    # Criar nova migration
npx prisma migrate deploy # Deploy de migrations
```

---

## Arquitetura do Projeto

O projeto segue **Arquitetura Hexagonal** com separacao de responsabilidades:

```
src/
├── domain/
│   ├── entities/              # Entidades do dominio (User, Product, Order)
│   ├── exceptions/            # Excecoes de negocio
│   └── repositories/          # Interfaces dos repositorios (Portas)
├── application/
│   └── use-cases/             # Casos de uso (logica de negocio)
├── infrastructure/
│   └── database/              # Implementacao dos repositorios (Adaptadores)
└── presentation/
    └── graphql/               # Resolvers GraphQL (Adaptadores)
```

### Beneficios da Arquitetura Hexagonal
- **Independencia de frameworks:** Logica de negocio isolada
- **Testabilidade:** Facil mock de dependencias
- **Manutenibilidade:** Separacao clara de responsabilidades
- **Escalabilidade:** Facil adicionar novos casos de uso

---

## Controle de Concorrencia

### Problema
Em operacoes simultaneas, multiplos pedidos podem levar o estoque a valores negativos (overselling).

```
Exemplo:
  Produto: Notebook (estoque = 1)
  Pedido A: 1 unidade
  Pedido B: 1 unidade (chegam simultaneamente)

  Sem protecao:
    - A le estoque (1)
    - B le estoque (1)
    - A decrementa -> estoque = 0
    - B decrementa -> estoque = -1 (NEGATIVO!)
```

### Solucao: Atomic WHERE Validation (Otimista)

**Implementado em:** `src/infrastructure/database/prisma-product.repository.ts`

Usamos **validacao atomica no banco de dados** — condicao de atualizacao combinada com operacao em uma unica query:

```typescript
async decrementStock(id: string, quantity: number): Promise<boolean> {
  // Operacao atomica: so decrementa se stock >= quantity
  const { count } = await this.prisma.product.updateMany({
    where: {
      id: id,
      stock: { gte: quantity },  // Condicao atomica
    },
    data: {
      stock: { decrement: quantity },
    },
  });

  return count > 0;  // Retorna sucesso (1) ou falha (0)
}
```

**SQL puro:**
```sql
UPDATE products
SET stock = stock - $1
WHERE id = $2 AND stock >= $3
-- Retorna: numero de linhas atualizadas (0 ou 1)
```

### Por que a solucao atomica e superior ao SQL puro?

| Aspecto | Atomic WHERE | Pessimistic Lock |
|---------|-----------|------------------|
| **Seguranca** | Impossivel negativo | Impossivel negativo |
| **Performance** |  Uma query | Multiplas + bloqueios |
| **Escalabilidade** |  Sem contencao | Com bloqueios |
| **Simplicidade** | 5 linhas | Transacoes explicitas |
| **Deadlock Risk** | Nenhum |  Qualidade de codigo

### Exemplo de Fluxo Seguro

```
Timeline | Pedido A                    | Pedido B              | Stock
---------|-----------------------------+----------------------+-------
0ms      | Le produto (stock=1)        |                      | 1
1ms      |                             | Le produto (stock=1) | 1
2ms      | updateMany(WHERE qty<=1)    |                      |
3ms      |    count=1, sucesso         |                      | 0
4ms      |                             | updateMany(...)      |
5ms      |                             |    count=0, falha    | 0

Resultado: 1 sucesso, 1 rejeicao com erro apropriado
```
---

## Estrutura das Entidades

### Users
```graphql
{
  id: ID!
  name: String!
  email: String!
  createdAt: DateTime!
  orders: [Order!]!
}
```

### Products
```graphql
{
  id: ID!
  name: String!
  price: Float!
  stock: Int!
  createdAt: DateTime!
  orderItems: [OrderItem!]!
}
```

### Orders
```graphql
{
  id: ID!
  userId: ID!
  status: OrderStatus!
  totalValue: Float!
  createdAt: DateTime!
  user: User!
  items: [OrderItem!]!
}
```

### OrderItems
```graphql
{
  id: ID!
  orderId: ID!
  productId: ID!
  quantity: Int!
  priceAtTime: Float!
  product: Product!
  order: Order!
}
```

---

## Testes

### Suite de Testes
- **Unitarios:** Casos de uso isolados com mock de repositorios
- **E2E:** Fluxo completo com banco de dados conteinerizado
- **Concorrencia:** Validacao de race conditions com multiplas requisicoes simultaneas

### Executar testes
```bash
# Todos
npm run test && npm run test:e2e

# Com coverage
npm run test:cov
```

---

## CI/CD

O projeto possui pipeline **GitHub Actions** no arquivo `/.github/workflows/ci.yml` que executa em cada PR:

- Checkout do codigo
- Setup de Node.js
- Instalar dependencias
- **Lint** (ESLint com erros)
- **Build** (Compilar TypeScript)
- **Migrations** (Executar Prisma)
- **Testes unitarios** (Jest)
- **Testes E2E** (Jest E2E)
- **Coverage** (Codecov)

---

## Trade-offs e Decisoes

### 1. Prisma vs SQL Puro
- **Escolha:** Prisma com fallback para `$queryRaw` onde necessario
- **Razao:** Type-safety + migrations automaticas, com controle via SQL puro para pessimistic lock
- **Trade-off:** Pequena curva de aprendizado vs. produtividade

### 2. Atomic WHERE Validation vs Pessimistic Lock vs Optimistic Concurrency
- **Escolha:** Atomic WHERE Validation
- **Implementacao:** Condicao na clausula WHERE + atualizacao atomica
- **Razoes:**
  - Performance excelente (sem bloqueios, sem retry loops)
  - Impossivel race conditions (banco garante atomicidade)
  - Simples e elegante (5 linhas de codigo)
  - Escalavel sob alta concorrencia
  - Zero deadlock risk
- **Trade-off:** Aplicacao valida `count === 0` para tratamento de erro

### 4. Logs Estruturados (Pino)
- **Escolha:** Pino para logs JSON estruturados
- **Razao:** Melhor para observabilidade em producao
- **Trade-off:** Menos legivel em desenvolvimento (mitigado com pino-pretty)

---

## O que Faria Diferente com Mais Tempo

#### 1. **Implementar status de Pedidos**
```typescript
enum OrderStatus {
  PENDING = "pending",          // Criado, aguardando confirmacao
  CONFIRMED = "confirmed",      // Confirmado, pronto para envio
  SHIPPED = "shipped",          // Despachado
  DELIVERED = "delivered",      // Entregue
  CANCELLED = "cancelled"       // Cancelado
}
```

Adicionar ao schema Prisma para rastreamento de ciclo de vida do pedido.

Permite rastreabilidade e conformidade regulatoria.

#### 2. **Autenticacao JWT**
```typescript
@UseGuards(JwtAuthGuard)
@Mutation(() => OrderType)
async createOrder(@CurrentUser() user: User, @Args('input') input: CreateOrderInput) {
  // Aplicar criar-pedido apenas ao usuario autenticado
  return this.createOrderUseCase.execute(input, user.id);
}
```

Seguranca e isolamento de dados entre usuarios.

#### 3. **Cache com Redis**
```typescript
@Query(() => [ProductType])
@Cacheable('products', 300)  // Cache 5 minutos
async products() {
  return this.productRepository.findAll();
}
```

Reduzir carga no BD, melhorar latencia.

#### 4. **Webhooks para Notificacoes**
```typescript
// Quando pedido e criado
await this.webhookService.trigger('order.created', {
  orderId: order.id,
  userId: order.userId,
  total: order.total
});
```

Integracao com sistemas de email, SMS, notificacoes.

#### 5. **Mensageria (RabbitMQ/Kafka)**
Processar pedidos assincronamente com garantia de ordem por produto:
- Escalabilidade horizontal
- Resiliencia
- Processamento sequencial por produto

