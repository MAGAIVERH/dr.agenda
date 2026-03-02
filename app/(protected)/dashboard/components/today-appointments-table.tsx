'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

const StatusPill = ({ label }: { label: string }) => {
  return (
    <span className="bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium">
      <span className="bg-primary h-2 w-2 rounded-full" />
      {label}
    </span>
  );
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

              return (
                <TableRow key={appointment.id} className="hover:bg-muted/30">
                  <TableCell className="py-4 font-medium">{appointment.patient?.name}</TableCell>

                  <TableCell className="py-4">
                    {format(appointmentDate, 'dd/MM/yy, HH:mm', { locale: ptBR })}
                  </TableCell>

                  <TableCell className="py-4">{appointment.doctor?.name}</TableCell>

                  <TableCell className="py-4">
                    <StatusPill label="Confirmado" />
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
