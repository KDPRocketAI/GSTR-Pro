import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Redirect unauthenticated users attempting to access protected routes
    const isAuthPage =
        request.nextUrl.pathname.startsWith('/login') ||
        request.nextUrl.pathname.startsWith('/signup') ||
        request.nextUrl.pathname.startsWith('/auth');

    const isApiRoute = request.nextUrl.pathname.startsWith('/api');

    const isProtectedRoute =
        request.nextUrl.pathname.startsWith('/dashboard') ||
        request.nextUrl.pathname.startsWith('/gstr1') ||
        request.nextUrl.pathname.startsWith('/profiles') ||
        request.nextUrl.pathname.startsWith('/settings');

    if (!user && isProtectedRoute && !isApiRoute) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    // Redirect trial-expired users to /upgrade
    if (user && isProtectedRoute && request.nextUrl.pathname !== '/upgrade' && !isApiRoute) {
        const plan = user.user_metadata?.plan;
        const trialEnd = user.user_metadata?.trial_end;

        if (plan === 'trial' && trialEnd) {
            const isExpired = new Date(trialEnd).getTime() <= Date.now();
            if (isExpired) {
                const url = request.nextUrl.clone();
                url.pathname = '/upgrade';
                return NextResponse.redirect(url);
            }
        }
    }

    // Redirect authenticated users away from auth pages
    if (user && isAuthPage) {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}
