import React, { useRef, useState, useEffect } from "react";
import QRCode from "qrcode";

const SITE_URL = "https://checkyourbodynature.vercel.app";

export default function App() {
  const [isWeChat, setIsWeChat] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [qrReady, setQrReady] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    setIsWeChat(/micromessenger/.test(ua));
  }, []);

  useEffect(() => {
    async function generateQR() {
      const canvas = qrCanvasRef.current;
      if (!canvas) return;
      await QRCode.toCanvas(canvas, SITE_URL, { margin: 1, width: 160 });
      setQrReady(true);
    }
    generateQR();
  }, []);

  const handleSharePoster = async () => {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      const w = 720,
        h = 960;
      canvas.width = w;
      canvas.height = h;

      // 背景
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#FFF4E0");
      grad.addColorStop(0.4, "#FDF0E1");
      grad.addColorStop(1, "#E6F3EB");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // 标题
      ctx.fillStyle = "#333";
      ctx.font = "bold 36px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("体质自测 · 结果海报", w / 2, 80);

      // 文字
      ctx.font = "20px sans-serif";
      ctx.fillStyle = "#92400E";
      ctx.fillText("Check Your Bodynature", w / 2, 120);
      ctx.fillText("更懂自己体质，开启养生之路", w / 2, 150);

      // QR code
      const qr = qrCanvasRef.current;
      if (qr) ctx.drawImage(qr, w / 2 - 80, h - 250, 160, 160);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      if (!blob) return;

      const file = new File([blob], "体质自测-分享图.png", { type: "image/png" });

      if (navigator.share && (navigator as any).canShare?.({ files: [file] })) {
        await (navigator as any).share({
          files: [file],
          title: "体质自测 · 结果海报",
          text: "Check Your Bodynature，更懂自己体质，开启养生之路。",
        });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "体质自测-分享图.png";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (e) {
      console.error("share_failed:", e);
      alert("分享失败，请稍后重试。");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(to bottom, #FFF4E0 0%, #FDF0E1 40%, #E6F3EB 100%)",
        padding: "2rem",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "rgba(255, 255, 255, 0.9)",
          borderRadius: "16px",
          padding: "2rem",
          width: "100%",
          maxWidth: "760px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
        }}
      >
        {/* 标题 */}
        <h1
          style={{
            textAlign: "center",
            fontSize: "24px",
            fontWeight: "bold",
            marginBottom: "0.5rem",
          }}
        >
          体质自测 · 结果报告
        </h1>

        <p style={{ textAlign: "center", color: "#92400E", marginBottom: "1.5rem" }}>
          测试结果显示，您目前主要是：
        </p>

        {/* 体质卡片 */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
          <div
            style={{
              flex: 1,
              background: "#FFF9F3",
              borderRadius: "12px",
              padding: "1rem",
              boxShadow: "inset 0 0 0 1px #FBE1C8",
            }}
          >
            <strong style={{ color: "#92400E" }}>阳虚质</strong>
            <p style={{ fontSize: "14px", marginTop: "0.5rem" }}>
              怕冷，手脚常冰凉，容易精神不振。多晒太阳，吃热食物会让你更有活力。
            </p>
          </div>

          <div
            style={{
              flex: 1,
              background: "#FFF9F3",
              borderRadius: "12px",
              padding: "1rem",
              boxShadow: "inset 0 0 0 1px #FBE1C8",
            }}
          >
            <strong style={{ color: "#92400E" }}>气虚质</strong>
            <p style={{ fontSize: "14px", marginTop: "0.5rem" }}>
              容易觉得累，说话没力气，天气变化时也容易感冒。注意休息和充足睡眠。
            </p>
          </div>
        </div>

        {/* 柱状图 */}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: "16px", marginBottom: "0.5rem" }}>各体质转化分（0~100）</h3>
            {[
              ["平和质", 75],
              ["气虚质", 75],
              ["阳虚质", 75],
              ["阴虚质", 0],
              ["痰湿质", 28],
              ["湿热质", 0],
              ["血瘀质", 0],
              ["气郁质", 0],
              ["特禀质", 0],
            ].map(([t, v]) => (
              <div key={t} style={{ display: "flex", alignItems: "center", marginBottom: "0.3rem" }}>
                <div style={{ width: "4rem", fontSize: "13px" }}>{t}</div>
                <div
                  style={{
                    flex: 1,
                    height: "6px",
                    background: "#eee",
                    borderRadius: "4px",
                    overflow: "hidden",
                    marginRight: "0.5rem",
                  }}
                >
                  <div
                    style={{
                      width: `${v}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, #F59E0B, #92400E)",
                    }}
                  />
                </div>
                <div style={{ fontSize: "13px", width: "2rem", textAlign: "right" }}>{v}</div>
              </div>
            ))}
          </div>

          {/* 右侧卡片 */}
          <div
            style={{
              width: "220px",
              marginLeft: "1.5rem",
              background: "#FFF9F3",
              borderRadius: "12px",
              padding: "1rem",
              boxShadow: "inset 0 0 0 1px #FBE1C8",
              fontSize: "14px",
            }}
          >
            <strong style={{ color: "#92400E" }}>🧡 建议摘要</strong>
            <ul style={{ paddingLeft: "1.2rem", marginTop: "0.5rem", lineHeight: 1.6 }}>
              <li>作息规律，四季随时令，不熬夜。</li>
              <li>饮食清淡均衡，少油腻辛辣。</li>
              <li>早睡早起，避免久坐久劳。</li>
              <li>温热饮食，少生冷。</li>
            </ul>
          </div>
        </div>

        {/* 二维码 */}
        <div style={{ textAlign: "center", marginTop: "2rem" }}>
          <canvas ref={qrCanvasRef} />
          <p style={{ fontSize: "13px", marginTop: "0.5rem" }}>扫码进入体质测试</p>
          <p style={{ fontSize: "13px", color: "#92400E" }}>
            想了解更多养生知识？在小红书搜索「王咩咩在新加坡」
          </p>
        </div>

        {/* disclaimer */}
        <p
          style={{
            textAlign: "center",
            fontSize: "12px",
            color: "#666",
            marginTop: "1rem",
          }}
        >
          * 本工具仅用于健康教育与体质自测，不构成医疗建议；如有不适或疾病，请及时就医。
        </p>

        {/* 按钮 */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "1rem",
            marginTop: "1.5rem",
          }}
        >
          <button
            style={{
              background: "#fff",
              border: "1px solid #ddd",
              borderRadius: "8px",
              padding: "0.5rem 1.2rem",
              cursor: "pointer",
            }}
          >
            返回修改答案
          </button>
          <button
            onClick={handleSharePoster}
            style={{
              background: "linear-gradient(90deg, #F59E0B, #92400E)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "0.5rem 1.2rem",
              cursor: "pointer",
            }}
          >
            分享给朋友
          </button>
        </div>
      </div>
    </div>
  );
}