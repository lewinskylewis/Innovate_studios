import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const port = 4321;
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".pdf": "application/pdf"
};

http
  .createServer(async (request, response) => {
    try {
      let pathname = decodeURIComponent(request.url.split("?")[0]);
      if (pathname === "/") pathname = "/index.html";
      const filePath = normalize(join(root, pathname));

      if (!filePath.startsWith(root)) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
      }

      const data = await readFile(filePath);
      response.writeHead(200, { "content-type": types[extname(filePath).toLowerCase()] || "application/octet-stream" });
      response.end(data);
    } catch {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
    }
  })
  .listen(port, () => {
    console.log(`Preview running at http://localhost:${port}`);
  });
