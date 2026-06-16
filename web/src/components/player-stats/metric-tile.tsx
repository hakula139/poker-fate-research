import { labelClass } from './styles';

export function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background/45 rounded-md border p-2.5">
      <span className={labelClass}>{label}</span>
      <strong className="text-foreground mt-1 block text-lg font-semibold">{value}</strong>
    </div>
  );
}
