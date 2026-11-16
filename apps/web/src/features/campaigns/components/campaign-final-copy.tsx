import { MessageCircle, Type } from 'lucide-react';
import type { StoredCampaign } from '../types/stored-campaign.types';

export function CampaignFinalCopy({
  content,
}: {
  content: NonNullable<StoredCampaign['candidateContent']>;
}) {
  return (
    <section
      className="overflow-hidden rounded-2xl border bg-card"
      aria-label="Textos de esta revisión"
    >
      <div className="border-b p-5 sm:px-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Type aria-hidden="true" className="size-4 text-brand-cyan" />
          Textos de esta revisión
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          El mensaje guardado junto al flyer que estás revisando.
        </p>
      </div>
      <div className="space-y-5 p-5 sm:p-6">
        <div>
          <p className="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            En el flyer
          </p>
          <h3 className="break-words text-xl font-semibold tracking-tight">{content.headline}</h3>
          {content.subheadline && (
            <p className="mt-2 break-words text-sm text-muted-foreground">{content.subheadline}</p>
          )}
        </div>
        <div className="rounded-xl border bg-control p-4">
          <p className="mb-3 flex items-center gap-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            <MessageCircle aria-hidden="true" className="size-3.5" />
            Texto para la publicación
          </p>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {content.caption}
          </p>
          {content.hashtags.length > 0 && (
            <p className="mt-3 break-words text-xs leading-relaxed text-brand-cyan">
              {content.hashtags.join(' ')}
            </p>
          )}
        </div>
        <div className="break-words rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-center text-sm font-semibold">
          {content.cta}
        </div>
      </div>
    </section>
  );
}
