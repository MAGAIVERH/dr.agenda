'use client';

import {
  CheckCircle2Icon,
  MoreVerticalIcon,
  PencilIcon,
  TrashIcon,
  UserX2Icon,
  XCircleIcon,
} from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { deleteAppointment } from '@/actions/delete-appointment';
import { updateAppointmentStatus } from '@/actions/update-appointment-status';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { appointmentsTables, doctorsTables, patientsTables } from '@/db/schema';

import AddAppointmentForm from './add-appointment-form';

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

interface AppointmentsTableActionsProps {
  appointment: AppointmentWithRelations;
  patients: (typeof patientsTables.$inferSelect)[];
  doctors: (typeof doctorsTables.$inferSelect)[];
}

const AppointmentsTableActions = ({
  appointment,
  patients,
  doctors,
}: AppointmentsTableActionsProps) => {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const updateStatusAction = useAction(updateAppointmentStatus);

  const deleteAppointmentAction = useAction(deleteAppointment, {
    onSuccess: () => {
      toast.success('Agendamento deletado com sucesso.');
      router.refresh();
    },
    onError: () => {
      toast.error('Erro ao deletar agendamento.');
    },
  });

  const handleDeleteAppointmentClick = () => {
    if (!appointment) return;
    deleteAppointmentAction.execute({ id: appointment.id });
  };

  const handleUpdateStatus = async (
    status: 'scheduled' | 'completed' | 'cancelled' | 'no_show',
  ) => {
    const toastId = toast.loading('Atualizando status...');

    try {
      const result = await updateStatusAction.executeAsync({
        id: appointment.id,
        status,
      });

      if (result?.data) {
        toast.success('Status do agendamento atualizado.', { id: toastId });

        // dá tempo do toast aparecer antes do refresh
        setTimeout(() => router.refresh(), 200);
        return;
      }

      if (result?.serverError) {
        toast.error(result.serverError, { id: toastId });
        return;
      }

      toast.error('Não foi possível atualizar o status.', { id: toastId });
    } catch {
      toast.error('Erro ao atualizar status do agendamento.', { id: toastId });
    }
  };

  const isUpdatingStatus = updateStatusAction.isExecuting;

  return (
    <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVerticalIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent>
          <DropdownMenuLabel>{appointment.patient.name}</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* ✅ Novas opções de status */}
          <DropdownMenuItem
            disabled={isUpdatingStatus}
            onSelect={(e) => {
              e.preventDefault();
              handleUpdateStatus('completed');
            }}
          >
            <CheckCircle2Icon />
            Concluído
          </DropdownMenuItem>

          <DropdownMenuItem
            disabled={isUpdatingStatus}
            onSelect={(e) => {
              e.preventDefault();
              handleUpdateStatus('no_show');
            }}
          >
            <UserX2Icon />
            Ausente
          </DropdownMenuItem>

          <DropdownMenuItem
            disabled={isUpdatingStatus}
            onSelect={(e) => {
              e.preventDefault();
              handleUpdateStatus('cancelled');
            }}
          >
            <XCircleIcon />
            Cancelado
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Editar */}
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setIsEditOpen(true);
            }}
          >
            <PencilIcon />
            Editar
          </DropdownMenuItem>

          {/* Excluir */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <TrashIcon />
                Excluir
              </DropdownMenuItem>
            </AlertDialogTrigger>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Tem certeza que deseja deletar esse agendamento?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Essa ação não pode ser revertida. Isso irá deletar o agendamento permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAppointmentClick}>
                  Deletar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DropdownMenuContent>
      </DropdownMenu>

      <AddAppointmentForm
        isOpen={isEditOpen}
        patients={patients}
        doctors={doctors}
        appointment={appointment}
        onSuccess={() => {
          setIsEditOpen(false);
          router.refresh();
        }}
      />
    </Dialog>
  );
};

export default AppointmentsTableActions;
