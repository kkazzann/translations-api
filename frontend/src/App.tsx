import { Toaster } from 'sonner';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import styles from './App.module.scss';

import Login from './components/Login';
import Navigation from './components/Navigation';
import RequireAuth from './components/RequireAuth';
import Statistics from './components/Statistics';
import Vault from './components/Vault';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <div className={styles.app}>
        <div className={styles.wrapper}>
          <Toaster richColors position="top-center" />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />

              {/* Protected routes */}
              <Route
                path="/"
                element={
                  <RequireAuth>
                    {/* Layout with navigation shown on protected pages */}
                    {/* <div> */}
                    <div className={styles.container}>
                      <Navigation />
                      <Outlet />
                    </div>
                    {/* </div> */}
                  </RequireAuth>
                }
              >
                  <Route index element={<Navigate to="/statistics" replace />} />
                  <Route path="statistics" element={<Statistics />} />
                  <Route path="vault" element={<Vault />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </div>
      </div>
    </AuthProvider>
  );
}

export default App;
