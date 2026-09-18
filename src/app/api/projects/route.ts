import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const projects = await db.project.findMany({
      include: {
        audits: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        connections: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ projects });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, domain } = body;

    if (!name || !domain) {
      return NextResponse.json({ error: "name and domain are required" }, { status: 400 });
    }

    let org = await db.organization.findFirst();
    if (!org) {
      org = await db.organization.create({
        data: { name: "Default Organization", slug: "default-org" },
      });
    }

    const project = await db.project.create({
      data: {
        name,
        domain: domain.replace(/^https?:\/\//, "").replace(/\/$/, ""),
        organizationId: org.id,
      },
    });

    return NextResponse.json({ project });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
