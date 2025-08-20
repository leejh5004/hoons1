# 오토바이 부품 견적서 작성 시스템

정비업체에서 사용할 수 있는 오토바이 부품 견적서 작성 웹 애플리케이션입니다.

## 주요 기능

### 사용자 기능
- **단계별 견적서 작성**: 정비업체 정보 → 고객 정보 → 부품 선택 → 견적서 생성
- **부품 선택**: 브랜드/모델별 부품 도면에서 직관적인 부품 선택
- **공임비 계산**: 부품별 작업시간 설정 및 자동 공임비 계산
- **견적서 출력**: 완성된 견적서 인쇄 기능

### 관리자 기능
- **브랜드/모델 관리**: 오토바이 브랜드 및 모델 추가/수정
- **부품 관리**: 모델별 부품 정보 및 가격 관리
- **부품 도면 관리**: 부품 위치 설정 및 이미지 업로드

## 로그인 정보

- **일반 사용자**: `user` / `user`
- **관리자**: `admin` / `admin`

## 기술 스택

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Storage**: LocalStorage (클라이언트 사이드)
- **Deployment**: GitHub Pages 호환

## 로컬 실행 방법

1. 파일 다운로드
2. 웹 서버 실행 (예: Python HTTP Server)
   ```bash
   python -m http.server 8000
   ```
3. 브라우저에서 `http://localhost:8000` 접속

## GitHub Pages 배포 방법

1. GitHub 저장소 생성
2. 모든 파일 업로드 (index.html, script.js, styles.css, README.md)
3. Settings → Pages → Source를 "Deploy from a branch" 선택
4. Branch를 "main" 선택 후 Save
5. 생성된 URL로 접속

## 파일 구조

```
├── index.html          # 메인 HTML 파일
├── script.js           # JavaScript 로직
├── styles.css          # CSS 스타일
└── README.md           # 프로젝트 설명
```

## 주의사항

- 현재 버전은 LocalStorage를 사용하여 데이터가 브라우저에만 저장됩니다
- 실제 운영 환경에서는 데이터베이스 연동을 권장합니다
- 사용자 인증은 데모용으로 실제 보안이 적용되지 않았습니다

## 라이선스

MIT License