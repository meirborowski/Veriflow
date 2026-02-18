import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateStepDto {
  @IsInt()
  @Min(1)
  order: number;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  instruction: string;
}
