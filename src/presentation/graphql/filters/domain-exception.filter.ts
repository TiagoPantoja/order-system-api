import { Catch, ExceptionFilter } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { InsufficientStockException } from '../../../domain/exceptions/insufficient-stock.exception';
import { ProductNotFoundException } from '../../../domain/exceptions/product-not-found.exception';
import { UserNotFoundException } from '../../../domain/exceptions/user-not-found.exception';
import { InvalidOrderException } from '../../../domain/exceptions/invalid-order.exception';

type DomainException =
  | InsufficientStockException
  | ProductNotFoundException
  | UserNotFoundException
  | InvalidOrderException;

const codeMap: Record<string, string> = {
  InsufficientStockException: 'INSUFFICIENT_STOCK',
  ProductNotFoundException: 'PRODUCT_NOT_FOUND',
  UserNotFoundException: 'USER_NOT_FOUND',
  InvalidOrderException: 'INVALID_ORDER',
};

@Catch(
  InsufficientStockException,
  ProductNotFoundException,
  UserNotFoundException,
  InvalidOrderException,
)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainException) {
    const code = codeMap[exception.name] || 'DOMAIN_ERROR';

    throw new GraphQLError(exception.message, {
      extensions: {
        code,
        http: { status: 400 },
      },
    });
  }
}
