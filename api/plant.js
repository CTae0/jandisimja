/**
 * Vercel Serverless Function
 * POST /api/plant
 *
 * 역할: 카카오 uid + 학교 id를 받아
 *   1) users 컬렉션에서 중복 참여 확인
 *   2) schools 컬렉션 grassCount +1 (atomic)
 *   3) users 컬렉션에 참여 기록 저장
 *
 * 환경변수 (Vercel 대시보드에서 설정):
 *   FIREBASE_SERVICE_ACCOUNT : 서비스 계정 JSON 전체를 문자열로 붙여넣기
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

function getDb() {
  if (!getApps().length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getFirestore();
}

const ALL_SCHOOLS = [
  {id:'e01',name:'가산초등학교',type:'elem'},{id:'e02',name:'광판초등학교',type:'elem'},
  {id:'e03',name:'교동초등학교',type:'elem'},{id:'e04',name:'근화초등학교',type:'elem'},
  {id:'e05',name:'금병초등학교',type:'elem'},{id:'e06',name:'금산초등학교',type:'elem'},
  {id:'e07',name:'남부초등학교',type:'elem'},{id:'e08',name:'남산초등학교',type:'elem'},
  {id:'e09',name:'남춘천초등학교',type:'elem'},{id:'e10',name:'당림초등학교',type:'elem'},
  {id:'e11',name:'동내초등학교',type:'elem'},{id:'e12',name:'동부초등학교',type:'elem'},
  {id:'e13',name:'동춘천초등학교',type:'elem'},{id:'e14',name:'만천초등학교',type:'elem'},
  {id:'e15',name:'봄내초등학교',type:'elem'},{id:'e16',name:'봉의초등학교',type:'elem'},
  {id:'e17',name:'부안초등학교',type:'elem'},{id:'e18',name:'상천초등학교',type:'elem'},
  {id:'e19',name:'서상초등학교',type:'elem'},{id:'e20',name:'석사초등학교',type:'elem'},
  {id:'e21',name:'성림초등학교',type:'elem'},{id:'e22',name:'성원초등학교',type:'elem'},
  {id:'e23',name:'소양초등학교',type:'elem'},{id:'e24',name:'송화초등학교',type:'elem'},
  {id:'e25',name:'신남초등학교',type:'elem'},{id:'e26',name:'신동초등학교',type:'elem'},
  {id:'e27',name:'오동초등학교',type:'elem'},{id:'e28',name:'우석초등학교',type:'elem'},
  {id:'e29',name:'장학초등학교',type:'elem'},{id:'e30',name:'조양초등학교',type:'elem'},
  {id:'e31',name:'중앙초등학교',type:'elem'},{id:'e32',name:'지촌초등학교',type:'elem'},
  {id:'e33',name:'천전초등학교',type:'elem'},{id:'e34',name:'추곡초등학교',type:'elem'},
  {id:'e35',name:'춘천교육대학교부설초등학교',type:'elem'},{id:'e36',name:'춘천삼육초등학교',type:'elem'},
  {id:'e37',name:'춘천초등학교',type:'elem'},{id:'e38',name:'퇴계초등학교',type:'elem'},
  {id:'e39',name:'호반초등학교',type:'elem'},{id:'e40',name:'효제초등학교',type:'elem'},
  {id:'e41',name:'후평초등학교',type:'elem'},
  {id:'m01',name:'가정중학교',type:'mid'},{id:'m02',name:'강서중학교',type:'mid'},
  {id:'m03',name:'강원체육중학교',type:'mid'},{id:'m04',name:'강원중학교',type:'mid'},
  {id:'m05',name:'광판중학교',type:'mid'},{id:'m06',name:'남춘천여자중학교',type:'mid'},
  {id:'m07',name:'남춘천중학교',type:'mid'},{id:'m08',name:'대룡중학교',type:'mid'},
  {id:'m09',name:'동산중학교',type:'mid'},{id:'m10',name:'봄내중학교',type:'mid'},
  {id:'m11',name:'봉의중학교',type:'mid'},{id:'m12',name:'소양중학교',type:'mid'},
  {id:'m13',name:'신포중학교',type:'mid'},{id:'m14',name:'우석중학교',type:'mid'},
  {id:'m15',name:'유봉여자중학교',type:'mid'},{id:'m16',name:'창촌중학교',type:'mid'},
  {id:'m17',name:'춘성중학교',type:'mid'},{id:'m18',name:'춘천중학교',type:'mid'},
  {id:'m19',name:'퇴계중학교',type:'mid'},{id:'m20',name:'후평중학교',type:'mid'},
  {id:'h01',name:'강원고등학교',type:'high'},{id:'h02',name:'강원대학교사범대학부설고등학교',type:'high'},
  {id:'h03',name:'강원생명과학고등학교',type:'high'},{id:'h04',name:'강원애니고등학교',type:'high'},
  {id:'h05',name:'강원체육고등학교',type:'high'},{id:'h06',name:'봉의고등학교',type:'high'},
  {id:'h07',name:'성수고등학교',type:'high'},{id:'h08',name:'성수여자고등학교',type:'high'},
  {id:'h09',name:'유봉여자고등학교',type:'high'},{id:'h10',name:'전인고등학교',type:'high'},
  {id:'h11',name:'춘천고등학교',type:'high'},{id:'h12',name:'춘천기계공업고등학교',type:'high'},
  {id:'h13',name:'춘천여자고등학교',type:'high'},{id:'h14',name:'춘천한샘고등학교',type:'high'},
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://jandisimja.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { uid, schoolId } = req.body;

  if (!uid || !schoolId) {
    return res.status(400).json({ error: 'uid and schoolId are required' });
  }

  // uid 형식 검증 (kakao_숫자 형식만 허용)
  if (!/^kakao_\d+$/.test(uid)) {
    return res.status(400).json({ error: 'Invalid uid format' });
  }

  // schoolId 화이트리스트 검증
  const school = ALL_SCHOOLS.find(s => s.id === schoolId);
  if (!school) {
    return res.status(400).json({ error: 'Invalid schoolId' });
  }

  try {
    const db = getDb();
    const userRef = db.collection('users').doc(uid);
    const schoolRef = db.collection('schools').doc(schoolId);

    // 트랜잭션으로 중복 확인 + 쓰기를 원자적으로 처리
    await db.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      if (userSnap.exists) {
        throw new Error('ALREADY_PLANTED');
      }
      tx.set(schoolRef, {
        grassCount: FieldValue.increment(1),
        name: school.name,
        type: school.type
      }, { merge: true });
      tx.set(userRef, {
        plantedSchool: schoolId,
        schoolName: school.name,
        ts: Date.now()
      });
    });

    return res.status(200).json({ success: true });

  } catch (err) {
    if (err.message === 'ALREADY_PLANTED') {
      return res.status(409).json({ error: 'ALREADY_PLANTED' });
    }
    console.error('plant 오류:', err);
    return res.status(500).json({ error: '서버 내부 오류' });
  }
}
