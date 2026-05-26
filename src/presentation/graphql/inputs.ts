import { InputType, Field, Float, Int, ID } from '@nestjs/graphql';
import {
  IsEmail,
  IsNotEmpty,
  IsPositive,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class CreateUserInput {
  @Field()
  @IsNotEmpty()
  name: string;

  @Field()
  @IsEmail()
  email: string;
}

@InputType()
export class CreateProductInput {
  @Field()
  @IsNotEmpty()
  name: string;

  @Field(() => Float)
  @IsPositive()
  price: number;

  @Field(() => Int)
  @Min(0)
  stock: number;
}

@InputType()
export class OrderItemInput {
  @Field(() => ID)
  @IsNotEmpty()
  productId: string;

  @Field(() => Int)
  @IsPositive()
  quantity: number;
}

@InputType()
export class CreateOrderInput {
  @Field(() => ID)
  @IsNotEmpty()
  userId: string;

  @Field(() => [OrderItemInput])
  @ValidateNested({ each: true })
  @Type(() => OrderItemInput)
  items: OrderItemInput[];
}
