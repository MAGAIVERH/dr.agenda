import { asc, eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { db } from '@/db';
import { appointmentsTables, doctorsTables, patientsTables } from '@/db/schema';
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

import AddAppointmentButton from './components/add-appointment-button';
import AppointmentsTable from './components/appointments-table';

const AppointmentsPage = async () => {
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

  const [patients, doctors, appointments] = await Promise.all([
    db.query.patientsTables.findMany({
      where: eq(patientsTables.clinicId, session.user.clinic.id),
    }),
    db.query.doctorsTables.findMany({
      where: eq(doctorsTables.clinicId, session.user.clinic.id),
    }),
    db.query.appointmentsTables.findMany({
      where: eq(appointmentsTables.clinicId, session.user.clinic.id),
      with: {
        patient: true,
        doctor: true,
      },
      orderBy: [asc(appointmentsTables.date)],
    }),
  ]);

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
      </PageContent>
    </PageContainer>
  );
};

export default AppointmentsPage;
