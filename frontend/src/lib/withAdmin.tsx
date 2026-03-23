'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth';

/**
 * Higher-order component that redirects to home if user is not an admin.
 * Use this to protect admin-only pages.
 */
export function withAdmin<P extends object>(
  WrappedComponent: React.ComponentType<P>
): React.FC<P> {
  return function WithAdminComponent(props: P) {
    const { isAuthenticated, isAdmin, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading) {
        if (!isAuthenticated) {
          router.push('/login');
        } else if (!isAdmin) {
          router.push('/');
        }
      }
    }, [isLoading, isAuthenticated, isAdmin, router]);

    // Show loading state while checking auth
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400" />
        </div>
      );
    }

    // Don't render if not admin (will redirect)
    if (!isAuthenticated || !isAdmin) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400" />
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };
}
