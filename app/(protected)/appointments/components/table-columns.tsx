'use client';

import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { appointmentsTables, patientsTables } from '@/db/schema';

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
  doctors: any[]; // mantém seu contrato atual (você já passa doctors mas não usa aqui)
}

type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

const BADGE_BASE = 'h-6 min-w-[108px] justify-center rounded-md px-2 text-xs font-medium leading-6';

const getAppointmentBadge = (appointment: AppointmentWithRelations) => {
  const now = new Date();
  const appointmentDate = new Date(appointment.date);

  const status = (appointment.status as AppointmentStatus) ?? 'scheduled';

  // 🔥 Prioridade 1: status vindo do banco (sempre vence)
  if (status === 'completed') {
    return {
      label: 'Concluído',
      variant: 'default' as const,
      className: BADGE_BASE,
    };
  }

  if (status === 'cancelled') {
    return {
      label: 'Cancelado',
      variant: 'destructive' as const,
      className: BADGE_BASE,
    };
  }

  if (status === 'no_show') {
    return {
      label: 'Ausente',
      variant: 'secondary' as const,
      className: `${BADGE_BASE} bg-zinc-100 text-zinc-700`,
    };
  }

  // A partir daqui: status é scheduled (ainda não concluído/cancelado/ausente no DB)

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const startOfDayAfterTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);

  // Se é HOJE: aplicar regra dos 30 minutos
  if (appointmentDate >= startOfToday && appointmentDate < startOfTomorrow) {
    const diffMs = now.getTime() - appointmentDate.getTime();
    const thirtyMinutesMs = 30 * 60 * 1000;

    // ainda não chegou o horário
    if (diffMs < 0) {
      return {
        label: 'Confirmado',
        variant: 'secondary' as const,
        className: `${BADGE_BASE} bg-blue-100 text-blue-700`,
      };
    }

    // já passou do horário, mas ainda dentro da tolerância
    if (diffMs <= thirtyMinutesMs) {
      return {
        label: 'Atrasado',
        variant: 'secondary' as const,
        className: `${BADGE_BASE} bg-amber-100 text-amber-800`,
      };
    }

    // passou 30 min: vira ausente (regra automática visual)
    return {
      label: 'Ausente',
      variant: 'secondary' as const,
      className: `${BADGE_BASE} bg-zinc-100 text-zinc-700`,
    };
  }

  // Se já passou do dia (ontem pra trás) e ainda estava scheduled:
  // regra automática visual: não compareceu => Ausente
  if (appointmentDate < startOfToday) {
    return {
      label: 'Ausente',
      variant: 'secondary' as const,
      className: `${BADGE_BASE} bg-zinc-100 text-zinc-700`,
    };
  }

  // Futuro: contexto
  // Amanhã
  if (appointmentDate >= startOfTomorrow && appointmentDate < startOfDayAfterTomorrow) {
    return {
      label: 'Amanhã',
      variant: 'outline' as const,
      className: `${BADGE_BASE} border-sky-200 bg-sky-50 text-sky-700`,
    };
  }

  // Esta semana (até 7 dias)
  const sevenDaysFromNow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
  if (appointmentDate < sevenDaysFromNow) {
    return {
      label: 'Esta semana',
      variant: 'outline' as const,
      className: `${BADGE_BASE} border-indigo-200 bg-indigo-50 text-indigo-700`,
    };
  }

  // Este mês (mesmo mês/ano)
  if (
    appointmentDate.getMonth() === now.getMonth() &&
    appointmentDate.getFullYear() === now.getFullYear()
  ) {
    return {
      label: 'Este mês',
      variant: 'outline' as const,
      className: `${BADGE_BASE} border-purple-200 bg-purple-50 text-purple-700`,
    };
  }

  // Fora do mês (futuro mais distante)
  return {
    label: 'Agendado',
    variant: 'outline' as const,
    className: `${BADGE_BASE} border-muted bg-muted/30 text-muted-foreground`,
  };
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

      return format(appointmentDate, "dd/MM/yyyy 'às' HH:mm", {
        locale: ptBR,
      });
    },
  },
  {
    id: 'status',
    header: 'Status',
    cell: (params) => {
      const appointment = params.row.original;
      const badge = getAppointmentBadge(appointment);

      return (
        <Badge variant={badge.variant} className={badge.className}>
          {badge.label}
        </Badge>
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
