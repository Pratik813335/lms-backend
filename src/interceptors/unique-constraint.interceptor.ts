import {
  Interceptor,
  InvocationContext,
  InvocationResult,
  Provider,
  ValueOrPromise,
  globalInterceptor,
} from '@loopback/core';
import {HttpErrors} from '@loopback/rest';

@globalInterceptor('error-handler', {tags: {name: 'uniqueConstraint'}})
export class UniqueConstraintInterceptor implements Provider<Interceptor> {
  value(): Interceptor {
    return this.intercept.bind(this);
  }

  async intercept(
    context: InvocationContext,
    next: () => ValueOrPromise<InvocationResult>,
  ) {
    try {
      return await next();
    } catch (err: any) {
      if (err.code === '23505' || err.message?.includes('duplicate key')) {
        throw new HttpErrors.Conflict('A record with the same unique identifier already exists');
      }
      throw err;
    }
  }
}
