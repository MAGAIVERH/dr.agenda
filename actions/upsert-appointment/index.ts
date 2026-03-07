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

    const [hoursRaw, minutesRaw] = parsedInput.time.split(':');
    const hours = Number(hoursRaw);
    const minutes = Number(minutesRaw);

    const isValidTime =
      Number.isFinite(hours) &&
      Number.isFinite(minutes) &&
      hours >= 0 &&
      hours <= 23 &&
      minutes >= 0 &&
      minutes <= 59;

    if (!isValidTime) {
      throw new Error('Invalid time');
    }

    const appointmentDateTime = dayjs(parsedInput.date)
      .set('hour', hours)
      .set('minute', minutes)
      .set('second', 0)
      .set('millisecond', 0)
      .toDate();

    if (appointmentDateTime.getTime() <= Date.now()) {
      throw new Error('Cannot schedule in the past');
    }

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
