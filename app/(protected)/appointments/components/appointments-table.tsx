'use client';

import { useMemo } from 'react';

import { DataTable } from '@/components/ui/data-table';
import { appointmentsTables, doctorsTables, patientsTables } from '@/db/schema';

import { getAppointmentsTableColumns } from './table-columns';

type AppointmentWithRelations = typeof appointmentsTables.$inferSelect & {
  patient: {
    id: string;
    name: string;
    email: string;
    phoneNumber: string;
    sex: 'male' | 'female';
  };
  doctor: {
    id: string;
    name: string;
    specialty: string;
  };
};

interface AppointmentsTableProps {
  appointments: AppointmentWithRelations[];
  patients: (typeof patientsTables.$inferSelect)[];
  doctors: (typeof doctorsTables.$inferSelect)[];
}

const AppointmentsTable = ({ appointments, patients, doctors }: AppointmentsTableProps) => {
  const columns = useMemo(() => {
    return getAppointmentsTableColumns({ patients, doctors });
  }, [patients, doctors]);

  return <DataTable data={appointments} columns={columns} />;
};

export default AppointmentsTable;
