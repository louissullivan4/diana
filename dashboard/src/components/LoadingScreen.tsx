import './LoadingScreen.css';

interface LoadingScreenProps {
    message?: string;
}

/**
 * Loading screen component with Moo Cow animation.
 */
export function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
    return (
        <div className="loading-screen">
            <div className="loading-content">
                <div className="loading-animation">
                    <img
                        src="/dashboard/icons/loading-cow.gif"
                        alt="Loading"
                        className="loading-cow"
                    />
                </div>
                <p className="loading-message">{message}</p>
            </div>
        </div>
    );
}
