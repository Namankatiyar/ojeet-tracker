import { useState, useEffect, useRef } from 'react';

interface InputModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    placeholder?: string;
    initialValue?: string;
    confirmLabel?: string;
    onConfirm: (value: string) => void;
    onCancel: () => void;
}

export function InputModal({
    isOpen,
    title,
    message,
    placeholder = '',
    initialValue = '',
    confirmLabel = 'Add',
    onConfirm,
    onCancel
}: InputModalProps) {
    const [value, setValue] = useState(initialValue);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setValue(initialValue);
            // Focus input after a short delay to ensure modal is rendered
            setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
        }
    }, [isOpen, initialValue]);

    if (!isOpen) return null;

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (value.trim()) {
            onConfirm(value.trim());
        }
    };

    return (
        <div className="modal-backdrop" onClick={onCancel}>
            <div className="modal-container" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{title}</h3>
                </div>
                <div className="modal-body">
                    <p>{message}</p>
                    <form onSubmit={handleSubmit}>
                        <input
                            ref={inputRef}
                            type="text"
                            className="modal-input"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder={placeholder}
                        />
                    </form>
                </div>
                <div className="modal-footer">
                    <button className="modal-btn cancel" onClick={onCancel}>
                        Cancel
                    </button>
                    <button
                        className="modal-btn primary"
                        onClick={() => handleSubmit()}
                        disabled={!value.trim()}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
