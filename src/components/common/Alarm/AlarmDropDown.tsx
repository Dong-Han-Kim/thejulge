import { RefObject, useEffect, useRef, useState } from 'react';
import { AlarmList } from '../../../types/types';
import AlarmCard from './AlarmCard';
import useAuth from '@/lib/hooks/use-auth';
import axios from '@/lib/api/axios';
import useToken from '@/lib/hooks/use-token';
import Image from 'next/image';

interface AlarmDropDownProps {
  alarm: AlarmList | null;
  ref: RefObject<HTMLDivElement | null>;
  setNewAlarm: (value: boolean) => void;
  onClick: () => void;
}

const AlarmDropDown = ({ alarm, ref, setNewAlarm, onClick }: AlarmDropDownProps) => {
  const [readCheck, setReadCheck] = useState(false);
  const { userData } = useAuth();
  const targetRef = useRef<HTMLDivElement | null>(null);
  const token = useToken();

  useEffect(() => {
    const userId = userData && userData.item.user.item.id;
    if (!alarm || !targetRef.current || !token) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          try {
            const alarmRead = async () => {
              Promise.all(
                alarm.items.map((item) =>
                  axios.put(
                    `/users/${userId}/alerts/${item.item.id}`,
                    {},
                    {
                      headers: {
                        Authorization: `Bearer ${token}`,
                      },
                    },
                  ),
                ),
              );
            };
            alarmRead();
            setNewAlarm(false);
            const timeoutId = setTimeout(() => {
              setReadCheck(true);
            }, 1500);
            return () => clearTimeout(timeoutId);
          } catch (error) {
            console.log('읽음 처리 에러:', error);
          }
        }
      },
      { threshold: 0.8 },
    );
    observer.observe(targetRef.current);

    return () => {
      observer.disconnect();
    };
  }, [alarm, token]);

  return (
    <div
      ref={ref}
      className="alarm fixed sm:absolute top-0 left-0 sm:left-auto right-0 sm:right-auto sm:top-7 w-full h-screen sm:w-[368px] sm:h-[419px] py-6 px-5 z-100 rounded-[10px] bg-red-10 border border-solid border-gray-30 overflow-y-scroll custom-scroll"
    >
      <div className="flex items-center justify-between mb-4">
        <h3>알림 {alarm ? alarm.count : 0}개</h3>
        <span className="cursor-pointer z-110" onClick={() => onClick()}>
          <Image
            className="sm:hidden"
            src={'/close-icon.png'}
            width={24}
            height={24}
            alt="닫기 버튼"
          />
        </span>
      </div>
      {alarm &&
        alarm.items.map((alItem, index) => {
          return (
            <AlarmCard
              key={alItem.item.id + index}
              id={alItem.item.id}
              result={alItem.item.result}
              shopName={alItem.item.shop?.item?.name}
              startsAt={alItem.item.notice?.item?.startsAt}
              workHour={alItem.item.notice?.item?.workhour}
              createAt={alItem.item.createdAt}
              read={alItem.item.read}
              readCheck={readCheck}
            />
          );
        })}
      <div ref={targetRef} className="absolute w-full h-full top-0 left-0"></div>
    </div>
  );
};

export default AlarmDropDown;
