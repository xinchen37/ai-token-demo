import { AuthLoginPage } from "@/features/shared/auth-login-page";

interface EnterpriseLoginPageProps {
  accounts: Array<{ loginAccount: string; status: "启用" | "停用" | "正常" | "未激活" | "已冻结" }>;
  onLogin: (account: string) => void;
}

export function EnterpriseLoginPage({ accounts, onLogin }: EnterpriseLoginPageProps) {
  return (
    <AuthLoginPage
      intro="专为企业客户打造的企业级管理平台。高效管理API Key、用量统计与团队协作，一站式赋能您的AI商业化落地。"
      loginTitle="企业客户登录"
      onLogin={onLogin}
      validateAccount={(loginAccount) => {
        const matched = accounts.find((item) => item.loginAccount === loginAccount);
        if (!matched) return "账号不存在，请确认后重新输入。";
        if (matched.status === "停用" || matched.status === "未激活" || matched.status === "已冻结") {
          return "账号不可用，请联系经销商管理员。";
        }
        return null;
      }}
    />
  );
}
