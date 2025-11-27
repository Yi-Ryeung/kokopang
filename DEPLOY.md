# Vercel에 KoKoPang 배포하기

이 가이드는 KoKoPang 게임을 Vercel에 배포하고 모바일에서 최적의 성능을 내도록 설정하는 방법을 설명합니다.

## 사전 준비

1.  **GitHub 계정**: 코드를 업로드하려면 GitHub 계정이 필요합니다.
2.  **Vercel 계정**: GitHub 계정을 사용하여 [vercel.com](https://vercel.com)에 가입하세요.
3.  **RPC 엔드포인트 (권장)**: 모바일 결제의 안정성을 위해 공용 엔드포인트 대신 커스텀 RPC 엔드포인트를 사용하는 것이 좋습니다.
    -   **무료 옵션**: [Helius](https://helius.dev), [QuickNode](https://www.quicknode.com/), 또는 [Alchemy](https://www.alchemy.com/).
    -   가입 후 무료 Devnet RPC URL을 발급받으세요.

## 1단계: GitHub에 코드 푸시

1.  아직 git 저장소를 초기화하지 않았다면 다음을 실행하세요:
    ```bash
    git init
    git add .
    git commit -m "Initial commit"
    ```
2.  GitHub에서 새 리포지토리를 만듭니다.
3.  코드를 푸시합니다:
    ```bash
    git remote add origin <your-repo-url>
    git branch -M main
    git push -u origin main
    ```

## 2단계: Vercel에 배포

1.  [Vercel 대시보드](https://vercel.com/dashboard)로 이동합니다.
2.  **"Add New..."** -> **"Project"**를 클릭합니다.
3.  GitHub에서 `kokopang` 리포지토리를 가져옵니다 (Import).
4.  **프로젝트 설정 (Configure Project)**:
    -   **Framework Preset**: Next.js (자동 감지됨).
    -   **Root Directory**: `./` (기본값).
5.  **환경 변수 (Environment Variables)**:
    -   "Environment Variables" 섹션을 펼칩니다.
    -   다음 변수를 추가합니다:
        -   **Key**: `NEXT_PUBLIC_RPC_URL`
        -   **Value**: 발급받은 커스텀 RPC URL (예: `https://devnet.helius-rpc.com/?api-key=...`).
        -   *아직 없다면 비워둬도 되지만, 결제가 불안정할 수 있습니다.*
6.  **"Deploy"**를 클릭합니다.

## 3단계: 배포 확인

1.  빌드가 완료될 때까지 기다립니다.
2.  제공된 Vercel URL (예: `https://kokopang.vercel.app`)을 방문합니다.
3.  **모바일 테스트**:
    -   모바일 브라우저(Chrome/Safari)나 팬텀 지갑 앱 내 브라우저에서 URL을 엽니다.
    -   지갑을 연결하고 1단계를 플레이해 봅니다.
    -   7단계까지 진행하여 결제가 정상적으로 작동하는지 확인합니다.

## 문제 해결 (Troubleshooting)

-   **"Transaction Expired" / "Blockhash not found"**: 보통 공용 RPC 노드가 과부하 상태일 때 발생합니다.
    -   **해결책**: Helius/QuickNode에서 무료 전용 RPC URL을 받아 Vercel 설정의 `NEXT_PUBLIC_RPC_URL` 환경 변수를 업데이트하고 다시 배포(Redeploy)하세요.
-   **지갑 연결 안 됨**: HTTPS로 접속했는지 확인하세요 (Vercel은 자동으로 HTTPS를 제공합니다).

## 로컬 개발

로컬에서 커스텀 RPC를 사용하려면:
1.  프로젝트 루트에 `.env.local` 파일을 만듭니다.
2.  RPC URL을 추가합니다:
    ```env
    NEXT_PUBLIC_RPC_URL=https://your-custom-rpc-url
    ```
3.  개발 서버를 재시작합니다: `npm run dev`.
