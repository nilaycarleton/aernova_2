This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Photogrammetry Worker

The Phase 6 drone pipeline can queue real ODM processing through a NodeODM worker.
Without `NODEODM_URL`, the app keeps using the built-in draft model package for local demos.
Legacy `NODEODX_*` variables are still accepted as fallbacks.

```bash
NODEODM_URL=http://127.0.0.1:3000
NODEODM_TOKEN=
```

Optional worker options can be supplied as JSON:

```bash
NODEODM_OPTIONS_JSON='[{"name":"gltf","value":true},{"name":"dsm","value":true},{"name":"dtm","value":true},{"name":"pc-quality","value":"high"}]'
```

When a worker is configured, “Process 3D Model” uploads the project imagery to NodeODM,
stores the NodeODM task UUID on the `MODEL` imagery record, and the “Sync worker” action
refreshes task state. Completed tasks expose the full ODM archive plus individual mesh,
point cloud, orthomosaic, DEM, and report downloads through the app proxy at
`/api/projects/:projectId/processing/:imageryId/download?asset=all`.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# aernova_2
