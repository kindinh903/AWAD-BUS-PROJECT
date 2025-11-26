import React from 'react';

interface GoogleLoginButtonProps {
  onSuccess: (credential: string) => void;
  onError: () => void;
}

declare global {
  interface Window {
    google: any;
    handleCredentialResponse: (response: any) => void;
  }
}

export const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
  onSuccess,
  onError,
}) => {
  React.useEffect(() => {
    // Load Google Identity Services script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    script.onload = () => {
      // Initialize Google Sign-In
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '899319379692-06c1gm0bgk4ngkg56j77qguonmu86m9u.apps.googleusercontent.com',
          callback: (response: any) => {
            console.log('Google response:', response);
            if (response.credential) {
              onSuccess(response.credential);
            } else {
              onError();
            }
          },
        });

        // Render the sign-in button
        window.google.accounts.id.renderButton(
          document.getElementById('google-signin-button'),
          {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: 'signin_with',
            shape: 'rectangular',
          }
        );
      }
    };

    return () => {
      // Cleanup
      const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, [onSuccess, onError]);
  return (
    <div className="w-full">
      {/* Google Sign-In Button */}
      <div id="google-signin-button" className="w-full"></div>
      
    </div>
  );
};