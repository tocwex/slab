# `%slab`

A tool for forming and managing syndicates, the building blocks of the web3
economy.

## Build/Develop

All commands assume that the current working directory is this repository's
base directory and use [durploy] to streamline various Urbit development
workflows.

### First-time Setup

The following commands should be executed after each fresh clone of the project
to set up the [Vite] and the UI development environment:

```bash
nvm install 22
nvm use 22
cd ./ui
npm install
echo "VITE_SHIP_URL=http://127.0.0.1:8080" >> .env.local
echo "VITE_ALCHEMY_KEY=…" >> .env.local
```

Subsequently, run the following commands to download [durploy] create a new
[fake `~zod`][fakezod] with the `%slab` desk:

```bash
curl -LO https://raw.githubusercontent.com/sidnym-ladrut/durploy/release/durploy
chmod u+x ./durploy
./durploy ship zod
# In a different terminal:
./durploy desk zod slab ./desk/full/
```

### Development Workflows

#### Back-end Workflows

In order to continuously test back-end code changes as they're made, run the
following commands:

```bash
./durploy desk -w zod slab ./desk/full/
```

#### Front-end Workflows

In order to continuously test front-end code changes as they're made, run the
following commands:

```bash
cd ./ui
npm run dev
```

Also, be sure to authenticate via both the NPM web portal (default:
`127.0.0.1:3000`) and the development ship's web portal ([fake `~zod`][fakezod]
default: `127.0.0.1:8080`) using the output of the Urbit `+code` command as
the password.

### Deployment Workflow

#### Back-end Workflows

To generate a new full desk from the existing base desk, run the following
command:

```bash
./meta/exec/regen
```

#### Front-end Workflows

In order to test the web package deployment process for the current
front-end build, run the following commands:

```bash
cd ./ui
npm run build
cd ..
./durploy desk -g zod slab ./ui/dist
cp "$(ls -dtr1 "${XDG_CACHE_HOME:-$HOME/.cache}/durploy/glob"/* | tail -1)" ./meta/glob
./meta/exec/release -l 1.2.3 "$(ls -dtr1 ./meta/glob/* | tail -1)"
./durploy desk zod slab ./desk/full/
# run this in zod's dojo to make sure the new glob is being used
# :docket [%kick %slab]
```


[urbit]: https://urbit.org
[durploy]: https://github.com/sidnym-ladrut/durploy

[fakezod]: https://developers.urbit.org/guides/core/environment#development-ships
[react]: https://reactjs.org/
[tailwind css]: https://tailwindcss.com/
[vite]: https://vitejs.dev/
