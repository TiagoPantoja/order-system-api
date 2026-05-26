import {
  Resolver,
  Query,
  Mutation,
  Args,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { UserType, ProductType, OrderType } from '../models';
import {
  CreateUserInput,
  CreateProductInput,
  CreateOrderInput,
} from '../inputs';

import { CreateUserUseCase } from '../../../application/use-cases/create-user.use-case';
import { CreateProductUseCase } from '../../../application/use-cases/create-product.use-case';
import { CreateOrderUseCase } from '../../../application/use-cases/create-order.use-case';

import { UserRepository } from '../../../domain/repositories/user.repository';
import { ProductRepository } from '../../../domain/repositories/product.repository';
import { OrderRepository } from '../../../domain/repositories/order.repository';

@Resolver(() => UserType)
export class ApiResolver {
  constructor(
    private createUserUseCase: CreateUserUseCase,
    private createProductUseCase: CreateProductUseCase,
    private createOrderUseCase: CreateOrderUseCase,
    private userRepository: UserRepository,
    private productRepository: ProductRepository,
    private orderRepository: OrderRepository,
  ) {}

  @Query(() => [UserType])
  async users() {
    return this.userRepository.findAll();
  }

  @Query(() => UserType, { nullable: true })
  async user(@Args('id') id: string) {
    return this.userRepository.findById(id);
  }

  @Query(() => [ProductType])
  async products() {
    return this.productRepository.findAll();
  }

  @Query(() => ProductType, { nullable: true })
  async product(@Args('id') id: string) {
    return this.productRepository.findById(id);
  }

  @Query(() => OrderType, { nullable: true })
  async order(@Args('id') id: string) {
    return this.orderRepository.findById(id);
  }

  @Mutation(() => UserType)
  async createUser(@Args('input') input: CreateUserInput) {
    return this.createUserUseCase.execute(input.name, input.email);
  }

  @Mutation(() => ProductType)
  async createProduct(@Args('input') input: CreateProductInput) {
    return this.createProductUseCase.execute(
      input.name,
      input.price,
      input.stock,
    );
  }

  @Mutation(() => OrderType)
  async createOrder(@Args('input') input: CreateOrderInput) {
    return this.createOrderUseCase.execute(input);
  }

  @ResolveField(() => [OrderType])
  async orders(@Parent() user: UserType) {
    return this.orderRepository.findByUserId(user.id);
  }
}
