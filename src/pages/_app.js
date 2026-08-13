import '../styles/global.css';
import '98.css'
import Head from 'next/head';

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/fav.png" type="image/png"/>
        <title>paige404notfound</title>
      </Head>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
