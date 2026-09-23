import React, { useEffect, useState } from 'react';
import { XIcon, AlertTriangleIcon } from 'lucide-react';
import { Button } from './ui/Button';
import type { ApprovalItem } from '../types';

interface ApprovalDecisionModalProps {
  isOpen: boolean;
  items: ApprovalItem[];
  decision: 'approved' | 'rejected' | null;
  onClose: () => void;
  onSubmit: (comment: string) => { succeeded: ApprovalItem[]; failed: Array<{ item: ApprovalItem; error: string }> } | void;
}

export function ApprovalDecisionModal({ isOpen, items, decision, onClose, onSubmit }: ApprovalDecisionModalProps) {
  const [comment, setComment] = useState('');
  const [result, setResult] = useState<{ succeeded: ApprovalItem[]; failed: Array<{ item: ApprovalItem; error: string }> } | null>(null);

  useEffect(() => {
    setComment('');
    setResult(null);
  }, [isOpen, items]);

  if (!isOpen || !decision) return null;

  const isReject = decision === 'rejected';
  const canSubmit = !isReject || comment.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const outcome = onSubmit(comment);
    if (outcome && outcome.failed.length > 0) {
      setResult(outcome);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div
        className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-pop animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-line pb-4">
          <div>
            <h2 className="text-lg font-bold text-ink">{isReject ? 'Reject' : 'Approve'} {items.length > 1 ? `${items.length} items` : '1 item'}</h2>
            <p className="text-xs text-muted mt-0.5">{items.map((i) => i.title).join(', ').slice(0, 120)}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink transition-colors">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-2xs font-semibold uppercase tracking-wider text-faint mb-1">
              Comment {isReject && <span className="text-danger">*</span>}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder={isReject ? 'Explain why this is being rejected...' : 'Optional context for the record...'}
              className="w-full rounded border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none"
            />
          </div>

          {result && result.failed.length > 0 && (
            <div className="flex items-start gap-2.5 rounded-xl border border-danger/40 bg-danger-soft/30 p-3.5">
              <AlertTriangleIcon className="h-4 w-4 shrink-0 text-danger mt-0.5" />
              <div className="text-xs text-ink">
                <p className="font-semibold">
                  {result.succeeded.length} succeeded, {result.failed.length} failed:
                </p>
                <ul className="mt-1 list-disc pl-4 space-y-0.5">
                  {result.failed.map(({ item, error }) => (
                    <li key={item.id}>
                      {item.title}: {error}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              {result ? 'Close' : 'Cancel'}
            </Button>
            {!result && (
              <Button type="submit" variant={isReject ? 'danger' : 'success'} disabled={!canSubmit}>
                Confirm {isReject ? 'Rejection' : 'Approval'}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
