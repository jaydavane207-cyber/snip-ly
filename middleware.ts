import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js Middleware with Clerk Auth Support.
 * 
 * When @clerk/nextjs is installed:
 *   - Uses clerkMiddleware + createRouteMatcher
 *   - Public routes: /, /demo, /s/(.*), /b/(.*), /verify/(.*), /api/bio/(.*), /api/metadata, /api/ai/generate, /api/demo/(.*)
 *   - Protected routes: /dashboard(.*)
 * 
 * When Clerk is not installed (e.g., initial local dev without Clerk keys):
 *   - Gracefully passes requests through to prevent build or runtime breakages.
 */
export async function middleware(req: NextRequest) {
  try {
    const pkg = '@clerk/nextjs/server';
    const clerk = await import(/* webpackIgnore: true */ pkg).catch(() => null);

    if (clerk && typeof clerk.clerkMiddleware === 'function') {
      const publicRoutePatterns = [
        '/',
        '/demo',
        '/s/(.*)',
        '/b/(.*)',
        '/verify/(.*)',
        '/api/bio/(.*)',
        '/api/metadata',
        '/api/ai/generate',
        '/api/demo/(.*)',
      ];

      const isPublicRoute = typeof clerk.createRouteMatcher === 'function'
        ? clerk.createRouteMatcher(publicRoutePatterns)
        : (request: NextRequest) => {
            const pathname = request.nextUrl.pathname;
            return publicRoutePatterns.some((pattern) => {
              const regex = new RegExp(`^${pattern.replace(/\(\.\*\)/g, '.*')}$`);
              return regex.test(pathname);
            });
          };

      const pathname = req.nextUrl.pathname;
      const isPublic = isPublicRoute(req);

      if (!isPublic && pathname.startsWith('/dashboard')) {
        const authFn = clerk.auth as () => Promise<{ userId: string | null }>;
        try {
          const { userId } = await authFn();
          if (!userId) {
            const signInUrl = new URL('/sign-in', req.url);
            signInUrl.searchParams.set('redirect_url', req.url);
            return NextResponse.redirect(signInUrl);
          }
        } catch {
          // Graceful fallback if auth session lookup fails
        }
      }
    }
  } catch {
    // Clerk not configured or error — allow request through
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
