'use server';

import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { z } from 'zod';

import { db } from '@/db';
import { appointmentsTables, doctorsTables } from '@/db/schema';
import { generateTimeSlots } from '@/helpers/time';
import { auth } from '@/lib/auth';
import { actionClient } from '@/lib/next-safe.action';

dayjs.extend(utc);
dayjs.extend(timezone);

// ✅ define o fuso explicitamente para não depender do timezone do servidor
const CLINIC_TIMEZONE = 'America/Fortaleza';

const normalizeTime = (time: string) => {
  const match = time.match(/\d{2}:\d{2}(:\d{2})?/);

  if (!match) {
    throw new Error(`Horário inválido: ${time}`);
  }

  return match[0].length === 5 ? `${match[0]}:00` : match[0];
};

// ✅ converte o horário salvo em UTC no banco para o horário local da clínica
const convertUtcTimeToClinicTime = (time: string) => {
  return dayjs
    .utc(`2000-01-01T${normalizeTime(time)}`)
    .tz(CLINIC_TIMEZONE)
    .format('HH:mm:ss');
};

const isTimeWithinRange = (time: string, from: string, to: string) => {
  if (from <= to) {
    return time >= from && time <= to;
  }

  return time >= from || time <= to;
};

export const getAvailableTimes = actionClient
  .schema(
    z.object({
      doctorId: z.string(),
      date: z.string().date(),
    }),
  )
  .action(async ({ parsedInput }) => {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      throw new Error('Unauthorized');
    }

    if (!session.user.clinic) {
      throw new Error('Clínica não encontrada');
    }

    const doctor = await db.query.doctorsTables.findFirst({
      where: eq(doctorsTables.id, parsedInput.doctorId),
    });

    if (!doctor) {
      throw new Error('Médico não encontrado');
    }

    const selectedDateInClinicTz = dayjs.tz(parsedInput.date, CLINIC_TIMEZONE);
    const selectedDayOfWeek = selectedDateInClinicTz.day();

    const fromWeekDay = doctor.availableFromWeekDay;
    const toWeekDay = doctor.availableToWeekDay;

    const doctorIsAvailableOnDate =
      fromWeekDay <= toWeekDay
        ? selectedDayOfWeek >= fromWeekDay && selectedDayOfWeek <= toWeekDay
        : selectedDayOfWeek >= fromWeekDay || selectedDayOfWeek <= toWeekDay;

    if (!doctorIsAvailableOnDate) {
      return [];
    }

    const appointments = await db.query.appointmentsTables.findMany({
      where: eq(appointmentsTables.doctorId, parsedInput.doctorId),
    });

    const blockingAppointmentsOnSelectedDate = appointments
      .filter((appointment) => {
        const appointmentDateInClinicTz = dayjs(appointment.date).tz(CLINIC_TIMEZONE);
        const isSameDay =
          appointmentDateInClinicTz.format('YYYY-MM-DD') ===
          selectedDateInClinicTz.format('YYYY-MM-DD');

        const status = appointment.status as string | undefined;
        const blocksSlot = status === 'scheduled' || status === 'completed';

        return isSameDay && blocksSlot;
      })
      .map((appointment) => dayjs(appointment.date).tz(CLINIC_TIMEZONE).format('HH:mm:ss'));

    const doctorAvailableFromClinicTime = convertUtcTimeToClinicTime(doctor.availableFromTime);
    const doctorAvailableToClinicTime = convertUtcTimeToClinicTime(doctor.availableToTime);

    const timeSlots = generateTimeSlots();

    // ✅ mantém a grade inteira do médico
    const doctorTimeSlots = timeSlots.filter((time) =>
      isTimeWithinRange(time, doctorAvailableFromClinicTime, doctorAvailableToClinicTime),
    );

    const nowInClinicTz = dayjs().tz(CLINIC_TIMEZONE);
    const isToday =
      selectedDateInClinicTz.format('YYYY-MM-DD') === nowInClinicTz.format('YYYY-MM-DD');
    const currentTime = nowInClinicTz.format('HH:mm:ss');

    return doctorTimeSlots.map((time) => {
      const isBlocked = blockingAppointmentsOnSelectedDate.includes(time);
      const isPastTimeToday = isToday && time <= currentTime;

      return {
        value: time,
        available: !isBlocked && !isPastTimeToday,
        label: time.substring(0, 5),
      };
    });
  });
