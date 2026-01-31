'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { db } from '@/db';
import { clinicsTables, usersToClinicsTables } from '@/db/schema';
import { auth } from '@/lib/auth';

export const createClinic = async (name: string) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  const [clinic] = await db.insert(clinicsTables).values({ name }).returning();
  await db.insert(usersToClinicsTables).values({
    userId: session.user.id,
    clinicId: clinic.id,
  });
  redirect('/dashboard');
};
