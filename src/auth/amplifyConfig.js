// ─────────────────────────────────────────────────────────────
//  Cognito / Amplify configuration
//  Swap these four values when reusing this auth module in
//  a different project — nothing else needs to change.
// ─────────────────────────────────────────────────────────────

const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: 'us-east-2_EJh7RDH8Q',
      userPoolClientId: '1dbf9pbu2bmid6b130vvdeno4n',
      loginWith: {
        oauth: {
          domain: 'us-east-2ejh7rdh8q.auth.us-east-2.amazoncognito.com',
          scopes: ['email', 'openid', 'profile'],
          redirectSignIn: [
            'http://localhost:5173/',
            'https://popashot-opal.vercel.app/',
          ],
          redirectSignOut: [
            'http://localhost:5173/',
            'https://popashot-opal.vercel.app/',
          ],
          responseType: 'code',
        },
        username: true,
        email: true,
      },
    },
  },
};

export default amplifyConfig;
