'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';
import { FiSend } from 'react-icons/fi';
import { useSocket } from '../providers/SocketProvider';

interface Participant {
    _id: string;
    username: string;
    avatar?: string;
}

interface Message {
    _id: string;
    sender: Participant;
    content: string;
    createdAt: string;
}

interface Conversation {
    _id: string;
    participants: Participant[];
}

interface ChatWindowProps {
    conversation: Conversation;
    onMessageSent: () => void;
}

export default function ChatWindow({ conversation, onMessageSent }: ChatWindowProps) {
    const { data: session } = useSession();
    const { socket, isConnected, joinConversation, leaveConversation } = useSocket();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [typingUser, setTypingUser] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Fetch initial messages
    useEffect(() => {
        const fetchMessages = async () => {
            try {
                const response = await fetch(`/api/conversations/${conversation._id}/messages`);
                if (response.ok) {
                    const data = await response.json();
                    setMessages(data);
                }
            } catch (error) {
                console.error('Error fetching messages:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchMessages();
        inputRef.current?.focus();
    }, [conversation._id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Join/leave conversation room via WebSocket
    useEffect(() => {
        if (!isConnected) return;

        joinConversation(conversation._id);

        return () => {
            leaveConversation(conversation._id);
        };
    }, [isConnected, conversation._id, joinConversation, leaveConversation]);

    // Listen for real-time messages
    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (message: Message) => {
            if (!message || !message._id) {
                console.error('Received invalid message:', message);
                return;
            }

            setMessages((prev) => {
                // Use Map for O(1) lookup and guaranteed uniqueness
                const messageMap = new Map(prev.map(m => [m._id, m]));

                // Add new message (will overwrite if exists, preventing duplicates)
                messageMap.set(message._id, message);

                return Array.from(messageMap.values()).sort(
                    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                );
            });
            onMessageSent();
        };

        const handleTyping = (data: { username: string }) => {
            setTypingUser(data.username);
            // Clear typing after 3 seconds
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            typingTimeoutRef.current = setTimeout(() => {
                setTypingUser(null);
            }, 3000);
        };

        const handleStopTyping = () => {
            setTypingUser(null);
        };

        socket.on('new-message', handleNewMessage);
        socket.on('user-typing', handleTyping);
        socket.on('user-stop-typing', handleStopTyping);

        return () => {
            socket.off('new-message', handleNewMessage);
            socket.off('user-typing', handleTyping);
            socket.off('user-stop-typing', handleStopTyping);
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, [socket, onMessageSent]);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;

        const content = newMessage.trim();
        setNewMessage('');
        setSending(true);

        // Optimistic update
        const optimisticMessage: Message = {
            _id: `temp-${Date.now()}`,
            sender: {
                _id: session?.user?.id || '',
                username: session?.user?.username || '',
                avatar: session?.user?.avatar,
            },
            content,
            createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, optimisticMessage]);

        try {
            const response = await fetch(`/api/conversations/${conversation._id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content }),
            });

            if (response.ok) {
                const sentMessage = await response.json();

                if (!sentMessage || !sentMessage._id) {
                    throw new Error('Invalid response from server');
                }

                // Replace optimistic message with real one and deduplicate
                setMessages((prev) => {
                    const messageMap = new Map(prev.map(m => [m._id, m]));

                    // Remove optimistic message
                    messageMap.delete(optimisticMessage._id);

                    // Add real message (will overwrite if exists)
                    messageMap.set(sentMessage._id, sentMessage);

                    // Convert back to array and sort by date
                    return Array.from(messageMap.values()).sort(
                        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                    );
                });

                onMessageSent();
            }
        } catch (error) {
            console.error('Error sending message:', error);
            // Remove optimistic message on error
            setMessages((prev) => prev.filter((m) => m._id !== optimisticMessage._id));
        } finally {
            setSending(false);
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex flex-col flex-1 min-h-0">
            {/* Connection indicator */}
            {isConnected && (
                <div className="px-4 py-1 bg-green-500/10 text-green-500 text-xs text-center">
                    ● Live
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loading ? (
                    <p className="text-center text-[var(--muted-foreground)]">Loading messages...</p>
                ) : messages.length === 0 ? (
                    <p className="text-center text-[var(--muted-foreground)]">
                        No messages yet. Say hi! 👋
                    </p>
                ) : (
                    messages.map((message) => {
                        const isOwn = message.sender._id === session?.user?.id;
                        return (
                            <div
                                key={message._id}
                                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[75%] rounded-2xl px-4 py-2 ${isOwn
                                        ? 'bg-[var(--primary)] text-white rounded-br-sm'
                                        : 'bg-[var(--secondary)] rounded-bl-sm'
                                        }`}
                                >
                                    <p className="break-words">{message.content}</p>
                                    <p
                                        className={`text-xs mt-1 ${isOwn ? 'text-white/70' : 'text-[var(--muted-foreground)]'
                                            }`}
                                    >
                                        {formatTime(message.createdAt)}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
                {typingUser && (
                    <div className="text-sm text-[var(--muted-foreground)] italic">
                        {typingUser} is typing...
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="p-4 border-t border-[var(--border)]">
                <div className="flex gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 bg-[var(--secondary)] rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className="p-3 bg-[var(--primary)] text-white rounded-full hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50"
                    >
                        <FiSend className="w-5 h-5" />
                    </button>
                </div>
            </form>
        </div>
    );
}
