<h1 align="center">
    <a href="https://cdnjs.com"><img src="https://raw.githubusercontent.com/cdnjs/brand/master/logo/standard/dark-512.png" width="175px" alt="< cdnjs >"></a>
</h1>

<h3 align="center">The #1 free and open source CDN built to make life easier for developers.</h3>

---

## Introduction

This is the code that runs behind cdnjs.cloudflare.com, implemented as a worker.

The [cdnjs bot] pushes the new files into a KV namespace that is bound to the worker.

## Contributing

### KV namespaces

- `CDNJS_FILES`: All ~7M cdnjs files in compressed forms.

While most are compressed with both gzip and brotli forms, some file types are left uncompressed like .woff2. The uncompressed file types can be found here with the compressed: false property.

Since Workers KV has a 25MiB limit, and not all files can be compressed to this limit (ex. some .png images here)—some files will not exist in KV and will be fetched from the origin in PDX.

This will eventually replace cdnjs/cdnjs.


### Deployement

Deployement and testing is managed by Cloudflare for now.

## License

Each library hosted on cdnjs is released under its own license. This cdnjs repository is published under [MIT license](LICENSE).

[cdnjs bot]: https://github.com/cdnjs/tools
