# `%slab` #

A tool for forming and managing syndicates, the building blocks of the web3
economy.

## Install ##

```bash
nvm install 22
nvm use 22
npm install
echo "DATABASE_URL='file:./dev.db'" >> .env
echo "NEXT_PUBLIC_ALCHEMY_KEY='…'" >> .env
npx prisma db push
npm run seed
```

## Build/Develop ##

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see
the result.
