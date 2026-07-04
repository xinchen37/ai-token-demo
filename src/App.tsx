import * as React from "react";
import { DealerSystem } from "@/features/dealer/dealer-system";
import { loadDealerData } from "@/features/dealer/local-store";
import { DealerLoginPage } from "@/features/dealer/pages/login-page";

const AUTH_KEY = "omni-ai-dealer-authenticated";
const AUTH_ACCOUNT_KEY = "omni-ai-dealer-account";
const DEFAULT_ADMIN_ACCOUNT = "18888888888";
const LEGACY_ADMIN_ACCOUNT = "1888888888";
const LOGIN_PATH = "/dealer/login";
const DEFAULT_DEALER_PATH = "/dealer/dashboard";

export default function App() {
  const [authenticated, setAuthenticated] = React.useState(() => window.localStorage.getItem(AUTH_KEY) === "true");
  const [loginAccount, setLoginAccount] = React.useState(() => {
    const account = window.localStorage.getItem(AUTH_ACCOUNT_KEY);
    if (account) {
      return account === LEGACY_ADMIN_ACCOUNT ? DEFAULT_ADMIN_ACCOUNT : account;
    }
    return window.localStorage.getItem(AUTH_KEY) === "true" ? DEFAULT_ADMIN_ACCOUNT : "";
  });
  const loginMembers = React.useMemo(
    () => loadDealerData().members.map((member) => ({ loginAccount: member.loginAccount, status: member.status })),
    [],
  );
  const isLoginPath = window.location.pathname.replace(/\/$/, "") === LOGIN_PATH;

  React.useEffect(() => {
    if (!authenticated && !isLoginPath) {
      window.history.replaceState(null, "", LOGIN_PATH);
    }
  }, [authenticated, isLoginPath]);

  React.useEffect(() => {
    const storedAccount = window.localStorage.getItem(AUTH_ACCOUNT_KEY);
    if (authenticated && storedAccount === LEGACY_ADMIN_ACCOUNT) {
      window.localStorage.setItem(AUTH_ACCOUNT_KEY, DEFAULT_ADMIN_ACCOUNT);
      setLoginAccount(DEFAULT_ADMIN_ACCOUNT);
      return;
    }

    if (authenticated && !storedAccount) {
      window.localStorage.setItem(AUTH_ACCOUNT_KEY, loginAccount || DEFAULT_ADMIN_ACCOUNT);
      setLoginAccount((account) => account || DEFAULT_ADMIN_ACCOUNT);
    }
  }, [authenticated, loginAccount]);

  function handleLogin(account: string) {
    window.localStorage.setItem(AUTH_KEY, "true");
    window.localStorage.setItem(AUTH_ACCOUNT_KEY, account);
    setLoginAccount(account);
    setAuthenticated(true);
    window.history.replaceState(null, "", DEFAULT_DEALER_PATH);
  }

  function handleLogout() {
    window.localStorage.removeItem(AUTH_KEY);
    window.localStorage.removeItem(AUTH_ACCOUNT_KEY);
    setLoginAccount("");
    setAuthenticated(false);
    window.history.replaceState(null, "", LOGIN_PATH);
  }

  if (!authenticated || isLoginPath) {
    return <DealerLoginPage members={loginMembers} onLogin={handleLogin} />;
  }

  return <DealerSystem loginAccount={loginAccount} onLogout={handleLogout} />;
}
