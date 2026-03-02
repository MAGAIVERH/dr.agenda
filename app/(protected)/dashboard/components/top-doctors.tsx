import { Stethoscope } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardTitle } from '@/components/ui/card';

interface TopDoctorsProps {
  doctors: {
    id: string;
    name: string;
    avatarImageUrl: string | null;
    specialty: string;
    appointments: number;
  }[];
}

const SPECIALTY_ABBREVIATIONS: Record<string, string> = {
  'Medicina de Família e Comunidade': 'Med. Família e Comun.',
  'Medicina Legal e Perícia Médica': 'Med. Legal e Perícia',
  'Medicina Física e Reabilitação': 'Med. Física e Reab.',
  'Endocrinologia e Metabologia': 'Endócrino e Metab.',
  'Hematologia e Hemoterapia': 'Hematol. e Hemot.',
  'Ortopedia e Traumatologia': 'Ortop. e Trauma.',
  'Ginecologia e Obstetrícia': 'Gineco. e Obst.',
  'Radiologia e Diagnóstico por Imagem': 'Radio. e Diag. Img.',
  'Patologia Clínica/Medicina Laboratorial': 'Patol. Clín./Lab.',
  'Cirurgia do Aparelho Digestivo': 'Cir. Ap. Digestivo',
  'Cirurgia de Cabeça e Pescoço': 'Cir. Cabeça/Pescoço',
  'Cirurgia Cardiovascular': 'Cir. Cardiov.',
  'Medicina de Emergência': 'Med. Emergência',
  'Medicina do Trabalho': 'Med. Trabalho',
  'Medicina do Esporte': 'Med. Esporte',
  Otorrinolaringologia: 'Otorrino.',
};

const abbreviateSpecialty = (specialty: string, maxLen = 22) => {
  const original = specialty.trim().replace(/\s+/g, ' ');
  if (!original) return original;

  const fromMap = SPECIALTY_ABBREVIATIONS[original];
  let result = fromMap ?? original;

  // replacements leves para padronizar abreviação
  const replacements: Array<[RegExp, string]> = [
    [/\bMedicina\b/gi, 'Med.'],
    [/\bCirurgia\b/gi, 'Cir.'],
    [/\bDiagnóstico\b/gi, 'Diag.'],
    [/\bImagem\b/gi, 'Img.'],
    [/\bClínica\b/gi, 'Clín.'],
    [/\bLaboratorial\b/gi, 'Lab.'],
    [/\bTraumatologia\b/gi, 'Trauma.'],
    [/\bObstetrícia\b/gi, 'Obst.'],
    [/\bMetabologia\b/gi, 'Metab.'],
    [/\bHemoterapia\b/gi, 'Hemot.'],
    [/\bReabilitação\b/gi, 'Reab.'],
    [/\bCardiovascular\b/gi, 'Cardiov.'],
  ];

  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }

  const stopwords = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'por', 'a', 'o']);

  // Abrevia palavras longas (fallback geral)
  result = result
    .split(' ')
    .map((w) => {
      const lower = w.toLowerCase();
      if (stopwords.has(lower)) return lower;
      if (w.includes('/') || w.endsWith('.')) return w;
      if (w.length <= 5) return w;
      return `${w.slice(0, 5)}.`;
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Garante tamanho máximo (sem ficar feio)
  if (result.length > maxLen) {
    // 1) remove stopwords
    const noStops = result
      .split(' ')
      .filter((w) => !stopwords.has(w.toLowerCase()))
      .join(' ')
      .trim();

    result = noStops || result;
  }

  if (result.length > maxLen) {
    // 2) encurta mais agressivo e aplica ellipsis
    const compact = result
      .split(' ')
      .map((w) => {
        const lower = w.toLowerCase();
        if (stopwords.has(lower)) return '';
        if (w.includes('/') || w.endsWith('.')) return w;
        if (w.length <= 4) return w;
        return `${w.slice(0, 3)}.`;
      })
      .filter(Boolean)
      .join(' ')
      .trim();

    result = compact.length > maxLen ? `${compact.slice(0, maxLen - 1)}…` : compact;
  }

  return result;
};

const formatAppointmentsCount = (n: number) => `${n} agend.`;

export default function TopDoctors({ doctors }: TopDoctorsProps) {
  const hasMoreThanFive = doctors.length > 5;

  return (
    <Card className="mx-auto w-full">
      <CardContent>
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Stethoscope className="text-muted-foreground" />
            <CardTitle className="text-base">Médicos</CardTitle>
          </div>
        </div>

        <div className="relative">
          <div
            className={[
              'space-y-6',
              'max-h-100',
              'overflow-y-auto',
              'pr-2',
              'pb-8',
              'overscroll-contain',
              '[-ms-overflow-style:none]',
              '[scrollbar-width:none]',
              '[&::-webkit-scrollbar]:hidden',
            ].join(' ')}
          >
            {doctors.map((doctor) => (
              <div key={doctor.id} className="flex items-center gap-4">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={doctor.avatarImageUrl ?? undefined} alt={doctor.name} />
                    <AvatarFallback className="bg-muted text-muted-foreground text-sm font-medium">
                      {doctor.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-medium">{doctor.name}</h3>
                    <p className="text-muted-foreground truncate text-sm" title={doctor.specialty}>
                      {abbreviateSpecialty(doctor.specialty, 22)}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span className="text-muted-foreground inline-flex min-w-27.5 justify-end text-sm font-medium whitespace-nowrap tabular-nums">
                    {formatAppointmentsCount(doctor.appointments)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {hasMoreThanFive ? (
            <div className="from-background pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-t to-transparent" />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
