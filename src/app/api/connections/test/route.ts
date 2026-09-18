import { NextRequest, NextResponse } from "next/server";
import { FtpAdapter } from "@/lib/adapters/ftp-adapter";
import { validateTargetUrl } from "@/lib/security/ssrf";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { host, port, username, password, remoteDir } = body;

    if (!host || !username) {
      return NextResponse.json(
        { ok: false, error: "Host and username are required." },
        { status: 400 }
      );
    }

    // SSRF validation for remote host
    try {
      await validateTargetUrl(`http://${host}`);
    } catch (err: any) {
      if (err.name === "SsrfSecurityError") {
        return NextResponse.json(
          { ok: false, error: `Security check: ${err.message}` },
          { status: 403 }
        );
      }
    }

    const adapter = new FtpAdapter({
      adapterType: "static_sftp",
      publicUrl: `http://${host}`,
      allowedRoot: remoteDir || "/htdocs",
      credentials: {
        host,
        port: port ? parseInt(port, 10) : 21,
        username,
        password: password || "",
      },
    });

    const testResult = await adapter.testConnection();

    return NextResponse.json(testResult);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to test connection." },
      { status: 500 }
    );
  }
}
