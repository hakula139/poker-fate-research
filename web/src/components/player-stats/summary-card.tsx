import { Card, CardContent } from '@/components/ui/card';

import { labelClass } from './styles';

export function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <span className={labelClass}>{label}</span>
        <strong className="mt-1 block text-xl font-semibold wrap-anywhere">{value}</strong>
      </CardContent>
    </Card>
  );
}
