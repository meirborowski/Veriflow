'use client';

import { use } from 'react';
import Link from 'next/link';
import { FileText, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { RoleBadge } from '@/components/role-badge';
import { useAuth } from '@/context/auth-context';
import { useProject } from '@/hooks/use-projects';
import { UserRole } from '@/types/projects';
import { ProjectDetailSkeleton } from './_components/project-detail-skeleton';

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const { user } = useAuth();
  const { data: project, isLoading, isError, refetch } = useProject(projectId);

  if (isLoading) return <ProjectDetailSkeleton />;

  if (isError || !project) {
    return (
      <div className="mt-16 flex flex-col items-center justify-center text-center">
        <p className="text-sm text-muted-foreground">Failed to load project.</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const currentMember = project.members.find((m) => m.userId === user?.id);
  const isAdmin = currentMember?.role === UserRole.ADMIN;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Projects', href: '/projects' },
          { label: project.name },
        ]}
      />

      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
        {isAdmin && (
          <Button variant="outline" size="icon" asChild>
            <Link
              href={`/projects/${projectId}/settings`}
              aria-label="Project settings"
              title="Project settings"
            >
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>

      {project.description && (
        <p className="mt-2 text-sm text-muted-foreground">{project.description}</p>
      )}

      <div className="mt-8">
        <Link
          href={`/projects/${projectId}/stories`}
          className="inline-flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50"
        >
          <div className="rounded-md bg-muted p-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">User Stories</p>
            <p className="text-sm text-muted-foreground">
              Manage stories and verification steps
            </p>
          </div>
        </Link>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-medium">Members</h2>
        <div className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {project.members.map((member) => (
                <TableRow key={member.userId}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell className="text-muted-foreground">{member.email}</TableCell>
                  <TableCell>
                    <RoleBadge role={member.role} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
