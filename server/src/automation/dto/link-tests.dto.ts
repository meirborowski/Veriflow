import { IsArray, IsUUID } from 'class-validator';

export class LinkTestsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  testIds: string[];
}
