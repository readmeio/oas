# Maintainers Guide
## Release prep

* [ ] All tests are should be passing (duh!).
* [ ] `npm audit` should be returning a clean bill of health.

## Publishing

1. Make sure that you're up to date with the latest changes in `main`.
    * Also make sure your tags are up to date but `git fetch` should handle this automatically.
2. Bump the version manually in `package.json`
    * We follow semver so: bug fixes get a point release (`*.*.x`), new non-breaking methods or additions get a minor release (`*.x.0`), and all breaking changes get a major release (`x.*.*`).
3. Run `npm run release` to update the changelog.
4. Commit both the package and changelog changes to a new commit with the message: `build: <new version> release`
5. Push changes up.
6. Create a new tag for this release.
    * `git tag <version> -m '<version>'`
    * `git push origin main --tags`
7. `npm publish`
    * If this doesn't run `npm run build` or you don't see any Webpack output while this is happening then something bad happened and you should debug and issue a new release.
