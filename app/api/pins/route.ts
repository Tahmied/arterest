import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Pin from '@/models/Pin';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

// GET all pins with optional filters
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        // Build query
        const query: Record<string, unknown> = {};

        if (category && category !== 'For You') {
            query.category = category;
        }

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
            ];
        }

        const pins = await Pin.find(query)
            .populate('creator', 'username avatar')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Pin.countDocuments(query);

        return NextResponse.json({
            pins,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching pins:', error);
        return NextResponse.json(
            { error: 'Failed to fetch pins' },
            { status: 500 }
        );
    }
}

// POST create a new pin
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { title, description, imageUrl, category } = await request.json();

        if (!title || !imageUrl) {
            return NextResponse.json(
                { error: 'Title and image URL are required' },
                { status: 400 }
            );
        }

        await connectDB();

        const pin = await Pin.create({
            title,
            description: description || '',
            imageUrl,
            category: category || 'For You',
            creator: session.user.id,
            likes: [],
            saves: [],
        });

        const populatedPin = await Pin.findById(pin._id)
            .populate('creator', 'username avatar')
            .lean();

        return NextResponse.json(populatedPin, { status: 201 });
    } catch (error) {
        console.error('Error creating pin:', error);
        return NextResponse.json(
            { error: 'Failed to create pin' },
            { status: 500 }
        );
    }
}
