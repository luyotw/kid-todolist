# kid-todolist

家長用手機管理小孩每日任務的 web app。

## 本機開發（Firebase Emulator）

雲端 Firestore 若未部署 `firestore.rules`，登入後會出現「讀取任務失敗」。本機請用 Emulator 開發：

```bash
npm install
npm run dev:local
```

會同時啟動：

| 服務 | 網址 |
| --- | --- |
| Vite app | http://localhost:5173 |
| Emulator UI | http://localhost:4000 |
| Auth emulator | `127.0.0.1:9099` |
| Firestore emulator | `127.0.0.1:8080` |

1. 瀏覽器開 http://localhost:5173
2. 點 **本機測試登入**（自動建立 `parent@local.test`）
3. 在 Emulator UI 可查看 `users/{uid}/tasks` 等資料

Emulator 資料會寫入 `emulator-data/`（已 gitignore，可保留本機狀態）。

### 只開前端（Emulator 另開終端）

```bash
# 終端 1
npm run emulators

# 終端 2
npx vite --mode emulator
```

### 連線正式 Firebase

複製 `.env.example` → `.env.local`，填入 Firebase 主控台設定，執行 `npm run dev`。並部署規則：

```bash
firebase deploy --only firestore:rules
```

## 測試

```bash
npm test
```

## 家庭資料模型（v2）

雲端資料以**家庭**為隔離單位，路徑上預留多小孩維度。MVP 僅使用固定小孩 id `_default`；每位登入者有快速索引 `users/{uid}/meta/membership`（`familyId`、`activeChildId`）。

```
families/{familyId}/
  meta/profile
  members/{uid}           # role: owner | parent
  invites/{token}         # 供後續邀請流程（#37）
  children/{childId}/     # MVP: childId = _default
    tasks/
    completions/
    adhoc/
    meta/settings

users/{uid}/meta/membership
```

路徑 helper 見 `src/lib/firestore.ts` 的 `paths.family.*`；`childId` 未指定或為空時正規化為 `_default`。

**未來多小孩擴充：** 新增 `children/{newChildId}` 子樹，並在 membership 更新 `activeChildId`；不需變更路徑 helper 簽名。
