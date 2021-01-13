import html from "./homepage/index.html";
import corecss from "./homepage/cf.core.css";
import logo from "./homepage/logo.svg";

export async function handleHomepageRequest(request) {
  const { pathname } = new URL(request.url);
  switch (pathname) {
    case "/":
      return new Response(html, {
        headers: {
          "content-type": "text/html"
        }
      });
    case "/cf.core.css":
      return new Response(corecss, {
        headers: {
          "content-type": "text/css"
        }
      });
    case "/logo.svg":
      return new Response(logo, {
        headers: {
          "content-type": "image/svg+xml"
        }
      });
    default:
      return new Response("file " + pathname + " not found", { status: 404 });
  }
}
