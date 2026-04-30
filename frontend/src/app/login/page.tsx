'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/translations';
import { api } from '@/lib/api';
import { LogoShape } from '@/domain/settings/types';
import { readLogoCache, writeLogoCache } from '@/domain/settings/cache';
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoShape, setLogoShape] = useState<LogoShape>('circle');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    // Hydrate from the localStorage cache synchronously before the
    // network round-trip so a returning visitor sees their persisted
    // shape immediately on the login screen. The fetch refreshes
    // both state and cache.
    const cached = readLogoCache();
    setLogoUrl(cached.url);
    setLogoShape(cached.shape);
    api.nurserySettings.get().then(s => {
      setLogoUrl(s.logo_url);
      setLogoShape(s.logo_shape);
      writeLogoCache(s);
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(email, password);

    if (result.success) {
      router.push('/');
    } else {
      setError(result.error || 'Login failed');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-[40rem] h-[40rem] bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-[30rem] h-[30rem] bg-primary hover:bg-primary/90/5 rounded-full blur-3xl" />

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-8">
          <div
            className={`w-16 h-16 sm:w-20 sm:h-20 inline-flex items-center justify-center bg-primary mb-4 shadow-lg shadow-primary/20 overflow-hidden ${
              logoShape === 'circle' ? 'rounded-full' : 'rounded-2xl'
            }`}
            data-testid="login-logo"
            data-shape={logoShape}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                className={`w-full h-full ${
                  logoShape === 'circle' ? 'object-cover' : 'object-contain'
                }`}
              />
            ) : (
              <LogIn className="w-8 h-8 sm:w-10 sm:h-10 text-primary-foreground" />
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            {t('app.name')}
          </h1>
          <h2 className="mt-3 text-lg sm:text-xl font-medium text-muted-foreground">
            {t('auth.signInTitle') || 'Sign in to your account'}
          </h2>
        </div>

        <div className="bg-card rounded-3xl shadow-xl shadow-border/10 border border-border/50 p-6 sm:p-10 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-destructive flex-shrink-0" />
                {error}
              </div>
            )}

            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              label={t('auth.email') || 'Email'}
            />

            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              label={t('auth.password') || 'Password'}
              endIcon={
                <button
                  type="button"
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 pt-2 w-full h-full hover:text-foreground text-muted-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5 -mt-2" /> : <Eye className="w-5 h-5 -mt-2" />}
                </button>
              }
            />

            <Button
              type="submit"
              disabled={isLoading}
              variant="primary"
              className="w-full py-3.5"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <LogIn className="w-5 h-5" />
              )}
              {t('auth.signIn') || 'Sign In'}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-border/50 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              {t('auth.noAccount') || "Don't have an account?"}{' '}
              <Link href="/register" className="text-primary hover:text-primary/80 transition-colors ml-1">
                {t('auth.signUp') || 'Sign up'}
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group">
            <span className="group-hover:-translate-x-1 transition-transform">←</span> {t('auth.backToHome') || 'Back to home'}
          </Link>
        </div>
      </div>
    </div>
  );
}

