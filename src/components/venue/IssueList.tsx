'use client';

import { CheckCircle2 } from 'lucide-react';
import type { LayoutIssue } from '@/types/layout-advisor';

interface IssueListProps {
  issues: LayoutIssue[];
  onHighlightIssue: (issue: LayoutIssue) => void;
}

const SEVERITY_STYLES: Record<string, { dot: string; bg: string }> = {
  critical: { dot: 'bg-red-500', bg: 'hover:bg-red-50' },
  warning: { dot: 'bg-amber-500', bg: 'hover:bg-amber-50' },
  info: { dot: 'bg-blue-500', bg: 'hover:bg-blue-50' },
};

export default function IssueList({ issues, onHighlightIssue }: IssueListProps) {
  if (issues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <CheckCircle2 size={32} className="text-emerald-500 mb-2" />
        <p className="text-sm font-medium text-slate-700">No issues found</p>
        <p className="text-xs text-slate-500 mt-1">Your layout looks good!</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
      {issues.map((issue, idx) => {
        const styles = SEVERITY_STYLES[issue.severity] || SEVERITY_STYLES.info;
        return (
          <button
            key={issue.id}
            onClick={() => onHighlightIssue(issue)}
            className={`w-full text-left p-3 transition-colors ${styles.bg}`}
          >
            <div className="flex items-start gap-2">
              <span className="flex items-center gap-1.5 shrink-0 mt-0.5">
                <span className="text-xs font-medium text-slate-400">{idx + 1}</span>
                <span className={`w-2 h-2 rounded-full ${styles.dot}`} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 leading-tight">{issue.title}</p>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{issue.description}</p>
                {issue.affectedObjectIds.length > 0 && (
                  <span className="inline-block mt-1 text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                    {issue.affectedObjectIds.length} object{issue.affectedObjectIds.length > 1 ? 's' : ''} affected
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
