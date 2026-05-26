declare module '@nestjs/graphql' {
  export function Resolver(...args: any[]): any;
  export function Query(...args: any[]): any;
  export function Mutation(...args: any[]): any;
  export function Args(...args: any[]): any;
  export function ResolveField(...args: any[]): any;
  export function Parent(...args: any[]): any;
  export const InputType: any;
  export const ObjectType: any;
  export const Field: any;
  export const Float: any;
  export const Int: any;
  export const ID: any;
  export default any;
  export class GraphQLModule {
    static forRoot<T = any>(config?: T): any;
  }
}

declare module 'class-validator' {
  export const IsString: any;
  export const IsInt: any;
  export const ValidateNested: any;
  export const IsUUID: any;
  export const IsPositive: any;
  export const Min: any;
  export const IsEmail: any;
  export const IsNotEmpty: any;
  export default any;
}

declare module 'class-transformer' {
  export function Type(...args: any[]): any;
  export default any;
}

declare module 'graphql' {
  export class GraphQLError extends Error {
    constructor(message: string, extensions?: any);
  }
  export default any;
}

declare module '@nestjs/apollo' {
  export const ApolloDriver: any;
  export type ApolloDriverConfig = any;
}
