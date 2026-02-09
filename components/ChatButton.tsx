'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { FiMessageCircle, FiX } from 'react-icons/fi';
import ChatModal from './chat/ChatModal';

export default function ChatButton() {
    const { data: session } = useSession();
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!session?.user) return;

        const fetchUnreadCount = async () => {
            try {
                const response = await fetch('/api/conversations');
                if (response.ok) {
                    const conversations = await response.json();
                    const total = conversations.reduce(
                        (sum: number, conv: { unreadCount: number }) => sum + (conv.unreadCount || 0),
                        0
                    );
                    setUnreadCount(total);
                }
            } catch (error) {
                console.error('Error fetching unread count:', error);
            }
        };

        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, [session?.user]);

    if (!session?.user) return null;

    return (
        <>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 hover:bg-[var(--secondary)] rounded-full transition-colors"
            >
                {isOpen ? (
                    <FiX className="w-5 h-5" />
                ) : (
                    <FiMessageCircle className="w-5 h-5" />
                )}
                {unreadCount > 0 && !isOpen && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--primary)] text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <ChatModal
                    onClose={() => setIsOpen(false)}
                    onUnreadChange={setUnreadCount}
                />
            )}
        </>
    );
}
