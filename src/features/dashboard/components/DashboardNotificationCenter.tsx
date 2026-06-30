import { Bell, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

export interface DashboardNotificationAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

export interface DashboardNotificationItem {
  id: string;
  title: string;
  message: string;
  unread: boolean;
  primaryAction?: DashboardNotificationAction;
  secondaryAction?: DashboardNotificationAction;
  onDismiss: () => void;
}

interface DashboardNotificationCenterProps {
  items: DashboardNotificationItem[];
  onPanelOpen: () => void;
}

export function DashboardNotificationCenter({
  items,
  onPanelOpen,
}: DashboardNotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (items.length === 0) {
      setIsOpen(false);
    }
  }, [items.length]);

  const hasUnread = useMemo(() => items.some((item) => item.unread), [items]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (!rootRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isOpen]);

  const handleToggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) {
      onPanelOpen();
    }
  };

  if (items.length === 0) return null;

  return (
    <div ref={rootRef} className="dashboard-notifications-root">
      {isOpen && (
        <section className="dashboard-notifications-panel glass-panel" aria-label="Notifications">
          <div className="dashboard-notifications-header">
            <h3>Notifications</h3>
          </div>

          <div className="dashboard-notifications-list">
            {items.map((item) => (
              <article
                key={item.id}
                className={`dashboard-notification-item ${item.unread ? 'is-unread' : ''}`}
              >
                <div className="dashboard-notification-item-head">
                  <h4>{item.title}</h4>
                  <button
                    type="button"
                    className="dashboard-notification-dismiss"
                    onClick={item.onDismiss}
                    aria-label={`Dismiss ${item.title}`}
                  >
                    <X size={14} />
                  </button>
                </div>
                <p>{item.message}</p>
                {(item.primaryAction || item.secondaryAction) && (
                  <div className="dashboard-notification-actions">
                    {item.secondaryAction && (
                      <button
                        type="button"
                        className="action-btn outline small"
                        onClick={item.secondaryAction.onClick}
                        disabled={item.secondaryAction.disabled}
                      >
                        {item.secondaryAction.label}
                      </button>
                    )}
                    {item.primaryAction && (
                      <button
                        type="button"
                        className="action-btn primary small"
                        onClick={item.primaryAction.onClick}
                        disabled={item.primaryAction.disabled}
                      >
                        {item.primaryAction.label}
                      </button>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      <button
        type="button"
        className={`dashboard-notifications-bell ${hasUnread ? 'is-highlighted' : ''}`}
        onClick={handleToggle}
        aria-label="Open notifications"
        aria-expanded={isOpen}
      >
        <Bell size={20} />
      </button>
    </div>
  );
}
