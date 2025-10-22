import React, { useEffect, useState, useMemo } from 'react';
import styles from './CacheStats.module.scss';
import { Icon } from '@iconify-icon/react';
import ChartPanel from './ChartPanel';
import MetricsPanel from './MetricsPanel';
import type { Summary } from '../types/Summary';
import type { Stat } from '../types/Stat';
import { API_BASE_URL } from '../config';

const CacheStats: React.FC<{ token: string; setToken: (token: string | null) => void }> = ({
  token,
  setToken,
}) => {
  const [stats, setStats] = useState<Stat[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);

  const [loading, setLoading] = useState(false);

  const [refreshingKeys, setRefreshingKeys] = useState<string[]>([]);

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'size' | 'age' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [now, setNow] = useState(Date.now());

  const fetchStats = async () => {
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/admin/cache-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (response.status === 401 || data.status === 401) {
        setToken(null);
        return;
      }

      const fetchedStats = data.stats || [];

      setStats(fetchedStats);
      setSummary(data.summary || null);
    } catch (error) {
      console.error('Failed to fetch stats', error);
    } finally {
      setLoading(false);
    }
  };

  const handleForceRefresh = async (key: string) => {
    setRefreshingKeys((prev) => [...prev, key]);

    try {
      let url = '';

      if (key.startsWith('dynamic_')) {
        const sheetTab = key.replace('dynamic_', '');
        url = `${API_BASE_URL}/dynamic/${sheetTab}/force-refresh`;
      } else {
        const staticKey = key.replace('_all', '');
        url = `${API_BASE_URL}/static/${staticKey}/force-refresh`;
      }

      await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      await fetchStats();
    } catch (error) {
      console.error(`Failed to refresh key ${key}`, error);
    } finally {
      setRefreshingKeys((prev) => prev.filter((k) => k !== key));
    }
  };

  useEffect(() => {
    fetchStats();
  }, [token]);

  const computedRows = useMemo(() => {
    const base = stats.map((stat) => ({
      ...stat,
      ageMs: stat.ageMs ?? Math.max(0, now - stat.lastRefresh),
    }));

    let filtered = base.filter((stat) => stat.key.toLowerCase().includes(search.toLowerCase()));

    if (sortBy) {
      filtered = filtered.sort((a, b) => {
        const aVal = sortBy === 'size' ? a.size : a.ageMs;
        const bVal = sortBy === 'size' ? b.size : b.ageMs;

        if (aVal === bVal) return 0;

        return sortDir === 'asc' ? (aVal < bVal ? -1 : 1) : aVal > bVal ? -1 : 1;
      });
    }

    return filtered;
  }, [stats, search, sortBy, sortDir, now]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatAge = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) return `${minutes}min ${remainingSeconds}s`;

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours < 24) return `${hours}h ${remainingMinutes}min`;

    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  return (
    <div className={styles.cacheStats}>
      <header className={styles.header}>
        <h1>Cache Dashboard</h1>

        <div className={styles.buttonsContainer}>
          <button className={styles.refresh} onClick={fetchStats} disabled={loading}>
            <Icon icon="ic:round-refresh" width="24px" height="24px" />
            {loading ? 'Refreshing...' : 'Refresh Stats'}
          </button>

          <button
            className={styles.logout}
            onClick={() => {
              setToken(null);
            }}
          >
            Logout
            <Icon height={20} icon="solar:logout-broken" />
          </button>
        </div>
      </header>

      <div className={styles.statsContainer}>
        {/* Top Metrics Row */}
        <div className={styles.metricsRow}>
          <ChartPanel stats={stats} summary={summary} />
        </div>

        {/* Additional Metrics Below Chart */}
        <div className={styles.additionalMetrics}>
          <MetricsPanel summary={summary} />
        </div>

        {/* Cache Table */}
        <div className={styles.twoColumn}>
          <div className={styles.filtersContainer}>
            <label className={styles.searchLabel}>
              Search:
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                }}
                placeholder="Filter by key"
              />
            </label>
          </div>

          <div className={styles.statsTable}>
            <div className={styles.tableHeader}>
              <div className={styles.cellKey}>Key</div>

              <div
                className={styles.cellSize}
                onClick={() => {
                  if (sortBy === 'size') setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                  else {
                    setSortBy('size');
                    setSortDir('desc');
                  }
                }}
              >
                Size (items)
                {sortBy === 'size' &&
                  (sortDir === 'desc' ? (
                    <Icon icon="cuida:sort-descending-duotone" width="23.04px" height="24px" />
                  ) : (
                    <Icon icon="cuida:sort-ascending-duotone" width="23.04px" height="24px" />
                  ))}
              </div>

              <div
                className={styles.cellAge}
                onClick={() => {
                  if (sortBy === 'age') setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                  else {
                    setSortBy('age');
                    setSortDir('desc');
                  }
                }}
              >
                Age
                {sortBy === 'age' &&
                  (sortDir === 'desc' ? (
                    <Icon icon="cuida:sort-descending-duotone" width="23.04px" height="24px" />
                  ) : (
                    <Icon icon="cuida:sort-ascending-duotone" width="23.04px" height="24px" />
                  ))}
              </div>

              <div className={styles.cellActions}>Actions</div>
            </div>

            <div className={styles.rowsContainer}>
              {computedRows.map((stat) => (
                <div className={styles.row} key={stat.key}>
                  <div className={styles.cellKey}>{stat.key}</div>

                  <div className={styles.cellSize}>{stat.size}</div>

                  <div className={styles.cellAge}>
                    {formatAge(stat.ageMs ?? Math.max(0, now - stat.lastRefresh))}
                  </div>

                  <div className={styles.cellActions}>
                    <button
                      onClick={() => handleForceRefresh(stat.key)}
                      disabled={refreshingKeys.includes(stat.key)}
                      className="action-button"
                    >
                      {refreshingKeys.includes(stat.key) ? 'Purging...' : 'Purge'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CacheStats;
