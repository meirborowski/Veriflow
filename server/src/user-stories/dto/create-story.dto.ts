import {
  IsEnum,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Priority } from '../../common/types/enums';
import { CreateStepDto } from './create-step.dto';

export class CreateStoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  description: string;

  @IsEnum(Priority)
  priority: Priority;

  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => CreateStepDto)
  steps: CreateStepDto[];
}
