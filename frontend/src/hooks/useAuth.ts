import { useAuthContext } from '../context/AuthContext';

export const useAuth = () => useAuthContext();

// Also export as default for backward compatibility
export default useAuth;

