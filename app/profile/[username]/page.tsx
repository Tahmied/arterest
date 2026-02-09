'use client';

import MasonryGrid from '@/components/MasonryGrid';
import PinCard from '@/components/PinCard';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { use, useCallback, useEffect, useState } from 'react';
import { FiBookmark, FiGrid, FiLoader, FiSettings, FiUsers } from 'react-icons/fi';

interface User {
    _id: string;
    username: string;
    email: string;
    avatar?: string;
    bio?: string;
    followers: { _id: string; username: string; avatar?: string }[];
    following: { _id: string; username: string; avatar?: string }[];
    createdAt: string;
}

interface Pin {
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
}

type TabType = 'pins' | 'saved' | 'following';

interface PageProps {
    params: Promise<{ username: string }>;
}

export default function ProfilePage({ params }: PageProps) {
    const { username } = use(params);
    const { data: session } = useSession();

    const [user, setUser] = useState<User | null>(null);
    const [pins, setPins] = useState<Pin[]>([]);
    const [savedPins, setSavedPins] = useState<Pin[]>([]);
    const [activeTab, setActiveTab] = useState<TabType>('pins');
    const [loading, setLoading] = useState(true);
    const [tabLoading, setTabLoading] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);

    const isOwnProfile = session?.user?.username === username;
    const userId = session?.user?.id;

    const fetchUser = useCallback(async () => {
        try {
            const response = await fetch(`/api/users/${username}`);
            if (!response.ok) throw new Error('User not found');
            const data = await response.json();
            setUser(data);
            const userFollowers = data.followers || [];
            setIsFollowing(
                userId
                    ? userFollowers.some((f: { _id: string }) => f._id === userId)
                    : false
            );
        } catch (error) {
            console.error('Error fetching user:', error);
        } finally {
            setLoading(false);
        }
    }, [username, userId]);

    const fetchPins = useCallback(async () => {
        setTabLoading(true);
        try {
            const response = await fetch(`/api/users/${username}/pins`);
            const data = await response.json();
            setPins(data);
        } catch (error) {
            console.error('Error fetching pins:', error);
        } finally {
            setTabLoading(false);
        }
    }, [username]);

    const fetchSavedPins = useCallback(async () => {
        setTabLoading(true);
        try {
            const response = await fetch(`/api/users/${username}/saved`);
            const data = await response.json();
            setSavedPins(data);
        } catch (error) {
            console.error('Error fetching saved pins:', error);
        } finally {
            setTabLoading(false);
        }
    }, [username]);

    useEffect(() => {
        fetchUser();
        fetchPins();
    }, [fetchUser, fetchPins]);

    useEffect(() => {
        if (activeTab === 'saved' && savedPins.length === 0) {
            fetchSavedPins();
        }
    }, [activeTab, savedPins.length, fetchSavedPins]);

    const handleFollow = async () => {
        if (!session?.user) {
            window.location.href = '/login';
            return;
        }

        try {
            const response = await fetch(`/api/users/${username}/follow`, {
                method: 'POST',
            });
            const data = await response.json();
            setIsFollowing(data.following);

            // Update followers count
            if (user) {
                setUser({
                    ...user,
                    followers: data.following
                        ? [...user.followers, { _id: userId!, username: session.user.username, avatar: session.user.avatar }]
                        : user.followers.filter((f) => f._id !== userId),
                });
            }
        } catch (error) {
            console.error('Error following user:', error);
        }
    };

    const handleLike = async (pinId: string) => {
        if (!session?.user) {
            window.location.href = '/login';
            return;
        }

        try {
            const response = await fetch(`/api/pins/${pinId}/like`, { method: 'POST' });
            const data = await response.json();

            const updatePins = (prevPins: Pin[]) =>
                prevPins.map((pin) =>
                    pin._id === pinId
                        ? {
                            ...pin,
                            likes: data.liked
                                ? [...(pin.likes || []), userId!]
                                : (pin.likes || []).filter((id) => id !== userId),
                        }
                        : pin
                );

            setPins(updatePins);
            setSavedPins(updatePins);
        } catch (error) {
            console.error('Error liking pin:', error);
        }
    };

    const handleSave = async (pinId: string) => {
        if (!session?.user) {
            window.location.href = '/login';
            return;
        }

        try {
            const response = await fetch(`/api/pins/${pinId}/save`, { method: 'POST' });
            const data = await response.json();

            const updatePins = (prevPins: Pin[]) =>
                prevPins.map((pin) =>
                    pin._id === pinId
                        ? {
                            ...pin,
                            saves: data.saved
                                ? [...(pin.saves || []), userId!]
                                : (pin.saves || []).filter((id) => id !== userId),
                        }
                        : pin
                );

            setPins(updatePins);
            setSavedPins(updatePins);
        } catch (error) {
            console.error('Error saving pin:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <FiLoader className="w-10 h-10 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <h1 className="text-2xl font-bold">User not found</h1>
                <Link href="/" className="btn-primary">
                    Go back home
                </Link>
            </div>
        );
    }

    const renderContent = () => {
        if (tabLoading) {
            return (
                <div className="flex items-center justify-center py-20">
                    <FiLoader className="w-8 h-8 animate-spin text-[var(--primary)]" />
                </div>
            );
        }

        switch (activeTab) {
            case 'pins':
                return pins.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-xl font-medium mb-2">No pins yet</p>
                        <p className="text-[var(--muted-foreground)]">
                            {isOwnProfile
                                ? 'Create your first pin to get started!'
                                : `${user.username} hasn't created any pins yet.`}
                        </p>
                        {isOwnProfile && (
                            <Link href="/create" className="btn-primary mt-4 inline-block">
                                Create Pin
                            </Link>
                        )}
                    </div>
                ) : (
                    <MasonryGrid>
                        {pins.map((pin) => (
                            <PinCard
                                key={pin._id}
                                pin={pin}
                                onLike={handleLike}
                                onSave={handleSave}
                            />
                        ))}
                    </MasonryGrid>
                );

            case 'saved':
                return savedPins.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-xl font-medium mb-2">No saved pins</p>
                        <p className="text-[var(--muted-foreground)]">
                            {isOwnProfile
                                ? 'Pins you save will appear here.'
                                : `${user.username} hasn't saved any pins yet.`}
                        </p>
                    </div>
                ) : (
                    <MasonryGrid>
                        {savedPins.map((pin) => (
                            <PinCard
                                key={pin._id}
                                pin={pin}
                                onLike={handleLike}
                                onSave={handleSave}
                            />
                        ))}
                    </MasonryGrid>
                );

            case 'following':
                return (user.following || []).length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-xl font-medium mb-2">Not following anyone</p>
                        <p className="text-[var(--muted-foreground)]">
                            {isOwnProfile
                                ? 'Follow other users to see them here.'
                                : `${user.username} isn't following anyone yet.`}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {user.following.map((followedUser) => (
                            <Link
                                key={followedUser._id}
                                href={`/profile/${followedUser.username}`}
                                className="flex items-center gap-3 p-4 bg-[var(--card)] border border-[var(--border)] rounded-xl hover:bg-[var(--card-hover)] transition-colors"
                            >
                                <div className="w-12 h-12 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-medium text-lg overflow-hidden shrink-0">
                                    {followedUser.avatar ? (
                                        <img
                                            src={followedUser.avatar}
                                            alt={followedUser.username}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        followedUser.username.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <span className="font-medium truncate">{followedUser.username}</span>
                            </Link>
                        ))}
                    </div>
                );
        }
    };

    return (
        <div className="max-w-[1800px] mx-auto px-4 py-8">
            {/* Profile Header */}
            <div className="flex flex-col items-center text-center mb-8">
                {/* Avatar */}
                <div className="w-28 h-28 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-4xl font-bold mb-4 overflow-hidden">
                    {user.avatar ? (
                        <img
                            src={user.avatar}
                            alt={user.username}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        user.username.charAt(0).toUpperCase()
                    )}
                </div>

                {/* Username */}
                <h1 className="text-3xl font-bold mb-2">{user.username}</h1>

                {/* Bio */}
                {user.bio && (
                    <p className="text-[var(--muted-foreground)] max-w-md mb-4">{user.bio}</p>
                )}

                {/* Stats */}
                <div className="flex items-center gap-6 mb-6">
                    <div className="text-center">
                        <p className="text-xl font-bold">{pins.length}</p>
                        <p className="text-sm text-[var(--muted-foreground)]">Pins</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xl font-bold">{(user.followers || []).length}</p>
                        <p className="text-sm text-[var(--muted-foreground)]">Followers</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xl font-bold">{(user.following || []).length}</p>
                        <p className="text-sm text-[var(--muted-foreground)]">Following</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    {isOwnProfile ? (
                        <Link href="/profile/edit" className="btn-secondary flex items-center gap-2">
                            <FiSettings className="w-4 h-4" />
                            Edit profile
                        </Link>
                    ) : (
                        <button
                            onClick={handleFollow}
                            className={`px-6 py-2 rounded-full font-medium transition-all ${isFollowing
                                ? 'bg-[var(--secondary)] border border-[var(--border)] hover:bg-[var(--card)]'
                                : 'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]'
                                }`}
                        >
                            {isFollowing ? 'Following' : 'Follow'}
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex justify-center border-b border-[var(--border)] mb-8">
                <button
                    onClick={() => setActiveTab('pins')}
                    className={`tab flex items-center gap-2 ${activeTab === 'pins' ? 'active' : ''}`}
                >
                    <FiGrid className="w-4 h-4" />
                    My Pins
                </button>
                <button
                    onClick={() => setActiveTab('saved')}
                    className={`tab flex items-center gap-2 ${activeTab === 'saved' ? 'active' : ''}`}
                >
                    <FiBookmark className="w-4 h-4" />
                    Saved
                </button>
                <button
                    onClick={() => setActiveTab('following')}
                    className={`tab flex items-center gap-2 ${activeTab === 'following' ? 'active' : ''}`}
                >
                    <FiUsers className="w-4 h-4" />
                    Following
                </button>
            </div>

            {/* Tab Content */}
            {renderContent()}
        </div>
    );
}
