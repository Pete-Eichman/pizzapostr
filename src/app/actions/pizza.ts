'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const pizzaSchema = z.object({
  name: z.string().min(1).max(50),
  toppings: z.array(z.string()).max(4),
  animation: z.enum(['cw', 'ccw', 'wave']).nullable().optional(),
});

export async function getUserPizzas() {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  try {
    const rawPizzas = await prisma.pizza.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const pizzas = rawPizzas.map((pizza: any) => ({
      ...pizza,
      toppings: JSON.parse(pizza.toppings) as string[],
      animation: pizza.animation as string | null,
    }));

    return { pizzas };
  } catch (error) {
    console.error('Error fetching pizzas:', error);
    return { error: 'Failed to fetch pizzas' };
  }
}

export async function savePizza(data: { name: string; toppings: string[]; animation?: string | null }) {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  const validated = pizzaSchema.safeParse(data);
  if (!validated.success) {
    return { error: 'Invalid pizza data' };
  }

  try {
    const rawPizza = await prisma.pizza.create({
      data: {
        name: validated.data.name,
        toppings: JSON.stringify(validated.data.toppings),
        animation: validated.data.animation ?? null,
        userId: session.user.id,
      },
    });

    const pizza = {
      ...rawPizza,
      toppings: JSON.parse(rawPizza.toppings) as string[],
      animation: rawPizza.animation,
    };

    revalidatePath('/');
    return { pizza };
  } catch (error) {
    console.error('Error saving pizza:', error);
    return { error: 'Failed to save pizza' };
  }
}

export async function deletePizza(pizzaId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  try {
    const pizza = await prisma.pizza.findUnique({
      where: { id: pizzaId },
    });

    if (!pizza || pizza.userId !== session.user.id) {
      return { error: 'Pizza not found or unauthorized' };
    }

    await prisma.pizza.delete({
      where: { id: pizzaId },
    });

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error deleting pizza:', error);
    return { error: 'Failed to delete pizza' };
  }
}

export async function loadPizza(pizzaId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  try {
    const rawPizza = await prisma.pizza.findUnique({
      where: { id: pizzaId },
    });

    if (!rawPizza || rawPizza.userId !== session.user.id) {
      return { error: 'Pizza not found or unauthorized' };
    }

    const pizza = {
      ...rawPizza,
      toppings: JSON.parse(rawPizza.toppings) as string[],
      animation: rawPizza.animation as string | null,
    };

    return { pizza };
  } catch (error) {
    console.error('Error loading pizza:', error);
    return { error: 'Failed to load pizza' };
  }
}
