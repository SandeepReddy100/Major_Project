import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import CryptoJS from 'crypto-js'; 

const AuthContext = createContext(null);

// --- Configuration ---
const EncDec_SECRET_KEY = import.meta.env.VITE_ENC_KEY || "YOUR_SECRET_KEY_HERE";

// --- Helper: Decrypt Data ---
const decryptData = (ciphertext) => {
  try {
    // 1. Basic safety checks
    if (!ciphertext) return null;

    // 2. If data is already an object, return it directly (No decryption needed)
    if (typeof ciphertext === 'object') {
      return ciphertext;
    }

    // 3. If it's not a string, we can't decrypt it
    if (typeof ciphertext !== 'string') {
      return null;
    }

    // 4. Perform Decryption
    const normalizedCiphertext = ciphertext.replace(/ /g, '+');
    const bytes = CryptoJS.AES.decrypt(normalizedCiphertext, EncDec_SECRET_KEY);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

    if (!decryptedString) return null;

    // 5. Parse JSON
    try {
      return JSON.parse(decryptedString);
    } catch (e) {
      return decryptedString;
    }
  } catch (err) {
    console.error("❌ Decryption Error:", err.message);
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // DEBUG: Monitor state changes
  useEffect(() => {
  }, [user]);

  useEffect(() => {
    const checkUserSession = async () => {
      // 1. Skip check on login page
      if (window.location.pathname === '/') {
        setLoading(false);
        return; 
      }

      try {
        const response = await api.get('/api/me');
        
        // --- THE FIX IS HERE ---
        // Your backend sends { data: "encrypted_string" }
        // So we need response.data.data
        const encryptedContent = response.data.data || response.data;

        // 2. Decrypt
        const decryptedData = decryptData(encryptedContent);


        if (decryptedData) {
          setUser({
            // Mapping fields based on your backend payload
            userId: decryptedData.userId,
            username: decryptedData.userId, 
            role: decryptedData.role,
            sem: decryptedData.sem,       
            batch: decryptedData.batch,   
          });
        } else {
          console.warn("⚠️ Decrypted data was null");
          setUser(null);
        }

      } catch (error) {
        if (error.response && error.response.status === 401) {
          setUser(null);
        } else {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    checkUserSession();
  }, []);

  const login = (userData) => {
    setUser(userData);
  };

  const logout = async () => {
    try {
      await api.post('/api/logout');
    } catch (error) {
    }
    setUser(null);
    window.location.href = '/'; 
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};