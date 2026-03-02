import { IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { IsInt, Min, Max } from 'class-validator';

export class NotificationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  unreadOnly?: boolean;
}
