import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface CharacterPreset {
  id: string;
  name: string;
  gender?: string;
  role?: string;
  description?: string;
  isFavorite?: boolean;
  userId?: string;
  isGlobal?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const LOCALSTORAGE_KEY = 'eliteCharacterPresets';
const MIGRATION_KEY = 'characterPresets_migrated';

export function useCharacterPresets() {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const [hasMigrated, setHasMigrated] = useState(false);

  // Fetch character presets from database
  const { data: presets = [], isLoading, refetch } = useQuery<CharacterPreset[]>({
    queryKey: ['/api/system-data/character-presets'],
    queryFn: async () => {
      const response = await fetch('/api/system-data/character-presets');
      if (!response.ok) throw new Error('Failed to fetch character presets');
      return response.json();
    },
    enabled: true, // Always fetch, even when not authenticated (to get global presets)
  });

  // Create preset mutation
  const createPreset = useMutation({
    mutationFn: async (preset: Omit<CharacterPreset, 'id'>) => {
      return (apiRequest as any)('/api/system-data/character-presets', {
        method: 'POST',
        body: JSON.stringify(preset),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/system-data/character-presets'] });
      toast({
        title: 'Character Saved',
        description: 'Your character preset has been saved successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save character preset',
        variant: 'destructive',
      });
    },
  });

  // Update preset mutation
  const updatePreset = useMutation({
    mutationFn: async ({ id, ...data }: CharacterPreset) => {
      return (apiRequest as any)(`/api/system-data/character-presets/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/system-data/character-presets'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update character preset',
        variant: 'destructive',
      });
    },
  });

  // Delete preset mutation
  const deletePreset = useMutation({
    mutationFn: async (id: string) => {
      return (apiRequest as any)(`/api/system-data/character-presets/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/system-data/character-presets'] });
      toast({
        title: 'Character Deleted',
        description: 'The character preset has been removed.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete character preset',
        variant: 'destructive',
      });
    },
  });

  // Toggle favorite mutation
  const toggleFavorite = useMutation({
    mutationFn: async (id: string) => {
      return (apiRequest as any)(`/api/system-data/character-presets/${id}/favorite`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/system-data/character-presets'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to toggle favorite',
        variant: 'destructive',
      });
    },
  });

  // Migration function to move localStorage data to database
  const migrateFromLocalStorage = async () => {
    if (!isAuthenticated || !user) return;
    
    // Check if we've already migrated for this user
    const migrationFlag = localStorage.getItem(`${MIGRATION_KEY}_${user.id}`);
    if (migrationFlag === 'true') return;

    try {
      // Get data from localStorage
      const storedData = localStorage.getItem(LOCALSTORAGE_KEY);
      if (!storedData) {
        // Mark as migrated even if no data to migrate
        localStorage.setItem(`${MIGRATION_KEY}_${user.id}`, 'true');
        return;
      }

      const localPresets = JSON.parse(storedData);
      
      if (Array.isArray(localPresets) && localPresets.length > 0) {
        // Filter out any default presets that might already exist as global
        const customPresets = localPresets.filter(preset => 
          preset.isCustom || 
          (preset.createdAt && preset.createdAt > 0) ||
          !['Elena, Warrior Princess', 'Marcus, Knight Commander', 'Zara, Mystic Scholar', 
            'Kai, Street Samurai', 'Luna, Forest Guardian'].includes(preset.name)
        );

        // Migrate each custom preset
        for (const preset of customPresets) {
          try {
            await createPreset.mutateAsync({
              name: preset.name || 'Unnamed Character',
              gender: preset.gender || 'Any',
              role: preset.role || preset.characterRole || 'Character',
              description: preset.description || preset.characterDescription || '',
              isFavorite: preset.favorite || preset.isFavorite || false,
            });
          } catch (error) {
            console.error('Failed to migrate preset:', preset.name, error);
          }
        }

        toast({
          title: 'Migration Complete',
          description: `Successfully migrated ${customPresets.length} character preset(s) to your account.`,
        });
      }

      // Mark as migrated for this user
      localStorage.setItem(`${MIGRATION_KEY}_${user.id}`, 'true');
      
      // Optionally remove the old localStorage data
      // localStorage.removeItem(LOCALSTORAGE_KEY);
      
      setHasMigrated(true);
    } catch (error) {
      console.error('Migration error:', error);
      toast({
        title: 'Migration Notice',
        description: 'Some character presets could not be migrated. You can recreate them manually.',
        variant: 'destructive',
      });
    }
  };

  // Run migration when user logs in
  useEffect(() => {
    if (isAuthenticated && user && !hasMigrated) {
      migrateFromLocalStorage();
    }
  }, [isAuthenticated, user]);

  // Sort presets: favorites first, then alphabetically
  const sortedPresets = [...presets].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return a.name.localeCompare(b.name);
  });

  return {
    presets: sortedPresets,
    isLoading,
    createPreset: createPreset.mutate,
    updatePreset: updatePreset.mutate,
    deletePreset: deletePreset.mutate,
    toggleFavorite: toggleFavorite.mutate,
    refetch,
  };
}