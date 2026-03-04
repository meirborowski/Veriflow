import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class SyncRegistryTestItemDto {
  @IsString()
  @MaxLength(255)
  externalId: string;

  @IsString()
  @MaxLength(512)
  testFile: string;

  @IsString()
  @MaxLength(255)
  testName: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class SyncRegistryDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncRegistryTestItemDto)
  tests: SyncRegistryTestItemDto[];
}
