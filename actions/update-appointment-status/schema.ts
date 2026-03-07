import { z } from 'zod';

export const updateAppointmentStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['scheduled', 'completed', 'cancelled', 'no_show']),
});
