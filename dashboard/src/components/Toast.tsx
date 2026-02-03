import {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    type ReactNode,
} from 'react';
import './Toast.css';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastContextValue {
    showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

interface ToastProviderProps {
    children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback(
        (
            message: string,
            type: ToastType = 'info',
            duration: number = 4000
        ) => {
            const id = Math.random().toString(36).substring(2, 9);
            setToasts((prev) => [...prev, { id, message, type, duration }]);
        },
        []
    );

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div
                className="toast-container"
                role="region"
                aria-label="Notifications"
            >
                {toasts.map((toast) => (
                    <ToastItem
                        key={toast.id}
                        toast={toast}
                        onRemove={() => removeToast(toast.id)}
                    />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

interface ToastItemProps {
    toast: Toast;
    onRemove: () => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
        }, toast.duration ?? 4000);

        return () => clearTimeout(timer);
    }, [toast.duration]);

    useEffect(() => {
        if (isExiting) {
            const timer = setTimeout(onRemove, 300); // Match animation duration
            return () => clearTimeout(timer);
        }
    }, [isExiting, onRemove]);

    const handleClose = () => {
        setIsExiting(true);
    };

    const icons: Record<ToastType, ReactNode> = {
        success: (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
            >
                <path
                    d="M20 6 9 17l-5-5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        ),
        error: (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
            >
                <circle cx="12" cy="12" r="10" />
                <path d="m15 9-6 6M9 9l6 6" strokeLinecap="round" />
            </svg>
        ),
        warning: (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
            >
                <path
                    d="m12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        ),
        info: (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
            >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
            </svg>
        ),
    };

    return (
        <div
            className={`toast toast-${toast.type} ${isExiting ? 'toast-exit' : 'toast-enter'}`}
            role="alert"
        >
            <span className="toast-icon">{icons[toast.type]}</span>
            <span className="toast-message">{toast.message}</span>
            <button
                type="button"
                className="toast-close"
                onClick={handleClose}
                aria-label="Dismiss notification"
            >
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                >
                    <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
            </button>
        </div>
    );
}
