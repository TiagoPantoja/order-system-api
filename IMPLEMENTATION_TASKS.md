# 🔧 PLANO DE AÇÃO PARA COMPLETAR FASE 5

**Objetivo:** Refinar a Camada GraphQL e resolver os 5 problemas críticos identificados

---

## 🎯 TAREFAS PRIORITÁRIAS

### **TAREFA 1: Criar Exceções Específicas de Domínio**

**Arquivo:** `src/domain/exceptions/`

Criar as seguintes exceções:
- `ProductNotFoundException` - quando produto não existe
- `UserNotFoundException` - quando usuário não existe
- `InvalidOrderException` - para outras validações

```typescript
// src/domain/exceptions/product-not-found.exception.ts
export class ProductNotFoundException extends Error {
  constructor(productId: string) {
    super(`Produto com ID ${productId} não foi encontrado`);
    this.name = 'ProductNotFoundException';
  }
}

// src/domain/exceptions/user-not-found.exception.ts
export class UserNotFoundException extends Error {
  constructor(userId: string) {
    super(`Usuário com ID ${userId} não foi encontrado`);
    this.name = 'UserNotFoundException';
  }
}

// src/domain/exceptions/invalid-order.exception.ts
export class InvalidOrderException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidOrderException';
  }
}
```

---

### **TAREFA 2: Expandir o Exception Filter**

**Arquivo:** `src/presentation/graphql/filters/domain-exception.filter.ts`

Atualizar para capturar TODAS as exceções de domínio:

```typescript
import { Catch, ExceptionFilter, ArgumentsHost } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { InsufficientStockException } from '../../../domain/exceptions/insufficient-stock.exception';
import { ProductNotFoundException } from '../../../domain/exceptions/product-not-found.exception';
import { UserNotFoundException } from '../../../domain/exceptions/user-not-found.exception';
import { InvalidOrderException } from '../../../domain/exceptions/invalid-order.exception';

@Catch(
  InsufficientStockException,
  ProductNotFoundException,
  UserNotFoundException,
  InvalidOrderException,
)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(
    exception:
      | InsufficientStockException
      | ProductNotFoundException
      | UserNotFoundException
      | InvalidOrderException,
    host: ArgumentsHost,
  ) {
    const codeMap = {
      InsufficientStockException: 'INSUFFICIENT_STOCK',
      ProductNotFoundException: 'PRODUCT_NOT_FOUND',
      UserNotFoundException: 'USER_NOT_FOUND',
      InvalidOrderException: 'INVALID_ORDER',
    };

    const code = codeMap[exception.name];

    throw new GraphQLError(exception.message, {
      extensions: {
        code: code || 'DOMAIN_ERROR',
        http: { status: 400 },
      },
    });
  }
}
```

---

### **TAREFA 3: Adicionar métodos `findById` nos Repositórios**

**Arquivo:** `src/domain/repositories/user.repository.ts`

```typescript
export abstract class UserRepository {
  abstract save(user: User): Promise<void>;
  abstract findAll(): Promise<User[]>;
  abstract findById(id: string): Promise<User | null>;  // ✅ NOVO
}
```

**Arquivo:** `src/domain/repositories/order.repository.ts`

```typescript
export abstract class OrderRepository {
  abstract save(order: Order): Promise<void>;
  abstract findByUserId(userId: string): Promise<Order[]>;
  abstract findById(id: string): Promise<Order | null>;  // ✅ NOVO
}
```

---

### **TAREFA 4: Implementar `findById` nos Repositórios Prisma**

**Arquivo:** `src/infrastructure/database/prisma-user.repository.ts`

```typescript
async findById(id: string): Promise<User | null> {
  const data = await this.prisma.user.findUnique({ where: { id } });
  if (!data) return null;
  return new User(data.id, data.name, data.email, data.createdAt);
}
```

**Arquivo:** `src/infrastructure/database/prisma-order.repository.ts`

```typescript
async findById(id: string): Promise<Order | null> {
  const data = await this.prisma.order.findUnique({
    where: { id },
    include: { orderItems: true },
  });
  if (!data) return null;
  return new Order(
    data.id,
    data.userId,
    data.total,
    data.orderItems.map(
      (i) => new OrderItem(i.productId, i.quantity, i.price),
    ),
    data.createdAt,
  );
}
```

---

### **TAREFA 5: Melhorar `CreateOrderUseCase`**

**Arquivo:** `src/application/use-cases/create-order.use-case.ts`

Adicionar validações de negócio:

```typescript
async execute(input: CreateOrderDto): Promise<Order> {
  // ✅ Validar se usuário existe
  const user = await this.userRepository.findById(input.userId);
  if (!user) {
    throw new UserNotFoundException(input.userId);
  }

  // Resto da lógica...
  let total = 0;
  const orderItems: OrderItem[] = [];

  for (const item of input.items) {
    const product = await this.productRepository.findById(item.productId);
    
    // ✅ Usar exceção específica
    if (!product) {
      throw new ProductNotFoundException(item.productId);
    }

    // Validar quantidade
    if (item.quantity <= 0) {
      throw new InvalidOrderException(
        `Quantidade deve ser maior que zero para o produto ${product.name}`,
      );
    }

    const stockDecremented = await this.productRepository.decrementStock(
      item.productId,
      item.quantity,
    );

    if (!stockDecremented) {
      throw new InsufficientStockException(product.id, product.name);
    }

    const itemTotal = product.price * item.quantity;
    total += itemTotal;

    orderItems.push(new OrderItem(product.id, item.quantity, product.price));
  }

  // Validar se há itens
  if (orderItems.length === 0) {
    throw new InvalidOrderException('Um pedido deve ter pelo menos um item');
  }

  const order = new Order(
    randomUUID(),
    input.userId,
    total,
    orderItems,
    new Date(),
  );
  await this.orderRepository.save(order);

  return order;
}
```

**Não esqueça de injetar UserRepository no construtor!**

---

### **TAREFA 6: Adicionar Queries GraphQL para buscar por ID**

**Arquivo:** `src/presentation/graphql/resolvers/api.resolver.ts`

Adicionar as queries:

```typescript
@Query(() => UserType, { nullable: true })
async user(@Args('id') id: string) {
  return this.userRepository.findById(id);
}

@Query(() => ProductType, { nullable: true })
async product(@Args('id') id: string) {
  return this.productRepository.findById(id);
}

@Query(() => OrderType, { nullable: true })
async order(@Args('id') id: string) {
  return this.orderRepository.findById(id);
}
```

---

### **TAREFA 7: Injetar UserRepository no CreateOrderUseCase**

**Arquivo:** `src/application/use-cases/create-order.use-case.ts`

```typescript
@Injectable()
export class CreateOrderUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly productRepository: ProductRepository,
    private readonly userRepository: UserRepository,  // ✅ NOVO
  ) {}

  // ... resto do código
}
```

---

### **TAREFA 8: Registrar UserRepository no App Module**

**Arquivo:** `src/app.module.ts`

Verificar e garantir que UserRepository está registrado:

```typescript
providers: [
  // ...
  { provide: UserRepository, useClass: PrismaUserRepository },  // ✅ Verificar se existe
  // ...
]
```

---

### **TAREFA 9: Resolver Problema N+1 (Opcional mas Recomendado)**

**Opção A: Usar DataLoader (mais elegante)**

```typescript
// file: src/presentation/graphql/dataloaders/order.dataloader.ts
import DataLoader from 'dataloader';
import { OrderRepository } from '../../../domain/repositories/order.repository';

export const createOrderDataLoader = (repository: OrderRepository) => {
  return new DataLoader(async (userIds: string[]) => {
    // Busca todos de uma vez
    const orders = await repository.findByUserIds(userIds);
    return userIds.map((id) => orders.filter((o) => o.userId === id));
  });
};
```

Depois usar no Field Resolver:
```typescript
@ResolveField(() => [OrderType])
async orders(
  @Parent() user: UserType,
  @Context('orderLoader') orderLoader: DataLoader<string, Order[]>,
) {
  return orderLoader.load(user.id);
}
```

**Opção B: Eager Loading (mais simples)**

```typescript
@ResolveField(() => [OrderType])
async orders(@Parent() user: UserType) {
  // Se você já carregou orders na query, retorna direto
  return user.orders || this.orderRepository.findByUserId(user.id);
}
```

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Criar 3 novas exceções de domínio
- [ ] Atualizar Exception Filter
- [ ] Adicionar `findById` nas interfaces de repositório
- [ ] Implementar `findById` nos repositórios Prisma
- [ ] Melhorar `CreateOrderUseCase` com validações
- [ ] Injetar `UserRepository` no `CreateOrderUseCase`
- [ ] Adicionar 3 novas Queries GraphQL
- [ ] Testar tudo com GraphQL Playground
- [ ] [ ] OPCIONAL: Implementar DataLoader para N+1

---

## ✅ RESULTADO ESPERADO

Após completar tudo:

✅ Exception Filter captura TODOS os erros de domínio  
✅ Validações robustas em todas as operações  
✅ Queries GraphQL para buscar dados por ID  
✅ Sem race conditions em pedidos simultâneos  
✅ Mensagens de erro claras e estruturadas  
✅ Código pronto para testes  

**Score de conclusão Fase 5: 100%** 🎉

---

**Tempo estimado:** 1-2 horas

