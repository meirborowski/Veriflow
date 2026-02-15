import { IS_PUBLIC_KEY, Public } from './public.decorator';

describe('Public decorator', () => {
  it('should set isPublic metadata to true', () => {
    const decorator = Public();
    const target = {};

    decorator(target, undefined as never, undefined as never);

    const metadata: boolean = Reflect.getMetadata(
      IS_PUBLIC_KEY,
      target,
    ) as boolean;
    expect(metadata).toBe(true);
  });
});
