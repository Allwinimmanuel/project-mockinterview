import { createContext, useContext, useState } from 'react';

import { loginUser, registerUser } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('mock_user');
    return saved ? JSON.parse(saved) : null;
  });

  const signup = async (name, email, dob) => {
    if (!email.endsWith('@nec.edu.in')) {
      return { success: false, error: 'Candidate email must end with @nec.edu.in' };
    }
    
    try {
      await registerUser(name, email, dob, 'candidate');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message || 'Registration failed.' };
    }
  };

  const login = async (email, password, role) => {
    try {
      const userData = await loginUser(email, password);
      
      // Basic role enforcement based on frontend selection vs backend data
      if (role === 'candidate' && userData.role !== 'candidate') {
        return { success: false, error: 'Invalid candidate credentials.' };
      }
      if (role === 'interviewer' && userData.role !== 'interviewer') {
         // Temporarily allow hardcoded admin bypass to not break existing admin
         if (email === 'admin@mock.ai' && password === 'admin') {
            const adminData = { email, name: 'Admin User', role: 'interviewer' };
            setUser(adminData);
            localStorage.setItem('mock_user', JSON.stringify(adminData));
            return { success: true };
         }
         return { success: false, error: 'Invalid interviewer credentials.' };
      }

      setUser(userData);
      localStorage.setItem('mock_user', JSON.stringify(userData));
      return { success: true };
    } catch (error) {
      // Temporarily allow hardcoded admin bypass in case DB is empty
      if (role === 'interviewer' && email === 'admin@mock.ai' && password === 'admin') {
        const userData = { email, name: 'Admin User', role: 'interviewer' };
        setUser(userData);
        localStorage.setItem('mock_user', JSON.stringify(userData));
        return { success: true };
      }
      return { success: false, error: error.message || 'Login failed.' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('mock_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, signup }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
