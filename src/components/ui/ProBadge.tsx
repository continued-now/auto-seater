import { Lock } from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';

export function ProBadge() {
  return (
    <Tooltip content="Upgrade to Pro to unlock this feature" side="top">
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
        <Lock size={10} />
        PRO
      </span>
    </Tooltip>
  );
}
