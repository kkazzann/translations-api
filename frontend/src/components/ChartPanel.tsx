import React from 'react';
import Chart from 'react-apexcharts';
import styles from './CacheStats.module.scss';
import type { Stat } from '../types/Stat';
import type { Summary } from '../types/Summary';

const ChartPanel: React.FC<{ stats: Stat[]; summary: Summary | null }> = ({ stats, summary }) => {
  const pieLabels = stats.map((s) => s.key);
  const pieSeries = stats.map((s) => s.size);

  const avgAgeMin = summary ? Math.round(summary.averageAgeMs / 60000) : 0;
  const totalItems = summary ? summary.totalCachedItems : 0;
  const totalHits = summary ? summary.totalHits : 0;
  const totalMisses = summary ? summary.totalMisses : 0;
  const hitRatioPercent = summary ? (summary.overallHitRatio * 100).toFixed(2) : '0.00';

  const pieOptions: ApexCharts.ApexOptions = {
    chart: { type: 'donut' },
    labels: pieLabels,
    legend: { show: false },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: '14px',
              offsetY: -10,
            },
            value: {
              show: true,
              fontSize: '22px',
              fontWeight: 'bold',
              offsetY: 5,
              formatter: (val: string) => val,
            },
            total: {
              show: true,
              showAlways: true,
              label: 'Total Items',
              fontSize: '14px',
              fontWeight: 400,
              color: '#373d3f',
              formatter: () => String(totalItems),
            },
          },
        },
      },
    },
    tooltip: { y: { formatter: (val: number) => `${val} items` } },
  };

  const rpm = summary ? summary.requestsPerMinute : 0;
  const avgOverallResponse = summary ? summary.avgOverallResponseTime.toFixed(2) : '0.00';
  const avgHitResponse = summary ? summary.avgCacheHitResponseTime.toFixed(2) : '0.00';
  const avgMissResponse = summary ? summary.avgCacheMissResponseTime.toFixed(2) : '0.00';
  const memoryMB = summary ? summary.cacheMemoryUsageMB.toFixed(2) : '0.00';

  return (
    <div className={styles.chartsPanelRow}>
      <div className={styles.chartsSummary}>
        <div className={styles.chartCard}>
          <h3>Cache Overview</h3>

          <div className={styles.summaryItem}>
            Average age: <b>{avgAgeMin} min</b>
          </div>

          <div className={styles.summaryItem}>
            Total cached items: <b>{totalItems}</b>
          </div>

          {/* prettier-ignore */}
          <div className={styles.summaryItem}>
            Hit ratio: <b>{hitRatioPercent}% ({totalHits}/{totalMisses})</b>
          </div>

          <div className={styles.summaryItem}>
            Memory usage: <b>{memoryMB} MB</b>
          </div>
        </div>

        <div className={styles.chartCard}>
          <h3>Performance</h3>

          <div className={styles.summaryItem}>
            Requests/min: <b>{rpm}</b>
          </div>

          <div className={styles.summaryItem}>
            Avg response: <b>{avgOverallResponse}ms</b>
          </div>

          <div className={styles.summaryItem}>
            Cache hit: <b className={styles.success}>{avgHitResponse}ms</b>
          </div>

          <div className={styles.summaryItem}>
            Cache miss: <b className={styles.warning}>{avgMissResponse}ms</b>
          </div>
        </div>
      </div>

      <div className={styles.chartsLarge}>
        <div className={styles.chartCard}>
          <Chart options={pieOptions} series={pieSeries} type="donut" height={380} width="100%" />
        </div>
      </div>
    </div>
  );
};

export default ChartPanel;
