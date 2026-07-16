'use server';

import { redirect } from 'next/navigation';
import { authenticate, createSession, destroySession } from '@/lib/auth';

export type LoginState = { error?: string };

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');

  if (!email || !password) {
    return { error: 'Introduce email y contraseña.' };
  }

  const user = await authenticate(email, password);
  if (!user) {
    return { error: 'Credenciales incorrectas.' };
  }

  await createSession({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role as 'ADMIN' | 'CARGADOR' | 'TRANSPORTISTA',
    entityId: user.entityId,
  });

  redirect('/dashboard');
}

export async function logoutAction() {
  await destroySession();
  redirect('/login');
}
