import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { APP_FILTER } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './infrastructure/database/prisma.service';

import { UserRepository } from './domain/repositories/user.repository';
import { PrismaUserRepository } from './infrastructure/database/prisma-user.repository';
import { ProductRepository } from './domain/repositories/product.repository';
import { PrismaProductRepository } from './infrastructure/database/prisma-product.repository';
import { OrderRepository } from './domain/repositories/order.repository';
import { PrismaOrderRepository } from './infrastructure/database/prisma-order.repository';

import { CreateUserUseCase } from './application/use-cases/create-user.use-case';
import { CreateProductUseCase } from './application/use-cases/create-product.use-case';
import { CreateOrderUseCase } from './application/use-cases/create-order.use-case';

import { ApiResolver } from './presentation/graphql/resolvers/api.resolver';
import { DomainExceptionFilter } from './presentation/graphql/filters/domain-exception.filter';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        autoLogging: false,
      },
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      playground: true,
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService,
    { provide: UserRepository, useClass: PrismaUserRepository },
    { provide: ProductRepository, useClass: PrismaProductRepository },
    { provide: OrderRepository, useClass: PrismaOrderRepository },
    CreateUserUseCase,
    CreateProductUseCase,
    CreateOrderUseCase,
    ApiResolver,
    {
      provide: APP_FILTER,
      useClass: DomainExceptionFilter,
    },
  ],
})
export class AppModule {}
