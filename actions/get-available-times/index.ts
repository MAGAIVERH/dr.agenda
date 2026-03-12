// 'use server';

// import dayjs from 'dayjs';
// import timezone from 'dayjs/plugin/timezone';
// import utc from 'dayjs/plugin/utc';
// import { eq } from 'drizzle-orm';
// import { headers } from 'next/headers';
// import { z } from 'zod';

// import { db } from '@/db';
// import { appointmentsTables, doctorsTables } from '@/db/schema';

// import { generateTimeSlots } from '@/helpers/time';
// import { auth } from '@/lib/auth';
// import { actionClient } from '@/lib/next-safe.action';

// dayjs.extend(utc);
// dayjs.extend(timezone);

// export const getAvailableTimes = actionClient
//   .schema(
//     z.object({
//       doctorId: z.string(),
//       date: z.string().date(), // YYYY-MM-DD,
//     }),
//   )
//   .action(async ({ parsedInput }) => {
//     const session = await auth.api.getSession({
//       headers: await headers(),
//     });

//     if (!session) {
//       throw new Error('Unauthorized');
//     }

//     if (!session.user.clinic) {
//       throw new Error('Clínica não encontrada');
//     }

//     const doctor = await db.query.doctorsTables.findFirst({
//       where: eq(doctorsTables.id, parsedInput.doctorId),
//     });

//     if (!doctor) {
//       throw new Error('Médico não encontrado');
//     }

//     const selectedDayOfWeek = dayjs(parsedInput.date).day(); // 0=Dom ... 6=Sáb
//     const from = doctor.availableFromWeekDay;
//     const to = doctor.availableToWeekDay;

//     // ✅ Suporta faixa normal e faixa que "vira" a semana (ex: Seg(1) -> Dom(0))
//     const doctorIsAvailable =
//       from <= to
//         ? selectedDayOfWeek >= from && selectedDayOfWeek <= to
//         : selectedDayOfWeek >= from || selectedDayOfWeek <= to;

//     if (!doctorIsAvailable) {
//       return [];
//     }

//     const appointments = await db.query.appointmentsTables.findMany({
//       where: eq(appointmentsTables.doctorId, parsedInput.doctorId),
//     });

//     // ✅ FIX: cancelado/ausente NÃO bloqueiam horário
//     const blockingAppointmentsOnSelectedDate = appointments
//       .filter((appointment) => {
//         const isSameDay = dayjs(appointment.date).isSame(parsedInput.date, 'day');
//         const status = appointment.status as string | undefined;

//         const blocksSlot = status === 'scheduled' || status === 'completed';
//         return isSameDay && blocksSlot;
//       })
//       .map((appointment) => dayjs(appointment.date).format('HH:mm:ss'));

//     const timeSlots = generateTimeSlots();

//     const doctorAvailableFrom = dayjs()
//       .utc()
//       .set('hour', Number(doctor.availableFromTime.split(':')[0]))
//       .set('minute', Number(doctor.availableFromTime.split(':')[1]))
//       .set('second', 0)
//       .local();

//     const doctorAvailableTo = dayjs()
//       .utc()
//       .set('hour', Number(doctor.availableToTime.split(':')[0]))
//       .set('minute', Number(doctor.availableToTime.split(':')[1]))
//       .set('second', 0)
//       .local();

//     const doctorTimeSlots = timeSlots.filter((time) => {
//       const date = dayjs()
//         .utc()
//         .set('hour', Number(time.split(':')[0]))
//         .set('minute', Number(time.split(':')[1]))
//         .set('second', 0);

//       return (
//         date.format('HH:mm:ss') >= doctorAvailableFrom.format('HH:mm:ss') &&
//         date.format('HH:mm:ss') <= doctorAvailableTo.format('HH:mm:ss')
//       );
//     });

//     return doctorTimeSlots.map((time) => {
//       return {
//         value: time,
//         available: !blockingAppointmentsOnSelectedDate.includes(time),
//         label: time.substring(0, 5),
//       };
//     });
//   });

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

const normalizeTime = (time: string) => {
  if (time.length === 5) {
    return `${time}:00`;
  }

  return time;
};

const convertUtcTimeToLocal = (time: string) => {
  return dayjs
    .utc(`2000-01-01T${normalizeTime(time)}`)
    .local()
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

    const selectedDayOfWeek = dayjs(parsedInput.date).day();
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
        const isSameDay = dayjs(appointment.date).isSame(parsedInput.date, 'day');
        const status = appointment.status as string | undefined;
        const blocksSlot = status === 'scheduled' || status === 'completed';

        return isSameDay && blocksSlot;
      })
      .map((appointment) => dayjs(appointment.date).format('HH:mm:ss'));

    const doctorAvailableFromLocal = convertUtcTimeToLocal(doctor.availableFromTime);
    const doctorAvailableToLocal = convertUtcTimeToLocal(doctor.availableToTime);

    const now = dayjs();
    const isToday = dayjs(parsedInput.date).isSame(now, 'day');
    const currentTime = now.format('HH:mm:ss');

    const timeSlots = generateTimeSlots();

    const availableSlots = timeSlots.filter((time) => {
      const isInsideDoctorSchedule = isTimeWithinRange(
        time,
        doctorAvailableFromLocal,
        doctorAvailableToLocal,
      );

      const isBlocked = blockingAppointmentsOnSelectedDate.includes(time);
      const isPastTimeToday = isToday && time <= currentTime;

      return isInsideDoctorSchedule && !isBlocked && !isPastTimeToday;
    });

    return availableSlots.map((time) => ({
      value: time,
      available: true,
      label: time.substring(0, 5),
    }));
  });
