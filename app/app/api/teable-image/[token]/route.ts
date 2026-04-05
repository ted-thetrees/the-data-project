export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const upstream = await fetch(
    `https://teable.ifnotfor.com/api/attachments/read/private/table/${token}`
  );
  if (!upstream.ok) {
    return new Response(null, { status: upstream.status });
  }
  const body = upstream.body;
  const contentType = upstream.headers.get("content-type") || "image/png";
  return new Response(body, {
    headers: {
      "Content-Type": contentType === "application/octet-stream" ? "image/png" : contentType,
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
