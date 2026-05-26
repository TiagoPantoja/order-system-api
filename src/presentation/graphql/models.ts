import { ObjectType, Field, ID, Float, Int } from '@nestjs/graphql';

@ObjectType()
export class OrderItemType {
  @Field(() => ID)
  productId: string;

  @Field(() => Int)
  quantity: number;

  @Field(() => Float)
  price: number;
}

@ObjectType()
export class OrderType {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  userId: string;

  @Field(() => Float)
  total: number;

  @Field(() => [OrderItemType])
  items: OrderItemType[];

  @Field()
  createdAt: Date;
}

@ObjectType()
export class UserType {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  email: string;

  @Field()
  createdAt: Date;

  @Field(() => [OrderType], { nullable: 'items' })
  orders?: OrderType[];
}

@ObjectType()
export class ProductType {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field(() => Float)
  price: number;

  @Field(() => Int)
  stock: number;

  @Field()
  createdAt: Date;
}
