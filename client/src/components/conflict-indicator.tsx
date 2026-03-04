import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function ConflictIndicator() {
  return (
    <Badge
      variant="outline"
      className="gap-1 border-amber-300 bg-amber-50 text-amber-700"
      title="Manual and automated test results disagree"
    >
      <AlertTriangle className="h-3 w-3" />
      Conflict
    </Badge>
  );
}
