import { Link } from 'react-router-dom';
import './NotFoundPage.css';

/**
 * 404 Not Found page with a link back to the dashboard.
 */
export function NotFoundPage() {
    return (
        <div className="not-found-page">
            <div className="not-found-content">
                <div className="not-found-icon">
                    <img
                        src="/dashboard/icons/loading-cow.gif"
                        alt=""
                        className="error-cow"
                    />
                </div>
                <h1 className="not-found-title">404</h1>
                <p className="not-found-subtitle">Page Not Found</p>
                <p className="not-found-message">
                    The page you're looking for doesn't exist or has been moved.
                </p>
                <Link to="/" className="btn btn-primary not-found-button">
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
                        <path d="m15 18-6-6 6-6" />
                    </svg>
                    Back to Dashboard
                </Link>
            </div>
        </div>
    );
}
