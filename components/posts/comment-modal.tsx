import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Heart, MessageCircle } from 'lucide-react';
import defaultAvatar from '@/public/default-avatar.png'; // Asegúrate de tener esta imagen en public/
import { likeComment, unlikeComment, isCommentLiked, getCommentLikesCount, getCommentReplies, addCommentReply } from '@/lib/supabase/posts';
import { useEffect } from 'react';
import Link from 'next/link';

interface CommentUser {
  username: string;
  display_name: string;
  avatar_url: string | null;
}

interface Comment {
  id: string;
  user: CommentUser;
  content: string;
  created_at: string;
  parent_comment_id?: string | null;
}

interface PostInfo {
    id: string;
    user: { username: string; display_name: string; avatar_url: string | null };
    created_at: string;
    content: string;
    likes: number;
    comments: number;
}

interface CommentModalProps {
    open: boolean;
    onClose: () => void;
    comments: Comment[];
    onAddComment: (content: string) => Promise<void>;
    postInfo?: PostInfo;
    onShowLikes?: () => void;
}

// Utilidad para formato de fecha relativo
function formatRelativeDate(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffYear = Math.floor(diffDay / 365);

    if (diffMin < 1) return 'hace unos segundos';
    if (diffMin < 60) return `hace ${diffMin} minuto${diffMin > 1 ? 's' : ''}`;
    if (diffHour < 24) return `hace ${diffHour} hora${diffHour > 1 ? 's' : ''}`;
    if (diffDay < 30) return `hace ${diffDay} día${diffDay > 1 ? 's' : ''}`;
    if (diffYear < 1) return `hace ${Math.floor(diffDay / 30)} mes${Math.floor(diffDay / 30) > 1 ? 'es' : ''}`;
    return `hace ${diffYear} año${diffYear > 1 ? 's' : ''}`;
}

export const CommentModal: React.FC<CommentModalProps> = ({ open, onClose, comments, onAddComment, postInfo, onShowLikes }) => {
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState('');
    const [commentLikes, setCommentLikes] = useState<{ [key: string]: number }>({});
    const [commentLiked, setCommentLiked] = useState<{ [key: string]: boolean }>({});
    const [replies, setReplies] = useState<{ [key: string]: Comment[] }>({});
    const [replyLoading, setReplyLoading] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        // Obtener usuario actual (puedes optimizar esto si ya lo tienes en contexto)
        const getUser = async () => {
            const supabase = (await import('@/lib/supabase/client')).createClient();
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUserId(user?.id || null);
        };
        getUser();
    }, []);

    useEffect(() => {
        if (!open) return;
        // Cargar likes y si el usuario ya le dio like a cada comentario
        comments.forEach(async (comment) => {
            const [likes, liked] = await Promise.all([
                getCommentLikesCount(comment.id),
                currentUserId ? isCommentLiked(comment.id, currentUserId) : Promise.resolve(false)
            ]);
            setCommentLikes(prev => ({ ...prev, [comment.id]: likes }));
            setCommentLiked(prev => ({ ...prev, [comment.id]: liked }));
            // Cargar replies
            const res: Comment[] = await getCommentReplies(comment.id);
            setReplies(prev => ({ ...prev, [comment.id]: res }));
        });
    }, [comments, open, currentUserId]);

    const handleLikeComment = async (commentId: string) => {
        if (!currentUserId) return;
        if (commentLiked[commentId]) {
            await unlikeComment(commentId, currentUserId);
            setCommentLiked(prev => ({ ...prev, [commentId]: false }));
            setCommentLikes(prev => ({ ...prev, [commentId]: (prev[commentId] || 1) - 1 }));
        } else {
            await likeComment(commentId, currentUserId);
            setCommentLiked(prev => ({ ...prev, [commentId]: true }));
            setCommentLikes(prev => ({ ...prev, [commentId]: (prev[commentId] || 0) + 1 }));
        }
    };

    const handleReply = (commentId: string) => {
        setReplyingTo(commentId);
        setReplyContent('');
    };

    const handleReplySubmit = async (e: React.FormEvent, commentId: string) => {
        e.preventDefault();
        if (!replyContent.trim() || !currentUserId) return;
        setReplyLoading(true);
        const reply = await addCommentReply(commentId, postInfo?.id || '', currentUserId, replyContent);
        if (reply) {
            setReplies(prev => ({
                ...prev,
                [commentId]: [...(prev[commentId] || []), reply]
            }));
            setReplyContent('');
            setReplyingTo(null);
        }
        setReplyLoading(false);
    };

    if (!open) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        setLoading(true);
        await onAddComment(newComment);
        setNewComment('');
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <span className="font-semibold">Comentarios</span>
                    <Button variant="ghost" size="sm" onClick={onClose}>&times;</Button>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto space-y-4 pb-2">
                    {/* Info del post */}
                    {postInfo && (
                        <div className="mb-4 p-4 rounded bg-muted flex flex-col gap-2">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={postInfo.user.avatar_url || defaultAvatar.src} alt={postInfo.user.display_name} />
                                    <AvatarFallback>{postInfo.user.display_name?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <span className="font-semibold">{postInfo.user.display_name}</span>{' '}
                                    <span className="text-xs text-muted-foreground">@{postInfo.user.username}</span>
                                    <div className="text-xs text-muted-foreground">{new Date(postInfo.created_at).toLocaleString('es-ES')}</div>
                                </div>
                            </div>
                            <div className="mt-2 text-base">{postInfo.content}</div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                                <span className="flex items-center gap-1 cursor-pointer hover:underline" onClick={onShowLikes}><Heart className="h-4 w-4" /> {postInfo.likes}</span>
                                <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4" /> {postInfo.comments}</span>
                            </div>
                        </div>
                    )}
                    {/* Comentarios */}
                    {comments.length === 0 && <p className="text-muted-foreground text-center">Sé el primero en comentar.</p>}
                    {comments.map(comment => (
                        <div key={comment.id} className="flex flex-col gap-1 mb-2">
                            <div className="flex items-start space-x-2">
                                <img
                                    src={comment.user.avatar_url || defaultAvatar.src}
                                    alt={comment.user.username}
                                    className="w-8 h-8 rounded-full object-cover"
                                    onError={e => (e.currentTarget.src = defaultAvatar.src)}
                                />
                                <div className="flex-1">
                                    <div className="flex text-start flex-col gap-2">
                                        <div className='flex items-center gap-2'>
                                            <Link href={`/profile/${comment.user.username}`} className="font-semibold text-sm hover:underline">
                                                {comment.user.username}
                                            </Link>
                                            <span className="text-muted-foreground">{formatRelativeDate(comment.created_at)}</span>
                                        </div>
                                        <span className="text-sm whitespace-pre-wrap">{comment.content}</span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1">
                                        <button
                                            className={`flex items-center gap-1 text-xs ${commentLiked[comment.id] ? 'text-blue-600' : 'text-muted-foreground'}`}
                                            onClick={() => handleLikeComment(comment.id)}
                                        >
                                            <Heart className="h-4 w-4" /> {commentLikes[comment.id] || 0}
                                        </button>
                                        <button
                                            className="text-xs text-blue-600 hover:underline"
                                            onClick={() => handleReply(comment.id)}
                                        >
                                            Responder
                                        </button>
                                    </div>
                                    {/* Input para responder */}
                                    {replyingTo === comment.id && (
                                        <form onSubmit={e => handleReplySubmit(e, comment.id)} className="flex items-center gap-2 mt-2">
                                            <Input
                                                value={replyContent}
                                                onChange={e => setReplyContent(e.target.value)}
                                                placeholder="Escribe una respuesta..."
                                                disabled={replyLoading}
                                                className="flex-1"
                                                maxLength={300}
                                                autoFocus
                                            />
                                            <Button type="submit" disabled={replyLoading || !replyContent.trim()} size="sm">
                                                Responder
                                            </Button>
                                        </form>
                                    )}
                                    {/* Sub-comentarios */}
                                    {replies[comment.id] && replies[comment.id].length > 0 && (
                                        <div className="mt-2 ml-6 border-l pl-3 space-y-1">
                                            {replies[comment.id].map((reply) => (
                                                <div key={reply.id} className="flex items-start space-x-2 text-xs">
                                                    <img
                                                        src={reply.user?.avatar_url || defaultAvatar.src}
                                                        alt={reply.user?.username}
                                                        className="w-6 h-6 rounded-full object-cover"
                                                        onError={e => (e.currentTarget.src = defaultAvatar.src)}
                                                    />
                                                    <div className="flex flex-col gap-2">
                                                        <div className='flex items-center gap-2'>
                                                            <Link href={`/profile/${reply.user?.username}`} className="font-semibold hover:underline">
                                                                {reply.user?.username}
                                                            </Link>
                                                            <span className="text-muted-foreground">{formatRelativeDate(reply.created_at)}</span> <br />
                                                        </div>
                                                        <span className="text-sm">{reply.content}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </CardContent>
                <form onSubmit={handleSubmit} className="flex items-center gap-2 p-4 border-t">
                    <Input
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        placeholder="Escribe un comentario..."
                        disabled={loading}
                        className="flex-1"
                        maxLength={300}
                    />
                    <Button type="submit" disabled={loading || !newComment.trim()}>
                        Comentar
                    </Button>
                </form>
            </Card>
        </div>
    );
}; 