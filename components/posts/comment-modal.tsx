import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Heart, MessageCircle } from 'lucide-react';
import defaultAvatar from '@/public/default-avatar.png'; // Asegúrate de tener esta imagen en public/
import { likeComment, unlikeComment, isCommentLiked, getCommentLikesCount, getCommentReplies, addCommentReply, deleteComment, updateComment } from '@/lib/supabase/posts';
import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image'
import { useUser } from '@/components/user-context'

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
    imageUrls?: string[];
    initialImageIndex?: number;
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

export const CommentModal: React.FC<CommentModalProps> = ({ open, onClose, comments, onAddComment, postInfo, onShowLikes, imageUrls = [], initialImageIndex = 0 }) => {
    const { user } = useUser();
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState('');
    const [commentLikes, setCommentLikes] = useState<{ [key: string]: number }>({});
    const [commentLiked, setCommentLiked] = useState<{ [key: string]: boolean }>({});
    const [replies, setReplies] = useState<{ [key: string]: Comment[] }>({});
    const [replyLoading, setReplyLoading] = useState(false);
    const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [editError, setEditError] = useState('');
    const currentUserId = user?.id || null;
    // Estado para el carrusel de imágenes
    const [currentImg, setCurrentImg] = useState(initialImageIndex);
    // Estados para el touch
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    // Configuración del swipe
    const minSwipeDistance = 50;

    const onTouchStart = (e: React.TouchEvent) => {
      setTouchEnd(null);
      setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: React.TouchEvent) => {
      setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
      if (!touchStart || !touchEnd) return;
      
      const distance = touchStart - touchEnd;
      const isLeftSwipe = distance > minSwipeDistance;
      const isRightSwipe = distance < -minSwipeDistance;

      if (isLeftSwipe) {
        // Deslizar izquierda = siguiente imagen
        setCurrentImg((prev) => prev === imageUrls.length - 1 ? 0 : prev + 1);
      }
      if (isRightSwipe) {
        // Deslizar derecha = imagen anterior
        setCurrentImg((prev) => prev === 0 ? imageUrls.length - 1 : prev - 1);
      }
    };

    // Si cambia el initialImageIndex (por abrir el modal con otra imagen), actualiza el estado
    React.useEffect(() => {
      if (open) setCurrentImg(initialImageIndex);
    }, [initialImageIndex, open]);

    const [commentList, setCommentList] = useState<Comment[]>(comments);
    useEffect(() => { setCommentList(comments); }, [comments]);

    useEffect(() => {
        // Cargar likes y si el usuario ya le dio like a cada comentario
        commentList.forEach(async (comment) => {
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
    }, [commentList, open, currentUserId]);

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

    const handleDeleteComment = async (commentId: string) => {
        if (!currentUserId) return;
        setDeletingCommentId(commentId);
        setTimeout(async () => {
          const ok = await deleteComment(commentId, currentUserId);
          setDeletingCommentId(null);
          if (ok) {
              setCommentList(prev => prev.filter(c => c.id !== commentId));
              // También eliminar de replies si es una reply
              setReplies(prev => {
                  const newReplies = { ...prev };
                  Object.keys(newReplies).forEach(key => {
                      newReplies[key] = newReplies[key].filter(r => r.id !== commentId);
                  });
                  return newReplies;
              });
          }
        }, 300);
    };

    const handleEditComment = (commentId: string, content: string) => {
      setEditingCommentId(commentId);
      setEditContent(content);
    };

    const handleEditSubmit = async (e: React.FormEvent, commentId: string, isReply: boolean = false, parentId?: string) => {
      e.preventDefault();
      if (!editContent.trim() || !currentUserId) return;
      setEditError('');
      const ok = await updateComment(commentId, editContent, currentUserId);
      if (!ok) {
        setEditError('Error al actualizar el comentario.');
        return;
      }
      if (isReply && parentId) {
        setReplies(prev => ({
          ...prev,
          [parentId]: prev[parentId].map(r => r.id === commentId ? { ...r, content: editContent } : r)
        }));
      } else {
        setCommentList(prev => prev.map(c => c.id === commentId ? { ...c, content: editContent } : c));
      }
      setEditingCommentId(null);
      setEditContent('');
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
            <Card className="w-full max-w-lg sm:max-w-2xl lg:max-w-6xl max-h-[90vh] flex flex-col lg:absolute lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2">
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
                            {/* Carrusel de imágenes en grande debajo del texto */}
                            {Array.isArray(imageUrls) && imageUrls.length > 0 && (
                              <div 
                                className="w-full bg-gray-100 rounded-lg overflow-hidden flex flex-col items-center justify-center relative my-4" 
                                style={imageUrls.length > 1 ? { height: '400px', maxHeight: '400px' } : { minHeight: '320px', maxHeight: '480px' }}
                                onTouchStart={onTouchStart}
                                onTouchMove={onTouchMove}
                                onTouchEnd={onTouchEnd}
                              >
                                <Image
                                  src={imageUrls[currentImg]}
                                  alt={`Imagen ${currentImg + 1} de la publicación`}
                                  className={imageUrls.length > 1 ? "w-full h-full bg-white object-contain" : "max-w-full h-auto bg-white object-contain"}
                                  style={{ display: 'block', background: 'white' }}
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                  }}
                                  width={600}
                                  height={400}
                                />
                                {imageUrls.length > 1 && (
                                  <>
                                    <button
                                      type="button"
                                      className="hidden sm:block absolute left-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-70 rounded-full p-1 shadow hover:bg-opacity-100 transition"
                                      onClick={e => { e.stopPropagation(); setCurrentImg((prev) => prev === 0 ? imageUrls.length - 1 : prev - 1) }}
                                      aria-label="Anterior"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                    </button>
                                    <button
                                      type="button"
                                      className="hidden sm:block absolute right-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-70 rounded-full p-1 shadow hover:bg-opacity-100 transition"
                                      onClick={e => { e.stopPropagation(); setCurrentImg((prev) => prev === imageUrls.length - 1 ? 0 : prev + 1) }}
                                      aria-label="Siguiente"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                    </button>
                                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                                      {imageUrls.map((_, idx) => (
                                        <span key={idx} className={`w-2 h-2 rounded-full ${idx === currentImg ? 'bg-blue-500' : 'bg-gray-300'}`}></span>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                                <span className="flex items-center gap-1 cursor-pointer hover:underline" onClick={onShowLikes}><Heart className="h-4 w-4" /> {postInfo.likes}</span>
                                <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4" /> {postInfo.comments}</span>
                            </div>
                        </div>
                    )}
                    {/* Comentarios */}
                    {commentList.length === 0 && <p className="text-muted-foreground text-center">Sé el primero en comentar.</p>}
                    {commentList.map(comment => (
                        <div key={comment.id} className={`flex flex-col gap-1 mb-2 transition-all duration-300 ${deletingCommentId === comment.id ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
                            <div className="flex items-start space-x-2">
                                <Image
                                    src={comment.user.avatar_url || defaultAvatar.src}
                                    alt={comment.user.username}
                                    className="w-8 h-8 rounded-full object-cover"
                                    onError={e => (e.currentTarget.src = defaultAvatar.src)}
                                    width={32}
                                    height={32}
                                />
                                <div className="flex-1">
                                    <div className="flex text-start flex-col gap-2">
                                        <div className='flex items-center gap-2'>
                                            <Link href={`/profile/${comment.user.username}`} className="font-semibold text-sm hover:underline">
                                                {comment.user.username}
                                            </Link>
                                            <span className="text-muted-foreground">{formatRelativeDate(comment.created_at)}</span>
                                        </div>
                                        <span className="text-sm whitespace-pre-wrap">
                                          {editingCommentId === comment.id ? (
                                            <form onSubmit={e => handleEditSubmit(e, comment.id)} className="flex items-center gap-2">
                                              <Input
                                                value={editContent}
                                                onChange={e => setEditContent(e.target.value)}
                                                className="flex-1"
                                                maxLength={300}
                                                autoFocus
                                              />
                                              <Button type="submit" size="sm" disabled={!editContent.trim()}>Guardar</Button>
                                              <Button type="button" size="sm" variant="ghost" onClick={() => setEditingCommentId(null)}>Cancelar</Button>
                                              {editError && <span className="text-xs text-red-500 ml-2">{editError}</span>}
                                            </form>
                                          ) : comment.content}
                                        </span>
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
                                        {currentUserId && comment.user.username === user?.user_metadata?.username && (
                                            <>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="ml-auto text-blue-500"
                                                onClick={() => handleEditComment(comment.id, comment.content)}
                                                disabled={deletingCommentId === comment.id}
                                              >
                                                Editar
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="ml-auto text-red-500"
                                                onClick={() => handleDeleteComment(comment.id)}
                                                disabled={deletingCommentId === comment.id}
                                              >
                                                {deletingCommentId === comment.id ? 'Eliminando...' : 'Eliminar'}
                                              </Button>
                                            </>
                                        )}
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
                                                <div key={reply.id} className={`flex items-start space-x-2 text-xs transition-all duration-300 ${deletingCommentId === reply.id ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
                                                    <Image
                                                        src={reply.user?.avatar_url || defaultAvatar.src}
                                                        alt={reply.user?.username}
                                                        className="w-6 h-6 rounded-full object-cover"
                                                        onError={e => (e.currentTarget.src = defaultAvatar.src)}
                                                        width={24}
                                                        height={24}
                                                    />
                                                    <div className="flex flex-col gap-2">
                                                        <div className='flex items-center gap-2'>
                                                            <Link href={`/profile/${reply.user?.username}`} className="font-semibold hover:underline">
                                                                {reply.user?.username}
                                                            </Link>
                                                            <span className="text-muted-foreground">{formatRelativeDate(reply.created_at)}</span> <br />
                                                            {currentUserId && reply.user?.username === user?.user_metadata?.username && (
                                                              <>
                                                                <Button
                                                                  variant="ghost"
                                                                  size="sm"
                                                                  className="ml-auto text-blue-500"
                                                                  onClick={() => handleEditComment(reply.id, reply.content)}
                                                                  disabled={deletingCommentId === reply.id}
                                                                >
                                                                  Editar
                                                                </Button>
                                                                <Button
                                                                  variant="ghost"
                                                                  size="sm"
                                                                  className="ml-auto text-red-500"
                                                                  onClick={() => handleDeleteComment(reply.id)}
                                                                  disabled={deletingCommentId === reply.id}
                                                                >
                                                                  {deletingCommentId === reply.id ? 'Eliminando...' : 'Eliminar'}
                                                                </Button>
                                                              </>
                                                            )}
                                                        </div>
                                                        <span className="text-sm">
                                                          {editingCommentId === reply.id ? (
                                                            <form onSubmit={e => handleEditSubmit(e, reply.id, true, comment.id)} className="flex items-center gap-2">
                                                              <Input
                                                                value={editContent}
                                                                onChange={e => setEditContent(e.target.value)}
                                                                className="flex-1"
                                                                maxLength={300}
                                                                autoFocus
                                                              />
                                                              <Button type="submit" size="sm" disabled={!editContent.trim()}>Guardar</Button>
                                                              <Button type="button" size="sm" variant="ghost" onClick={() => setEditingCommentId(null)}>Cancelar</Button>
                                                              {editError && <span className="text-xs text-red-500 ml-2">{editError}</span>}
                                                            </form>
                                                          ) : reply.content}
                                                        </span>
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