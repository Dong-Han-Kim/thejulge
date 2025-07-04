import Link from 'next/link';
import Alarm from '../Alarm/Alarm';
import useAuth from '@/lib/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useMemo } from 'react';
import axios from '@/lib/api/axios';
import { AlarmList } from '@/types/types';
import AlarmDropDown from '../Alarm/AlarmDropDown';
import useToken from '@/lib/hooks/use-token';
import { CancelData } from '../../../types/types';

const UserMenu = () => {
  const [alarmList, setAlarmList] = useState<AlarmList | null>(null);
  const [newAlarm, setNewAlarm] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [alarmid, setAlarmId] = useState('');
  const [storageData, setStorageData] = useState<CancelData>();
  const { userData, logout, updateUserData } = useAuth();
  const router = useRouter();
  const token = useToken();
  const albaActiveLink = userData?.item.user.item.name ? '/member/myprofile' : '/member/profile';
  const ownerActiveLink = userData?.item.user.item.name ? '/owner/owner-store-detail' : '/owner';

  const userValue = useMemo(() => {
    if (!userData) return null;
    const { id, type } = userData.item.user.item;
    return { id, type };
  }, [userData]);

  // 지원 목록 가져오기
  useEffect(() => {
    const storage = localStorage.getItem('cancel-data');
    setStorageData(storage ? JSON.parse(storage) : null);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'cancel-data') {
        setStorageData(e.newValue ? JSON.parse(e.newValue) : null);
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // 알림 목록 조회
  const offsetRef = useRef(0);

  useEffect(() => {
    if (!userValue?.id || !storageData) return;
    console.log('알림 데이터 시작');

    const getAlarmList = async () => {
      try {
        const res = await axios.get(
          `/users/${userValue.id}/alerts?offset=${offsetRef.current}&limit=10`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        const data = res.data;
        console.log('알림 데이터');
        console.log(data);

        setAlarmList(data);

        // 불필요한 api 호출 막기
        if (!data.hasNext) {
          clearInterval(alarmInterval);
        } else {
          offsetRef.current += 10;
        }
      } catch (error) {
        console.error('Alarm Api 호출 에러:', error);
      }
    };

    const alarmInterval = setInterval(() => {
      getAlarmList();
    }, 30000);

    return () => {
      clearInterval(alarmInterval);
    };
  }, [userValue, token, storageData]);

  // 새로운 알림 있으면 newAlarm true로 변경
  useEffect(() => {
    const alarmCheckPoint = alarmList?.items.some((item) => item.item.read === false);
    if (alarmCheckPoint && !newAlarm) {
      setNewAlarm(true);
    }
  }, [alarmList, newAlarm]);

  // 알림 읽음 처리
  useEffect(() => {
    if (!alarmid) return;
    const alarmRead = async () => {
      const userId = userData?.item.user.item.id;
      const res = await axios.put(`/users/${userId}/alerts/${alarmid}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = res.data;
    };

    alarmRead();
  }, [alarmid]);

  const getAlarmId = (e: React.MouseEvent<HTMLDivElement>) => {
    setAlarmId(e.currentTarget.id);
  };

  // 알림창 외부 클릭 시 알림창 닫힘
  const alarmRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (alarmRef.current && !alarmRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [isOpen]);

  // 유저 데이터 업데이트
  useEffect(() => {
    if (!userData || userValue?.type !== 'employer') return;
    const getUserInfo = async () => {
      const res = await axios.get(`/users/${userValue.id}`);
      const data = res.data;
      updateUserData(data.item);
    };
    getUserInfo();
  }, []);

  return (
    <>
      {userValue?.type === 'employer' ? (
        <>
          <Link href={ownerActiveLink}>내 가게</Link>
          <button
            onClick={() => {
              logout();
              router.push('/');
            }}
            className="cursor-pointer"
          >
            로그아웃
          </button>
          <div className="relative flex flex-col items-end">
            <Alarm newAlarm={newAlarm} onClick={() => setIsOpen(!isOpen)} />
            {isOpen && <AlarmDropDown alarm={alarmList} getAlarmId={getAlarmId} ref={alarmRef} />}
          </div>
        </>
      ) : (
        <>
          <Link href={albaActiveLink}>내 프로필</Link>
          <button
            onClick={() => {
              logout();
              router.push('/');
            }}
            className="cursor-pointer"
          >
            로그아웃
          </button>
          <div className="relative flex flex-col items-end">
            <Alarm newAlarm={newAlarm} onClick={() => setIsOpen(!isOpen)} />
            {isOpen && <AlarmDropDown alarm={alarmList} getAlarmId={getAlarmId} ref={alarmRef} />}
          </div>
        </>
      )}
    </>
  );
};

export default UserMenu;
