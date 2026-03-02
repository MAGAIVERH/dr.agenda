'use client';

import { CalendarDays, LayoutDashboard, LogOut, Stethoscope, UsersRound } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { authClient } from '@/lib/auth-client';

const items = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Agendamentos', url: '/appointments', icon: CalendarDays },
  { title: 'Médicos', url: '/doctors', icon: Stethoscope },
  { title: 'Pacientes', url: '/patients', icon: UsersRound },
];

const getInitial = (value?: string | null) => {
  const v = value?.trim();
  return v ? v[0].toUpperCase() : '?';
};

export function AppSidebar() {
  const router = useRouter();
  const session = authClient.useSession();
  const pathname = usePathname();

  const clinicName = session.data?.user?.clinic?.name ?? '';
  const userName = (session.data?.user as any)?.name ?? ''; // caso exista no seu session
  const email = session.data?.user?.email ?? '';

  const fallbackLetter = getInitial(clinicName || userName || email);

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push('/authentication');
        },
      },
    });
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4">
        <Image src="/logo.dr.agenda.svg" alt="Doutor Agenda" width={136} height={28} />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {/* ✅ BLOCO DO PERFIL (SEM DROPDOWN) */}
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="w-full">
              <Avatar className="h-9 w-9">
                <AvatarImage
                  src={(session.data?.user as any)?.image ?? undefined}
                  alt={clinicName || userName || 'Usuário'}
                />
                <AvatarFallback>{fallbackLetter}</AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium">
                  {clinicName || userName || 'Minha conta'}
                </p>
                <p className="text-muted-foreground truncate text-sm" title={email}>
                  {email}
                </p>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {/* ✅ BOTÃO SAIR VISÍVEL (ACIMA DO PERFIL) */}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              className="bg-primary hover:bg-primary/80 w-full justify-center gap-2 border-0 text-black"
            >
              <LogOut className="h-4 w-4" />
              <span className="font-medium">Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
