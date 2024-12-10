"use server";
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from "next/server";

export async function GET(req, res) {
  const tasks = await prisma.task.findMany();
  // return res.status(200).json(tasks);
  return NextResponse.json(tasks, {status: 200});
}

export async function POST(req, res) {
  const { title, description } = await req.json();
  const result = await prisma.task.create({
    data: { title, description },
  });
  // return res.status(201).json({ id: result, title, description });
  return NextResponse.json(result, {status: 201});
}
