import { SetMetadata } from '@nestjs/common';

export const RESOLVE_PROJECT_KEY = 'resolveProjectFrom';
export const ResolveProjectFrom = (source: 'story' | 'release' | 'execution') =>
  SetMetadata(RESOLVE_PROJECT_KEY, source);
