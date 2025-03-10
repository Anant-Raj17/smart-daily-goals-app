import { NextResponse } from "next/server";

export async function POST(req: Request) {
  return NextResponse.json(
    { 
      error: "This endpoint is not currently in use",
      message: "OpenAI transcription functionality is disabled in this version"
    },
    { status: 501 }
  );
}
