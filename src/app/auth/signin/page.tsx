'use client';

import { SessionProvider } from 'next-auth/react';
import { SignInForm } from './SignInForm';
import Link from 'next/link';

export default function SignIn() {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-stone-200 p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-stone-800 mb-1">Welcome back</h1>
            <p className="text-sm text-stone-400">Sign in to continue building pizzas</p>
          </div>

          <SignInForm />

          <p className="text-center text-sm text-stone-400 mt-6">
            New here?{' '}
            <Link href="/auth/register" className="text-stone-700 font-medium hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </SessionProvider>
  );
}
