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
  // Keep stable refs to the latest callbacks so we don't have to re-run
  // the initialization effect every time parent re-renders.
  const onSuccessRef = React.useRef(onSuccess);
  const onErrorRef = React.useRef(onError);

  React.useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [onSuccess, onError]);

  React.useEffect(() => {
    // If button container isn't present, nothing to do
    const container = document.getElementById('google-signin-button');
    if (!container) return;

    // Only add the script if it doesn't already exist
    let created = false;
    let script = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]'
    ) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
      created = true;
    }

    const initialize = () => {
      if (!window.google) return;

      window.google.accounts.id.initialize({
        client_id:
          import.meta.env.VITE_GOOGLE_CLIENT_ID ||
          '899319379692-06c1gm0bgk4ngkg56j77qguonmu86m9u.apps.googleusercontent.com',
        callback: (response: any) => {
          // Use refs to call latest callbacks without re-initializing
          if (response?.credential) {
            onSuccessRef.current(response.credential);
          } else {
            onErrorRef.current();
          }
        },
      });

      // Render the sign-in button into the container
      window.google.accounts.id.renderButton(container, {
        theme: 'outline',
        size: 'large',
        width: '100%',
        text: 'signin_with',
        shape: 'rectangular',
      });
    };

    if ((window as any).google) {
      initialize();
    } else {
      // If the script was just added, wait for it to load
      script!.onload = initialize;
    }

    return () => {
      // Remove only what we created; leave existing script if it was present
      if (created && script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
      // Clear container to avoid leftover iframes on unmount
      const c = document.getElementById('google-signin-button');
      if (c) c.innerHTML = '';
    };
  }, []);
  return (
    <div className="w-full">
      {/* Google Sign-In Button */}
      <div id="google-signin-button" className="w-full"></div>
    </div>
  );
};
