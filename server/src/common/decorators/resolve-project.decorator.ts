import { SetMetadata } from '@nestjs/common';

export const RESOLVE_PROJECT_KEY = 'resolveProjectFrom';
export const ResolveProjectFrom = (
  source:
    | 'story'
    | 'release'
    | 'execution'
    | 'bug'
    | 'attachment'
    | 'attachment-entity',
) => SetMetadata(RESOLVE_PROJECT_KEY, source);
