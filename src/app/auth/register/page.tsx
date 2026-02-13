'use client';

import { SessionProvider } from 'next-auth/react';
import { RegisterForm } from './RegisterForm';
import Link from 'next/link';

export default function Register() {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-stone-200 p-8 w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-stone-800 mb-1">Create an account</h1>
            <p className="text-sm text-stone-400">Start designing your perfect pizza</p>
          </div>

          <RegisterForm />

          <p className="text-center text-sm text-stone-400 mt-6">
            Already have an account?{' '}
            <Link href="/auth/signin" className="text-stone-700 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </SessionProvider>
  );
}
