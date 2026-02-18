'use server';

import dayjs from 'dayjs';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

import { db } from '@/db';
import { appointmentsTables } from '@/db/schema';
import { auth } from '@/lib/auth';
import { actionClient } from '@/lib/next-safe.action';

import { getAvailableTimes } from '../get-available-times';
import { upsertAppointmentSchema } from './schema';

export const upsertAppointment = actionClient
  .schema(upsertAppointmentSchema)
  .action(async ({ parsedInput }) => {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      throw new Error('Unauthorized');
    }

    if (!session?.user.clinic?.id) {
      throw new Error('Clinic not found');
    }

    const availableTimes = await getAvailableTimes({
      doctorId: parsedInput.doctorId,
      date: dayjs(parsedInput.date).format('YYYY-MM-DD'),
    });

    if (!availableTimes?.data) {
      throw new Error('No available times');
    }

    const isTimeAvailable = availableTimes.data.some(
      (time) => time.value === parsedInput.time && time.available,
    );

    if (!isTimeAvailable) {
      throw new Error('Time not available');
    }

    const appointmentDateTime = dayjs(parsedInput.date)
      .set('hour', Number(parsedInput.time.split(':')[0]))
      .set('minute', Number(parsedInput.time.split(':')[1]))
      .set('second', 0)
      .set('millisecond', 0)
      .toDate();

    await db
      .insert(appointmentsTables)
      .values({
        id: parsedInput.id,
        clinicId: session.user.clinic.id,
        patientId: parsedInput.patientId,
        doctorId: parsedInput.doctorId,
        appointmentPriceInCents: parsedInput.appointmentPriceInCents,
        date: appointmentDateTime,
      })
      .onConflictDoUpdate({
        target: [appointmentsTables.id],
        set: {
          patientId: parsedInput.patientId,
          doctorId: parsedInput.doctorId,
          appointmentPriceInCents: parsedInput.appointmentPriceInCents,
          date: appointmentDateTime,
        },
      });

    revalidatePath('/appointments');
  });
