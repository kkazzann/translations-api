import React from 'react';
import { Icon } from '@iconify-icon/react';
import styles from './styles/Navigation.module.scss';
import logo from '../assets/Beliani_Color.svg';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const { setToken } = useAuth();

  return (
    <nav className={styles.navigation}>
      <a href="#" className={styles.logo} onClick={(e) => e.preventDefault()}>
        <img src={logo} width={64} alt="logo" />
      </a>

      <div className={styles.itemsOnRight}>
        <button className={styles.docs} onClick={() => navigate('/docs')}>
          <Icon icon="nrk:globe" />
          Docs
        </button>

        <button onClick={() => navigate('/statistics')}>
          <Icon icon="material-symbols:home-outline-rounded" /> Statistics
        </button>

        <button onClick={() => navigate('/vault')}>
          <Icon icon="streamline-flex:safe-vault" /> Vault
        </button>

        <button
          className={styles.logout}
          onClick={() => {
            setToken(null);
            navigate('/login');
          }}
        >
          <Icon icon="solar:logout-broken" /> Logout
        </button>
      </div>
    </nav>
  );
};

export default Navigation;
