import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { and, count, desc, eq, gte, lte, or, sql, sum } from 'drizzle-orm';
import { unstable_noStore as noStore } from 'next/cache';

import { db } from '@/db';
import { appointmentsTables, doctorsTables, patientsTables } from '@/db/schema';

dayjs.extend(utc);
dayjs.extend(timezone);

const CLINIC_TIMEZONE = 'America/Fortaleza';

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

const getUtcRangeFromLocalDate = (date: string) => {
  const start = dayjs.tz(date, CLINIC_TIMEZONE).startOf('day').utc().toDate();
  const end = dayjs.tz(date, CLINIC_TIMEZONE).endOf('day').utc().toDate();

  return { start, end };
};

export const getDashboard = async ({ from, to, session }: Params) => {
  noStore();

  const clinicId = session.user.clinic.id;

  const { start: rangeStartDate } = getUtcRangeFromLocalDate(from);
  const { end: rangeEndDate } = getUtcRangeFromLocalDate(to);

  const todayInClinicTz = dayjs().tz(CLINIC_TIMEZONE).format('YYYY-MM-DD');
  const { start: todayStart, end: todayEnd } = getUtcRangeFromLocalDate(todayInClinicTz);

  const chartStartDate = dayjs()
    .tz(CLINIC_TIMEZONE)
    .subtract(10, 'days')
    .startOf('day')
    .utc()
    .toDate();

  const chartEndDate = dayjs().tz(CLINIC_TIMEZONE).add(10, 'days').endOf('day').utc().toDate();

  const [
    [totalRevenueProjected],
    [totalRevenueReal],
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
          or(
            eq(appointmentsTables.status, 'scheduled'),
            eq(appointmentsTables.status, 'completed'),
          ),
        ),
      ),

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
          eq(appointmentsTables.status, 'completed'),
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

    db.query.appointmentsTables.findMany({
      where: and(
        eq(appointmentsTables.clinicId, clinicId),
        gte(appointmentsTables.date, todayStart),
        lte(appointmentsTables.date, todayEnd),
        or(
          eq(appointmentsTables.status, 'scheduled'),
          eq(appointmentsTables.status, 'completed'),
          and(
            or(
              eq(appointmentsTables.status, 'cancelled'),
              eq(appointmentsTables.status, 'no_show'),
            ),
            gte(appointmentsTables.statusChangedAt, todayStart),
            lte(appointmentsTables.statusChangedAt, todayEnd),
          ),
        ),
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
        revenueProjected: sql<number>`
          COALESCE(
            SUM(
              CASE
                WHEN ${appointmentsTables.status} IN ('scheduled', 'completed')
                THEN ${appointmentsTables.appointmentPriceInCents}
                ELSE 0
              END
            ),
            0
          )
        `.as('revenueProjected'),
        revenueReal: sql<number>`
          COALESCE(
            SUM(
              CASE
                WHEN ${appointmentsTables.status} = 'completed'
                THEN ${appointmentsTables.appointmentPriceInCents}
                ELSE 0
              END
            ),
            0
          )
        `.as('revenueReal'),
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
    totalRevenueProjected,
    totalRevenueReal,
    totalAppointments,
    totalPatients,
    totalDoctors,
    topDoctors,
    topSpecialties,
    todayAppointments,
    dailyAppointmentsData,
  };
};
