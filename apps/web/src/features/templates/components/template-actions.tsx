import Link from 'next/link';
import { Button } from '@/components/ui/button';
export function TemplateActions({ templateId }: { templateId: string }) {
  return (
    <Button
      variant="outline"
      nativeButton={false}
      render={<Link href={`/templates/${templateId}/edit`} />}
    >
      Ver detalle
    </Button>
  );
}
