import { JwtStrategy } from './jwt.strategy';

const mockConfigService = {
  get: jest.fn().mockReturnValue('test-secret'),
};

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    strategy = new JwtStrategy(mockConfigService as never);
  });

  describe('validate', () => {
    it('should return userId and email from payload', () => {
      const payload = { sub: 'uuid-123', email: 'test@example.com' };

      const result = strategy.validate(payload);

      expect(result).toEqual({ userId: 'uuid-123', email: 'test@example.com' });
    });

    it('should handle payload with different values', () => {
      const payload = { sub: 'other-uuid', email: 'other@example.com' };

      const result = strategy.validate(payload);

      expect(result).toEqual({
        userId: 'other-uuid',
        email: 'other@example.com',
      });
    });
  });
});
