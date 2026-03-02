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
          eq(appointmentsTables.clinicId, session.user.clinic.id),
          gte(appointmentsTables.date, new Date(from)),
          lte(appointmentsTables.date, new Date(to)),
        ),
      ),
    db
      .select({
        total: count(),
      })
      .from(appointmentsTables)
      .where(
        and(
          eq(appointmentsTables.clinicId, session.user.clinic.id),
          gte(appointmentsTables.date, new Date(from)),
          lte(appointmentsTables.date, new Date(to)),
        ),
      ),
    db
      .select({
        total: count(),
      })
      .from(patientsTables)
      .where(eq(patientsTables.clinicId, session.user.clinic.id)),
    db
      .select({
        total: count(),
      })
      .from(doctorsTables)
      .where(eq(doctorsTables.clinicId, session.user.clinic.id)),
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
          gte(appointmentsTables.date, new Date(from)),
          lte(appointmentsTables.date, new Date(to)),
        ),
      )
      .where(eq(doctorsTables.clinicId, session.user.clinic.id))
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
          eq(appointmentsTables.clinicId, session.user.clinic.id),
          gte(appointmentsTables.date, new Date(from)),
          lte(appointmentsTables.date, new Date(to)),
        ),
      )
      .groupBy(doctorsTables.specialty)
      .orderBy(desc(count(appointmentsTables.id))),
    db.query.appointmentsTables.findMany({
      where: and(
        eq(appointmentsTables.clinicId, session.user.clinic.id),
        gte(appointmentsTables.date, new Date()),
        lte(appointmentsTables.date, new Date()),
      ),
      with: {
        patient: true,
        doctor: true,
      },
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
          eq(appointmentsTables.clinicId, session.user.clinic.id),
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
