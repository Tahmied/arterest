import 'next-auth';

declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            username: string;
            email: string;
            avatar?: string;
        };
    }

    interface User {
        id: string;
        username: string;
        avatar?: string;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id: string;
        username: string;
        avatar?: string;
    }
}
