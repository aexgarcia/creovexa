import styles from './campaign-pipeline-preview.module.css';

export function CampaignPipelinePreview({
  stages,
  total,
}: {
  stages: readonly { label: string; count: number; color: string }[];
  total: number;
}) {
  return (
    <div className={styles.pipeline}>
      <ol aria-label="Recorrido de campañas de ejemplo" className={styles.steps}>
        {stages.map((stage) => (
          <li key={stage.label} className={styles.step}>
            <span className={`${styles.count} ${stage.count ? styles.active : ''}`}>
              {stage.count}
            </span>
            <span className={styles.label}>{stage.label}</span>
          </li>
        ))}
      </ol>
      <div
        className="mt-4 flex h-2 overflow-hidden rounded-full"
        aria-label="Distribución de campañas de ejemplo"
      >
        {stages
          .filter((stage) => stage.count > 0)
          .map((stage) => (
            <span
              key={stage.label}
              style={{
                backgroundColor: stage.color,
                width: `${total ? (stage.count / total) * 100 : 0}%`,
              }}
            />
          ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
        {stages
          .filter((stage) => stage.count > 0)
          .map((stage) => (
            <li key={stage.label} className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-sm" style={{ backgroundColor: stage.color }} />
              {stage.label}
              <b className="font-medium text-foreground">{stage.count}</b>·{' '}
              {total ? Math.round((stage.count / total) * 100) : 0}%
            </li>
          ))}
      </ul>
    </div>
  );
}
