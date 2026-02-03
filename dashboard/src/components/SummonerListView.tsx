import './SummonerListView.css';

interface TrackedSummoner {
    puuid: string;
    name?: string;
    discordChannelId?: string;
}

interface SummonerListViewProps {
    summoners: TrackedSummoner[];
    onRemove?: (index: number) => void;
    onEdit?: (index: number) => void;
}

/**
 * Displays tracked summoners in a nice card list view.
 * Shows in the config modal before the add form.
 */
export function SummonerListView({
    summoners,
    onRemove,
    onEdit,
}: SummonerListViewProps) {
    if (summoners.length === 0) {
        return (
            <div className="summoner-list-empty">
                <div className="summoner-list-empty-icon">
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    >
                        <path
                            d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                        <circle cx="9" cy="7" r="4" />
                        <path
                            d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>
                <p className="summoner-list-empty-text">
                    No summoners tracked yet
                </p>
                <p className="summoner-list-empty-hint">
                    Add summoners below to start tracking their matches
                </p>
            </div>
        );
    }

    return (
        <div className="summoner-list">
            <div className="summoner-list-header">
                <h4 className="summoner-list-title">
                    Tracked Summoners ({summoners.length})
                </h4>
            </div>
            <div className="summoner-list-grid">
                {summoners.map((summoner, index) => (
                    <div
                        key={summoner.puuid || index}
                        className="summoner-card"
                    >
                        <div className="summoner-card-avatar">
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path
                                    d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                        </div>
                        <div className="summoner-card-info">
                            <span className="summoner-card-name">
                                {summoner.name || 'Unnamed Summoner'}
                            </span>
                            <span
                                className="summoner-card-puuid"
                                title={summoner.puuid}
                            >
                                {summoner.puuid.substring(0, 8)}...
                                {summoner.puuid.substring(
                                    summoner.puuid.length - 4
                                )}
                            </span>
                            {summoner.discordChannelId && (
                                <span className="summoner-card-channel">
                                    <svg
                                        viewBox="0 0 24 24"
                                        width="12"
                                        height="12"
                                        fill="currentColor"
                                    >
                                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                                    </svg>
                                    Custom channel
                                </span>
                            )}
                        </div>
                        <div className="summoner-card-actions">
                            {onEdit && (
                                <button
                                    type="button"
                                    className="summoner-card-btn summoner-card-edit"
                                    onClick={() => onEdit(index)}
                                    aria-label="Edit summoner"
                                    title="Edit"
                                >
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                        <path d="m15 5 4 4" />
                                    </svg>
                                </button>
                            )}
                            {onRemove && (
                                <button
                                    type="button"
                                    className="summoner-card-btn summoner-card-remove"
                                    onClick={() => onRemove(index)}
                                    aria-label="Remove summoner"
                                    title="Remove"
                                >
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
