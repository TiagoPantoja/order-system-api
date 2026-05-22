export class InsufficientStockException extends Error {
  constructor(productId: string) {
    super(`Estoque insuficiente para o produto: ${productId}`);
    this.name = 'InsufficientStockException';
  }
}
