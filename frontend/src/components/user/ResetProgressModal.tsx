import React, { useEffect, useRef, useState } from 'react';
import { userService } from '../../services/user.service';
import { Button } from '../common/Button';
import { FormError } from '../common/FormError';

interface Props {
  open: boolean;
  onClose: () => void;
  // Injected for tests. Production always navigates via window.location.assign.
  onReload?: () => void;
}

const CONFIRM_WORD = 'RESET';

export const ResetProgressModal: React.FC<Props> = ({
  open,
  onClose,
  onReload,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Reset internal state on each open so a previous failed attempt's
  // typed text doesn't persist for the next visit.
  useEffect(() => {
    if (!open) return;
    setConfirmText('');
    setError(null);
    setToast(null);
    setSubmitting(false);
    // Focus the confirm field on next tick so the modal is mountable.
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  if (!open) return null;

  const canSubmit = confirmText === CONFIRM_WORD && !submitting;

  const handleConfirm = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await userService.resetProgress();
      setToast('Progress reset — reloading…');
      // Tiny delay so the user sees the toast; full reload clears every cache
      // (AuthContext stage cache, dashboard intro flag still applies per-device).
      setTimeout(() => {
        if (onReload) onReload();
        else window.location.assign('/dashboard');
      }, 600);
    } catch (err) {
      const apiErr = err as { code?: string; message?: string };
      setError(apiErr?.message || 'Could not reset progress.');
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 px-4"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !submitting) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
        <h2 id="reset-modal-title" className="text-xl font-bold text-gray-900">
          Reset all your testing data?
        </h2>
        <p className="text-sm text-gray-700">
          This action wipes everything you've created on this account so you can
          re-run the cascade from a clean state.
        </p>

        <div className="rounded-lg bg-red-50 ring-1 ring-red-200 p-3 text-sm">
          <p className="font-semibold text-red-800 mb-1">Will be deleted</p>
          <ul className="list-disc list-inside text-red-800 space-y-0.5">
            <li>All assessments (5Q, 10Q, GAP test)</li>
            <li>All worksheet drafts and submissions</li>
            <li>Framework step progress</li>
            <li>Example calculator interactions</li>
          </ul>
        </div>

        <div className="rounded-lg bg-emerald-50 ring-1 ring-emerald-200 p-3 text-sm">
          <p className="font-semibold text-emerald-800 mb-1">Will be kept</p>
          <ul className="list-disc list-inside text-emerald-800 space-y-0.5">
            <li>Your account, profile, and password</li>
            <li>Compliance audit log</li>
          </ul>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">
            Type <span className="font-mono font-bold">{CONFIRM_WORD}</span> to confirm
          </span>
          <input
            ref={inputRef}
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            disabled={submitting}
            aria-label="Type RESET to confirm"
            autoComplete="off"
            spellCheck={false}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus:border-blue-500"
          />
        </label>

        {error && <FormError error={error} />}

        {toast ? (
          <p role="status" className="text-sm text-emerald-800 text-center">
            {toast}
          </p>
        ) : (
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleConfirm}
              disabled={!canSubmit}
              aria-label="Confirm reset"
            >
              {submitting ? 'Resetting…' : 'Reset progress'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
