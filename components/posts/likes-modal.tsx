import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface LikeUser {
  id: string;
  user: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

interface LikesModalProps {
  open: boolean;
  onClose: () => void;
  likes: LikeUser[];
}

export const LikesModal: React.FC<LikesModalProps> = ({ open, onClose, likes }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <Card className="w-full max-w-md max-h-[70vh] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <span className="font-semibold">A quienes les gusta</span>
          <Button variant="ghost" size="sm" onClick={onClose}>&times;</Button>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-4 pb-2">
          {likes.length === 0 && <p className="text-muted-foreground text-center">Nadie ha dado like aún.</p>}
          {likes.map(like => (
            <div key={like.id} className="flex items-center space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={like.user.avatar_url || ''} alt={like.user.display_name} />
                <AvatarFallback>
                  {like.user.display_name?.charAt(0).toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <span className="font-semibold text-sm">{like.user.display_name}</span>
                <span className="text-xs text-muted-foreground ml-2">@{like.user.username}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}; 