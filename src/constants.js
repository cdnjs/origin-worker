export const SWF_XSS_REGEX = ".swf[?].*(=&|[(){}])";

// Aliases to libraries.
// We no longer accept library symlinks in cdnjs, so this
// list will not change.
//
// Found using: `find $BOT_BASE_PATH/cdnjs/ajax/libs/ -maxdepth 1 -type l -ls`
export const ALIASES = {
  pie: "css3pie",
  zocial: "css-social-buttons",
  "angular-morris-chart": "angular-morris",
  "bower-angular-translate": "angular-translate",
  "fine-uploader": "file-uploader",
  "bower-angular-translate-loader-partial": "angular-translate-loader-partial",
  "bower-angular-translate-loader-url": "angular-translate-loader-url",
  "bower-angular-translate-loader-static-files":
    "angular-translate-loader-static-files",
  nicescroll: "jquery.nicescroll"
};

// Supported file extensions.
export const EXTS = {
  js: { cors: true, compressed: true, content_type: "application/javascript" },
  css: { cors: true, compressed: true, content_type: "text/css" },
  png: { cors: true, compressed: true, content_type: "image/png" },
  gif: { cors: true, compressed: true, content_type: "image/gif" },
  jpg: { cors: true, compressed: true, content_type: "image/jpeg" },
  jpeg: { cors: true, compressed: true, content_type: "image/jpeg" },
  swf: {
    cors: false,
    compressed: true,
    content_type: "application/x-shockwave-flash"
  },
  svg: { cors: true, compressed: true, content_type: "image/svg+xml" },
  ttf: {
    cors: true,
    compressed: true,
    content_type: "application/octet-stream"
  },
  eot: {
    cors: true,
    compressed: true,
    content_type: "application/octet-stream"
  },
  woff: {
    cors: true,
    compressed: true,
    content_type: "application/octet-stream"
  },
  woff2: {
    cors: true,
    compressed: false,
    content_type: "application/octet-stream"
  },
  otf: {
    cors: true,
    compressed: true,
    content_type: "application/octet-stream"
  },
  map: {
    cors: true,
    compressed: true,
    content_type: "application/octet-stream"
  },
  cur: {
    cors: true,
    compressed: true,
    content_type: "application/octet-stream"
  },
  mp3: { cors: true, compressed: true, content_type: "audio/mpeg" },
  ogg: { cors: true, compressed: true, content_type: "audio/ogg" },
  aac: {
    cors: true,
    compressed: true,
    content_type: "application/octet-stream"
  },
  scss: {
    cors: true,
    compressed: true,
    content_type: "application/octet-stream"
  },
  webp: { cors: true, compressed: true, content_type: "image/webp" },
  json: { cors: true, compressed: true, content_type: "application/json" },
  wasm: { cors: true, compressed: true, content_type: "application/wasm" },
  ts: {
    cors: true,
    compressed: true,
    content_type: "application/octet-stream"
  },
  hpb: {
    cors: true,
    compressed: true,
    content_type: "application/octet-stream"
  },
  lang: {
    cors: true,
    compressed: true,
    content_type: "application/octet-stream"
  },
  mjs: { cors: true, compressed: true, content_type: "application/javascript" },
  avif: { cors: true, compressed: true, content_type: "image/avif" }
};
