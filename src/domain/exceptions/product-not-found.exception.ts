export class ProductNotFoundException extends Error {
  constructor(productId: string) {
    super(`Produto com ID ${productId} não foi encontrado`);
    this.name = 'ProductNotFoundException';
  }
}
