import { IsOptional, IsString, MinLength, MaxLength } from 'class-validator';

export class UpdateReleaseDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;
}
