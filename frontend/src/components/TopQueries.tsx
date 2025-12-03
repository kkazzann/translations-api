import React from 'react';
import { motion } from 'motion/react';
import styles from './styles/TopQueries.module.scss';
import statTileStyles from './styles/StatTile.module.scss';

import CountUp from '../bits/CountUp';

type Query = { name: string; requests: string };

type Props = {
  loading: boolean;
  topQueries: Query[];
  queriesLast30Days?: number;
};

const TopQueries: React.FC<Props> = ({ loading, topQueries, queriesLast30Days }) => {
  return (
    <div className={styles.topQueries}>
      <div
        className={styles.title}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        Top Queries <div style={{ fontSize: '12px', fontWeight: '600' }}>Requests</div>
      </div>

      <div className={styles.queriesContainer}>
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
          : topQueries.slice(0, 9).map((query) => (
              <div className={styles.query} key={query.name}>
                <div className={styles.name} title={query.name}>
                  {query.name}
                </div>
                <div className={styles.requests}>{query.requests + ' req'}</div>
              </div>
            ))}
      </div>

      <div className={styles.monthlyQueries}>
        <div className={styles.title}>Queries @ 30 days</div>
        {loading ? (
          <>
            <motion.div
              className={statTileStyles.skeletonValue}
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.0, repeat: Infinity }}
            />
            <div className={styles.separator}></div>
            <div className={styles.action}>Check Queries History →</div>
          </>
        ) : (
          <>
            {typeof queriesLast30Days === 'number' ? (
              <div className={styles.value}>
                <CountUp
                  to={queriesLast30Days}
                  className={styles.value}
                  duration={0.9}
                  separator=","
                />
              </div>
            ) : (
              <div className={styles.value}>-</div>
            )}
            <div className={styles.separator}></div>
            <div className={styles.action}>Check Queries History →</div>
          </>
        )}
      </div>
    </div>
  );
};

export default TopQueries;
