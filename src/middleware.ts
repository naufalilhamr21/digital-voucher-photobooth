import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public asset and client routes that do not require admin auth
  if (
    pathname.startsWith('/e/') ||
    pathname.startsWith('/scanner/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/icons/') ||
    pathname === '/manifest.json' ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/sw.js' ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // If Supabase redirects a recovery code to root `/` or `/login`, forward to `/auth/callback`
  const code = request.nextUrl.searchParams.get('code');
  if (code && (pathname === '/' || pathname === '/login')) {
    const callbackUrl = new URL('/auth/callback', request.url);
    callbackUrl.searchParams.set('code', code);
    callbackUrl.searchParams.set('next', '/reset-password');
    return NextResponse.redirect(callbackUrl);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnonKey) {
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    });

    let hasSupabaseUser = false;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      hasSupabaseUser = !!user;
    } catch {
      hasSupabaseUser = false;
    }

    // If on /login and already logged in -> redirect to /
    if (pathname === '/login') {
      if (hasSupabaseUser) {
        return NextResponse.redirect(new URL('/', request.url));
      }
      return response;
    }

    // If accessing root / or /admin without session -> redirect to /login
    if (!hasSupabaseUser) {
      const loginUrl = new URL('/login', request.url);
      if (pathname !== '/') {
        loginUrl.searchParams.set('redirect', pathname);
      }
      return NextResponse.redirect(loginUrl);
    }

    return response;
  }

  // If Supabase credentials are not configured, redirect protected routes to /login
  if (pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
