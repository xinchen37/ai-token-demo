import * as React from "react";
import { DealerSystem } from "@/features/dealer/dealer-system";
import { loadDealerData } from "@/features/dealer/local-store";
import { DealerLoginPage } from "@/features/dealer/pages/login-page";
import { EnterpriseSystem } from "@/features/enterprise/enterprise-system";
import { EnterpriseLoginPage } from "@/features/enterprise/pages/login-page";

const AUTH_KEY = "omni-ai-dealer-authenticated";
const AUTH_ACCOUNT_KEY = "omni-ai-dealer-account";
const DEFAULT_ADMIN_ACCOUNT = "18888888888";
const LEGACY_ADMIN_ACCOUNT = "1888888888";
const LOGIN_PATH = "/dealer/login";
const DEFAULT_DEALER_PATH = "/dealer/dashboard";
const ENTERPRISE_AUTH_KEY = "omni-ai-enterprise-authenticated";
const ENTERPRISE_ACCOUNT_KEY = "omni-ai-enterprise-account";
const ENTERPRISE_LOGIN_PATH = "/enterprise/login";
const DEFAULT_ENTERPRISE_PATH = "/enterprise/dashboard";

export default function App() {
  const isEnterpriseRoute = window.location.pathname.startsWith("/enterprise");
  const [authenticated, setAuthenticated] = React.useState(() => window.localStorage.getItem(AUTH_KEY) === "true");
  const [enterpriseAuthenticated, setEnterpriseAuthenticated] = React.useState(() => window.localStorage.getItem(ENTERPRISE_AUTH_KEY) === "true");
  const [loginAccount, setLoginAccount] = React.useState(() => {
    const account = window.localStorage.getItem(AUTH_ACCOUNT_KEY);
    if (account) {
      return account === LEGACY_ADMIN_ACCOUNT ? DEFAULT_ADMIN_ACCOUNT : account;
    }
    return window.localStorage.getItem(AUTH_KEY) === "true" ? DEFAULT_ADMIN_ACCOUNT : "";
  });
  const [enterpriseAccount, setEnterpriseAccount] = React.useState(() => window.localStorage.getItem(ENTERPRISE_ACCOUNT_KEY) ?? "");
  const loginMembers = React.useMemo(
    () => loadDealerData().members.map((member) => ({ loginAccount: member.loginAccount, status: member.status })),
    [],
  );
  const enterpriseAccounts = React.useMemo(() => {
    const data = loadDealerData();
    return [
      ...data.customers.map((customer) => ({ loginAccount: customer.loginAccount, status: customer.status })),
      ...data.enterpriseMembers.map((member) => ({ loginAccount: member.loginAccount, status: member.status })),
    ];
  }, []);
  const isLoginPath = window.location.pathname.replace(/\/$/, "") === LOGIN_PATH;
  const isEnterpriseLoginPath = window.location.pathname.replace(/\/$/, "") === ENTERPRISE_LOGIN_PATH;

  React.useEffect(() => {
    if (!isEnterpriseRoute && !authenticated && !isLoginPath) {
      window.history.replaceState(null, "", LOGIN_PATH);
    }
  }, [authenticated, isEnterpriseRoute, isLoginPath]);

  React.useEffect(() => {
    if (isEnterpriseRoute && !enterpriseAuthenticated && !isEnterpriseLoginPath) {
      window.history.replaceState(null, "", ENTERPRISE_LOGIN_PATH);
    }
  }, [enterpriseAuthenticated, isEnterpriseLoginPath, isEnterpriseRoute]);

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

  function handleEnterpriseLogin(account: string) {
    window.localStorage.setItem(ENTERPRISE_AUTH_KEY, "true");
    window.localStorage.setItem(ENTERPRISE_ACCOUNT_KEY, account);
    setEnterpriseAccount(account);
    setEnterpriseAuthenticated(true);
    window.history.replaceState(null, "", DEFAULT_ENTERPRISE_PATH);
  }

  function handleEnterpriseLogout() {
    window.localStorage.removeItem(ENTERPRISE_AUTH_KEY);
    window.localStorage.removeItem(ENTERPRISE_ACCOUNT_KEY);
    setEnterpriseAccount("");
    setEnterpriseAuthenticated(false);
    window.history.replaceState(null, "", ENTERPRISE_LOGIN_PATH);
  }

  if (isEnterpriseRoute) {
    if (!enterpriseAuthenticated || isEnterpriseLoginPath) {
      return <EnterpriseLoginPage accounts={enterpriseAccounts} onLogin={handleEnterpriseLogin} />;
    }
    return <EnterpriseSystem loginAccount={enterpriseAccount} onLogout={handleEnterpriseLogout} />;
  }

  if (!authenticated || isLoginPath) {
    return <DealerLoginPage members={loginMembers} onLogin={handleLogin} />;
  }

  return <DealerSystem loginAccount={loginAccount} onLogout={handleLogout} />;
}
