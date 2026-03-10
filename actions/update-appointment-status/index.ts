'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

import { db } from '@/db';
import { appointmentsTables } from '@/db/schema';
import { auth } from '@/lib/auth';
import { actionClient } from '@/lib/next-safe.action';

import { updateAppointmentStatusSchema } from './schema';

export const updateAppointmentStatus = actionClient
  .schema(updateAppointmentStatusSchema)
  .action(async ({ parsedInput }) => {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      throw new Error('Unauthorized');
    }

    if (!session.user.clinic?.id) {
      throw new Error('Clinic not found');
    }

    const [appointment] = await db
      .select({
        id: appointmentsTables.id,
      })
      .from(appointmentsTables)
      .where(
        and(
          eq(appointmentsTables.id, parsedInput.id),
          eq(appointmentsTables.clinicId, session.user.clinic.id),
        ),
      )
      .limit(1);

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    await db
      .update(appointmentsTables)
      .set({
        status: parsedInput.status,
        statusChangedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(appointmentsTables.id, parsedInput.id));

    revalidatePath('/appointments');
    revalidatePath('/dashboard');

    return {
      id: parsedInput.id,
      status: parsedInput.status,
    };
  });
