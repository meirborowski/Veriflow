import { IsUUID } from 'class-validator';

export class JoinSessionDto {
  @IsUUID('4')
  releaseId: string;
}
