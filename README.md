<p align="center">
  <img src="https://raw.githubusercontent.com/readmeio/oas/main/.github/hero.png" alt="oas" />
</p>

<p align="center">
  Comprehensive tooling for working with OpenAPI definitions
</p>

<p align="center">
  <a href="https://npm.im/oas"><img src="https://img.shields.io/npm/v/oas.svg?style=for-the-badge" alt="NPM Version"></a>
  <a href="https://npm.im/oas"><img src="https://img.shields.io/node/v/oas.svg?style=for-the-badge" alt="Node Version"></a>
  <a href="https://npm.im/oas"><img src="https://img.shields.io/npm/l/oas.svg?style=for-the-badge" alt="MIT License"></a>
  <a href="https://github.com/readmeio/oas"><img src="https://img.shields.io/github/workflow/status/readmeio/oas/CI.svg?style=for-the-badge" alt="Build status"></a>
</p>

`oas` is the library that we've built at [ReadMe](https://readme.com) for powering everything we do related to [OpenAPI](https://www.openapis.org/); from our [Reference Guides](https://readme.com/documentation), to our [Metrics product](https://readme.com/metrics), or to other in-house tooling like [code generation](https://npm.im/@readme/oas-to-snippet), [request execution](https://npm.im/@readme/oas-to-har), and [SDK code generation](https://api.readme.dev/).

- [Installation](https://api.readme.dev/docs/installation)
- [Usage](https://api.readme.dev/docs/usage)
- [FAQ](#faq)

## Installation

```
npm install oas
```

## Usage

> ℹ️ If you need to use this library within a browser you'll likely need to use a bundler like [Webpack](https://webpack.js.org/) or [Rollup](https://rollupjs.org/).

## FAQ
### Can I create an OpenAPI definition with this?
Though `oas` used to offer functionality related to this it does no longer. If you need an OpenAPI (or Swagger) definition for your API we recommend checking out the language-agnostic [swagger-inline](https://npm.im/swagger-inline), the API editing experience within [ReadMe](https://readme.com), or manually maintaining JSON/YAML files (it sounds worse than it actually is).
