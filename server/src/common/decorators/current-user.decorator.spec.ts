import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { CurrentUser } from './current-user.decorator';

interface ParamDecoratorMetadata {
  factory: (data: unknown, ctx: ExecutionContext) => unknown;
}

function getParamDecoratorFactory() {
  class TestController {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    test(@CurrentUser() _user: unknown) {}
  }

  const metadata: Record<string, ParamDecoratorMetadata> = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    TestController,
    'test',
  ) as Record<string, ParamDecoratorMetadata>;
  const key = Object.keys(metadata)[0];
  return metadata[key].factory;
}

describe('CurrentUser decorator', () => {
  it('should extract user from request', () => {
    const factory = getParamDecoratorFactory();
    const mockUser = { userId: 'uuid-123', email: 'test@example.com' };

    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({ user: mockUser }),
      }),
    } as unknown as ExecutionContext;

    const result = factory(undefined, ctx);

    expect(result).toEqual(mockUser);
  });
});
