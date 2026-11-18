import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessiblePatients, setAccessiblePatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize session on mount
  useEffect(() => {
    async function loadUser() {
      try {
        const savedToken = localStorage.getItem('carepal_token');
        if (savedToken) {
          const res = await api.get('/auth/me');
          setUser(res.user);
          setAccessiblePatients(res.accessiblePatients || []);
          if (res.accessiblePatients && res.accessiblePatients.length > 0) {
            const savedPatientId = localStorage.getItem('carepal_selected_patient');
            const exists = res.accessiblePatients.some(p => p.id === savedPatientId);
            setSelectedPatientId(exists ? savedPatientId : res.accessiblePatients[0].id);
          }
        }
      } catch (err) {
        console.warn('Session check failed or expired:', err.message);
        localStorage.removeItem('carepal_token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    setUser(res.user);
    setAccessiblePatients(res.accessiblePatients || []);
    if (res.token) {
      localStorage.setItem('carepal_token', res.token);
    }
    if (res.accessiblePatients && res.accessiblePatients.length > 0) {
      setSelectedPatientId(res.accessiblePatients[0].id);
      localStorage.setItem('carepal_selected_patient', res.accessiblePatients[0].id);
    }
    return res;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // ignore
    } finally {
      localStorage.removeItem('carepal_token');
      localStorage.removeItem('carepal_selected_patient');
      setUser(null);
      setAccessiblePatients([]);
      setSelectedPatientId(null);
    }
  };

  const selectPatient = (patientId) => {
    setSelectedPatientId(patientId);
    localStorage.setItem('carepal_selected_patient', patientId);
  };

  const activePatient = accessiblePatients.find(p => p.id === selectedPatientId) || accessiblePatients[0] || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        accessiblePatients,
        selectedPatientId,
        activePatient,
        loading,
        login,
        logout,
        selectPatient,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

