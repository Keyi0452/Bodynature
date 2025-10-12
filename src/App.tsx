import React, { useEffect, useMemo, useRef, useState } from "react";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { getQuestions, compute, BodyType, Answer } from "./standard";

/** 网站地址：优先取环境变量，回退到浏览器 origin */
const SITE_URL =
  (import.meta as any)?.env?.VITE_SITE_URL ||
  (typeof window !== "undefined" ? window.location.origin : "https://example.com");

/** 先默认性别（你可以做个下拉选择来改） */
const userSex: "male" | "female" = "female";

/** 评分文字 */
const SCALE = [
  { v: 1, label: "1 从不/没有" },
  { v: 2, label: "2 偶尔/轻度" },
  { v: 3, label: "3 有时/中度" },
  { v: 4, label: "4 经常/较重" },
  { v: 5, label: "5 总是/严重" },
] as const;

type Answers = Partial<Record<BodyType, (Answer | undefined)[]>>;

export default function App() {
  /** 题库（已按性别处理好互斥题） */
  const bank = useMemo(() => getQuestions({ sex: userSex }), []);

  /** 答案：按体质维度分别存（与题库长度同步） */
  const [answers, setAnswers] = useState<Answers>({});
  useEffect(() => {
    const init: Answers = {};
    (Object.keys(bank) as BodyType[]).forEach((t) => {
      init[t] = Array(bank[t].length).fill(undefined);
    });
    setAnswers(init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 结果展示 */
  const [resultView, setResultView] = useState<{
    trans: Record<BodyType, number>;
    ranking: BodyType[];
    result: { 平和质?: "平和质" | "基本是平和质"; 倾向?: BodyType[]; 体质?: BodyType[] };
  } | null>(null);

  const updatingPdf = useRef(false);

  const handleChange = (t: BodyType, idx: number, v: number) => {
    setAnswers((prev) => {
      const next = { ...prev };
      const arr = (next[t] ? [...(next[t] as (Answer | undefined)[])] : Array(bank[t].length).fill(undefined)) as (Answer | undefined)[];
      arr[idx] = v as Answer;
      next[t] = arr;
      return next;
    });
  };

  const handleSubmit = () => {
    const { trans, result, ranking } = compute(answers as any, { sex: userSex });
    setResultView({ trans, result, ranking });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const exportPdf = async () => {
    if (updatingPdf.current) return;
    updatingPdf.current = true;
    try {
      const { trans, result, ranking } = compute(answers as any, { sex: userSex });

      const margin = 36;
      const doc = new jsPDF({ unit: "pt", format: "a4" });

      doc.setFontSize(18);
      doc.text("中医体质判断问卷 · 结果", margin, margin);

      doc.setFontSize(12);
      doc.text(`主要体质：${ranking.slice(0, 2).join("、")}`, margin, margin + 26);

      doc.setFontSize(11);
      let y = margin + 50;
      doc.text("各体质转化分（0~100）：", margin, y);
      y += 18;
      (Object.keys(trans) as BodyType[]).forEach((k) => {
        doc.text(`${k}：${trans[k].toFixed(1)}`, margin + 12, y);
        y += 16;
      });

      y += 8;
      doc.setFontSize(11);
      const tags: string[] = [];
      if (result.平和质) tags.push(result.平和质);
      if (result.体质?.length) tags.push(...result.体质);
      if (result.倾向?.length) tags.push(...result.倾向.map((t) => `${t}（倾向）`));
      doc.text(`判定：${tags.length ? tags.join("，") : "暂无（答案不足或均低于阈值）"}`, margin, y);

      // 右侧二维码 + 站点地址
      const qrDataUrl = await QRCode.toDataURL(SITE_URL, { margin: 1, width: 180 });
      doc.setFontSize(10);
      doc.text("扫码进入网页测试：", 400, margin + 12);
      doc.addImage(qrDataUrl, "PNG", 400, margin + 24, 150, 150);
      // ✅ 改用 URL 解析，避免构建转义错误
      const u = new URL(SITE_URL);
      doc.text(`${u.host}${u.pathname}`, 400, margin + 186);

      doc.setFontSize(9);
      doc.text(
        "* 本工具仅用于健康教育与体质自测，不构成医疗建议；如有不适或疾病，请尽快就医。",
        margin,
        812,
        { maxWidth: 520 }
      );

      doc.save("体质自测-结果.pdf");
    } catch (e) {
      console.error(e);
      alert("导出失败，请稍后重试。");
    } finally {
      updatingPdf.current = false;
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 text-gray-900">
      <h1 className="text-2xl font-bold mb-2">中医体质判断问卷</h1>
      <p className="text-sm text-gray-600 mb-6">
        了解体质，更准确的养生。<b>免责声明：</b>本网站不构成医疗建议，如有疾病请及时就医。
      </p>

      {/* 结果区 */}
      {resultView && (
        <div className="mb-6 rounded-lg border border-gray-200 p-4 bg-gray-50">
          <div className="font-semibold mb-2">判定结果</div>
          <div className="text-sm leading-6">
            <div className="mb-1">
              <b>主要体质：</b>
              {resultView.ranking.slice(0, 2).join("、")}
            </div>
            <div className="mb-1">
              <b>平和质：</b>
              {resultView.result.平和质 ?? "—"}
            </div>
            <div className="mb-1">
              <b>偏颇体质：</b>
              {resultView.result.体质?.length ? resultView.result.体质.join("、") : "—"}
            </div>
            <div>
              <b>倾向体质：</b>
              {resultView.result.倾向?.length ? resultView.result.倾向.join("、") : "—"}
            </div>
          </div>
        </div>
      )}

      {/* 题目 */}
      {(Object.keys(bank) as BodyType[]).map((t) => (
        <div key={t} className="mb-8 rounded-lg border border-gray-200 p-4">
          <h2 className="font-semibold mb-4">{t}</h2>
          <ol className="space-y-4">
            {bank[t].map((q, idx) => (
              <li key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
                <div className="md:col-span-2 text-sm">{idx + 1}、{q.text}</div>
                <div className="md:col-span-3 flex flex-wrap gap-3">
                  {SCALE.map((s) => (
                    <label key={s.v} className="inline-flex items-center gap-1">
                      <input
                        type="radio"
                        name={`${t}-${idx}`}
                        value={s.v}
                        checked={answers[t]?.[idx] === s.v}
                        onChange={() => handleChange(t, idx, s.v)}
                      />
                      <span className="text-xs">{s.label}</span>
                    </label>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </div>
      ))}

      {/* 操作区 */}
      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          计算结果
        </button>
        <button
          onClick={exportPdf}
          className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-50"
        >
          导出 PDF
        </button>
      </div>
    </div>
  );
}