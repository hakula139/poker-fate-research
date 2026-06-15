import { labelClass } from './styles';

export function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background/45 p-2.5">
      <span className={labelClass}>{label}</span>
      <strong className="mt-1 block text-lg font-semibold text-foreground">{value}</strong>
    </div>
  );
}
