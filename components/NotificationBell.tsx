'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { FiBell, FiHeart, FiMessageCircle, FiUserPlus, FiX } from 'react-icons/fi';
import { useSocket } from './providers/SocketProvider';

interface Notification {
    _id: string;
    sender: {
        _id: string;
        username: string;
        avatar?: string;
    };
    type: 'like' | 'comment' | 'follow' | 'save';
    pin?: {
        _id: string;
        title: string;
        imageUrl: string;
    };
    comment?: string;
    read: boolean;
    createdAt: string;
}

export default function NotificationBell() {
    const { socket, isConnected } = useSocket();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const fetchNotifications = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/notifications?limit=10');
            if (response.ok) {
                const data = await response.json();
                setNotifications(data.notifications || []);
                setUnreadCount(data.unreadCount || 0);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Listen for real-time notifications via WebSocket
    useEffect(() => {
        if (!socket || !isConnected) return;

        const handleNewNotification = (notification: Notification) => {
            setNotifications((prev) => {
                if (prev.some((n) => n._id === notification._id)) {
                    return prev;
                }
                return [notification, ...prev];
            });
            setUnreadCount((prev) => prev + 1);
        };

        socket.on('new-notification', handleNewNotification);

        return () => {
            socket.off('new-notification', handleNewNotification);
        };
    }, [socket, isConnected]);

    const markAllAsRead = async () => {
        try {
            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ markAllRead: true }),
            });
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking notifications as read:', error);
        }
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'like':
                return <FiHeart className="w-4 h-4 text-red-500" />;
            case 'comment':
                return <FiMessageCircle className="w-4 h-4 text-blue-500" />;
            case 'follow':
                return <FiUserPlus className="w-4 h-4 text-green-500" />;
            default:
                return <FiBell className="w-4 h-4" />;
        }
    };

    const getNotificationText = (notification: Notification) => {
        switch (notification.type) {
            case 'like':
                return `liked your pin "${notification.pin?.title || 'a pin'}"`;
            case 'comment':
                return `commented on your pin`;
            case 'follow':
                return `started following you`;
            case 'save':
                return `saved your pin`;
            default:
                return 'interacted with your content';
        }
    };

    const getNotificationLink = (notification: Notification) => {
        if (notification.type === 'follow') {
            return `/profile/${notification.sender.username}`;
        }
        if (notification.pin) {
            return `/pin/${notification.pin._id}`;
        }
        return '#';
    };

    const timeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
        return `${Math.floor(seconds / 86400)}d`;
    };

    return (
        <div className="relative">
            <button
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen) fetchNotifications();
                }}
                className="relative p-2 hover:bg-[var(--secondary)] rounded-full transition-colors"
            >
                <FiBell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--destructive)] text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Dropdown */}
                    <div className="absolute right-0 top-full mt-2 w-80 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl z-50 max-h-[400px] overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold">Notifications</h3>
                                {isConnected && (
                                    <span className="w-2 h-2 bg-green-500 rounded-full" title="Live" />
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        className="text-xs text-[var(--primary)] hover:underline"
                                    >
                                        Mark all read
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1 hover:bg-[var(--secondary)] rounded-full"
                                >
                                    <FiX className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Notifications List */}
                        <div className="overflow-y-auto max-h-[320px]">
                            {loading && notifications.length === 0 ? (
                                <div className="p-8 text-center text-[var(--muted-foreground)]">
                                    Loading...
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="p-8 text-center text-[var(--muted-foreground)]">
                                    No notifications yet
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <Link
                                        key={notification._id}
                                        href={getNotificationLink(notification)}
                                        onClick={() => setIsOpen(false)}
                                        className={`flex items-start gap-3 p-4 hover:bg-[var(--card-hover)] transition-colors ${!notification.read ? 'bg-[var(--primary)]/5' : ''
                                            }`}
                                    >
                                        {/* Sender Avatar */}
                                        <div className="w-10 h-10 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-sm font-medium overflow-hidden shrink-0">
                                            {notification.sender.avatar ? (
                                                <img
                                                    src={notification.sender.avatar}
                                                    alt={notification.sender.username}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                notification.sender.username?.charAt(0).toUpperCase()
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm">
                                                <span className="font-medium">{notification.sender.username}</span>{' '}
                                                {getNotificationText(notification)}
                                            </p>
                                            <p className="text-xs text-[var(--muted-foreground)] mt-1">
                                                {timeAgo(notification.createdAt)}
                                            </p>
                                        </div>

                                        {/* Icon */}
                                        <div className="shrink-0">
                                            {getNotificationIcon(notification.type)}
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
