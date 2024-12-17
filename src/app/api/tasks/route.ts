"use server";
import { prisma } from '@/dat/prisma';
import { NextRequest, NextResponse } from "next/server";

// NOTE: This is Nextjs v13+ "route handler" syntax
// https://nextjs.org/docs/app/building-your-application/routing/route-handlers

export async function GET(req: Request): Promise<Response> {
  const tasks = await prisma.task.findMany();
  return NextResponse.json(tasks, {status: 200});
}

export async function POST(req: Request): Promise<Response> {
  const { title, description } = await req.json();
  const result = await prisma.task.create({
    data: { title, description },
  });
  return NextResponse.json(result, {status: 201});
}
