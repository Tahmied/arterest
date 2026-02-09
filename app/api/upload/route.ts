import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { mkdir, writeFile } from 'fs/promises';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json(
                { error: 'You must be logged in to upload files' },
                { status: 401 }
            );
        }

        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const type = formData.get('type') as string; // 'pin' or 'avatar'

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            return NextResponse.json(
                { error: 'Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.' },
                { status: 400 }
            );
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            return NextResponse.json(
                { error: 'File too large. Maximum size is 10MB.' },
                { status: 400 }
            );
        }

        // Determine upload directory
        const uploadDir = type === 'avatar' ? 'public/uploads/dp' : 'public/uploads/pins';
        const fullUploadPath = path.join(process.cwd(), uploadDir);

        // Ensure directory exists
        await mkdir(fullUploadPath, { recursive: true });

        // Generate unique filename
        const ext = file.name.split('.').pop() || 'jpg';
        const filename = `${uuidv4()}.${ext}`;
        const filepath = path.join(fullUploadPath, filename);

        // Convert file to buffer and save
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filepath, buffer);

        // Return the public URL path
        const publicPath = `/${uploadDir.replace('public/', '')}/${filename}`;

        return NextResponse.json({
            url: publicPath,
            filename,
        });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: 'Failed to upload file' },
            { status: 500 }
        );
    }
}
