import { useEffect, useState } from 'react';
import {
  applyPwaUpdate,
  dismissUpdateNotice,
  getPwaBridgeState,
  subscribePwaBridge,
} from '../../utils/pwaBridge';

export function PwaUpdateBanner() {
  const [bridge, setBridge] = useState(getPwaBridgeState());
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => subscribePwaBridge(setBridge), []);

  if (!bridge.needRefresh || bridge.dismissUpdate) return null;

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await applyPwaUpdate();
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="pwa-update-banner" role="status" aria-live="polite">
      <span className="pwa-update-copy">A new version is ready.</span>
      <div className="pwa-update-actions">
        <button
          type="button"
          className="action-btn primary small"
          onClick={handleUpdate}
          disabled={isUpdating}
        >
          {isUpdating ? 'Updating...' : 'Update now'}
        </button>
        <button
          type="button"
          className="action-btn outline small"
          onClick={dismissUpdateNotice}
          disabled={isUpdating}
        >
          Later
        </button>
      </div>
    </div>
  );
}
