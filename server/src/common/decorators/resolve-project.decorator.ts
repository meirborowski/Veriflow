import { SetMetadata } from '@nestjs/common';

export const RESOLVE_PROJECT_KEY = 'resolveProjectFrom';
export const ResolveProjectFrom = (
  source: 'story' | 'release' | 'execution' | 'bug',
) => SetMetadata(RESOLVE_PROJECT_KEY, source);
