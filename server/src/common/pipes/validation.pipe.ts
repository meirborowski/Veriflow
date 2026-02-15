import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class ValidationPipe implements PipeTransform {
  async transform(value: unknown, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object: object = plainToInstance(
      metatype,
      value as Record<string, unknown>,
    ) as object;
    const errors = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      const fieldErrors = errors.map((err) => ({
        field: err.property,
        message: Object.values(err.constraints ?? {}).join(', '),
      }));

      throw new BadRequestException({
        statusCode: 400,
        message: 'Validation failed',
        errors: fieldErrors,
      });
    }

    return object as unknown;
  }

  private toValidate(
    metatype: abstract new (...args: unknown[]) => unknown,
  ): boolean {
    const types: Array<abstract new (...args: unknown[]) => unknown> = [
      String,
      Boolean,
      Number,
      Array,
      Object,
    ];
    return !types.includes(metatype);
  }
}
