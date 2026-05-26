import { Product } from '../entities/product.entity';

export abstract class ProductRepository {
  abstract findById(id: string): Promise<Product | null>;
  abstract findAll(): Promise<Product[]>;
  abstract save(product: Product): Promise<void>;
  abstract decrementStock(id: string, quantity: number): Promise<boolean>;
}
