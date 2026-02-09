'use client';

import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import { FiArrowLeft, FiSearch, FiX } from 'react-icons/fi';
import ChatWindow from './ChatWindow';

interface Participant {
    _id: string;
    username: string;
    avatar?: string;
}

interface Conversation {
    _id: string;
    participants: Participant[];
    lastMessageText?: string;
    lastMessageAt?: string;
    unreadCount: number;
}

interface ChatModalProps {
    onClose: () => void;
    onUnreadChange: (count: number) => void;
}

export default function ChatModal({ onClose, onUnreadChange }: ChatModalProps) {
    const { data: session } = useSession();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Participant[]>([]);
    const [searching, setSearching] = useState(false);

    const fetchConversations = useCallback(async () => {
        try {
            const response = await fetch('/api/conversations');
            if (response.ok) {
                const data = await response.json();

                // Deduplicate conversations
                setConversations((prev) => {
                    const convMap = new Map(prev.map(c => [c._id, c]));
                    data.forEach((c: Conversation) => convMap.set(c._id, c));
                    return Array.from(convMap.values());
                });

                const total = data.reduce(
                    (sum: number, conv: Conversation) => sum + (conv.unreadCount || 0),
                    0
                );
                onUnreadChange(total);
            }
        } catch (error) {
            console.error('Error fetching conversations:', error);
        } finally {
            setLoading(false);
        }
    }, [onUnreadChange]);

    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    const searchUsers = async (query: string) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        setSearching(true);
        try {
            const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
            if (response.ok) {
                const data = await response.json();
                // Filter out current user
                setSearchResults(data.filter((u: Participant) => u._id !== session?.user?.id));
            }
        } catch (error) {
            console.error('Error searching users:', error);
        } finally {
            setSearching(false);
        }
    };

    useEffect(() => {
        const debounce = setTimeout(() => {
            searchUsers(searchQuery);
        }, 300);
        return () => clearTimeout(debounce);
    }, [searchQuery]);

    const startConversation = async (participant: Participant) => {
        try {
            const response = await fetch('/api/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ participantId: participant._id }),
            });

            if (response.ok) {
                const conversation = await response.json();
                setSelectedConversation(conversation);
                setSearchQuery('');
                setSearchResults([]);
                fetchConversations();
            }
        } catch (error) {
            console.error('Error starting conversation:', error);
        }
    };

    const getOtherParticipant = (conversation: Conversation): Participant | undefined => {
        return conversation.participants.find((p) => p._id !== session?.user?.id);
    };

    const timeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (seconds < 60) return 'now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
        return `${Math.floor(seconds / 86400)}d`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg h-[600px] max-h-[80vh] bg-[var(--card)] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 p-4 border-b border-[var(--border)]">
                    {selectedConversation ? (
                        <>
                            <button
                                onClick={() => setSelectedConversation(null)}
                                className="p-2 hover:bg-[var(--secondary)] rounded-full transition-colors"
                            >
                                <FiArrowLeft className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-3 flex-1">
                                <div className="w-10 h-10 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-medium overflow-hidden">
                                    {getOtherParticipant(selectedConversation)?.avatar ? (
                                        <img
                                            src={getOtherParticipant(selectedConversation)?.avatar}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        getOtherParticipant(selectedConversation)?.username?.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <span className="font-semibold">
                                    {getOtherParticipant(selectedConversation)?.username}
                                </span>
                            </div>
                        </>
                    ) : (
                        <>
                            <h2 className="text-lg font-semibold flex-1">Messages</h2>
                        </>
                    )}
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-[var(--secondary)] rounded-full transition-colors"
                    >
                        <FiX className="w-5 h-5" />
                    </button>
                </div>

                {selectedConversation ? (
                    <ChatWindow
                        conversation={selectedConversation}
                        onMessageSent={fetchConversations}
                    />
                ) : (
                    <>
                        {/* Search */}
                        <div className="p-4 border-b border-[var(--border)]">
                            <div className="relative">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Search users..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-[var(--secondary)] rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                />
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto">
                            {searchQuery ? (
                                // Search Results
                                <div className="p-2">
                                    {searching ? (
                                        <p className="text-center text-[var(--muted-foreground)] py-4">
                                            Searching...
                                        </p>
                                    ) : searchResults.length === 0 ? (
                                        <p className="text-center text-[var(--muted-foreground)] py-4">
                                            No users found
                                        </p>
                                    ) : (
                                        searchResults.map((user) => (
                                            <button
                                                key={user._id}
                                                onClick={() => startConversation(user)}
                                                className="w-full flex items-center gap-3 p-3 hover:bg-[var(--card-hover)] rounded-xl transition-colors"
                                            >
                                                <div className="w-12 h-12 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-medium overflow-hidden">
                                                    {user.avatar ? (
                                                        <img
                                                            src={user.avatar}
                                                            alt=""
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        user.username?.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <span className="font-medium">{user.username}</span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            ) : (
                                // Conversations List
                                <div className="p-2">
                                    {loading ? (
                                        <p className="text-center text-[var(--muted-foreground)] py-4">
                                            Loading...
                                        </p>
                                    ) : conversations.length === 0 ? (
                                        <p className="text-center text-[var(--muted-foreground)] py-8">
                                            No conversations yet.<br />
                                            Search for users to start chatting!
                                        </p>
                                    ) : (
                                        conversations.map((conv) => {
                                            const other = getOtherParticipant(conv);
                                            return (
                                                <button
                                                    key={conv._id}
                                                    onClick={() => setSelectedConversation(conv)}
                                                    className="w-full flex items-center gap-3 p-3 hover:bg-[var(--card-hover)] rounded-xl transition-colors"
                                                >
                                                    <div className="relative">
                                                        <div className="w-12 h-12 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-medium overflow-hidden">
                                                            {other?.avatar ? (
                                                                <img
                                                                    src={other.avatar}
                                                                    alt=""
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                other?.username?.charAt(0).toUpperCase()
                                                            )}
                                                        </div>
                                                        {conv.unreadCount > 0 && (
                                                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--primary)] text-white text-xs font-bold rounded-full flex items-center justify-center">
                                                                {conv.unreadCount}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 text-left min-w-0">
                                                        <p className="font-medium">{other?.username}</p>
                                                        {conv.lastMessageText && (
                                                            <p className="text-sm text-[var(--muted-foreground)] truncate">
                                                                {conv.lastMessageText}
                                                            </p>
                                                        )}
                                                    </div>
                                                    {conv.lastMessageAt && (
                                                        <span className="text-xs text-[var(--muted-foreground)]">
                                                            {timeAgo(conv.lastMessageAt)}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
