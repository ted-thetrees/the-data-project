import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { updateMindMapNodeImage } from "@/app/lib/mindmap";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const passphrase = formData.get("passphrase") as string | null;

  if (!file || !passphrase) {
    return Response.json({ error: "file and passphrase required" }, { status: 400 });
  }

  const slug = passphrase.replace(/\s+/g, "-");
  const ext = file.name.split(".").pop() || "jpeg";
  const filename = `${slug}.${ext}`;

  const dir = path.join(process.cwd(), "public", "mindmap");
  await mkdir(dir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = path.join(dir, filename);
  await writeFile(filePath, buffer);

  const publicPath = `/mindmap/${filename}?t=${Date.now()}`;
  await updateMindMapNodeImage(passphrase, publicPath);

  return Response.json({ image: publicPath });
}
