import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpsertRepoConfigDto {
  @IsUrl({ require_tld: false })
  @MaxLength(512)
  repoUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  branch?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  testDirectory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  playwrightConfig?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  authToken?: string;
}
