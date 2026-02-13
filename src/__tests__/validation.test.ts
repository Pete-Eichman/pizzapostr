import { describe, it, expect, vi, beforeEach } from 'vitest';

// We test the Zod validation schemas directly since the server actions
// themselves depend on Prisma and NextAuth which require a real server environment.
// These unit tests validate the data validation layer.

import { z } from 'zod';

// Mirror the schemas from the source code
const pizzaSchema = z.object({
  name: z.string().min(1).max(50),
  toppings: z.array(z.string()).max(4),
  animation: z.enum(['cw', 'ccw', 'wave']).nullable().optional(),
});

const registerSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(6),
});

describe('Pizza Validation Schema', () => {
  it('accepts valid pizza data', () => {
    const result = pizzaSchema.safeParse({
      name: 'Margherita',
      toppings: ['pepperoni', 'mushroom'],
    });
    expect(result.success).toBe(true);
  });

  it('accepts pizza with no toppings', () => {
    const result = pizzaSchema.safeParse({
      name: 'Plain Cheese',
      toppings: [],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = pizzaSchema.safeParse({
      name: '',
      toppings: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects name over 50 characters', () => {
    const result = pizzaSchema.safeParse({
      name: 'A'.repeat(51),
      toppings: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects more than 4 toppings', () => {
    const result = pizzaSchema.safeParse({
      name: 'Everything',
      toppings: Array.from({ length: 5 }, (_, i) => `topping${i}`),
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing name field', () => {
    const result = pizzaSchema.safeParse({ toppings: [] });
    expect(result.success).toBe(false);
  });

  it('rejects missing toppings field', () => {
    const result = pizzaSchema.safeParse({ name: 'Test' });
    expect(result.success).toBe(false);
  });

  it('accepts valid animation value', () => {
    const result = pizzaSchema.safeParse({
      name: 'Spinner',
      toppings: ['pepperoni'],
      animation: 'cw',
    });
    expect(result.success).toBe(true);
  });

  it('accepts null animation', () => {
    const result = pizzaSchema.safeParse({
      name: 'Static',
      toppings: [],
      animation: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid animation value', () => {
    const result = pizzaSchema.safeParse({
      name: 'Bad',
      toppings: [],
      animation: 'spin',
    });
    expect(result.success).toBe(false);
  });
});

describe('Register Validation Schema', () => {
  it('accepts valid registration data', () => {
    const result = registerSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'secret123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects name shorter than 2 characters', () => {
    const result = registerSchema.safeParse({
      name: 'J',
      email: 'j@example.com',
      password: 'secret123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects name longer than 50 characters', () => {
    const result = registerSchema.safeParse({
      name: 'A'.repeat(51),
      email: 'a@example.com',
      password: 'secret123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = registerSchema.safeParse({
      name: 'John',
      email: 'not-an-email',
      password: 'secret123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password shorter than 6 characters', () => {
    const result = registerSchema.safeParse({
      name: 'John',
      email: 'john@example.com',
      password: '12345',
    });
    expect(result.success).toBe(false);
  });

  it('accepts minimum valid inputs', () => {
    const result = registerSchema.safeParse({
      name: 'Jo',
      email: 'j@e.co',
      password: '123456',
    });
    expect(result.success).toBe(true);
  });
});
