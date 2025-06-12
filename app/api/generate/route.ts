import { NextResponse } from "next/server";
import { insertGeneratedData } from "@/app/lib/db";

// Mock data for now - we'll replace this with actual Twitter scraping later
const mockTweets = [
  {
    id: "1",
    author: "user1",
    content: "This is a test tweet about #testing",
    timestamp: new Date(),
    metadata: { likes: 10, retweets: 2 },
  },
  {
    id: "2",
    author: "user2",
    content: "Another test tweet with #testing hashtag",
    timestamp: new Date(),
    metadata: { likes: 5, retweets: 1 },
  },
];

export async function POST(request: Request) {
  try {
    const { topic } = await request.json();

    // Mock response for now
    const tweets = mockTweets.map((tweet) => ({
      topic,
      platform: "twitter",
      source_id: tweet.id,
      author: tweet.author,
      content: tweet.content,
      timestamp: tweet.timestamp,
      metadata: tweet.metadata,
    }));

    // Insert into database
    const results = await Promise.all(
      tweets.map((tweet) => insertGeneratedData(tweet))
    );

    return NextResponse.json({
      success: true,
      data: results.map((r) => r.rows[0]),
    });
  } catch (error) {
    console.error("Error generating dataset:", error);
    return NextResponse.json(
      { error: "Failed to generate dataset" },
      { status: 500 }
    );
  }
}
