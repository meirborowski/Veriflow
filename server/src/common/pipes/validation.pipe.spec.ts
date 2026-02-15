import { BadRequestException } from '@nestjs/common';
import { IsString, MinLength, IsEmail } from 'class-validator';
import { ValidationPipe } from './validation.pipe';

class TestDto {
  @IsString()
  @MinLength(3)
  name!: string;

  @IsEmail()
  email!: string;
}

describe('ValidationPipe', () => {
  let pipe: ValidationPipe;

  beforeEach(() => {
    pipe = new ValidationPipe();
  });

  it('should pass valid DTO', async () => {
    const value = { name: 'John', email: 'john@example.com' };
    const result = (await pipe.transform(value, {
      type: 'body',
      metatype: TestDto,
    })) as TestDto;
    expect(result).toBeInstanceOf(TestDto);
    expect(result.name).toBe('John');
    expect(result.email).toBe('john@example.com');
  });

  it('should throw BadRequestException for invalid DTO', async () => {
    const value = { name: 'Jo', email: 'not-an-email' };
    await expect(
      pipe.transform(value, { type: 'body', metatype: TestDto }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should include field-level errors', async () => {
    const value = { name: 'Jo', email: 'not-an-email' };
    try {
      await pipe.transform(value, { type: 'body', metatype: TestDto });
      fail('Should have thrown');
    } catch (err) {
      const response = (err as BadRequestException).getResponse() as Record<
        string,
        unknown
      >;
      expect(response.statusCode).toBe(400);
      expect(response.message).toBe('Validation failed');
      expect(Array.isArray(response.errors)).toBe(true);

      const errors = response.errors as Array<{
        field: string;
        message: string;
      }>;
      const fields = errors.map((e) => e.field);
      expect(fields).toContain('name');
      expect(fields).toContain('email');
    }
  });

  it('should strip non-whitelisted properties', async () => {
    const value = {
      name: 'John',
      email: 'john@example.com',
      extraField: 'should be removed',
    };
    try {
      await pipe.transform(value, { type: 'body', metatype: TestDto });
      fail('Should have thrown due to forbidNonWhitelisted');
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
    }
  });

  it('should pass through primitive types unchanged', async () => {
    const result: unknown = await pipe.transform('hello', {
      type: 'body',
      metatype: String,
    });
    expect(result).toBe('hello');
  });

  it('should pass through value when no metatype', async () => {
    const value = { anything: true };
    const result: unknown = await pipe.transform(value, {
      type: 'body',
      metatype: undefined,
    });
    expect(result).toBe(value);
  });
});
