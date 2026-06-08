import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

// Define the context shape
interface AdminModeContextType {
  isAdminMode: boolean;
  toggleAdminMode: () => void;
  setAdminMode: (value: boolean) => void;
  verifyingAdmin: boolean;
  canAccessAdmin: boolean;
}

// Create the context with default values
const AdminModeContext = createContext<AdminModeContextType>({
  isAdminMode: false,
  toggleAdminMode: () => {},
  setAdminMode: () => {},
  verifyingAdmin: false,
  canAccessAdmin: false
});

// No password needed for developer role access

// Hook for consuming the context
export const useAdminMode = () => useContext(AdminModeContext);

// Provider component
interface AdminModeProviderProps {
  children: ReactNode;
}

export const AdminModeProvider: React.FC<AdminModeProviderProps> = ({ children }) => {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [verifyingAdmin, setVerifyingAdmin] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Check if user has developer or system administrator role
  const canAccessAdmin = (user as any)?.roles?.some((role: any) => 
    role.role_name === 'Developer' || 
    role.role_name === 'developer' ||
    role.role_name === 'System Administrator' || 
    role.role_name === 'system_administrator'
  ) || false;

  // On component mount, check localStorage for saved preference
  useEffect(() => {
    if (canAccessAdmin) {
      try {
        const savedAdminMode = localStorage.getItem('quickprompt_developer_mode');
        if (savedAdminMode === 'true') {
          setIsAdminMode(true);
        }
      } catch (error) {
        console.error('Error reading admin mode from localStorage:', error);
      }
    }
  }, [canAccessAdmin]);

  // Update localStorage when admin mode changes
  useEffect(() => {
    if (canAccessAdmin) {
      try {
        localStorage.setItem('quickprompt_developer_mode', isAdminMode.toString());
      } catch (error) {
        console.error('Error saving admin mode to localStorage:', error);
      }
    }
  }, [isAdminMode, canAccessAdmin]);


  const toggleAdminMode = () => {
    if (!canAccessAdmin) {
      toast({
        title: "Access Denied",
        description: "You need developer role to access admin features.",
        variant: "destructive"
      });
      return;
    }

    if (isAdminMode) {
      // Going from admin to user mode
      setIsAdminMode(false);
      toast({
        title: "User Mode Enabled",
        description: "Developer features are now disabled.",
      });
    } else {
      // Going from user to admin mode (no password required for developers)
      setIsAdminMode(true);
      toast({
        title: "Developer Mode Enabled",
        description: "You now have access to developer features.",
      });
    }
  };

  // Function to directly set admin mode (used primarily for internal logic)
  const setAdminModeDirectly = (value: boolean) => {
    if (canAccessAdmin) {
      setIsAdminMode(value);
    }
  };

  return (
    <AdminModeContext.Provider 
      value={{ 
        isAdminMode, 
        toggleAdminMode, 
        setAdminMode: setAdminModeDirectly,
        verifyingAdmin,
        canAccessAdmin
      }}
    >
      {children}
    </AdminModeContext.Provider>
  );
};