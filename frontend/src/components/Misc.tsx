import React from 'react';
import { motion } from 'motion/react';
import styles from './styles/Misc.module.scss';
import statTileStyles from './styles/StatTile.module.scss';
import CountUp from '../bits/CountUp';

type Query = { name: string; time: string };

type Props = {
  loading: boolean;
  hits: number;
  misses: number;
  hitRatio: string;
  avgHitTime: string;
  avgMissTime: string;
  recentQueries: Query[];
};

const Misc: React.FC<Props> = ({
  loading,
  hits,
  misses,
  hitRatio,
  avgHitTime,
  avgMissTime,
  recentQueries,
}) => {
  return (
    <div className={styles.miscContainer}>
      <div className={[styles.column, styles.hitRatio].join(' ')}>
        <div className={styles.header}>
          <div className={styles.title}>Hit Ratio</div>
          <div className={styles.value}>
            {loading ? (
              <motion.div
                className={statTileStyles.skeletonValue}
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.0, repeat: Infinity }}
              />
            ) : (
              hitRatio
            )}
          </div>
        </div>

        <div className={styles.hits}>
          <div className={styles.desc}>
            Hits <div className={styles.descSeparator}></div>
            {loading ? (
              <motion.div
                className={statTileStyles.skeletonAction}
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.0, repeat: Infinity }}
              />
            ) : (
              <div>
                <CountUp to={hits} className={styles.avgValue} duration={0.9} separator=',' />
              </div>
            )}
          </div>

          <div className={styles.bar}>
            {loading ? (
              <motion.div
                className={styles.barSkeleton}
                style={{ width: '70%' }}
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.0, repeat: Infinity }}
              />
            ) : (
              <div
                className={styles.fill}
                style={{ width: `${(hits / (hits + misses)) * 100}%` }}
              />
            )}
          </div>
        </div>

        <div className={styles.misses}>
          <div className={styles.desc}>
            Misses <div className={styles.descSeparator}></div>
            {loading ? (
              <motion.div
                className={statTileStyles.skeletonAction}
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.0, repeat: Infinity, delay: 0.06 }}
              />
            ) : (
              <div>
                <CountUp to={misses} className={styles.avgValue} duration={0.9} separator=',' />
              </div>
            )}
          </div>

          <div className={styles.bar}>
            {loading ? (
              <motion.div
                className={styles.barSkeleton}
                style={{ width: '30%' }}
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.0, repeat: Infinity, delay: 0.06 }}
              />
            ) : (
              <div
                className={styles.fill}
                style={{ width: `${(misses / (hits + misses)) * 100}%` }}
              />
            )}
          </div>
        </div>

        <div className={styles.avgGroup}>
          <div className={styles.avgRow}>
            <div>Hits</div>
            <div className={styles.avgValue}>
              {loading ? (
                <motion.div
                  className={statTileStyles.skeletonValue}
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              ) : (
                avgHitTime
              )}
            </div>
          </div>

          <div className={styles.avgRow}>
            <div>Misses</div>
            <div className={styles.avgValue}>
              {loading ? (
                <motion.div
                  className={statTileStyles.skeletonValue}
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.12 }}
                />
              ) : (
                avgMissTime
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={[styles.column, styles.recentQueries].join(' ')}>
        <div
          className={styles.title}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          Recent Queries <div style={{ fontSize: '12px', fontWeight: '600' }}>Time Ago</div>
        </div>

        <div className={styles.queries}>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div className={styles.query} key={i}>
                  <motion.div
                    className={statTileStyles.skeletonTitle}
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.06 }}
                  />
                  <motion.div
                    className={statTileStyles.skeletonAction}
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.06 + 0.12 }}
                  />
                </div>
              ))
            : recentQueries
                    .slice(0, 5) // take first 5 (recentQueries is newest-first from the API)
                    .map((query, i) => (
                      <div className={styles.query} key={`${query.name ?? 'q'}-${i}-${query.time}`}>
                        <div className={styles.name}>{query.name ?? '-'}</div>
                        <div className={styles.timeAgo}>{query.time}</div>
                      </div>
                    ))
          }
        </div>
      </div>
    </div>
  );
};

export default Misc;
