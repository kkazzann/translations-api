import styles from './styles/StatTile.module.scss';
import { motion } from 'motion/react';
import CountUp from '../bits/CountUp';

type Props = {
  title: string;
  value: string | number;
  variant?: 'default' | 'highlighted';
  loading?: boolean;
  action?: string;
};

function StatTile({ title, value, variant, loading, action }: Props) {
  const rootClass = `${styles.statTile} ${variant ? styles[variant] : ''}`;

  if (loading) {
    return (
      <div className={rootClass}>
        <span className={styles.title}>{title}</span>
        <motion.div
          className={styles.skeletonValue}
          animate={{ opacity: [0.4, 1, 0.4], x: [0, -3, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: 0.16 }}
        />

        <div className={styles.separator}></div>

        {action && <span className={styles.action}>{action}</span>}
      </div>
    );
  }

  return (
    <motion.div className={rootClass}>
      <span className={styles.title}>{title}</span>
      {typeof value === 'number' ? (
        // animate numeric values
        <CountUp to={value} className={styles.value} duration={0.9} separator=',' />
      ) : (
        <span className={styles.value}>{value}</span>
      )}
      <div className={styles.separator}></div>
      {action && <span className={styles.action}>{action}</span>}
    </motion.div>
  );
}

export default StatTile;
