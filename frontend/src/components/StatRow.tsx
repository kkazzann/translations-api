import React from 'react';
import StatTile from './StatTile';
import styles from './styles/StatRow.module.scss';

type Props = {
  sheetTabs: number;
  items: number;
  topLanguages: string[];
  memoryUsed: string;
  loading: boolean;
};

const StatRow: React.FC<Props> = ({ sheetTabs, items, topLanguages, memoryUsed, loading }) => {
  return (
    <div className={styles.statRow}>
      <StatTile title="Sheet Tabs" value={sheetTabs} loading={loading} action={'Loaded Sheets →'} />
      <StatTile title="Items" value={items} loading={loading} />
      <StatTile
        title="Top Language"
        value={topLanguages[0]}
        loading={loading}
        action={'Other Languages →'}
      />
      <StatTile
        title="Memory Used"
        value={memoryUsed}
        variant="highlighted"
        loading={loading}
        action={'Usage History →'}
      />
    </div>
  );
};

export default StatRow;
