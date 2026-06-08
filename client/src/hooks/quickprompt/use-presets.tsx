import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type InsertCharacterPreset = { name: string; [key: string]: any };
type InsertGlobalPreset = { name: string; [key: string]: any };

const apiRequest = async (url: string, options?: RequestInit) => {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// Character Presets Hooks
export function useCharacterPresets() {
  return useQuery({
    queryKey: ['/api/system-data/character-presets'],
    queryFn: () => apiRequest('/api/system-data/character-presets'),
  });
}

export function useCharacterPreset(id: number) {
  return useQuery({
    queryKey: ['/api/system-data/character-presets', id],
    queryFn: () => apiRequest(`/api/system-data/character-presets/${id}`),
    enabled: !!id,
  });
}

export function useCreateCharacterPreset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (preset: InsertCharacterPreset) =>
      apiRequest('/api/system-data/character-presets', {
        method: 'POST',
        body: JSON.stringify(preset),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/system-data/character-presets'] });
    },
  });
}

export function useUpdateCharacterPreset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, preset }: { id: number; preset: Partial<InsertCharacterPreset> }) =>
      apiRequest(`/api/system-data/character-presets/${id}`, {
        method: 'PUT',
        body: JSON.stringify(preset),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/system-data/character-presets'] });
    },
  });
}

export function useDeleteCharacterPreset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/system-data/character-presets/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/system-data/character-presets'] });
    },
  });
}

export function useToggleCharacterPresetFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/system-data/character-presets/${id}/favorite`, {
        method: 'PUT',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/system-data/character-presets'] });
    },
  });
}

export function useSetCharacterPresetDefault() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/system-data/character-presets/${id}/default`, {
        method: 'PUT',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/system-data/character-presets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/system-data/global-presets'] });
    },
  });
}

// Global Presets Hooks
export function useGlobalPresets() {
  return useQuery({
    queryKey: ['/api/system-data/global-presets'],
    queryFn: () => apiRequest('/api/system-data/global-presets'),
  });
}

export function useGlobalPreset(id: number) {
  return useQuery({
    queryKey: ['/api/system-data/global-presets', id],
    queryFn: () => apiRequest(`/api/system-data/global-presets/${id}`),
    enabled: !!id,
  });
}

export function useCreateGlobalPreset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (preset: InsertGlobalPreset) =>
      apiRequest('/api/system-data/global-presets', {
        method: 'POST',
        body: JSON.stringify(preset),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/system-data/global-presets'] });
    },
  });
}

export function useUpdateGlobalPreset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, preset }: { id: number; preset: Partial<InsertGlobalPreset> }) =>
      apiRequest(`/api/system-data/global-presets/${id}`, {
        method: 'PUT',
        body: JSON.stringify(preset),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/system-data/global-presets'] });
    },
  });
}

export function useDeleteGlobalPreset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/system-data/global-presets/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/system-data/global-presets'] });
    },
  });
}

export function useToggleGlobalPresetFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/system-data/global-presets/${id}/favorite`, {
        method: 'PUT',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/system-data/global-presets'] });
    },
  });
}

export function useSetGlobalPresetDefault() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/system-data/global-presets/${id}/default`, {
        method: 'PUT',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/system-data/character-presets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/system-data/global-presets'] });
    },
  });
}

// Helper functions to transform data between frontend and database formats
export function transformCharacterDataToDatabase(characterData: any): InsertCharacterPreset {
  return {
    name: characterData.name,
    prompt: characterData.prompt || '',
    description: characterData.description,
    character_data: {
      gender: characterData.gender,
      bodyType: characterData.bodyType,
      defaultTag: characterData.defaultTag,
      role: characterData.role,
      hairstyle: characterData.hairstyle,
      hairColor: characterData.hairColor,
      eyeColor: characterData.eyeColor,
      makeup: characterData.makeup,
      skinTone: characterData.skinTone,
      clothing: characterData.clothing,
      additionalDetails: characterData.additionalDetails,
      loraDescription: characterData.loraDescription,
    },
    is_favorite: characterData.favorite || false,
    is_default: false,
    user_id: 'dev-user',
  };
}

export function transformGlobalDataToDatabase(globalData: any): InsertGlobalPreset {
  return {
    name: globalData.name,
    description: globalData.description,
    preset_data: globalData.options,
    is_favorite: globalData.favorite || false,
    is_default: false,
    user_id: 'dev-user',
  };
}