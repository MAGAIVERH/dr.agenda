import { z } from 'zod';

export const upsertPatientSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(1, {
      message: 'Nome é obrigatório.',
    }),
    email: z.string().email({
      message: 'Email inválido.',
    }),
    phoneNumber: z.string().trim().min(1, {
      message: 'Número de telefone é obrigatório.',
    }),

    sex: z.enum(['male', 'female'] as const).optional(),
  })
  //  aqui garante obrigatório com mensagem correta
  .refine(
    (data) => {
      return !!data.sex;
    },
    {
      message: 'Sexo é obrigatório.',
      path: ['sex'],
    },
  )
  //  aqui “fecha” o tipo e garante sex obrigatório no output
  .transform((data) => ({
    ...data,
    sex: data.sex!,
  }));

export type UpsertPatientSchema = z.infer<typeof upsertPatientSchema>;
