import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class TriggerRunDto {
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  testIds?: string[];

  @IsOptional()
  @IsUUID('4')
  releaseId?: string;

  @IsString()
  @MaxLength(512)
  baseUrl: string;
}
