import React from 'react';
import styles from './CacheStats.module.scss';
import type { Summary } from '../types/Summary';

const MetricsPanel: React.FC<{ summary: Summary | null }> = ({ summary }) => {
  if (!summary) {
    return <div>Loading metrics...</div>;
  }

  const formatAge = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s ago`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className={styles.metricsPanel}>
      {/* Top Requested Keys */}
      <div className={styles.metricCard}>
        <h3>Top Requested Keys</h3>

        {summary.topRequestedKeys.length > 0 ? (
          <div className={styles.topList}>
            {summary.topRequestedKeys.slice(0, 5).map((item, idx) => (
              <div key={idx} className={styles.topListItem}>
                <span className={styles.rank}>{idx + 1}.</span>
                <span className={styles.keyName}>{item.key}</span>
                <span className={styles.count}>{item.count} req</span>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.noData}>No data yet</div>
        )}
      </div>

      {/* Top Requested Languages */}
      <div className={styles.metricCard}>
        <h3>Top Requested Languages</h3>

        {summary.topRequestedLanguages.length > 0 ? (
          <div className={styles.topList}>
            {summary.topRequestedLanguages.slice(0, 5).map((item, idx) => (
              <div key={idx} className={styles.topListItem}>
                <span className={styles.rank}>{idx + 1}.</span>
                <span className={styles.keyName}>{item.language}</span>
                <span className={styles.count}>{item.count} req</span>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.noData}>No data yet</div>
        )}
      </div>

      {/* Recently Accessed Dynamic Sheets */}
      <div className={styles.metricCard}>
        <h3>Recently Accessed Dynamic Sheets</h3>

        {summary.recentDynamicSheetAccesses.length > 0 ? (
          <div className={styles.topList}>
            {summary.recentDynamicSheetAccesses.slice(0, 5).map((item, idx) => (
              <div key={idx} className={styles.topListItem}>
                <span className={styles.keyName}>{item.sheetTab}</span>
                <span className={styles.timestamp}>{formatAge(Date.now() - item.lastAccess)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.noData}>No data yet</div>
        )}
      </div>

      {/* Recently Updated Dynamic Sheets */}
      <div className={styles.metricCard}>
        <h3>Recently Updated Dynamic Sheets</h3>

        {summary.recentDynamicSheetUpdates.length > 0 ? (
          <div className={styles.topList}>
            {summary.recentDynamicSheetUpdates.slice(0, 5).map((item, idx) => (
              <div key={idx} className={styles.topListItem}>
                <span className={styles.keyName}>{item.sheetTab}</span>
                <span className={styles.timestamp}>{formatAge(Date.now() - item.lastUpdate)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.noData}>No data yet</div>
        )}
      </div>
    </div>
  );
};

export default MetricsPanel;
