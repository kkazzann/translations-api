import { useState, useEffect } from 'react';
import Login from './components/Login';
import CacheStats from './components/CacheStats';
import styles from './App.module.scss';
import { Toaster } from 'sonner';

function App() {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('token');
  });

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  return (
    <div className={styles.app}>
      <Toaster richColors position="top-center" />
      {/* <CacheStats token={token!} setToken={setToken} /> */}
      {token ? <CacheStats token={token} setToken={setToken} /> : <Login setToken={setToken} />}
    </div>
  );
}

export default App;
