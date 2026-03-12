'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { format, isSameDay, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import dayjs from 'dayjs';
import { CalendarIcon } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { NumericFormat } from 'react-number-format';
import { toast } from 'sonner';
import { z } from 'zod';

import { getAvailableTimes } from '@/actions/get-available-times';
import { upsertAppointment } from '@/actions/upsert-appointment';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { appointmentsTables, doctorsTables, patientsTables } from '@/db/schema';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  patientId: z.string().min(1, {
    message: 'Paciente é obrigatório.',
  }),
  doctorId: z.string().min(1, {
    message: 'Médico é obrigatório.',
  }),
  appointmentPrice: z.number().min(1, {
    message: 'Valor da consulta é obrigatório.',
  }),
  date: z.date({
    message: 'Data é obrigatória.',
  }),
  time: z.string().min(1, {
    message: 'Horário é obrigatório.',
  }),
});

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

interface AddAppointmentFormProps {
  isOpen: boolean;
  patients: (typeof patientsTables.$inferSelect)[];
  doctors: (typeof doctorsTables.$inferSelect)[];
  onSuccess?: () => void;
  appointment?: AppointmentWithRelations;
}

const AddAppointmentForm = ({
  patients,
  doctors,
  onSuccess,
  isOpen,
  appointment,
}: AddAppointmentFormProps) => {
  const isEditing = !!appointment?.id;
  const initialDoctorIdRef = useRef<string | null>(null);

  const defaultValues = useMemo(() => {
    if (!appointment) {
      return {
        patientId: '',
        doctorId: '',
        appointmentPrice: 0,
        date: undefined,
        time: '',
      };
    }

    const appointmentDate = new Date(appointment.date);
    const appointmentTime = dayjs(appointmentDate).format('HH:mm:ss');

    return {
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      appointmentPrice: appointment.appointmentPriceInCents / 100,
      date: appointmentDate,
      time: appointmentTime,
    };
  }, [appointment]);

  const form = useForm<z.infer<typeof formSchema>>({
    shouldUnregister: true,
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const selectedDoctorId = form.watch('doctorId');
  const selectedPatientId = form.watch('patientId');
  const selectedDate = form.watch('date');

  const { data: availableTimes } = useQuery({
    queryKey: ['available-times', selectedDate, selectedDoctorId],
    queryFn: () =>
      getAvailableTimes({
        date: dayjs(selectedDate).format('YYYY-MM-DD'),
        doctorId: selectedDoctorId,
      }),
    enabled: !!selectedDate && !!selectedDoctorId,
  });

  useEffect(() => {
    if (!isOpen) return;

    initialDoctorIdRef.current = appointment?.doctorId ?? null;
    form.reset(defaultValues);
  }, [isOpen, form, defaultValues, appointment]);

  useEffect(() => {
    if (!selectedDoctorId) return;

    const selectedDoctor = doctors.find((doctor) => doctor.id === selectedDoctorId);
    if (!selectedDoctor) return;

    if (appointment?.id && initialDoctorIdRef.current === selectedDoctorId) return;

    form.setValue('appointmentPrice', selectedDoctor.appointmentPriceInCents / 100, {
      shouldDirty: false,
    });
  }, [selectedDoctorId, doctors, form, appointment?.id]);

  const upsertAppointmentAction = useAction(upsertAppointment, {
    onSuccess: () => {
      toast.success(
        isEditing ? 'Agendamento atualizado com sucesso.' : 'Agendamento criado com sucesso.',
      );
      onSuccess?.();
    },
    onError: () => {
      toast.error(isEditing ? 'Erro ao atualizar agendamento.' : 'Erro ao criar agendamento.');
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    upsertAppointmentAction.execute({
      id: appointment?.id,
      patientId: values.patientId,
      doctorId: values.doctorId,
      date: values.date,
      time: values.time,
      appointmentPriceInCents: Math.round(values.appointmentPrice * 100),
    });
  };

  const isDateAvailable = (date: Date) => {
    if (!selectedDoctorId) return false;
    const selectedDoctor = doctors.find((doctor) => doctor.id === selectedDoctorId);
    if (!selectedDoctor) return false;

    const dayOfWeek = date.getDay();
    const from = selectedDoctor.availableFromWeekDay;
    const to = selectedDoctor.availableToWeekDay;

    return from <= to ? dayOfWeek >= from && dayOfWeek <= to : dayOfWeek >= from || dayOfWeek <= to;
  };

  const isPastTimeToday = (timeValue: string) => {
    if (!selectedDate) return false;

    const now = new Date();
    if (!isSameDay(selectedDate, now)) return false;

    const [hours, minutes] = timeValue.split(':').map(Number);
    const slot = new Date(selectedDate);
    slot.setHours(hours, minutes, 0, 0);

    return slot.getTime() <= now.getTime();
  };

  const isDateTimeEnabled = selectedPatientId && selectedDoctorId;

  useEffect(() => {
    if (!isOpen) return;

    if (!selectedDoctorId || !selectedDate) {
      form.setValue('time', '');
      return;
    }

    if (
      appointment?.id &&
      selectedDoctorId === appointment.doctorId &&
      selectedDate &&
      isSameDay(selectedDate, new Date(appointment.date))
    ) {
      return;
    }

    form.setValue('time', '');
  }, [selectedDoctorId, selectedDate, form, appointment, isOpen]);

  return (
    <DialogContent className="sm:max-w-125">
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Editar agendamento' : 'Novo agendamento'}</DialogTitle>
        <DialogDescription>
          {isEditing
            ? 'Atualize os dados do agendamento.'
            : 'Crie um novo agendamento para sua clínica.'}
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="patientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Paciente</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione um paciente" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="doctorId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Médico</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione um médico" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        {doctor.name} - {doctor.specialty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="appointmentPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor da consulta</FormLabel>
                <NumericFormat
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value.floatValue ?? 0);
                  }}
                  decimalScale={2}
                  fixedDecimalScale
                  decimalSeparator=","
                  thousandSeparator="."
                  prefix="R$ "
                  allowNegative={false}
                  disabled={!selectedDoctorId}
                  customInput={Input}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        disabled={!isDateTimeEnabled}
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !field.value && 'text-muted-foreground',
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? (
                          format(field.value, 'PPP', { locale: ptBR })
                        ) : (
                          <span>Selecione uma data</span>
                        )}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      locale={ptBR}
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < startOfDay(new Date()) || !isDateAvailable(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Horário</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={!isDateTimeEnabled || !selectedDate}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione um horário" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableTimes?.data?.map((time) => {
                      const isPast = isPastTimeToday(time.value);
                      const isDisabled = !time.available || isPast;

                      return (
                        <SelectItem key={time.value} value={time.value} disabled={isDisabled}>
                          {time.label} {isDisabled && '(Indisponível)'}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <DialogFooter>
            <Button type="submit" disabled={upsertAppointmentAction.isPending}>
              {upsertAppointmentAction.isPending
                ? isEditing
                  ? 'Salvando...'
                  : 'Criando...'
                : isEditing
                  ? 'Salvar'
                  : 'Criar agendamento'}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
};

export default AddAppointmentForm;
