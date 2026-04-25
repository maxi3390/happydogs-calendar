import { Redirect } from '@docusaurus/router';

// The docs hub lives at /docs/overview. The site has no separate
// landing page, so / redirects there to avoid a 404.
export default function Home() {
  return <Redirect to="/docs/overview" />;
}
