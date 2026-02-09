'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';

import { db } from '@/db';
import { doctorsTables } from '@/db/schema';
import { auth } from '@/lib/auth';
import { actionClient } from '@/lib/next-safe.action';

export const deleteDoctor = actionClient
  .schema(
    z.object({
      id: z.string().uuid(),
    }),
  )
  .action(async ({ parsedInput }) => {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      throw new Error('Unauthorized');
    }
    const doctor = await db.query.doctorsTables.findFirst({
      where: eq(doctorsTables.id, parsedInput.id),
    });
    if (!doctor) {
      throw new Error('Médico não encontrado');
    }
    if (doctor.clinicId !== session.user.clinic?.id) {
      throw new Error('Médico não encontrado');
    }
    await db.delete(doctorsTables).where(eq(doctorsTables.id, parsedInput.id));
    revalidatePath('/doctors');
  });
