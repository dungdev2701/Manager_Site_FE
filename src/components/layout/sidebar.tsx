'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Globe,
  Users,
  BarChart3,
  LogOut,
  Menu,
  X,
  Mail,
  Wrench,
  Network,
} from 'lucide-react';

const LikepionLogo = () => (
  <img
    src="https://app.likepion.com/images/logo-likepion-light.svg"
    alt="Likepion"
    className="h-8"
  />
);
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/hooks';
import { Role } from '@/types';
import { useState } from 'react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[];
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Websites',
    href: '/websites',
    icon: Globe,
  },
  {
    title: 'Emails',
    href: '/emails',
    icon: Mail,
  },
  {
    title: 'Proxies',
    href: '/proxies',
    icon: Network,
  },
  {
    title: 'Tools',
    href: '/tools',
    icon: Wrench,
  },
  {
    title: 'Statistics',
    href: '/statistics',
    icon: BarChart3,
  },
  {
    title: 'Users',
    href: '/users',
    icon: Users,
    roles: [Role.ADMIN],
  },
];

function NavLinks({ onItemClick }: { onItemClick?: () => void }) {
  const pathname = usePathname();
  const { hasRole } = useAuth();

  return (
    <nav className="flex flex-col gap-1">
      {navItems
        .filter((item) => !item.roles || hasRole(item.roles))
        .map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onItemClick}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </Link>
          );
        })}
    </nav>
  );
}

export function Sidebar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const SidebarContent = ({ onItemClick }: { onItemClick?: () => void }) => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center">
          <LikepionLogo />
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-auto py-4 px-3">
        <NavLinks onItemClick={onItemClick} />
      </div>

      {/* User info & Logout */}
      <div className="border-t p-4">
        <div className="mb-3">
          <p className="text-sm font-medium">{user?.name}</p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Sidebar */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild className="lg:hidden">
          <Button variant="ghost" size="icon" className="fixed left-4 top-3 z-40">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent onItemClick={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex h-screen w-64 flex-col border-r bg-background">
        <SidebarContent />
      </aside>
    </>
  );
}
