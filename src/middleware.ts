import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public asset and client routes that do not require admin auth
  if (
    pathname.startsWith('/e/') ||
    pathname.startsWith('/scanner/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/icons/') ||
    pathname === '/manifest.json' ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/sw.js' ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isDemoAuth = request.cookies.get('alineas_demo_auth')?.value === 'true';

  // 1. Supabase Mode
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

    const isAuthenticated = hasSupabaseUser || isDemoAuth;

    // If on /login and already logged in -> redirect to /
    if (pathname === '/login') {
      if (isAuthenticated) {
        return NextResponse.redirect(new URL('/', request.url));
      }
      return response;
    }

    // If accessing root / or /admin without session -> redirect to /login
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      if (pathname !== '/') {
        loginUrl.searchParams.set('redirect', pathname);
      }
      return NextResponse.redirect(loginUrl);
    }

    return response;
  }

  // 2. Demo / Fallback Mode (before Supabase credentials are set)
  if (pathname === '/login') {
    if (isDemoAuth) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // Protected admin routes: / and /admin
  if (!isDemoAuth) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
