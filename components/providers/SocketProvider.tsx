'use client';

import { useSession } from 'next-auth/react';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
    joinConversation: (conversationId: string) => void;
    leaveConversation: (conversationId: string) => void;
    sendMessage: (conversationId: string, message: unknown) => void;
    sendTyping: (conversationId: string) => void;
    stopTyping: (conversationId: string) => void;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
    joinConversation: () => { },
    leaveConversation: () => { },
    sendMessage: () => { },
    sendTyping: () => { },
    stopTyping: () => { },
});

export function useSocket() {
    return useContext(SocketContext);
}

interface SocketProviderProps {
    children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
    const { data: session } = useSession();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!session?.user?.id) return;

        // Initialize socket connection
        const socketInstance = io({
            path: '/api/socket',
            addTrailingSlash: false,
        });

        socketInstance.on('connect', () => {
            setIsConnected(true);
            // Authenticate user
            socketInstance.emit('authenticate', session.user.id);
        });

        socketInstance.on('disconnect', () => {
            setIsConnected(false);
        });

        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
        };
    }, [session?.user?.id]);

    const joinConversation = useCallback((conversationId: string) => {
        socket?.emit('join-conversation', conversationId);
    }, [socket]);

    const leaveConversation = useCallback((conversationId: string) => {
        socket?.emit('leave-conversation', conversationId);
    }, [socket]);

    const sendMessage = useCallback((conversationId: string, message: unknown) => {
        socket?.emit('send-message', { conversationId, message });
    }, [socket]);

    const sendTyping = useCallback((conversationId: string) => {
        if (session?.user) {
            socket?.emit('typing', {
                conversationId,
                userId: session.user.id,
                username: session.user.username,
            });
        }
    }, [socket, session?.user]);

    const stopTyping = useCallback((conversationId: string) => {
        socket?.emit('stop-typing', { conversationId });
    }, [socket]);

    return (
        <SocketContext.Provider value={{
            socket,
            isConnected,
            joinConversation,
            leaveConversation,
            sendMessage,
            sendTyping,
            stopTyping,
        }}>
            {children}
        </SocketContext.Provider>
    );
}
