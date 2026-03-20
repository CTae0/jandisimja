/**
 * Vercel Serverless Function
 * POST /api/kakao-auth
 *
 * 역할: 카카오 인가코드(code)를 받아
 *   1) 카카오 토큰 교환 API 호출 → access_token 획득
 *   2) 카카오 사용자 정보 API 호출 → 실제 회원번호(kakaoId) 획득
 *   3) kakaoId를 클라이언트에 반환
 *
 * 환경변수 (Vercel 대시보드에서 설정):
 *   KAKAO_REST_API_KEY  : 카카오 개발자 콘솔 > 앱 키 > REST API 키
 *   KAKAO_REDIRECT_URI  : https://jandisimja.vercel.app/
 */

export default async function handler(req, res) {
  // CORS 허용
  res.setHeader('Access-Control-Allow-Origin', 'https://jandisimja.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'code is required' });
  }

  const REST_API_KEY   = process.env.KAKAO_REST_API_KEY;
  const REDIRECT_URI   = process.env.KAKAO_REDIRECT_URI || 'https://jandisimja.vercel.app/';

  if (!REST_API_KEY) {
    return res.status(500).json({ error: 'KAKAO_REST_API_KEY 환경변수가 설정되지 않았습니다.' });
  }

  try {
    // ── STEP 1: 인가코드 → 액세스 토큰 교환 ──
    const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:   'authorization_code',
        client_id:    REST_API_KEY,
        redirect_uri: REDIRECT_URI,
        code:         code,
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error('토큰 교환 실패:', tokenData);
      return res.status(400).json({ error: tokenData.error_description || '토큰 교환 실패' });
    }

    const accessToken = tokenData.access_token;

    // ── STEP 2: 액세스 토큰 → 카카오 회원번호 조회 ──
    const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type':  'application/x-www-form-urlencoded',
      },
    });

    const userData = await userRes.json();

    if (!userData.id) {
      console.error('사용자 정보 조회 실패:', userData);
      return res.status(400).json({ error: '사용자 정보 조회 실패' });
    }

    // 회원번호만 반환 (개인정보 최소화)
    return res.status(200).json({
      kakaoId: String(userData.id),
    });

  } catch (err) {
    console.error('서버 오류:', err);
    return res.status(500).json({ error: '서버 내부 오류' });
  }
}
