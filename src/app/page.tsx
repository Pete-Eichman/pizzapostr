import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import PizzaCanvas from '@/components/PizzaCanvas';
import { signOut } from '@/lib/auth';
import { ThemeToggle } from '@/components/ThemeToggle';

export default async function Home() {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  return (
    <main className="min-h-screen py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-semibold text-stone-800 dark:text-zinc-100">
              Welcome, {session.user?.name}
            </h2>
            <p className="text-sm text-stone-500 dark:text-zinc-400">{session.user?.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <form
              action={async () => {
                'use server';
                await signOut();
              }}
            >
              <button
                type="submit"
                className="text-sm text-stone-500 hover:text-stone-800 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium transition-colors"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>

        <PizzaCanvas />
      </div>
    </main>
  );
}
