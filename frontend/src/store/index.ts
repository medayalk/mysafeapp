import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  email: string;
  name: string;
  subscription_status: 'free' | 'premium';
}

interface Profile {
  id: string;
  user_id: string;
  name: string;
  profile_type: 'human' | 'pet';
  age_value?: number;
  age_unit?: 'months' | 'years';
  biological_sex?: 'male' | 'female' | 'other';
  is_pregnant_nursing?: boolean;
  height_cm?: number;
  weight_kg?: number;
  skin_type?: 'normal' | 'dry' | 'oily' | 'combination' | 'sensitive';
  hair_type?: 'straight' | 'wavy' | 'curly' | 'coily' | 'dry' | 'oily' | 'color-treated';
  medical_conditions?: string[];
  allergies?: string[];
  pet_type?: 'dog' | 'cat' | 'bird' | 'exotic';
  fixed_status?: 'neutered' | 'spayed' | 'intact';
  pet_medical_conditions?: string[];
  created_at: string;
}

interface Scan {
  id: string;
  user_id: string;
  profile_id: string;
  image_base64: string;
  ocr_text: string;
  category: 'food' | 'cosmetic' | 'unknown';
  score: number;
  verdict: 'safe' | 'caution' | 'unhealthy' | 'danger';
  flagged_ingredients: Array<{ name: string; reason: string }>;
  safe_ingredients: string[];
  ai_summary: string;
  created_at: string;
}

interface AppState {
  token: string | null;
  user: User | null;
  profiles: Profile[];
  activeProfile: Profile | null;
  scans: Scan[];
  isLoading: boolean;
  
  setToken: (token: string | null) => Promise<void>;
  setUser: (user: User | null) => void;
  setProfiles: (profiles: Profile[]) => void;
  setActiveProfile: (profile: Profile | null) => Promise<void>;
  setScans: (scans: Scan[]) => void;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useStore = create<AppState>((set) => ({
  token: null,
  user: null,
  profiles: [],
  activeProfile: null,
  scans: [],
  isLoading: true,
  
  setToken: async (token) => {
    if (token) {
      await AsyncStorage.setItem('token', token);
    } else {
      await AsyncStorage.removeItem('token');
    }
    set({ token });
  },
  
  setUser: (user) => set({ user }),
  
  setProfiles: (profiles) => set({ profiles }),
  
  setActiveProfile: async (profile) => {
    if (profile) {
      await AsyncStorage.setItem('activeProfile', JSON.stringify(profile));
    } else {
      await AsyncStorage.removeItem('activeProfile');
    }
    set({ activeProfile: profile });
  },
  
  setScans: (scans) => set({ scans }),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  logout: async () => {
    await AsyncStorage.multiRemove(['token', 'activeProfile']);
    set({ 
      token: null, 
      user: null, 
      profiles: [], 
      activeProfile: null, 
      scans: [] 
    });
  },
  
  initialize: async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const activeProfileStr = await AsyncStorage.getItem('activeProfile');
      
      set({ 
        token, 
        activeProfile: activeProfileStr ? JSON.parse(activeProfileStr) : null,
        isLoading: false 
      });
    } catch (error) {
      console.error('Error initializing store:', error);
      set({ isLoading: false });
    }
  },
}));
