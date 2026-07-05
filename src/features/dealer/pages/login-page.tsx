import { AuthLoginPage } from "@/features/shared/auth-login-page";

interface DealerLoginPageProps {
  members: Array<{ loginAccount: string; status: "启用" | "停用" }>;
  onLogin: (account: string) => void;
}

export function DealerLoginPage({ members, onLogin }: DealerLoginPageProps) {
  return (
    <AuthLoginPage
      intro="专为经销商打造的企业级管理平台。高效管理下级客户、API 用量统计与团队协作，一站式赋能您的AI商业化落地。"
      loginTitle="经销商登录"
      onLogin={onLogin}
      validateAccount={(loginAccount) => {
        const member = members.find((item) => item.loginAccount === loginAccount);
        if (!member) return "账号不存在，请确认后重新输入。";
        if (member.status !== "启用") return "账号已停用，请联系管理员。";
        return null;
      }}
    />
  );
}
