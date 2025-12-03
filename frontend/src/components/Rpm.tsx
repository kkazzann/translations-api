import React from 'react';
import { motion } from 'motion/react';
import styles from './styles/Rpm.module.scss';
import statTileStyles from './styles/StatTile.module.scss';

type Props = {
  loading: boolean;
  rpmHistory: number[];
  ApexChart?: any;
  chartOptions?: any;
  chartSeries?: any;
};

const Rpm: React.FC<Props> = ({ loading, rpmHistory, ApexChart, chartOptions, chartSeries }) => {
  return (
    <div className={styles.rpm}>
      <div className={styles.title}>Requests Per Minute</div>
      {loading ? (
        <>
          {/* animated bar-skeleton matching rpmHistory */}
          <div style={{ display: 'flex', flex: '1', alignItems: 'end', gap: 6, paddingTop: 8 }}>
            {rpmHistory.map((v, i) => {
              const max = Math.max(...rpmHistory);

              return (
                <motion.div
                  key={i}
                  style={{
                    width: 8,
                    flex: '1',
                    height: `${(v / max) * 80}px`,
                    background: '#750000',
                    borderRadius: 4,
                  }}
                  animate={{ opacity: [0.3, 0.5, 0.3] }}
                  transition={{ duration: 1.0 + (i % 3) * 0.08, repeat: Infinity, delay: i * 0.03 }}
                />
              );
            })}
          </div>
        </>
      ) : (
        <>
          <ApexChart options={chartOptions} series={chartSeries} type="bar" height={85} />
        </>
      )}
    </div>
  );
};

export default Rpm;
