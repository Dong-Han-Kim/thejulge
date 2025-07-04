'use client';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import Filter from '@/components/notice/filter';
import DetailFilter from '@/components/notice/detailfilter';
import axios from '@/lib/api/axios';
import Link from 'next/link';
import { useSortOption, useDetailOption } from '@/lib/hooks/zustand';
import Pagination from '@/components/member/myprofile/Pagination';
import useAuth from '@/lib/hooks/use-auth';

interface JobList {
  id: string;
  hourlyPay: number;
  startsAt: string;
  workhour: number;
  description: string;
  closed: boolean;
  shop: Item;
}
interface dataItem {
  item: JobList;
  links: number;
}
interface Item {
  item: Shop;
  href: string;
}
interface Shop {
  id: string;
  name: string;
  category: string;
  address1: string;
  address2: string;
  description: string;
  imageUrl: string;
  originalHourlyPay: number;
}

export default function JobList() {
  const [jobList, setJobList] = useState<JobList[]>([]);
  const sortOption = useSortOption((state) => state.sortOption);
  const { detailOption } = useDetailOption();

  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsCounts = 6;
  const totalPages = Math.ceil(totalItems / itemsCounts);

  const [recommendList, setRecommendList] = useState<JobList[]>([]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  const { userData } = useAuth();
  useEffect(() => {
    async function fetchRecommendList(userID?: string) {
      try {
        let response;
        console.log(userData);
        if (userID) {
          const userAddress = userData?.item.user.item.address;
          response = await axios.get('/notices', {
            params: {
              limit: 3,
              sort: 'time',
              address: userAddress,
            },
          });
        } else {
          response = await axios.get('/notices', {
            params: {
              limit: 3,
              sort: 'time',
            },
          });
        }

        const settingData: JobList[] = response.data.items.map((dataItem: dataItem) => ({
          id: dataItem.item.id,
          hourlyPay: dataItem.item.hourlyPay,
          startsAt: dataItem.item.startsAt,
          workhour: dataItem.item.workhour,
          description: dataItem.item.description,
          closed: dataItem.item.closed,
          shop: dataItem.item.shop,
        }));

        setRecommendList(settingData);
      } catch (error) {
        console.error('추천 공고 불러오기 실패:', error);
      }
    }
    const userAddress = userData?.item.user.item.address;
    fetchRecommendList(userAddress);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const sortMap: Record<string, string> = {
        '마감 임박 순': 'time',
        '시급 많은 순': 'pay',
        '시간 적은 순': 'hour',
        '가나다 순': 'shop',
      };

      const params = new URLSearchParams();
      params.append('sort', sortMap[sortOption] || 'time');
      params.append('hourlyPayGte', String(detailOption.pay));
      params.append('limit', String(itemsCounts));
      params.append('offset', String((currentPage - 1) * itemsCounts));

      if (Array.isArray(detailOption.location)) {
        detailOption.location.slice(0, 3).forEach((loc) => {
          params.append('address', loc);
        });
      } else if (detailOption.location) {
        params.append('address', detailOption.location);
      }

      try {
        const response = await axios.get('/notices', { params });

        const settingData: JobList[] = response.data.items.map((dataItem: dataItem) => ({
          id: dataItem.item.id,
          hourlyPay: dataItem.item.hourlyPay,
          startsAt: dataItem.item.startsAt,
          workhour: dataItem.item.workhour,
          description: dataItem.item.description,
          closed: dataItem.item.closed,
          shop: dataItem.item.shop,
        }));

        setJobList(settingData);
        setTotalItems(response.data.count);

        console.log('요청 URL:', `/notices?${params.toString()}`);
        console.log('세팅 데이터:', settingData);
      } catch (error) {
        console.error('공고 불러오기 실패:', error);
      }
    };

    fetchData();
  }, [sortOption, detailOption, currentPage]);
  return (
    <>
      <section className="bg-red-10 flex flex-col justify-center items-center py-[40px]">
        <div className="w-full flex flex-col max-w-[964px] px-4">
          <h1 className="text-black text-xl md:text-2xl font-bold mb-[16px] md:mb-[31px] w-full flex justify-start px-4">
            맞춤 공고
          </h1>

          <div className="w-full overflow-x-auto scrollbar-hide">
            <div className="max-w-[964px] w-full mx-auto px-4">
              <div className="flex gap-4 justify-center md:justify-start min-w-max">
                {recommendList.map((job) => {
                  const originalPay = job.shop.item.originalHourlyPay;
                  const currentPay = job.hourlyPay;

                  let percentageIncrease = 0;
                  let displayMessage = '';
                  let shouldDisplayIncreaseInfo = false;

                  if (originalPay > 0 && currentPay > originalPay) {
                    percentageIncrease = ((currentPay - originalPay) / originalPay) * 100;
                    displayMessage = `${Math.round(percentageIncrease)}%`;
                    shouldDisplayIncreaseInfo = true;
                  } else if (currentPay > 0 && originalPay === 0) {
                    displayMessage = '새로운 시급';
                    shouldDisplayIncreaseInfo = true;
                  }

                  return (
                    <div
                      key={job.id}
                      className="w-[171px] h-[261px] p-[12px] md:w-[312px] md:h-[349px] md:p-[14px] bg-white border border-gray-200 rounded-xl shrink-0"
                    >
                      <Link href={`/notice/${job.shop.item.id}/${job.id}`}>
                        <div className="flex flex-col gap-[16px]">
                          <section className="flex flex-col gap-[8px]">
                            <div className="relative w-[147px] h-[84px] md:w-[280px] md:h-[160px]">
                              <Image
                                src={job.shop.item.imageUrl}
                                alt="가게 이미지"
                                fill
                                className="rounded-xl object-cover"
                              />
                              {job.closed && (
                                <div className="absolute top-0 left-0 w-full h-full bg-black/60 rounded-xl flex justify-center items-center z-10">
                                  <span className="text-white font-bold text-lg">지난 공고</span>
                                </div>
                              )}
                            </div>
                            <label className="text-base font-bold md:text-xl">
                              {job.shop.item.name}
                            </label>
                            <div className="flex gap-[6px] h-[20px]">
                              <div className="relative w-[16px] h-[16px] md:w-[20px] md:h-[20px]">
                                <Image
                                  src={job.closed ? '/clock-closed-icon.png' : '/clock-icon.png'}
                                  alt="일시"
                                  fill
                                  className="object-contain"
                                />
                              </div>
                              <span
                                className={`text-xs ${job.closed ? 'text-gray-30' : 'text-gray-50'} md:text-sm`}
                              >
                                {new Date(job.startsAt).toLocaleDateString('ko-KR', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                })}
                              </span>
                              <span
                                className={`text-xs ${job.closed ? 'text-gray-30' : 'text-gray-50'} md:text-sm`}
                              >
                                ({job.workhour}시간)
                              </span>
                            </div>
                            <div className="flex gap-[6px] h-[20px]">
                              <div className="relative w-[16px] h-[16px] md:w-[20px] md:h-[20px]">
                                <Image
                                  src={
                                    job.closed ? '/location-closed-icon.png' : '/location-icon.png'
                                  }
                                  alt="장소"
                                  fill
                                  className="object-contain"
                                />
                              </div>
                              <span className="text-xs text-gray-50 md:text-sm">
                                {job.shop.item.address1}
                              </span>
                            </div>
                          </section>
                          <section className="flex flex-col justify-between items-start md:flex-row md:items-center">
                            <span className="font-bold text-lg md:text-2xl">
                              {job.hourlyPay.toLocaleString()}원
                            </span>
                            {shouldDisplayIncreaseInfo && (
                              <div
                                className={`flex justify-center items-center rounded-[20px] pt-[8px] md:pb-[8px] md:pr-[12px] md:pl-[12px] ${
                                  job.closed ? 'md:bg-gray-20' : 'md:bg-red-40'
                                }`}
                              >
                                <span
                                  className={`text-xs sm:text-sm ${
                                    job.closed ? 'text-gray-30' : 'text-red-40'
                                  } md:text-white`}
                                >
                                  기존 시급보다{' '}
                                </span>
                                <span
                                  className={`text-xs md:text-sm ${
                                    job.closed ? 'text-gray-30' : 'text-red-40'
                                  } md:text-white`}
                                >
                                  {displayMessage}
                                </span>
                                <div>
                                  <Image
                                    src="/arrow-up-bold.png"
                                    alt="시급 인상"
                                    width={20}
                                    height={20}
                                    className="hidden md:block"
                                  />
                                  <Image
                                    src="/arrow-orange.png"
                                    alt="시급 인상"
                                    width={11}
                                    height={11}
                                    className="block md:hidden"
                                  />
                                </div>
                              </div>
                            )}
                          </section>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col justify-center items-center mb-[29px] md:mb-[40px]">
        <div className="w-[350px] md:w-[678px] mb-[16px] flex flex-col gap-[16px] items-start md:flex-row md:justify-between md:items-center md:pb-[32px] pt-[60px] lg:w-[964px]">
          <div className="text-black text-xl md:text-2xl font-bold">전체 공고</div>
          <div className="flex gap-[10px]">
            <Filter />
            <DetailFilter />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-[8px] gap-y-[16px] sm:gap-x-[14px] sm:gap-y-[31px] lg:grid-cols-3">
          {jobList.map((job) => {
            const originalPay = job.shop.item.originalHourlyPay;
            const currentPay = job.hourlyPay;

            let percentageIncrease = 0;
            let displayMessage = '';
            let shouldDisplayIncreaseInfo = false;

            if (originalPay > 0 && currentPay > originalPay) {
              percentageIncrease = ((currentPay - originalPay) / originalPay) * 100;
              displayMessage = `${Math.round(percentageIncrease)}%`;
              shouldDisplayIncreaseInfo = true;
            } else if (currentPay > 0 && originalPay === 0) {
              displayMessage = '새로운 시급';
              shouldDisplayIncreaseInfo = true;
            }

            return (
              <div
                key={job.id}
                className="w-[171px] h-[261px] p-[8px] bg-white border border-gray-20 rounded-xl md:w-[312px] md:h-[349px] sm:p-[14px]"
              >
                <Link href={`/notice/${job.shop.item.id}/${job.id}`}>
                  <div className="flex flex-col gap-[16px]">
                    <section className="flex flex-col gap-[8px]">
                      <div className="relative w-[147px] h-[84px] md:w-[280px] md:h-[160px]">
                        <Image
                          src={job.shop.item.imageUrl}
                          alt="가게 이미지"
                          fill
                          className="rounded-xl object-cover w-full h-[174px]"
                        />
                        {job.closed && (
                          <div className="absolute top-0 left-0 w-full h-full bg-black/60 rounded-xl flex justify-center items-center z-10">
                            <span className="text-white font-bold text-lg">지난 공고</span>
                          </div>
                        )}
                      </div>
                      <label
                        className={`text-base font-bold md:text-xl ${job.closed ? 'text-gray-30' : 'text-black'}`}
                      >
                        {job.shop.item.name}
                      </label>
                      <div className="flex gap-[6px] h-[20px]">
                        <div className="relative w-[16px] h-[16px] sm:w-[20px] sm:h-[20px]">
                          <Image
                            src={job.closed ? '/clock-closed-icon.png' : '/clock-icon.png'}
                            alt="일시"
                            fill
                            className="object-contain"
                          />
                        </div>
                        <span
                          className={`text-xs ${job.closed ? 'text-gray-30' : 'text-gray-50'} md:text-sm`}
                        >
                          {new Date(job.startsAt).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                          })}
                        </span>
                        <span
                          className={`text-xs ${job.closed ? 'text-gray-30' : 'text-gray-50'} md:text-sm`}
                        >
                          ({job.workhour}시간)
                        </span>
                      </div>
                      <div className="flex gap-[6px] h-[20px]">
                        <div className="relative w-[16px] h-[16px] sm:w-[20px] sm:h-[20px]">
                          <Image
                            src={job.closed ? '/location-closed-icon.png' : '/location-icon.png'}
                            alt="장소"
                            fill
                            className="object-contain"
                          />
                        </div>
                        <span
                          className={`text-xs ${job.closed ? 'text-gray-30' : 'text-gray-50'} md:text-sm`}
                        >
                          {job.shop.item.address1}
                        </span>
                      </div>
                    </section>
                    <section
                      className={`flex flex-col justify-between items-start md:flex-row md:items-center`}
                    >
                      <span
                        className={`font-bold text-lg md:text-2xl ${job.closed ? 'text-gray-30' : 'text-black'}`}
                      >
                        {job.hourlyPay.toLocaleString()}원
                      </span>
                      {shouldDisplayIncreaseInfo && (
                        <div
                          className={`flex justify-center items-center rounded-[20px] pt-[8px] md:pb-[8px] md:pr-[12px] md:pl-[12px] ${
                            job.closed ? 'md:bg-gray-30' : 'md:bg-red-40'
                          }`}
                        >
                          <span
                            className={`text-xs sm:text-sm ${
                              job.closed ? 'text-gray-30' : 'text-red-40'
                            } md:text-white`}
                          >
                            기존 시급보다{' '}
                          </span>
                          <span
                            className={`text-xs md:text-sm ${
                              job.closed ? 'text-gray-30' : 'text-red-40'
                            } md:text-white`}
                          >
                            {displayMessage}
                          </span>
                          <div>
                            <Image
                              src="/arrow-up-bold.png"
                              alt="시급 인상"
                              width={20}
                              height={20}
                              className="hidden md:block"
                            />
                            <Image
                              src="/arrow-orange.png"
                              alt="시급 인상"
                              width={11}
                              height={11}
                              className="block md:hidden"
                            />
                          </div>
                        </div>
                      )}
                    </section>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mb-[80px] md:mb-[60px]">
        <Pagination
          totalPages={totalPages}
          currentPage={currentPage}
          onPageChange={handlePageChange}
        />
      </div>
    </>
  );
}
