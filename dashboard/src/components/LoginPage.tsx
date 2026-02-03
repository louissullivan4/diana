import { useState, type FormEvent } from 'react';
import './LoginPage.css';

interface LoginPageProps {
    onLogin: (token: string) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
                credentials: 'include',
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Login failed');
                return;
            }

            // Store token in localStorage as backup (cookie is primary)
            if (data.token) {
                localStorage.setItem('diana_token', data.token);
            }

            onLogin(data.token);
        } catch (err) {
            setError('Unable to connect to server');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-header">
                    <img
                        src="/dashboard/icons/loading-cow.gif"
                        alt="Diana"
                        className="login-logo"
                    />
                    <h1 className="login-title">Diana</h1>
                    <p className="login-subtitle">
                        Sign in to access the dashboard
                    </p>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    {error && (
                        <div className="login-error">
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <circle cx="12" cy="12" r="10" />
                                <path
                                    d="m15 9-6 6M9 9l6 6"
                                    strokeLinecap="round"
                                />
                            </svg>
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="login-field">
                        <label htmlFor="username" className="login-label">
                            Username
                        </label>
                        <input
                            id="username"
                            type="text"
                            className="login-input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your username"
                            autoComplete="username"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="login-field">
                        <label htmlFor="password" className="login-label">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            className="login-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            autoComplete="current-password"
                            required
                            disabled={loading}
                        />
                    </div>

                    <button
                        type="submit"
                        className="login-button"
                        disabled={loading || !username || !password}
                    >
                        {loading ? (
                            <>
                                <span className="login-spinner" />
                                Signing in...
                            </>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
