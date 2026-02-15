import { SetMetadata } from '@nestjs/common';

/** Metadata key used by {@link JwtAuthGuard} to identify public routes. */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route or controller as publicly accessible, bypassing JWT authentication.
 * Use this decorator on routes that should be accessible without authentication, such as login or registration endpoints.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
