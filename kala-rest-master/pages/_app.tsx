import React, { PropsWithChildren, ReactNode } from 'react';
import { AppProps } from 'next/app';
import Head from 'next/head';
import { AppProvider } from '@shopify/polaris';
import { Provider } from '@shopify/app-bridge-react';
// import Cookies from 'js-cookie';
import ApolloClient from 'apollo-boost';
import { ApolloProvider } from 'react-apollo';
import '@shopify/polaris/dist/styles.css';
import translations from '@shopify/polaris/locales/en.json';

const App = (props: AppProps) => {
  const { Component, pageProps } = props;

  return (
    <>
      <Component {...pageProps} />
    </>
  );
};

// const client = new ApolloClient({
//   fetchOptions: {
//     credentials: 'include',
//   },
// });

// const App = (props: AppProps) => {
//   const { Component, pageProps } = props;
//   const config = {
//     apiKey: '',
//     shopOrigin: '',
//     forceRedirect: true,
//   };

//   return (
//     <>
//       <Head>
//         <title>Sample App</title>
//         <meta charSet="utf-8" />
//       </Head>
//       <Provider config={config}>
//         <AppProvider i18n={translations}>
//           <ApolloProvider client={client}>
//             <Component {...pageProps} />
//           </ApolloProvider>
//         </AppProvider>
//       </Provider>
//     </>
//   );
// };

export default App;
