import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const text = await req.text();
    fs.writeFileSync(path.join(process.cwd(), 'scratch', 'debug_output.json'), text);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false });
  }
}
