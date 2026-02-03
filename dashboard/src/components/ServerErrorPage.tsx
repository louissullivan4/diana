import './ServerErrorPage.css';

interface ServerErrorPageProps {
    onRetry?: () => void;
}

/**
 * 502 Server Error page shown when the backend is unreachable.
 */
export function ServerErrorPage({ onRetry }: ServerErrorPageProps) {
    return (
        <div className="server-error-page">
            <div className="server-error-content">
                <div className="server-error-icon">
                    <img
                        src="/dashboard/icons/loading-cow.gif"
                        alt=""
                        className="error-cow"
                    />
                </div>
                <h1 className="server-error-title">502</h1>
                <p className="server-error-subtitle">Server Unavailable</p>
                <p className="server-error-message">
                    Unable to connect to the Diana server. The server may be
                    starting up, restarting, or experiencing issues.
                </p>
                <div className="server-error-actions">
                    {onRetry && (
                        <button
                            type="button"
                            className="btn btn-primary server-error-button"
                            onClick={onRetry}
                        >
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                                <path d="M21 3v5h-5" />
                            </svg>
                            Retry Connection
                        </button>
                    )}
                </div>
                <div className="server-error-tips">
                    <p className="server-error-tips-title">Things to try:</p>
                    <ul>
                        <li>Check if the Diana server is running</li>
                        <li>Verify the server URL and port</li>
                        <li>Check your network connection</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
