# Releasing packages

Every change to `@bounty-ai/agent-sdk` or `@bounty-ai/flue` that should reach
npm needs a Changeset:

```bash
pnpm changeset
```

After the change reaches `main`, the **Version packages** workflow opens or
updates a draft pull request containing the version and changelog changes.
Review and merge that pull request normally.

GitHub Actions must be allowed to create pull requests in the repository
settings. The workflow uses the built-in token by default. Set
`RELEASE_GITHUB_TOKEN` to a bot or GitHub App token if version pull requests
must trigger the normal pull-request CI automatically.

Publishing is separate and always manual. Run the **Publish packages** workflow
from `main`. It defaults to a dry run. Turn off **dry_run** only when the package
contents and versions are ready. Releases use the npm `beta` tag, so they do not
replace `latest`.

The packages remain pre-1.0 while their public interfaces settle. Changesets is
in `beta` prerelease mode, so version pull requests continue the prerelease
sequence instead of promoting a package to a stable release. Leave prerelease
mode only when the packages are ready for stable versions.

The publish job is attached to the `npm` GitHub environment. Configure that
environment with required reviewer approval before the first release.

## npm authentication

`@bounty-ai/agent-sdk` already exists on npm and can use trusted publishing now.
Configure its npm trusted publisher with:

- GitHub owner: `trybounty-ai`
- Repository: `bounty-agent-sdk`
- Workflow: `publish.yml`
- Environment: `npm`
- Allowed action: `npm publish`

An npm package must exist before trusted publishing can be configured.
`@bounty-ai/flue` therefore needs a one-time bootstrap release using an npm
automation token stored as the `NPM_TOKEN` environment secret. After that first
release, configure the same trusted publisher for Flue and remove the token.

The workflow publishes through the npm CLI, which supports OIDC and automatic
provenance. pnpm is still used to create each tarball so workspace dependency
ranges are converted correctly before publication.
