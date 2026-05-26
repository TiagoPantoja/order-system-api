export class UserNotFoundException extends Error {
  constructor(userId: string) {
    super(`Usuário com ID ${userId} não foi encontrado`);
    this.name = 'UserNotFoundException';
  }
}
