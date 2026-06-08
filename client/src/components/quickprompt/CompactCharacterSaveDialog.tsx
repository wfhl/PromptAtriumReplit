import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface CompactCharacterSaveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  customCharacterInput: string;
}

export default function CompactCharacterSaveDialog({
  isOpen,
  onClose,
  onSuccess,
  customCharacterInput
}: CompactCharacterSaveDialogProps) {
  const [name, setName] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Pre-populate name from custom character input (first 3 words)
  useEffect(() => {
    if (customCharacterInput.trim()) {
      const words = customCharacterInput.trim().split(' ');
      setName(words.slice(0, 3).join(' '));
    }
  }, [customCharacterInput]);

  const saveCharacterMutation = useMutation({
    mutationFn: (preset: any) =>
      apiRequest('/api/character-presets', 'POST', preset),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/character-presets'] });
      toast({
        title: "Character saved",
        description: `"${name}" has been saved to your presets.`,
      });
      onSuccess?.();
      handleClose();
    },
    onError: (error: any) => {
      console.error("Error saving character preset:", error);
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save character preset",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your character preset.",
        variant: "destructive",
      });
      return;
    }

    // Create complete character preset data structure
    const preset = {
      preset_id: name.toLowerCase().replace(/\s+/g, '-'),
      name: name.trim(),
      gender: 'female', // Default
      body_type: '',
      default_tag: '',
      role: '',
      hairstyle: '',
      hair_color: '',
      eye_color: '',
      makeup: '',
      skin_tone: '',
      clothing: '',
      expression: '',
      jewelry: '',
      accessories: '',
      pose: '',
      additional_details: '',
      lora_description: customCharacterInput.trim(), // Use user input as lora_description
      is_custom: true,
      created_by: 'dev-user',
      character_data: {
        gender: 'female',
        bodyType: '',
        characterType: '',
        defaultTag: '',
        role: '',
        hairstyle: '',
        hairColor: '',
        eyeColor: '',
        makeup: '',
        skinTone: '',
        clothing: '',
        expression: '',
        jewelry: '',
        accessories: '',
        pose: '',
        additionalDetails: '',
        loraDescription: customCharacterInput.trim()
      }
    };

    saveCharacterMutation.mutate(preset);
  };

  const handleClose = () => {
    setName('');
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-w-[90vw] bg-gray-900 border-gray-700">
        <DialogTitle className="text-white text-center">
          Enter a name for this character preset:
        </DialogTitle>
        
        <div className="space-y-4 mt-4">
          <Input
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="e.g., Anime Girl, Business Woman"
            className="bg-gray-800 border-gray-600 text-white"
            autoFocus
          />
          
          <div className="flex justify-center space-x-3">
            <Button 
              variant="outline" 
              onClick={handleClose}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saveCharacterMutation.isPending || !name.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saveCharacterMutation.isPending ? "Saving..." : "Ok"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}