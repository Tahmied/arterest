'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useState } from 'react';
import { FiBookmark, FiHeart, FiMoreHorizontal } from 'react-icons/fi';

interface PinCardProps {
    pin: {
        _id: string;
        title: string;
        imageUrl: string;
        creator: {
            _id: string;
            username: string;
            avatar?: string;
        };
        likes: string[];
        saves: string[];
    };
    onLike?: (pinId: string) => void;
    onSave?: (pinId: string) => void;
}

export default function PinCard({ pin, onLike, onSave }: PinCardProps) {
    const { data: session } = useSession();
    const [isHovered, setIsHovered] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);

    const userId = session?.user?.id;
    const likes = pin.likes || [];
    const saves = pin.saves || [];
    const isLiked = userId ? likes.includes(userId) : false;
    const isSaved = userId ? saves.includes(userId) : false;

    const handleLike = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (onLike) onLike(pin._id);
    };

    const handleSave = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (onSave) onSave(pin._id);
    };

    return (
        <div className="mb-4">
            <Link href={`/pin/${pin._id}`}>
                <div
                    className="pin-card relative rounded-2xl overflow-hidden bg-[var(--secondary)] cursor-pointer"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    {/* Image */}
                    <div className="relative">
                        {!imageLoaded && (
                            <div className="skeleton aspect-[3/4]" />
                        )}
                        <img
                            src={pin.imageUrl || '/placeholder.png'}
                            alt={pin.title || 'Pin'}
                            className={`w-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0 absolute inset-0'
                                }`}
                            onLoad={() => setImageLoaded(true)}
                            onError={(e) => {
                                setImageLoaded(true); // Hide skeleton even on error
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"%3E%3Crect fill="%231f1f1f" width="400" height="400"/%3E%3Ctext fill="%23737373" font-family="system-ui" font-size="20" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage not found%3C/text%3E%3C/svg%3E';
                            }}
                        />

                        {/* Overlay */}
                        <div className={`overlay ${isHovered ? 'opacity-100' : ''}`}>
                            {/* Action Buttons */}
                            <div className="absolute top-3 right-3 flex gap-2">
                                <button
                                    onClick={handleSave}
                                    className={`p-2 rounded-full transition-all ${isSaved
                                        ? 'bg-[var(--primary)] text-white'
                                        : 'bg-white/90 text-gray-800 hover:bg-white'
                                        }`}
                                >
                                    <FiBookmark className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
                                </button>
                            </div>

                            {/* Bottom Actions */}
                            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                                <button
                                    onClick={handleLike}
                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${isLiked
                                        ? 'bg-[var(--destructive)] text-white'
                                        : 'bg-white/90 text-gray-800 hover:bg-white'
                                        }`}
                                >
                                    <FiHeart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                                    <span>{likes.length}</span>
                                </button>
                                <button className="p-2 bg-white/90 text-gray-800 hover:bg-white rounded-full transition-all">
                                    <FiMoreHorizontal className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </Link>

            {/* Pin Info */}
            <div className="mt-2 px-1">
                <h3 className="font-medium text-[var(--foreground)] truncate">{pin.title || 'Untitled'}</h3>
                {pin.creator && (
                    <Link
                        href={`/profile/${pin.creator.username || ''}`}
                        className="flex items-center gap-2 mt-1 group"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-7 h-7 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-xs font-medium overflow-hidden">
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
                        <span className="text-sm text-[var(--muted-foreground)] group-hover:text-[var(--foreground)] transition-colors">
                            {pin.creator.username || 'Unknown'}
                        </span>
                    </Link>
                )}
            </div>
        </div>
    );
}
