## Contributing to oas

For commits to the `oas` library, roughly follow the same conventions as else where. Create a feature branch, makes some changes, write some tests. When it's all green and reviewed, merge it into `main`.

When you're ready to roll a new `oas` release, you should do the following:

```sh
git checkout main
git pull
npm run build
npm login # Ensure the login worked via `npm whoami`
npm run publish
```

If you run into errors with pushing to the `main` branch when publishing, you'll need to have the **Owner** in the [ReadMe Enterprise Group](https://github.com/orgs/readmeio/people) on Github.
