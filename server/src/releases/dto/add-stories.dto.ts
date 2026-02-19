import { IsArray, ArrayMinSize, IsUUID } from 'class-validator';

export class AddStoriesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  storyIds: string[];
}
