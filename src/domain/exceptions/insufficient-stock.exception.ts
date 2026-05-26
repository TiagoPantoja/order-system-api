export class InsufficientStockException extends Error {
  constructor(productId: string, productName?: string) {
    const label = productName ? `${productName} (${productId})` : productId;
    super(`Estoque insuficiente para o produto: ${label}`);
    this.name = 'InsufficientStockException';
  }
}
