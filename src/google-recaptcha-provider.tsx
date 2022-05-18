import React from 'react';
import {
  useMemo,
  useState,
  useEffect,
  useCallback,
  createContext,
  ReactNode
} from 'react';
import {
  cleanGoogleRecaptcha,
  injectGoogleReCaptchaScript,
  logWarningMessage
} from './utils';

enum GoogleRecaptchaError {
  SCRIPT_NOT_AVAILABLE = 'Recaptcha script is not available'
}

interface IGoogleReCaptchaProviderProps {
  reCaptchaKey?: string;
  language?: string;
  useRecaptchaNet?: boolean;
  useEnterprise?: boolean;
  scriptProps?: {
    nonce?: string;
    defer?: boolean;
    async?: boolean;
    appendTo?: 'head' | 'body';
    id?: string;
  };
  children: ReactNode;
}

export interface IGoogleReCaptchaConsumerProps {
  executeRecaptcha?: (action?: string) => Promise<string>;
}

const GoogleReCaptchaContext = createContext<IGoogleReCaptchaConsumerProps>({
  executeRecaptcha: () => {
    // This default context function is not supposed to be called
    throw Error(
      'GoogleReCaptcha Context has not yet been implemented, if you are using useGoogleReCaptcha hook, make sure the hook is called inside component wrapped by GoogleRecaptchaProvider'
    );
  }
});

const { Consumer: GoogleReCaptchaConsumer } = GoogleReCaptchaContext;

export function GoogleReCaptchaProvider({
  reCaptchaKey,
  useEnterprise = false,
  useRecaptchaNet = false,
  scriptProps,
  language,
  children
}: IGoogleReCaptchaProviderProps) {
  const [greCaptchaInstance, setGreCaptchaInstance] = useState<null | {
    execute: Function;
  }>(null);

  useEffect(() => {
    if (!reCaptchaKey) {
      logWarningMessage(
        '<GoogleReCaptchaProvider /> recaptcha key not provided'
      );

      return;
    }

    const scriptId = scriptProps?.id || 'google-recaptcha-v3';

    const onLoad = () => {
      if (!window || !(window as any).grecaptcha) {
        logWarningMessage(
          `<GoogleRecaptchaProvider /> ${GoogleRecaptchaError.SCRIPT_NOT_AVAILABLE}`
        );

        return;
      }

      const grecaptcha = useEnterprise
        ? (window as any).grecaptcha.enterprise
        : (window as any).grecaptcha;

      grecaptcha.ready(() => {
        setGreCaptchaInstance(grecaptcha);
      });
    };

    const onError = () => {
      logWarningMessage('Error loading google recaptcha script');
    };


    const timer = setInterval(() => {
      if (window && (window as any).__recaptchav3 === true) {
        injectGoogleReCaptchaScript({
          reCaptchaKey,
          useEnterprise,
          useRecaptchaNet,
          scriptProps,
          language,
          onLoad,
          onError
        });
        clearInterval(timer);
      }
    }, 500);

    return () => {
      clearInterval(timer);
      cleanGoogleRecaptcha(scriptId);
    };
  }, [useEnterprise, useRecaptchaNet, scriptProps, language, reCaptchaKey]);

  const executeRecaptcha = useCallback(
    async (action?: string) => {
      if (!greCaptchaInstance || !greCaptchaInstance.execute) {
        throw new Error(
          '<GoogleReCaptchaProvider /> Google Recaptcha has not been loaded'
        );
      }

      const result = await greCaptchaInstance.execute(reCaptchaKey, { action });

      return result;
    },
    [greCaptchaInstance]
  );

  const googleReCaptchaContextValue = useMemo(
    () => ({
      executeRecaptcha: greCaptchaInstance ? executeRecaptcha : undefined
    }),
    [executeRecaptcha, greCaptchaInstance]
  );

  return (
    <GoogleReCaptchaContext.Provider value={googleReCaptchaContextValue}>
      {children}
    </GoogleReCaptchaContext.Provider>
  );
}

export { GoogleReCaptchaConsumer, GoogleReCaptchaContext };
