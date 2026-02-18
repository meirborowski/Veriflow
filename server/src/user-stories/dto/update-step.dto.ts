import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateStepDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsInt()
  @Min(1)
  order: number;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  instruction: string;
}
