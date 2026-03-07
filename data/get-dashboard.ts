import dayjs from 'dayjs';
import { and, count, desc, eq, gte, lte, sql, sum } from 'drizzle-orm';

import { db } from '@/db';
import { appointmentsTables, doctorsTables, patientsTables } from '@/db/schema';

interface Params {
  from: string;
  to: string;
  session: {
    user: {
      clinic: {
        id: string;
      };
    };
  };
}

export const getDashboard = async ({ from, to, session }: Params) => {
  const clinicId = session.user.clinic.id;

  const rangeStartDate = dayjs(from).startOf('day').toDate();
  const rangeEndDate = dayjs(to).endOf('day').toDate();

  const todayStart = dayjs().startOf('day').toDate();
  const todayEnd = dayjs().endOf('day').toDate();

  const chartStartDate = dayjs().subtract(10, 'days').startOf('day').toDate();
  const chartEndDate = dayjs().add(10, 'days').endOf('day').toDate();

  const [
    [totalRevenue],
    [totalAppointments],
    [totalPatients],
    [totalDoctors],
    topDoctors,
    topSpecialties,
    todayAppointments,
    dailyAppointmentsData,
  ] = await Promise.all([
    db
      .select({
        total: sum(appointmentsTables.appointmentPriceInCents),
      })
      .from(appointmentsTables)
      .where(
        and(
          eq(appointmentsTables.clinicId, clinicId),
          gte(appointmentsTables.date, rangeStartDate),
          lte(appointmentsTables.date, rangeEndDate),
        ),
      ),

    db
      .select({
        total: count(),
      })
      .from(appointmentsTables)
      .where(
        and(
          eq(appointmentsTables.clinicId, clinicId),
          gte(appointmentsTables.date, rangeStartDate),
          lte(appointmentsTables.date, rangeEndDate),
        ),
      ),

    db
      .select({
        total: count(),
      })
      .from(patientsTables)
      .where(eq(patientsTables.clinicId, clinicId)),

    db
      .select({
        total: count(),
      })
      .from(doctorsTables)
      .where(eq(doctorsTables.clinicId, clinicId)),

    db
      .select({
        id: doctorsTables.id,
        name: doctorsTables.name,
        avatarImageUrl: doctorsTables.avatarImageUrl,
        specialty: doctorsTables.specialty,
        appointments: count(appointmentsTables.id),
      })
      .from(doctorsTables)
      .leftJoin(
        appointmentsTables,
        and(
          eq(appointmentsTables.doctorId, doctorsTables.id),
          gte(appointmentsTables.date, rangeStartDate),
          lte(appointmentsTables.date, rangeEndDate),
        ),
      )
      .where(eq(doctorsTables.clinicId, clinicId))
      .groupBy(doctorsTables.id)
      .orderBy(desc(count(appointmentsTables.id)))
      .limit(10),

    db
      .select({
        specialty: doctorsTables.specialty,
        appointments: count(appointmentsTables.id),
      })
      .from(appointmentsTables)
      .innerJoin(doctorsTables, eq(appointmentsTables.doctorId, doctorsTables.id))
      .where(
        and(
          eq(appointmentsTables.clinicId, clinicId),
          gte(appointmentsTables.date, rangeStartDate),
          lte(appointmentsTables.date, rangeEndDate),
        ),
      )
      .groupBy(doctorsTables.specialty)
      .orderBy(desc(count(appointmentsTables.id))),

    // ✅ FIX AQUI: hoje = startOfDay..endOfDay
    db.query.appointmentsTables.findMany({
      where: and(
        eq(appointmentsTables.clinicId, clinicId),
        gte(appointmentsTables.date, todayStart),
        lte(appointmentsTables.date, todayEnd),
      ),
      with: {
        patient: true,
        doctor: true,
      },
      orderBy: (appointments, { asc }) => [asc(appointments.date)],
    }),

    db
      .select({
        date: sql<string>`DATE(${appointmentsTables.date})`.as('date'),
        appointments: count(appointmentsTables.id),
        revenue: sql<number>`COALESCE(SUM(${appointmentsTables.appointmentPriceInCents}), 0)`.as(
          'revenue',
        ),
      })
      .from(appointmentsTables)
      .where(
        and(
          eq(appointmentsTables.clinicId, clinicId),
          gte(appointmentsTables.date, chartStartDate),
          lte(appointmentsTables.date, chartEndDate),
        ),
      )
      .groupBy(sql`DATE(${appointmentsTables.date})`)
      .orderBy(sql`DATE(${appointmentsTables.date})`),
  ]);

  return {
    totalRevenue,
    totalAppointments,
    totalPatients,
    totalDoctors,
    topDoctors,
    topSpecialties,
    todayAppointments,
    dailyAppointmentsData,
  };
};
