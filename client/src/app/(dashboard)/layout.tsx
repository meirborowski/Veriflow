'use client';

import { useAuth } from '@/context/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import {
  FolderOpen,
  FileText,
  Package,
  Settings,
  ChevronLeft,
  LogOut,
  Bug,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProject } from '@/hooks/use-projects';

const UUID_PATTERN = /^\/projects\/([0-9a-f-]{36})/i;

function extractProjectId(pathname: string): string | null {
  const match = pathname.match(UUID_PATTERN);
  return match ? match[1] : null;
}

function ProjectNav({ projectId, pathname }: { projectId: string; pathname: string }) {
  const { data: project } = useProject(projectId);

  const navItems = [
    { href: `/projects/${projectId}`, label: 'Overview', icon: FolderOpen, exact: true },
    { href: `/projects/${projectId}/stories`, label: 'Stories', icon: FileText },
    { href: `/projects/${projectId}/releases`, label: 'Releases', icon: Package },
    { href: `/projects/${projectId}/bugs`, label: 'Bugs', icon: Bug },
    { href: `/projects/${projectId}/settings`, label: 'Settings', icon: Settings },
  ];

  return (
    <>
      <div className="flex h-14 items-center border-b px-4">
        <Link
          href="/projects"
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Projects
        </Link>
      </div>
      <div className="border-b px-4 py-3">
        <p className="truncate text-sm font-semibold">
          {project?.name ?? '...'}
        </p>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function GlobalNav({ pathname }: { pathname: string }) {
  return (
    <>
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/projects" className="text-lg font-semibold tracking-tight">
          Veriflow
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        <Link
          href="/projects"
          className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            pathname.startsWith('/projects')
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
          }`}
        >
          <FolderOpen className="h-4 w-4" />
          Projects
        </Link>
      </nav>
    </>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (!user) return null;

  function handleLogout() {
    logout();
    router.push('/login');
  }

  const projectId = extractProjectId(pathname);

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 flex-col border-r bg-background">
        {projectId ? (
          <ProjectNav projectId={projectId} pathname={pathname} />
        ) : (
          <GlobalNav pathname={pathname} />
        )}
        <div className="border-t p-2">
          <div className="flex items-center justify-between px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title="Sign out"
              className="shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
