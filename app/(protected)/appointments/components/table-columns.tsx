'use client';

import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { appointmentsTables, doctorsTables, patientsTables } from '@/db/schema';

import { Badge } from '@/components/ui/badge';
import AppointmentsTableActions from './table-actions';

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

interface GetAppointmentsTableColumnsProps {
  patients: (typeof patientsTables.$inferSelect)[];
  doctors: (typeof doctorsTables.$inferSelect)[];
}

const getAppointmentStatus = (date: Date) => {
  const now = new Date();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const startOfDayAfterTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);

  if (date < startOfToday) {
    return { label: 'Atrasado', variant: 'destructive' as const };
  }

  if (date >= startOfToday && date < startOfTomorrow) {
    return { label: 'Hoje', variant: 'default' as const };
  }

  if (date >= startOfTomorrow && date < startOfDayAfterTomorrow) {
    return { label: 'Amanhã', variant: 'secondary' as const };
  }

  const sevenDaysFromNow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
  if (date < sevenDaysFromNow) {
    return { label: 'Esta semana', variant: 'outline' as const };
  }

  return null;
};

export const getAppointmentsTableColumns = ({
  patients,
  doctors,
}: GetAppointmentsTableColumnsProps): ColumnDef<AppointmentWithRelations>[] => [
  {
    id: 'patient',
    accessorKey: 'patient.name',
    header: 'Paciente',
  },
  {
    id: 'doctor',
    accessorKey: 'doctor.name',
    header: 'Médico',
    cell: (params) => {
      const appointment = params.row.original;
      return `${appointment.doctor.name}`;
    },
  },
  {
    id: 'date',
    accessorKey: 'date',
    header: 'Data e Hora',
    cell: (params) => {
      const appointment = params.row.original;
      const appointmentDate = new Date(appointment.date);

      const formatted = format(appointmentDate, "dd/MM/yyyy 'às' HH:mm", {
        locale: ptBR,
      });

      const status = getAppointmentStatus(appointmentDate);
      const appointmentBadgeClassName =
        'h-6 min-w-[92px] justify-center rounded-md px-2 text-xs font-medium leading-6';

      return (
        <div className="flex items-center gap-2">
          <span>{formatted}</span>
          {status ? (
            <Badge variant={status.variant} className={appointmentBadgeClassName}>
              {status.label}
            </Badge>
          ) : null}
        </div>
      );
    },
  },

  {
    id: 'specialty',
    accessorKey: 'doctor.specialty',
    header: 'Especialidade',
  },
  {
    id: 'price',
    accessorKey: 'appointmentPriceInCents',
    header: 'Valor',
    cell: (params) => {
      const appointment = params.row.original;
      const price = appointment.appointmentPriceInCents / 100;
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(price);
    },
  },
  {
    id: 'actions',
    cell: (params) => {
      const appointment = params.row.original;
      return (
        <AppointmentsTableActions appointment={appointment} patients={patients} doctors={doctors} />
      );
    },
  },
];
