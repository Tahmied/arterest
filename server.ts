import { createServer } from 'http';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { parse } from 'url';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Store connected users
const connectedUsers = new Map<string, string>(); // socketId -> userId

app.prepare().then(() => {
    const httpServer = createServer((req, res) => {
        const parsedUrl = parse(req.url!, true);
        handle(req, res, parsedUrl);
    });

    const io = new SocketIOServer(httpServer, {
        path: '/api/socket',
        addTrailingSlash: false,
        cors: {
            origin: dev ? 'http://localhost:3000' : process.env.NEXT_PUBLIC_APP_URL,
            methods: ['GET', 'POST'],
        },
    });

    // Make io accessible globally for API routes
    (global as typeof globalThis & { io: SocketIOServer }).io = io;

    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);

        // User authentication
        socket.on('authenticate', (userId: string) => {
            connectedUsers.set(socket.id, userId);
            socket.join(`user:${userId}`);
            console.log(`User ${userId} authenticated`);
        });

        // Join conversation room
        socket.on('join-conversation', (conversationId: string) => {
            socket.join(`conversation:${conversationId}`);
            console.log(`Socket ${socket.id} joined conversation:${conversationId}`);
        });

        // Leave conversation room
        socket.on('leave-conversation', (conversationId: string) => {
            socket.leave(`conversation:${conversationId}`);
        });

        // Handle new message
        socket.on('send-message', (data: { conversationId: string; message: unknown }) => {
            // Broadcast to all in the conversation except sender
            socket.to(`conversation:${data.conversationId}`).emit('new-message', data.message);
        });

        // Handle typing indicator
        socket.on('typing', (data: { conversationId: string; userId: string; username: string }) => {
            socket.to(`conversation:${data.conversationId}`).emit('user-typing', {
                userId: data.userId,
                username: data.username,
            });
        });

        socket.on('stop-typing', (data: { conversationId: string }) => {
            socket.to(`conversation:${data.conversationId}`).emit('user-stop-typing');
        });

        socket.on('disconnect', () => {
            const userId = connectedUsers.get(socket.id);
            if (userId) {
                connectedUsers.delete(socket.id);
                console.log(`User ${userId} disconnected`);
            }
        });
    });

    httpServer.listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
        console.log('> WebSocket server initialized');
    });
});

export { };

