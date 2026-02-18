'use client';

import { use } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { useAuth } from '@/context/auth-context';
import { useProject } from '@/hooks/use-projects';
import { UserRole } from '@/types/projects';
import { SettingsSkeleton } from './_components/settings-skeleton';
import { ProjectDetailsForm } from './_components/project-details-form';
import { InviteMemberForm } from './_components/invite-member-form';
import { MembersSettingsTable } from './_components/members-settings-table';
import { DeleteProjectSection } from './_components/delete-project-section';

export default function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const { user } = useAuth();
  const { data: project, isLoading, isError, refetch } = useProject(projectId);

  if (isLoading) return <SettingsSkeleton />;

  if (isError || !project) {
    return (
      <div className="mt-16 flex flex-col items-center justify-center text-center">
        <p className="text-sm text-muted-foreground">Failed to load project settings.</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const currentMember = project.members.find((m) => m.userId === user?.id);
  const isAdmin = currentMember?.role === UserRole.ADMIN;

  if (!isAdmin) {
    return (
      <div className="mt-16 flex flex-col items-center justify-center text-center">
        <p className="text-sm text-muted-foreground">
          Only project admins can access settings.
        </p>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'Projects', href: '/projects' },
          { label: project.name, href: `/projects/${projectId}` },
          { label: 'Settings' },
        ]}
      />

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Settings</h1>

      <div className="mt-8">
        <ProjectDetailsForm
          projectId={projectId}
          initialName={project.name}
          initialDescription={project.description}
        />
      </div>

      <Separator className="my-8" />

      <InviteMemberForm projectId={projectId} />

      <Separator className="my-8" />

      <MembersSettingsTable
        projectId={projectId}
        members={project.members}
        currentUserId={user!.id}
      />

      <Separator className="my-8" />

      <DeleteProjectSection projectId={projectId} projectName={project.name} />
    </div>
  );
}
