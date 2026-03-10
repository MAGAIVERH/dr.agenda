'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { appointmentsTables } from '@/db/schema';

type TodayAppointment = typeof appointmentsTables.$inferSelect & {
  patient: {
    id: string;
    name: string;
  };
  doctor: {
    id: string;
    name: string;
  };
};

interface TodayAppointmentsTableProps {
  appointments: TodayAppointment[];
}

type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

const BADGE_BASE = 'h-6 min-w-[108px] justify-center rounded-md px-2 text-xs font-medium leading-6';

const getTodayAppointmentBadge = (status: string) => {
  const appointmentStatus = (status as AppointmentStatus) ?? 'scheduled';

  if (appointmentStatus === 'completed') {
    return {
      label: 'Concluído',
      variant: 'default' as const,
      className: BADGE_BASE,
    };
  }

  if (appointmentStatus === 'cancelled') {
    return {
      label: 'Cancelado',
      variant: 'destructive' as const,
      className: BADGE_BASE,
    };
  }

  if (appointmentStatus === 'no_show') {
    return {
      label: 'Ausente',
      variant: 'secondary' as const,
      className: `${BADGE_BASE} bg-zinc-100 text-zinc-700`,
    };
  }

  return {
    label: 'Confirmado',
    variant: 'secondary' as const,
    className: `${BADGE_BASE} bg-blue-100 text-blue-700`,
  };
};

const TodayAppointmentsTable = ({ appointments }: TodayAppointmentsTableProps) => {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="text-muted-foreground text-xs font-medium uppercase">
              Paciente
            </TableHead>
            <TableHead className="text-muted-foreground text-xs font-medium uppercase">
              Data
            </TableHead>
            <TableHead className="text-muted-foreground text-xs font-medium uppercase">
              Doutor
            </TableHead>
            <TableHead className="text-muted-foreground text-xs font-medium uppercase">
              Status
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {appointments.length ? (
            appointments.map((appointment) => {
              const appointmentDate = new Date(appointment.date);
              const badge = getTodayAppointmentBadge(appointment.status);

              return (
                <TableRow key={appointment.id} className="hover:bg-muted/30">
                  <TableCell className="py-4 font-medium">{appointment.patient?.name}</TableCell>

                  <TableCell className="py-4">
                    {format(appointmentDate, 'dd/MM/yy, HH:mm', { locale: ptBR })}
                  </TableCell>

                  <TableCell className="py-4">{appointment.doctor?.name}</TableCell>

                  <TableCell className="py-4">
                    <Badge variant={badge.variant} className={badge.className}>
                      {badge.label}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground h-24 text-center">
                Nenhum agendamento para hoje.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default TodayAppointmentsTable;
