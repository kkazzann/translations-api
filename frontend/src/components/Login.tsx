import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Icon } from '@iconify-icon/react';
import styles from './Login.module.scss';
import { toast } from 'sonner';
import { API_BASE_URL } from '../config';

const Login: React.FC<{ setToken: (token: string) => void }> = ({ setToken }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focus, setFocus] = useState<'username' | 'password' | null>(null);

  const handleLogin = async () => {
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_BASE_URL}/admin/login`, {
        username,
        password,
      });

      if (response.data.token) {
        setToken(response.data.token);
      } else {
        setError('Invalid credentials');
      }
    } catch (err) {
      setError('Login failed. Please check the console.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleLogin();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin();
  };

  useEffect(() => {
    if (error.trim() !== '') toast.error(error);
  }, [error]);

  return (
    <div className={styles.login}>
      <h2>Login</h2>

      <form className={styles.loginForm} onSubmit={handleSubmit}>
        <div
          className={[
            styles.inputGroup,
            username ? styles.filled : '',
            focus === 'username' ? styles.focused : '',
          ]
            .join(' ')
            .trim()}
        >
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyUp={handleKeyPress}
            onFocus={() => setFocus('username')}
            onBlur={() => setFocus(null)}
            autoComplete="username"
          />
        </div>

        <div
          className={[
            styles.inputGroup,
            password ? styles.filled : '',
            focus === 'password' ? styles.focused : '',
          ]
            .join(' ')
            .trim()}
        >
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyUp={handleKeyPress}
            onFocus={() => setFocus('password')}
            onBlur={() => setFocus(null)}
            autoComplete="current-password"
          />
        </div>

        <button type="submit" disabled={loading}>
          <Icon height={20} icon="solar:login-broken" />
          Login
        </button>
      </form>
    </div>
  );
};

export default Login;
