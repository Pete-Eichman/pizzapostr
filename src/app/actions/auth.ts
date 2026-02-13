'use server';

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function registerUser(data: { name: string; email: string; password: string }) {
  const validated = registerSchema.safeParse(data);
  
  if (!validated.success) {
    return { error: 'Invalid input data' };
  }

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.data.email },
    });

    if (existingUser) {
      return { error: 'User already exists' };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validated.data.password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: validated.data.name,
        email: validated.data.email,
        password: hashedPassword,
      },
    });

    return { success: true, userId: user.id };
  } catch (error) {
    console.error('Registration error:', error);
    return { error: 'Failed to create user' };
  }
}
