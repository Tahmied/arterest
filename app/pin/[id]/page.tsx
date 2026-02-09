'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useCallback, useEffect, useState } from 'react';
import {
    FiArrowLeft,
    FiBookmark,
    FiHeart,
    FiLoader,
    FiMessageCircle,
    FiMoreHorizontal,
    FiSend,
    FiTrash2,
} from 'react-icons/fi';

interface Pin {
    _id: string;
    title: string;
    description: string;
    imageUrl: string;
    category: string;
    creator: {
        _id: string;
        username: string;
        avatar?: string;
        followers: string[];
    };
    likes: string[];
    saves: string[];
    createdAt: string;
}

interface Comment {
    _id: string;
    content: string;
    author: {
        _id: string;
        username: string;
        avatar?: string;
    };
    createdAt: string;
}

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function PinDetailPage({ params }: PageProps) {
    const { id } = use(params);
    const { data: session } = useSession();
    const router = useRouter();

    const [pin, setPin] = useState<Pin | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [commentLoading, setCommentLoading] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);

    const userId = session?.user?.id;
    const isOwner = pin?.creator?._id === userId;
    const pinLikes = pin?.likes || [];
    const pinSaves = pin?.saves || [];
    const isLiked = userId && pin ? pinLikes.includes(userId) : false;
    const isSaved = userId && pin ? pinSaves.includes(userId) : false;

    const fetchPin = useCallback(async () => {
        try {
            const response = await fetch(`/api/pins/${id}`);
            if (!response.ok) throw new Error('Pin not found');
            const data = await response.json();
            setPin(data);
            const creatorFollowers = data.creator?.followers || [];
            setIsFollowing(userId ? creatorFollowers.includes(userId) : false);
        } catch (error) {
            console.error('Error fetching pin:', error);
        } finally {
            setLoading(false);
        }
    }, [id, userId]);

    const fetchComments = useCallback(async () => {
        try {
            const response = await fetch(`/api/pins/${id}/comments`);
            const data = await response.json();
            setComments(data);
        } catch (error) {
            console.error('Error fetching comments:', error);
        }
    }, [id]);

    useEffect(() => {
        fetchPin();
        fetchComments();
    }, [fetchPin, fetchComments]);

    const handleLike = async () => {
        if (!session?.user) {
            router.push('/login');
            return;
        }

        try {
            const response = await fetch(`/api/pins/${id}/like`, { method: 'POST' });
            const data = await response.json();
            setPin((prev) =>
                prev
                    ? {
                        ...prev,
                        likes: data.liked
                            ? [...prev.likes, userId!]
                            : prev.likes.filter((lid) => lid !== userId),
                    }
                    : null
            );
        } catch (error) {
            console.error('Error liking pin:', error);
        }
    };

    const handleSave = async () => {
        if (!session?.user) {
            router.push('/login');
            return;
        }

        try {
            const response = await fetch(`/api/pins/${id}/save`, { method: 'POST' });
            const data = await response.json();
            setPin((prev) =>
                prev
                    ? {
                        ...prev,
                        saves: data.saved
                            ? [...prev.saves, userId!]
                            : prev.saves.filter((sid) => sid !== userId),
                    }
                    : null
            );
        } catch (error) {
            console.error('Error saving pin:', error);
        }
    };

    const handleFollow = async () => {
        if (!session?.user || !pin) {
            router.push('/login');
            return;
        }

        try {
            const response = await fetch(`/api/users/${pin.creator.username}/follow`, {
                method: 'POST',
            });
            const data = await response.json();
            setIsFollowing(data.following);
        } catch (error) {
            console.error('Error following user:', error);
        }
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session?.user) {
            router.push('/login');
            return;
        }

        if (!newComment.trim()) return;

        setCommentLoading(true);
        try {
            const response = await fetch(`/api/pins/${id}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: newComment }),
            });
            const data = await response.json();
            setComments((prev) => [data, ...prev]);
            setNewComment('');
        } catch (error) {
            console.error('Error adding comment:', error);
        } finally {
            setCommentLoading(false);
        }
    };

    const handleDeletePin = async () => {
        if (!confirm('Are you sure you want to delete this pin?')) return;

        try {
            await fetch(`/api/pins/${id}`, { method: 'DELETE' });
            router.push('/');
        } catch (error) {
            console.error('Error deleting pin:', error);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <FiLoader className="w-10 h-10 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    if (!pin) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <h1 className="text-2xl font-bold">Pin not found</h1>
                <Link href="/" className="btn-primary">
                    Go back home
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-6">
            {/* Back Button */}
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 mb-6 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
                <FiArrowLeft className="w-5 h-5" />
                Back
            </button>

            <div className="card overflow-hidden">
                <div className="grid md:grid-cols-2 gap-0">
                    {/* Image */}
                    <div className="bg-[var(--secondary)]">
                        <img
                            src={pin.imageUrl}
                            alt={pin.title}
                            className="w-full h-full object-contain max-h-[700px]"
                        />
                    </div>

                    {/* Details */}
                    <div className="flex flex-col max-h-[700px]">
                        {/* Header */}
                        <div className="p-6 border-b border-[var(--border)]">
                            <div className="flex items-center justify-between">
                                {/* Actions */}
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleLike}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${isLiked
                                            ? 'bg-[var(--destructive)] text-white'
                                            : 'bg-[var(--secondary)] hover:bg-[var(--card-hover)]'
                                            }`}
                                    >
                                        <FiHeart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                                        <span>{pinLikes.length}</span>
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${isSaved
                                            ? 'bg-[var(--primary)] text-white'
                                            : 'bg-[var(--secondary)] hover:bg-[var(--card-hover)]'
                                            }`}
                                    >
                                        <FiBookmark className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
                                        <span>Save</span>
                                    </button>
                                </div>

                                {/* Options Menu */}
                                {isOwner && (
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowOptions(!showOptions)}
                                            className="p-2 hover:bg-[var(--secondary)] rounded-full transition-colors"
                                        >
                                            <FiMoreHorizontal className="w-5 h-5" />
                                        </button>
                                        {showOptions && (
                                            <div className="absolute right-0 top-full mt-2 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden z-10">
                                                <button
                                                    onClick={handleDeletePin}
                                                    className="flex items-center gap-2 px-4 py-3 w-full text-left hover:bg-[var(--card-hover)] text-[var(--destructive)] transition-colors"
                                                >
                                                    <FiTrash2 className="w-4 h-4" />
                                                    Delete Pin
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 flex-1 overflow-y-auto">
                            {/* Category */}
                            <span className="inline-block px-3 py-1 text-sm bg-[var(--secondary)] rounded-full text-[var(--muted-foreground)] mb-4">
                                {pin.category}
                            </span>

                            {/* Title */}
                            <h1 className="text-2xl font-bold mb-3">{pin.title}</h1>

                            {/* Description */}
                            {pin.description && (
                                <p className="text-[var(--muted-foreground)] mb-6">{pin.description}</p>
                            )}

                            {/* Creator */}
                            {pin.creator && (
                                <div className="flex items-center justify-between mb-6 p-4 bg-[var(--secondary)] rounded-xl">
                                    <Link
                                        href={`/profile/${pin.creator.username || ''}`}
                                        className="flex items-center gap-3"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-medium text-lg overflow-hidden">
                                            {pin.creator.avatar ? (
                                                <img
                                                    src={pin.creator.avatar}
                                                    alt={pin.creator.username || 'User'}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                (pin.creator.username || 'U').charAt(0).toUpperCase()
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium">{pin.creator.username || 'Unknown'}</p>
                                            <p className="text-sm text-[var(--muted-foreground)]">
                                                {pin.creator.followers?.length || 0} followers
                                            </p>
                                        </div>
                                    </Link>
                                    {!isOwner && pin.creator && (
                                        <button
                                            onClick={handleFollow}
                                            className={`px-4 py-2 rounded-full font-medium transition-all ${isFollowing
                                                ? 'bg-[var(--card)] border border-[var(--border)]'
                                                : 'bg-[var(--primary)] text-white'
                                                }`}
                                        >
                                            {isFollowing ? 'Following' : 'Follow'}
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Date */}
                            <p className="text-sm text-[var(--muted-foreground)] mb-6">
                                Posted on {formatDate(pin.createdAt)}
                            </p>

                            {/* Comments */}
                            <div>
                                <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
                                    <FiMessageCircle className="w-5 h-5" />
                                    Comments ({comments.length})
                                </h2>

                                {/* Comment Form */}
                                <form onSubmit={handleAddComment} className="flex gap-2 mb-6">
                                    <input
                                        type="text"
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder="Add a comment..."
                                        className="input flex-1"
                                        disabled={!session?.user}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!session?.user || commentLoading || !newComment.trim()}
                                        className="btn-primary px-4"
                                    >
                                        {commentLoading ? (
                                            <FiLoader className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <FiSend className="w-5 h-5" />
                                        )}
                                    </button>
                                </form>

                                {/* Comments List */}
                                <div className="space-y-4">
                                    {comments.length === 0 ? (
                                        <p className="text-center text-[var(--muted-foreground)] py-4">
                                            No comments yet. Be the first to comment!
                                        </p>
                                    ) : (
                                        comments.map((comment) => (
                                            <div
                                                key={comment._id}
                                                className="flex gap-3 p-3 bg-[var(--secondary)] rounded-xl"
                                            >
                                                <Link href={`/profile/${comment.author.username}`}>
                                                    <div className="w-9 h-9 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-sm font-medium overflow-hidden shrink-0">
                                                        {comment.author.avatar ? (
                                                            <img
                                                                src={comment.author.avatar}
                                                                alt={comment.author.username}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            comment.author.username.charAt(0).toUpperCase()
                                                        )}
                                                    </div>
                                                </Link>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <Link
                                                            href={`/profile/${comment.author.username}`}
                                                            className="font-medium hover:underline"
                                                        >
                                                            {comment.author.username}
                                                        </Link>
                                                        <span className="text-xs text-[var(--muted-foreground)]">
                                                            {formatDate(comment.createdAt)}
                                                        </span>
                                                    </div>
                                                    <p className="text-[var(--muted-foreground)] mt-1">
                                                        {comment.content}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
