'use server';

import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

import { db } from '@/db';
import { appointmentsTables } from '@/db/schema';
import { auth } from '@/lib/auth';
import { actionClient } from '@/lib/next-safe.action';

import { getAvailableTimes } from '../get-available-times';
import { upsertAppointmentSchema } from './schema';

dayjs.extend(utc);
dayjs.extend(timezone);

const CLINIC_TIMEZONE = 'America/Fortaleza';

const normalizeTime = (time: string) => {
  const parts = time.split(':');

  const hours = parts[0] ?? '00';
  const minutes = parts[1] ?? '00';
  const seconds = parts[2] ?? '00';

  return {
    hours: Number(hours),
    minutes: Number(minutes),
    seconds: Number(seconds),
  };
};

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

    const formattedDate = dayjs(parsedInput.date).format('YYYY-MM-DD');

    const availableTimes = await getAvailableTimes({
      doctorId: parsedInput.doctorId,
      date: formattedDate,
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

    const { hours, minutes, seconds } = normalizeTime(parsedInput.time);

    const isValidTime =
      Number.isFinite(hours) &&
      Number.isFinite(minutes) &&
      Number.isFinite(seconds) &&
      hours >= 0 &&
      hours <= 23 &&
      minutes >= 0 &&
      minutes <= 59 &&
      seconds >= 0 &&
      seconds <= 59;

    if (!isValidTime) {
      throw new Error('Invalid time');
    }

    // ✅ monta a data/hora no fuso da clínica
    const appointmentDateInClinicTz = dayjs
      .tz(formattedDate, CLINIC_TIMEZONE)
      .set('hour', hours)
      .set('minute', minutes)
      .set('second', seconds)
      .set('millisecond', 0);

    const nowInClinicTz = dayjs().tz(CLINIC_TIMEZONE);

    if (appointmentDateInClinicTz.valueOf() <= nowInClinicTz.valueOf()) {
      throw new Error('Cannot schedule in the past');
    }

    // ✅ salva em UTC no banco
    const appointmentDateTime = appointmentDateInClinicTz.utc().toDate();

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
