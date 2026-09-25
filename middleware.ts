import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware — no-op when Clerk is not installed.
 * When Clerk IS installed, import clerkMiddleware from @clerk/nextjs/server.
 * Public routes: /, /s/(.*), /b/(.*), /verify/(.*), /api/bio/(.*), /api/metadata, /api/ai/generate
 * Protected routes: /dashboard(/.*)?
 */
export async function middleware(req: NextRequest) {
  try {
    // Try to use Clerk if available
    const pkg = '@clerk/nextjs/server';
    const clerk = await import(/* webpackIgnore: true */ pkg).catch(() => null);

    if (clerk && typeof clerk.clerkMiddleware === 'function') {
      const publicRoutes = [
        '/',
        '/demo',
        '/demo/(.*)',
        '/api/demo/(.*)',
        '/s/(.*)',
        '/b/(.*)',
        '/verify/(.*)',
        '/api/bio/(.*)',
        '/api/metadata',
        '/api/ai/generate',
        '/api/links',
        '/api/links/(.*)',
        '/api/webhooks',
        '/api/webhooks/(.*)',
      ];

      const pathname = req.nextUrl.pathname;
      const isPublic = publicRoutes.some((route) => {
        const pattern = route.replace(/\(\.\*\)/g, '.*');
        return new RegExp(`^${pattern}$`).test(pathname);
      });

      if (!isPublic && pathname.startsWith('/dashboard')) {
        // Check auth
        const authFn = clerk.auth as () => Promise<{ userId: string | null }>;
        try {
          const { userId } = await authFn();
          if (!userId) {
            const signInUrl = new URL('/sign-in', req.url);
            signInUrl.searchParams.set('redirect_url', req.url);
            return NextResponse.redirect(signInUrl);
          }
        } catch {
          // If auth fails, allow through (graceful degradation)
        }
      }
    }
  } catch {
    // Clerk not installed or errored — allow all requests
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
