<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<h1 align="center">Order System</h1>

<p align="center">
  <strong>Sistema de Gestão de Pedidos</strong>
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

## Descrição do Projeto

Uma **API GraphQL de sistema de gestão de pedidos** construída com:
- **NestJS** framework para Node.js
- **TypeScript** com tipagem estática
- **Prisma**, ORM para PostgreSQL
- **PostgreSQL**, banco de dados relacional
- **GraphQL Apollo** server para API flexível
- **Docker** para ambiente de desenvolvimento e testes

Além disso, a API possui controle de concorrência para evitar overselling de produtos usando **Atomic WHERE Validation**, validação atômica no banco de dados sem bloqueios.

## Início Rápido do Projeto

Siga um dos fluxos abaixo para iniciar o projeto: com Docker (recomendado) ou localmente sem Docker.

### Requisitos
- Docker & Docker Compose
- Node.js 20+ e npm

---

### 1) Usando Docker (recomendado)

Opção Rápida — subir API e banco em containers (recomendado)

```bash
# 1. Copiar o exemplo de env
cp .env.example .env

# 2. Subir os serviços em background para construir a imagem
docker compose up -d --build

# 3. Dentro do container da API: instalar deps, gerar Prisma client e aplicar migrations
docker compose run --rm api sh -c "npm install && npx prisma generate && npx prisma migrate deploy"
```

Opção para desenvolvimento local com hot-reload (subir só o DB em container)

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
# Testes Unitários
npm run test

# Testes E2E (DB precisa estar rodando: `docker compose up -d db`)
npm run test:e2e
```

---

## Comandos Disponíveis

### Desenvolvimento
```bash
npm run start          # Iniciar servidor
npm run start:dev      # Modo watch (desenvolvimento)
```

### Testes
```bash
npm run test           # Testes unitários
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

O projeto segue **Arquitetura Hexagonal** com separação de responsabilidades:

```
src/
├── domain/
│   ├── entities/              # Entidades do domínio (User, Product, Order)
│   ├── exceptions/            # Exceções de negócio
│   └── repositories/          # Interfaces dos repositórios (Portas)
├── application/
│   └── use-cases/             # Casos de uso (lógica de negócio)
├── infrastructure/
│   └── database/              # Implementação dos repositórios (Adaptadores)
└── presentation/
    └── graphql/               # Resolvers GraphQL (Adaptadores)
```

### Benefícios da Arquitetura Hexagonal
- **Independência de frameworks:** Lógica de negócio isolada  
- **Testabilidade:** Fácil mock de dependências  
- **Manutenibilidade:** Separação clara de responsabilidades  
- **Escalabilidade:** Fácil adicionar novos casos de uso  

---

## Controle de Concorrência

### Problema
Em operações simultâneas, múltiplos pedidos podem levar o estoque a valores negativos (overselling).

```
Exemplo:
  Produto: Notebook (estoque = 1)
  Pedido A: 1 unidade
  Pedido B: 1 unidade (chegam simultaneamente)
  
  Sem proteção:
    - A lê estoque (1)
    - B lê estoque (1)
    - A decrementa → estoque = 0
    - B decrementa → estoque = -1 (NEGATIVO!)
```

### Solução: Atomic WHERE Validation (Otimista)

**Implementado em:** `src/infrastructure/database/prisma-product.repository.ts`

Usamos **validação atômica no banco de dados** — condição de atualização combinada com operação em uma única query:

```typescript
async decrementStock(id: string, quantity: number): Promise<boolean> {
  // Operação atômica: só decrementa se stock >= quantity
  const { count } = await this.prisma.product.updateMany({
    where: {
      id: id,
      stock: { gte: quantity },  // Condição atômica
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
-- Retorna: número de linhas atualizadas (0 ou 1)
```

### Por que a solução atômica é superior ao SQL puro?

| Aspecto | Atomic WHERE | Pessimistic Lock |
|---------|-----------|------------------|
| **Segurança** | Impossível negativo | Impossível negativo |
| **Performance** |  Uma query | Múltiplas + bloqueios |
| **Escalabilidade** |  Sem contenção | Com bloqueios |
| **Simplicidade** | 5 linhas | Transações explícitas |
| **Deadlock Risk** | Nenhum |  Qualidade de código

### Exemplo de Fluxo Seguro

```
Timeline | Pedido A                    | Pedido B              | Stock
---------|-----------------------------+----------------------+-------
0ms      | Lê produto (stock=1)        |                      | 1
1ms      |                             | Lê produto (stock=1) | 1
2ms      | updateMany(WHERE qty<=1)    |                      |
3ms      |    count=1, sucesso         |                      | 0
4ms      |                             | updateMany(...)      |
5ms      |                             |    count=0, falha    | 0
         
Resultado: 1 sucesso, 1 rejeição com erro apropriado
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

### Suíte de Testes
- **Unitários:** Casos de uso isolados com mock de repositórios
- **E2E:** Fluxo completo com banco de dados conteinerizado
- **Concorrência:** Validação de race conditions com múltiplas requisições simultâneas

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

- Checkout do código  
- Setup de Node.js  
- Instalar dependências  
- **Lint** (ESLint com erros)  
- **Build** (Compilar TypeScript)  
- **Migrations** (Executar Prisma)  
- **Testes unitários** (Jest)  
- **Testes E2E** (Jest E2E)  
- **Coverage** (Codecov)  

---

## Trade-offs e Decisões

### 1. Prisma vs SQL Puro
- **Escolha:** Prisma com fallback para `$queryRaw` onde necessário
- **Razão:** Type-safety + migrations automáticas, com controle via SQL puro para pessimistic lock
- **Trade-off:** Pequena curva de aprendizado vs. produtividade

### 2. Atomic WHERE Validation vs Pessimistic Lock vs Optimistic Concurrency
- **Escolha:** Atomic WHERE Validation
- **Implementação:** Condição na cláusula WHERE + atualização atômica
- **Razões:** 
  - Performance excelente (sem bloqueios, sem retry loops)
  - Impossível race conditions (banco garante atomicidade)
  - Simples e elegante (5 linhas de código)
  - Escalável sob alta concorrência
  - Zero deadlock risk
- **Trade-off:** Aplicação valida `count === 0` para tratamento de erro

### 4. Logs Estruturados (Pino)
- **Escolha:** Pino para logs JSON estruturados
- **Razão:** Melhor para observabilidade em produção
- **Trade-off:** Menos legível em desenvolvimento (mitigado com pino-pretty)

---

## O que Faria Diferente com Mais Tempo

#### 1. **Implementar tatus de Pedidos**
```typescript
enum OrderStatus {
  PENDING = "pending",          // Criado, aguardando confirmação
  CONFIRMED = "confirmed",      // Confirmado, pronto para envio
  SHIPPED = "shipped",          // Despachado
  DELIVERED = "delivered",      // Entregue
  CANCELLED = "cancelled"       // Cancelado
}
```

Adicionar ao schema Prisma para rastreamento de ciclo de vida do pedido.

Permite rastreabilidade e conformidade regulatória.

#### 2. **Autenticação JWT**
```typescript
@UseGuards(JwtAuthGuard)
@Mutation(() => OrderType)
async createOrder(@CurrentUser() user: User, @Args('input') input: CreateOrderInput) {
  // Aplicar criar-pedido apenas ao usuário autenticado
  return this.createOrderUseCase.execute(input, user.id);
}
```

Segurança e isolamento de dados entre usuários.

#### 3. **Cache com Redis**
```typescript
@Query(() => [ProductType])
@Cacheable('products', 300)  // Cache 5 minutos
async products() {
  return this.productRepository.findAll();
}
```

Reduzir carga no BD, melhorar latência.

#### 4. **Webhooks para Notificações**
```typescript
// Quando pedido é criado
await this.webhookService.trigger('order.created', {
  orderId: order.id,
  userId: order.userId,
  total: order.total
});
```

Integração com sistemas de email, SMS, notificações.

#### 5. **Mensageria (RabbitMQ/Kafka)**
Processar pedidos assincronamente com garantia de ordem por produto:
- Escalabilidade horizontal
- Resiliência
- Processamento sequencial por produto

---