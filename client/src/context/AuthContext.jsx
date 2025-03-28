import React, { createContext, useState, useEffect, useContext } from 'react';
import { auth, db } from '../services/firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification
} from 'firebase/auth';
import { ref, get, set } from 'firebase/database';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Check if user is an admin
        try {
          const adminRef = ref(db, `law_firm_admin/${user.uid}`);
          const snapshot = await get(adminRef);
          
          if (snapshot.exists()) {
            setAdminData(snapshot.val());
          }
        } catch (error) {
          console.error("Error fetching admin data:", error);
        }
      } else {
        setAdminData(null);
      }
      
      setLoading(false);
    });

    // Load from localStorage or sessionStorage if available
    const storedAdmin = localStorage.getItem('adminData') || sessionStorage.getItem('adminData');
    if (storedAdmin) {
      setAdminData(JSON.parse(storedAdmin));
    }

    return () => unsubscribe();
  }, []);

  const login = async (email, password, rememberMe = false) => {
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const adminRef = ref(db, `law_firm_admin/${user.uid}`);
      const snapshot = await get(adminRef);
      
      if (snapshot.exists()) {
        const adminData = snapshot.val();
        setAdminData(adminData);
        
        if (rememberMe) {
          localStorage.setItem('adminData', JSON.stringify(adminData));
        } else {
          sessionStorage.setItem('adminData', JSON.stringify(adminData));
        }
        
        return true;
      } else {
        await signOut(auth);
        setError('Access Denied: You are not an admin!');
        return false;
      }
    } catch (error) {
      setError(error.message);
      return false;
    }
  };

  const register = async (userData) => {
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        userData.email, 
        userData.password
      );
      
      const user = userCredential.user;
      
      const lawFirmAdminRef = ref(db, `law_firm_admin/${user.uid}`);
      
      // Store user data (omitting password)
      const { password, confirmPassword, ...dataToStore } = userData;
      
      await set(lawFirmAdminRef, {
        ...dataToStore,
        uid: user.uid
      });
      
      return true;
    } catch (error) {
      setError(error.message);
      return false;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('adminData');
      sessionStorage.removeItem('adminData');
      return true;
    } catch (error) {
      setError(error.message);
      return false;
    }
  };

  const value = {
    currentUser,
    adminData,
    loading,
    error,
    login,
    register,
    logout,
    setError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};

export default AuthContext;