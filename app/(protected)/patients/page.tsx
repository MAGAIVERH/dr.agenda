import { count, eq } from 'drizzle-orm';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import {
  PageActions,
  PageContainer,
  PageContent,
  PageDescription,
  PageHeader,
  PageHeaderContent,
  PageTitle,
} from '@/components/ui/page.container';
import { db } from '@/db';
import { patientsTables } from '@/db/schema';
import { auth } from '@/lib/auth';

import AddPatientButton from './components/add-patient-button';
import { patientsTableColumns } from './components/table-columns';

const PAGE_SIZE = 20;

interface PatientsPageProps {
  searchParams: Promise<{
    page?: string;
  }>;
}

const PatientsPage = async ({ searchParams }: PatientsPageProps) => {
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

  const [totalRow, patients] = await Promise.all([
    db
      .select({ total: count() })
      .from(patientsTables)
      .where(eq(patientsTables.clinicId, clinicId))
      .then((rows) => rows[0]),
    db.query.patientsTables.findMany({
      where: eq(patientsTables.clinicId, clinicId),
      limit: PAGE_SIZE,
      offset,
    }),
  ]);

  const total = totalRow?.total ?? 0;
  const hasNextPage = offset + PAGE_SIZE < total;

  const buildPageUrl = (nextPage: number) => {
    const params = new URLSearchParams();
    params.set('page', String(nextPage));
    return `/patients?${params.toString()}`;
  };

  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>Pacientes</PageTitle>
          <PageDescription>Gerencie os pacientes da sua clínica</PageDescription>
        </PageHeaderContent>

        <PageActions>
          <AddPatientButton />
        </PageActions>
      </PageHeader>

      <PageContent>
        <DataTable data={patients} columns={patientsTableColumns} />

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

export default PatientsPage;
