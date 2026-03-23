'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/translations';
import { Eye, EyeOff, UserPlus, Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated } = useAuth();
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.password_confirm) {
      setError(t('auth.passwordMismatch') || 'Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError(t('auth.passwordTooShort') || 'Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    const result = await register(formData);

    if (result.success) {
      router.push('/');
    } else {
      setError(result.error || 'Registration failed');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-[800px] h-[800px] bg-primary/20 rounded-full blur-3xl opacity-50 pointer-events-none" />
      <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-[600px] h-[600px] bg-secondary/20 rounded-full blur-3xl opacity-50 pointer-events-none" />

      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-6 ring-1 ring-primary/20 shadow-sm">
            <span className="text-3xl">🐾</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Happy Pet Nursery
          </h1>
          <h2 className="mt-2 text-muted-foreground">
            {t('auth.signUpTitle') || 'Create your account'}
          </h2>
        </div>

        <div className="bg-card text-card-foreground rounded-2xl border border-border/50 shadow-xl p-8 backdrop-blur-sm bg-card/95">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                <span className="text-destructive font-bold">!</span>
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium mb-1.5">
                  {t('auth.firstName') || 'First Name'}
                </label>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  required
                  value={formData.first_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-background border border-input rounded-xl focus:ring-2 focus:ring-ring focus:border-input transition-colors duration-200 placeholder:text-muted-foreground"
                  placeholder="John"
                />
              </div>
              <div>
                <label htmlFor="last_name" className="block text-sm font-medium mb-1.5">
                  {t('auth.lastName') || 'Last Name'}
                </label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  required
                  value={formData.last_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-background border border-input rounded-xl focus:ring-2 focus:ring-ring focus:border-input transition-colors duration-200 placeholder:text-muted-foreground"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1.5">
                {t('auth.email') || 'Email'}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-background border border-input rounded-xl focus:ring-2 focus:ring-ring focus:border-input transition-colors duration-200 placeholder:text-muted-foreground"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1.5">
                {t('auth.password') || 'Password'}
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-2 pr-10 bg-background border border-input rounded-xl focus:ring-2 focus:ring-ring focus:border-input transition-colors duration-200 placeholder:text-muted-foreground"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="password_confirm" className="block text-sm font-medium mb-1.5">
                {t('auth.confirmPassword') || 'Confirm Password'}
              </label>
              <input
                id="password_confirm"
                name="password_confirm"
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password_confirm}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-background border border-input rounded-xl focus:ring-2 focus:ring-ring focus:border-input transition-colors duration-200 placeholder:text-muted-foreground"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-medium rounded-xl transition-all shadow-sm active:scale-[0.98]"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <UserPlus className="w-5 h-5" />
              )}
              {t('auth.signUp') || 'Sign Up'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {t('auth.hasAccount') || 'Already have an account?'}{' '}
              <Link href="/login" className="text-primary hover:underline font-medium">
                {t('auth.signIn') || 'Sign in'}
              </Link>
            </p>
          </div>
        </div>

        <div className="text-center pt-2">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-block hover:-translate-x-1 transform duration-200">
            ← {t('auth.backToHome') || 'Back to home'}
          </Link>
        </div>
      </div>
    </div>
  );
}
