import Link from 'next/link';
import NoticeImage from './NoticeImage';
import PayRate from './PayRate';
import WorkHour from './WorkHour';
import Image from 'next/image';
import clsx from 'clsx';

interface LatestData {
  shopId: string;
  noticeId: string;
  closed: boolean;
  hourlyPay: number;
  startsAt: string;
  workhour: number;
  name: string;
  address1: string;
  imageUrl: string;
  originalHourlyPay: number;
}

const NoticeCard = ({ info }: { info: LatestData }) => {
  const {
    shopId,
    noticeId,
    closed,
    hourlyPay,
    startsAt,
    workhour,
    name,
    address1,
    imageUrl,
    originalHourlyPay,
  } = info;
  const className = 'relative w-full h-full min-h-[84px] rounded-xl overflow-hidden';
  const rateArrow = 'relative w-[11px] h-[11px] sm:w-[13px] sm:h-[13px]';
  const imgClass = 'first:hidden sm:first:inline-block sm:last:hidden';
  const timeClass = `relative w-4 h-4 sm:w-5 sm:h-5 shrink-0`;

  // 지난 공고
  const startAt = new Date(startsAt);
  const now = new Date();

  const isPast = startAt < now;
  return (
    <Link
      href={`/notice/${shopId}/${noticeId}`}
      className="md:w-[312px] sm:max-w-[332px] w-full h-[261px] sm:h-[359px] md:h-[349px]"
    >
      <div className="w-full h-full p-3 md:p-4 flex flex-col gap-3 md:gap-5 border border-solid border-gray-20 rounded-xl">
        <NoticeImage
          imageUrl={imageUrl}
          name={name}
          closed={closed}
          className={className}
          isPast={isPast}
        />
        <div className={isPast ? 'bg-white opacity-20' : ''}>
          <h3
            className={`${clsx(closed ? 'text-gray-30' : 'text-black')}, text-base sm:text-lg font-bold mb-2`}
          >
            {name}
          </h3>
          <div
            className={`${clsx(closed ? 'text-gray-30' : 'text-black')}, text-xs sm:text-sm flex items-start sm:items-center gap-1.5 mb-2`}
          >
            <WorkHour startsAt={startsAt} workhour={workhour} className={timeClass} />
          </div>
          <div
            className={`${clsx(closed ? 'opacity-30' : 'opacity-100')}, flex items-center gap-1.5 text-xs sm:text-sm mb-4`}
          >
            <div
              className={`${clsx(closed ? 'opacity-30' : 'opacity-100')}, relative w-4 h-4 sm:w-5 sm:h-5`}
            >
              <Image src={'/location.png'} fill alt="주소" />
            </div>
            {address1}
          </div>
          <div className="flex flex-col sm:flex-row sm:gap-7 sm:items-center text-[18px]">
            {hourlyPay.toLocaleString()}원
            <span className="flex items-center sm:bg-orange rounded-[20px] text-orange sm:text-white text-xs sm:text-sm font-normal sm:font-bold sm:py-2 sm:px-3 gap-1.5">
              <PayRate
                hourlyPay={hourlyPay}
                originalPay={originalHourlyPay}
                closed={closed}
                className={rateArrow}
                imgClass={imgClass}
              />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default NoticeCard;
