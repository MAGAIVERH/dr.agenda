import dayjs from 'dayjs';
import { Calendar } from 'lucide-react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { getDashboard } from '@/data/get-dashboard';
import { auth } from '@/lib/auth';

import {
  PageActions,
  PageContainer,
  PageContent,
  PageDescription,
  PageHeader,
  PageHeaderContent,
  PageTitle,
} from '@/components/ui/page.container';
import AppointmentsChart from './components/appointments-chart';
import { DatePicker } from './components/date-picker';
import StatsCards from './components/stats-cards';
import TodayAppointmentsTable from './components/today-appointments-table';
import TopDoctors from './components/top-doctors';
import TopSpecialties from './components/top-specialties';

interface DashboardPageProps {
  searchParams: Promise<{
    from: string;
    to: string;
  }>;
}

const DashboardPage = async ({ searchParams }: DashboardPageProps) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/authentication');
  }

  if (!session.user.clinic) {
    redirect('/clinic-form');
  }

  // if (!session.user.plan) {
  //   redirect('/new-subscription');
  // }

  const { from, to } = await searchParams;

  if (!from || !to) {
    redirect(
      `/dashboard?from=${dayjs().format('YYYY-MM-DD')}&to=${dayjs().add(1, 'month').format('YYYY-MM-DD')}`,
    );
  }

  const {
    totalRevenue,
    totalAppointments,
    totalPatients,
    totalDoctors,
    topDoctors,
    topSpecialties,
    todayAppointments,
    dailyAppointmentsData,
  } = await getDashboard({
    from,
    to,
    session: {
      user: {
        clinic: {
          id: session.user.clinic.id,
        },
      },
    },
  });

  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>Dashboard</PageTitle>
          <PageDescription>Tenha uma visão geral da sua clínica.</PageDescription>
        </PageHeaderContent>

        <PageActions>
          <DatePicker />
        </PageActions>
      </PageHeader>

      <PageContent>
        <StatsCards
          totalRevenue={totalRevenue.total ? Number(totalRevenue.total) : null}
          totalAppointments={totalAppointments.total}
          totalPatients={totalPatients.total}
          totalDoctors={totalDoctors.total}
        />

        {/* ✅ GRID ÚNICO 2x2: colunas com mesma largura e linhas com mesma altura */}
        <div className="grid gap-4 lg:grid-cols-[2.25fr_1fr] lg:grid-rows-[460px_340px] lg:items-stretch">
          {/* Linha 1 / Col 1 - Chart */}
          <div className="min-w-0 lg:h-full lg:overflow-hidden lg:*:h-full">
            <AppointmentsChart dailyAppointmentsData={dailyAppointmentsData} />
          </div>

          {/* Linha 1 / Col 2 - Médicos */}
          <div className="min-w-0 lg:h-full lg:overflow-hidden lg:*:h-full">
            <TopDoctors doctors={topDoctors} />
          </div>

          {/* Linha 2 / Col 1 - Agendamentos */}
          <Card className="min-w-0 lg:flex lg:h-full lg:flex-col lg:overflow-hidden">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Calendar className="text-muted-foreground" />
                <CardTitle className="text-base">Agendamentos de hoje</CardTitle>
              </div>
            </CardHeader>

            <CardContent className="min-h-0 flex-1 overflow-y-auto pr-2 pb-10 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <TodayAppointmentsTable appointments={todayAppointments} />
            </CardContent>
          </Card>

          {/* Linha 2 / Col 2 - Especialidades */}
          <div className="min-w-0 lg:h-full lg:overflow-hidden lg:*:h-full">
            <TopSpecialties topSpecialties={topSpecialties} />
          </div>
        </div>
      </PageContent>
    </PageContainer>
  );
};

export default DashboardPage;
