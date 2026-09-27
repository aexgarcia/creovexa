import { EditTemplateView } from '@/features/templates/components/edit-template-view';

interface EditTemplatePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditTemplatePage({ params }: EditTemplatePageProps) {
  const { id } = await params;

  return <EditTemplateView templateId={id} />;
}
