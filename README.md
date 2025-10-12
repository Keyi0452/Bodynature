# 九型体质自测 - 部署说明（GitHub + Vercel）

## 本地运行
```bash
npm i
npm run dev
```

## 部署到 Vercel
1. 新建 GitHub 仓库，将项目代码推送上去（仓库名建议 `tizhi`）。
2. 登录 https://vercel.com -> New Project -> 选择你的仓库 -> Deploy。
3. 部署成功会得到一个域名（例如 `https://tizhi.vercel.app`）。
4. 将 `src/App.tsx` 里的 `SITE_URL` 改为该域名，重新部署即可让二维码指向正确链接。

## 提示
- 想要更短域名：项目名尽量短（比如 `tizhi`）。
- 自定义域名可在 Vercel 里添加，然后再更新 `SITE_URL`。