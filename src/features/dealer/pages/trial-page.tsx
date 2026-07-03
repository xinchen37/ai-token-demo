import * as React from "react";
import { Bot, SendHorizontal, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { AiModel, CustomerApiKey } from "../types";
import { formatNumber } from "../dealer-utils";

interface TrialPageProps {
  models: AiModel[];
  apiKeys: CustomerApiKey[];
}

export function TrialPage({ models, apiKeys }: TrialPageProps) {
  const [sessionType, setSessionType] = React.useState("对话补全");
  const [modelName, setModelName] = React.useState(models[0]?.name ?? "");
  const [keyName, setKeyName] = React.useState(apiKeys[0]?.keyName ?? "");
  const [prompt, setPrompt] = React.useState("请帮我生成一段适合企业客户的 API 接入说明。");
  const [output, setOutput] = React.useState("选择模型和 API Key 后发送提示词，这里会展示模拟响应。");
  const [tokens, setTokens] = React.useState(0);

  function handleSend() {
    const nextTokens = Math.max(800, prompt.length * 42 + modelName.length * 90);
    setTokens(nextTokens);
    setOutput(`已使用 ${modelName} 完成${sessionType}模拟调用。本次请求围绕“${prompt.slice(0, 28)}${prompt.length > 28 ? "..." : ""}”生成了企业级接入说明，建议包含鉴权、限额、错误码和账单核对流程。`);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm shadow-slate-100">
        <div className="flex items-center gap-2">
          <Settings2 className="size-5 text-slate-400" />
          <h2 className="text-xl font-semibold text-slate-950">设置 API 参数</h2>
        </div>
        <div className="mt-7 space-y-5">
          <label className="block space-y-2.5">
            <span className="block text-sm font-semibold text-slate-600">会话类型</span>
            <Select className="h-11 rounded-lg bg-slate-50/70 pl-4 focus:border-[#1155ff] focus:bg-white focus:ring-blue-100" value={sessionType} onChange={(event) => setSessionType(event.target.value)}>
              {["对话补全", "图像", "文本转语音", "视频", "语音转文本"].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </Select>
          </label>
          <label className="block space-y-2.5">
            <span className="block text-sm font-semibold text-slate-600">模型</span>
            <Select className="h-11 rounded-lg bg-slate-50/70 pl-4 focus:border-[#1155ff] focus:bg-white focus:ring-blue-100" value={modelName} onChange={(event) => setModelName(event.target.value)}>
              {models.map((model) => (
                <option key={model.id}>{model.name}</option>
              ))}
            </Select>
          </label>
          <label className="block space-y-2.5">
            <span className="block text-sm font-semibold text-slate-600">API Key</span>
            <Select className="h-11 rounded-lg bg-slate-50/70 pl-4 focus:border-[#1155ff] focus:bg-white focus:ring-blue-100" value={keyName} onChange={(event) => setKeyName(event.target.value)}>
              {apiKeys.map((apiKey) => (
                <option key={apiKey.id}>{apiKey.keyName}</option>
              ))}
            </Select>
          </label>
          <label className="block space-y-2.5">
            <span className="block text-sm font-semibold text-slate-600">输入提示词</span>
            <textarea
              className="min-h-44 w-full rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-[#1155ff] focus:bg-white focus:ring-2 focus:ring-blue-100"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />
          </label>
          <Button className="h-11 w-full" variant="primary" onClick={handleSend}>
            <SendHorizontal className="size-4" />
            发送
          </Button>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm shadow-slate-100">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Bot className="size-5 text-[#1155ff]" />
            <h2 className="text-xl font-semibold text-slate-950">响应展示区</h2>
          </div>
          <div className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-[#1155ff]">
            本次消耗 {formatNumber(tokens)} Tokens
          </div>
        </div>
        <div className="mt-6 min-h-[360px] rounded-md border border-slate-100 bg-slate-50 p-5 leading-7 text-slate-700">
          {output}
        </div>
      </section>
    </div>
  );
}
