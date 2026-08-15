import '../styles/global.css';
import '98.css'
import Head from 'next/head';

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <title>paige404notfound</title>
      </Head>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
