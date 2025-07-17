import React, { useState, useRef } from 'react';
import { Profile } from '@/lib/types/database';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  profile: Profile;
  onProfileUpdated: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ open, onClose, profile, onProfileUpdated }) => {
  const [displayName, setDisplayName] = useState(profile.display_name || '');
  const [username, setUsername] = useState(profile.username || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '');
  const [preview, setPreview] = useState<string | null>(profile.avatar_url || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    setError('');
    setPreview(URL.createObjectURL(file));
    try {
      // Subir imagen a Supabase Storage
      const fileExt = file.name.split('.').pop();
      const filePath = `avatars/${profile.id}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('publicaciones').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from('publicaciones').getPublicUrl(filePath);
      setAvatarUrl(publicUrlData.publicUrl);
    } catch {
      setError('Error al subir la imagen');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    if (!displayName.trim() || !username.trim()) {
      setError('El nombre y el usuario son obligatorios');
      setIsLoading(false);
      return;
    }
    // Validar que el nombre de usuario sea único
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.trim())
      .neq('id', profile.id)
      .maybeSingle();
    if (existing) {
      setError('Ese nombre de usuario ya está en uso. Elige otro.');
      setIsLoading(false);
      return;
    }
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          username: username.trim(),
          bio: bio.trim(),
          avatar_url: avatarUrl || null,
        })
        .eq('id', profile.id);
      if (updateError) throw updateError;
      onProfileUpdated();
    } catch  {
      setError('Error al actualizar el perfil');
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
        <button className="absolute top-2 right-2 text-2xl" onClick={onClose}>&times;</button>
        <h2 className="text-xl font-bold mb-4">Editar perfil</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col items-center gap-2">
            <Avatar className="h-20 w-20">
              <AvatarImage src={preview || ''} alt={displayName} />
              <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
              Cambiar foto de perfil
            </Button>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileChange}
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Nombre para mostrar</label>
            <Input value={displayName} onChange={e => setDisplayName(e.target.value)} disabled={isLoading} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Usuario</label>
            <Input value={username} onChange={e => setUsername(e.target.value)} disabled={isLoading} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Biografía</label>
            <Textarea value={bio} onChange={e => setBio(e.target.value)} disabled={isLoading} />
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? 'Guardando...' : 'Guardar cambios'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}; 