import { NextResponse } from 'next/server';


const NUMBER_OF_POSTS = 21;
// Mock data generator for posts
const generateMockPosts = (startIndex: number, pageSize: number) => {
    const posts = [];
    const now = new Date();

    for (let i = 0; i < pageSize; i++) {
        const id = startIndex + i;
        posts.push({
            id: id.toString(),
            timestamp: new Date(now.getTime() - i * 3600000).toISOString(),
            imageURL: `https://picsum.photos/seed/${id}/600/400`, // Using a real image placeholder service
            caption: `This is a mock post with ID ${id}. #mockdata #awesome`,
            username: `user${id % 10}`,
            avatar: `https://i.pravatar.cc/40?u=user${id % 10}`, // Using a real avatar placeholder
            likes: Math.floor(Math.random() * 200),
            isLiked: Math.random() > 0.5,
        });
    }
    return posts;
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const startIndex = parseInt(searchParams.get('startIndex') || '0', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '5', 10);

    // Simulate the end of the feed after 25 posts (5 pages)
    if (startIndex > NUMBER_OF_POSTS) {
        return NextResponse.json({
            posts: [],
            nextOffset: -1,
            remainingOffset: 0
        });
    }

    const posts = !(startIndex + pageSize > NUMBER_OF_POSTS) ? generateMockPosts(startIndex, pageSize) : generateMockPosts(startIndex, NUMBER_OF_POSTS-startIndex+1);
    const nextOffset = (startIndex + posts.length > NUMBER_OF_POSTS) ? -1 : startIndex + posts.length;

    // Simulate a network delay for a realistic loading experience
    await new Promise(resolve => setTimeout(resolve, 500));

    return NextResponse.json({
        posts,
        nextOffset,
    });
}