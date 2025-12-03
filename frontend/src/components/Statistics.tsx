import React, { useEffect, useState } from 'react';
import styles from './styles/Statistics.module.scss';
import StatTile from './StatTile';
import Rpm from './Rpm';
import TopQueries from './TopQueries';
import StatRow from './StatRow';
import Misc from './Misc';
import { getStats } from '../api/getStats';
import type { CacheStatsResponse } from '../types/cachestats-response';
import { formatAge } from '../utils/formatAge';

const Statistics: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [ApexChart, setApexChart] = useState<any>(null);

  const [stats, setStats] = useState<CacheStatsResponse | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchStats = () =>
      getStats()
        .then((data) => {
          if (!mounted) return;
          setStats(data);
        })
        .catch((err) => {
          if (!mounted) return;
          console.error('getStats error', err);
        })
        .finally(() => {
          if (!mounted) return;
          setLoading(false);
        });

    // initial fetch
    fetchStats();

    // poll every 15 seconds
    const id = setInterval(() => {
      fetchStats();
    }, 15 * 1000);

    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  // lazy-load react-apexcharts so the app doesn't break if dependency is missing
  useEffect(() => {
    let mounted = true;
    import('react-apexcharts')
      .then((mod) => {
        if (!mounted) return;
        // default export is usually the Chart component
        setApexChart(() => mod.default || mod);
      })
      .catch(() => {
        // ignore - we'll fall back to a placeholder if import fails
      });
    return () => {
      mounted = false;
    };
  }, []);

  const timeFormatter = new Intl.NumberFormat([], {
    style: 'unit',
    unit: 'millisecond',
    notation: 'compact',
    unitDisplay: 'short',
  });

  const hasAvgResponse = typeof stats?.avgResponseTime === 'number';
  const avgResponseTime = hasAvgResponse
    ? timeFormatter.format(stats!.avgResponseTime!)
    : '-';

  const rpmHistory = stats?.rpmHistory ?? [];
  const hasRpm = rpmHistory.length > 0;

  // chart data & options derived from rpmHistory
  const chartSeries = [
    {
      name: 'RPM',
      data: rpmHistory,
    },
  ];

  const chartOptions = {
    chart: {
      id: 'rpm-chart',
      toolbar: { show: false },
      sparkline: { enabled: true },
    },
    colors: ['#750000'],
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: '100%',
      },
    },
    dataLabels: { enabled: false },
    xaxis: {
      // categories as human-readable hour labels (e.g. 11:00)
      categories: (() => {
        const now = Date.now();
        const hours = rpmHistory.length || 12;
        const oneHour = 60 * 60 * 1000;
        const cutoff = now - hours * oneHour;
        const fmt = new Intl.DateTimeFormat([], { hour: '2-digit', minute: '2-digit' });
        return Array.from({ length: hours }).map((_, i) => fmt.format(new Date(cutoff + i * oneHour)));
      })(),
      labels: { show: true },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { show: false },
    grid: { show: false },
    stroke: { width: 0 },
    tooltip: {
      enabled: true,
      y: {
        formatter: (val: number) => `${val} rpm`,
      },
      x: {
        formatter: (val: any) => `${val}`,
      },
    },
  } as any;

  const sheetTabs: number = stats?.sheetTabs ? stats.sheetTabs.length : 0;
  const items: number = stats?.items ?? 0;
  const topLanguages: string[] = stats?.topLanguages
    ? stats.topLanguages.map((l) => l.name)
    : ['-'];

  const sizeFormatter = new Intl.NumberFormat([], {
    style: 'unit',
    unit: 'byte',
    notation: 'compact',
    unitDisplay: 'narrow',
  });

  const percentFormatter = new Intl.NumberFormat('pl-PL', {
    style: 'percent',
    maximumFractionDigits: 2,
  });

  const memoryUsed: string = stats?.memoryUsed
    ? sizeFormatter.format(stats.memoryUsed)
    : sizeFormatter.format(0);

  const hits: number = stats?.hits ?? 0;
  const misses: number = stats?.misses ?? 0;
  const hitRatio: string =
    hits + misses > 0 ? percentFormatter.format(hits / (hits + misses)) : '-';

  const avgHitTime: string = (stats as any)?.avgHitTime
    ? timeFormatter.format((stats as any).avgHitTime)
    : '-';
  const avgMissTime: string = (stats as any)?.avgMissTime
    ? timeFormatter.format((stats as any).avgMissTime)
    : '-';

  const recentQueries = stats?.recentQueries
    ? stats.recentQueries.map((q) => ({ name: q.name, time: `${formatAge(q.time)} ago` }))
    : [];
  const hasRecent = recentQueries.length > 0;

  const topQueries = stats?.top10Queries
    ? stats.top10Queries.map((q) => ({ name: q.name, requests: String(q.count) }))
    : [];
  const hasTopQueries = topQueries.length > 0;

  return (
    <main className={styles.main}>
      <StatTile
        title="Response Time"
        value={avgResponseTime}
        loading={loading || !hasAvgResponse}
        variant="highlighted"
      />

      {/* requests per minute ----------------------- */}
      <Rpm
        loading={loading || !hasRpm}
        rpmHistory={rpmHistory}
        ApexChart={ApexChart}
        chartOptions={chartOptions}
        chartSeries={chartSeries}
      />

      {/* most accessed queries --------------------- */}
      <TopQueries loading={loading || !hasTopQueries} topQueries={topQueries} queriesLast30Days={stats?.queriesLast30Days} />

      {/* row with stats tiles */}
      <StatRow
        sheetTabs={sheetTabs}
        items={items}
        topLanguages={topLanguages}
        memoryUsed={memoryUsed}
        loading={loading}
      />

      {/* 2x2 row with hit ratio and recent queries */}
      <Misc
        loading={loading || !hasRecent}
        hits={hits}
        misses={misses}
        hitRatio={hitRatio}
        avgHitTime={avgHitTime}
        avgMissTime={avgMissTime}
        recentQueries={recentQueries}
      />
    </main>
  );
};

export default Statistics;
