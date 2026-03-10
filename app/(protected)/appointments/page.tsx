import { count, desc, eq, sql } from 'drizzle-orm';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { db } from '@/db';
import { appointmentsTables, doctorsTables, patientsTables } from '@/db/schema';
import { auth } from '@/lib/auth';

import { Button } from '@/components/ui/button';
import {
  PageActions,
  PageContainer,
  PageContent,
  PageDescription,
  PageHeader,
  PageHeaderContent,
  PageTitle,
} from '@/components/ui/page.container';

import AddAppointmentButton from './components/add-appointment-button';
import AppointmentsTable from './components/appointments-table';

const PAGE_SIZE = 20;

interface AppointmentsPageProps {
  searchParams: Promise<{
    page?: string;
  }>;
}

const AppointmentsPage = async ({ searchParams }: AppointmentsPageProps) => {
  const { page: pageParam } = await searchParams;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/authentication');
  }

  if (!session.user.clinic) {
    redirect('/clinic-form');
  }

  if (!session.user.plan) {
    redirect('/new-subscription');
  }

  const clinicId = session.user.clinic.id;

  const page = Math.max(1, Number(pageParam ?? '1') || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const now = new Date();

  const [patients, doctors, totalRow, appointments] = await Promise.all([
    db.query.patientsTables.findMany({
      where: eq(patientsTables.clinicId, clinicId),
    }),
    db.query.doctorsTables.findMany({
      where: eq(doctorsTables.clinicId, clinicId),
    }),
    db
      .select({ total: count() })
      .from(appointmentsTables)
      .where(eq(appointmentsTables.clinicId, clinicId))
      .then((rows) => rows[0]),
    db.query.appointmentsTables.findMany({
      where: eq(appointmentsTables.clinicId, clinicId),
      with: {
        patient: true,
        doctor: true,
      },
      // ✅ Ordenação: próximos (futuros) primeiro, depois passados mais recentes
      orderBy: [
        sql`CASE WHEN ${appointmentsTables.date} >= ${now} THEN 0 ELSE 1 END`,
        sql`CASE WHEN ${appointmentsTables.date} >= ${now} THEN ${appointmentsTables.date} END`,
        desc(
          sql`CASE WHEN ${appointmentsTables.date} < ${now} THEN ${appointmentsTables.date} END`,
        ),
      ],
      limit: PAGE_SIZE,
      offset,
    }),
  ]);

  const total = totalRow?.total ?? 0;
  const hasNextPage = offset + PAGE_SIZE < total;

  const buildPageUrl = (nextPage: number) => {
    const params = new URLSearchParams();
    params.set('page', String(nextPage));
    return `/appointments?${params.toString()}`;
  };

  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>Agendamentos</PageTitle>
          <PageDescription>Gerencie os agendamentos da sua clínica</PageDescription>
        </PageHeaderContent>

        <PageActions>
          <AddAppointmentButton patients={patients} doctors={doctors} />
        </PageActions>
      </PageHeader>

      <PageContent>
        <AppointmentsTable appointments={appointments} patients={patients} doctors={doctors} />

        {/* ✅ Paginação */}
        {(page > 1 || hasNextPage) && (
          <div className="mt-4 flex items-center justify-end gap-2">
            {page > 1 && (
              <Button asChild variant="outline" size="icon">
                <Link href={buildPageUrl(page - 1)} aria-label="Página anterior">
                  <ChevronLeft className="h-4 w-4" />
                </Link>
              </Button>
            )}

            {hasNextPage && (
              <Button asChild variant="outline" size="icon">
                <Link href={buildPageUrl(page + 1)} aria-label="Próxima página">
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        )}
      </PageContent>
    </PageContainer>
  );
};

export default AppointmentsPage;
