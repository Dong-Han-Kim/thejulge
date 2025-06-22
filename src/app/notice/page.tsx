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
import MySpinner from '@/components/common/Spinner';
import dayjs from 'dayjs';

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
  const [isLoading, setIsLoading] = useState(true);
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
    async function fetchRecommendList() {
      const userAddress = userData?.item.user.item.address;

      try {
        let response;
        if (userAddress) {
          try {
            response = await axios.get('/notices', {
              params: {
                limit: 3,
                sort: 'time',
                address: userAddress,
              },
            });

            if (response.data.items.length > 0) {
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
              return;
            }
          } catch (error) {
            console.error('사용자 주소로 추천 공고 불러오기 실패 (fallback 시도):', error);
          }
        }
        const fallbackResponse = await axios.get('/notices', {
          params: {
            limit: 3,
            sort: 'time',
          },
        });

        const settingData: JobList[] = fallbackResponse.data.items.map((dataItem: dataItem) => ({
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
        console.error('추천 공고 최종 불러오기 실패:', error);
      }
    }

    if (userData !== undefined) {
      fetchRecommendList();
    }
  }, [userData]);

  useEffect(() => {
    async function fetchData() {
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

      const fetchJobList = axios.get('/notices', { params });

      const fetchRecommendList = (async () => {
        const userAddress = userData?.item.user.item.address;
        try {
          if (userAddress) {
            const res = await axios.get('/notices', {
              params: { limit: 3, sort: 'time', address: userAddress },
            });
            return res.data.items;
          }
        } catch (e) {
          console.error(e, '추천 공고 실패, fallback 사용');
        }

        const fallback = await axios.get('/notices', {
          params: { limit: 3, sort: 'time' },
        });
        return fallback.data.items;
      })();

      try {
        const [jobRes, recommendItems] = await Promise.all([fetchJobList, fetchRecommendList]);

        const jobData: JobList[] = jobRes.data.items.map((d: dataItem) => d.item);
        const recommendData: JobList[] = recommendItems.map((d: dataItem) => d.item);

        setJobList(jobData);
        setRecommendList(recommendData);
        setTotalItems(jobRes.data.count);
      } catch (error) {
        console.error('전체 데이터 로딩 실패', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (userData !== undefined) {
      fetchData();
    }
  }, [sortOption, detailOption, currentPage, userData]);

  return (
    <>
      {isLoading ? (
        <MySpinner isLoading={isLoading} />
      ) : (
        <div className="">
          <section className="bg-red-10 flex flex-col justify-center items-center py-[40px] mt-2">
            <div className="w-full flex flex-col max-w-[996px] px-4">
              <h1 className="text-black text-xl md:text-2xl font-bold mb-[16px] md:mb-[31px] w-full flex justify-start">
                맞춤 공고
              </h1>
              <div className="">
                <div className="w-full lg:w-[980px] overflow-x-auto scrollbar-hide">
                  <div className="max-w-[980px] w-full mx-auto">
                    <div className="flex gap-4 justify-center md:justify-start min-w-max">
                      {recommendList.map((job) => {
                        const originalPay = job.shop.item.originalHourlyPay;
                        const currentPay = job.hourlyPay;

                        const isClosed = job.closed;
                        const isPast = dayjs(job.startsAt).isBefore(dayjs());
                        const isEnded = isClosed || isPast;

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
                                    {isEnded && (
                                      <div className="absolute top-0 left-0 w-full h-full bg-black/60 rounded-xl flex justify-center items-center z-10">
                                        <span className="text-white font-bold text-lg">
                                          마감 완료
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <label
                                    className={`text-base font-bold md:text-xl ${isEnded ? 'text-gray-30' : 'text-black'}`}
                                  >
                                    {job.shop.item.name}
                                  </label>
                                  <div className="flex gap-[6px] h-[20px]">
                                    <div className="relative w-[16px] h-[16px] md:w-[20px] md:h-[20px]">
                                      <Image
                                        src={isEnded ? '/clock-closed-icon.png' : '/clock-icon.png'}
                                        alt="일시"
                                        fill
                                        className="object-contain"
                                      />
                                    </div>
                                    <span
                                      className={`text-xs ${isEnded ? 'text-gray-30' : 'text-gray-50'} md:text-sm`}
                                    >
                                      {new Date(job.startsAt).toLocaleDateString('ko-KR', {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                      })}
                                    </span>
                                    <span
                                      className={`text-xs ${isEnded ? 'text-gray-30' : 'text-gray-50'} md:text-sm`}
                                    >
                                      ({job.workhour}시간)
                                    </span>
                                  </div>
                                  <div className="flex gap-[6px] h-[20px]">
                                    <div className="relative w-[16px] h-[16px] md:w-[20px] md:h-[20px]">
                                      <Image
                                        src={
                                          isEnded
                                            ? '/location-closed-icon.png'
                                            : '/location-icon.png'
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
                                  <span
                                    className={`font-bold text-lg md:text-2xl ${isEnded ? 'text-gray-30' : 'text-black'}`}
                                  >
                                    {job.hourlyPay.toLocaleString()}원
                                  </span>
                                  {shouldDisplayIncreaseInfo && (
                                    <div
                                      className={`flex justify-center items-center rounded-[20px] pt-[8px] md:pb-[8px] md:pr-[12px] md:pl-[12px] ${
                                        isEnded ? 'md:bg-gray-20' : 'md:bg-red-40'
                                      }`}
                                    >
                                      <span
                                        className={`text-xs sm:text-sm ${
                                          isEnded ? 'text-gray-30' : 'text-red-40'
                                        } md:text-white`}
                                      >
                                        기존 시급보다{' '}
                                      </span>
                                      <span
                                        className={`text-xs md:text-sm ${
                                          isEnded ? 'text-gray-30' : 'text-red-40'
                                        } md:text-white`}
                                      >
                                        {displayMessage}
                                      </span>
                                      {isEnded ? (
                                        <>
                                          <Image
                                            src="/arrow-up-bold.png"
                                            alt="시급 인상"
                                            width={16}
                                            height={16}
                                            className="block md:hidden"
                                          />
                                          <Image
                                            src="/arrow-up-bold.png"
                                            alt="시급 인상"
                                            width={20}
                                            height={20}
                                            className="hidden md:block"
                                          />
                                        </>
                                      ) : (
                                        <>
                                          <Image
                                            src="/arrow-orange.png"
                                            alt="시급 인상"
                                            width={16}
                                            height={16}
                                            className="block md:hidden"
                                          />
                                          <Image
                                            src="/arrow-up-bold.png"
                                            alt="시급 인상"
                                            width={20}
                                            height={20}
                                            className="hidden md:block"
                                          />
                                        </>
                                      )}
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
            </div>
          </section>

          <section className=" w-full flex flex-col justify-center items-center mb-[29px] md:mb-[40px]">
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
                const isClosed = job.closed;
                const isPast = dayjs(job.startsAt).isBefore(dayjs());
                const isEnded = isClosed || isPast;

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
                            {isEnded && (
                              <div className="absolute top-0 left-0 w-full h-full bg-black/60 rounded-xl flex justify-center items-center z-10">
                                <span className="text-white font-bold text-lg">마감 완료</span>
                              </div>
                            )}
                          </div>
                          <label
                            className={`text-base font-bold md:text-xl ${isEnded ? 'text-gray-30' : 'text-black'}`}
                          >
                            {job.shop.item.name}
                          </label>
                          <div className="flex gap-[6px] h-[20px]">
                            <div className="relative w-[16px] h-[16px] sm:w-[20px] sm:h-[20px]">
                              <Image
                                src={isEnded ? '/clock-closed-icon.png' : '/clock-icon.png'}
                                alt="일시"
                                fill
                                className="object-contain"
                              />
                            </div>
                            <span
                              className={`text-xs ${isEnded ? 'text-gray-30' : 'text-gray-50'} md:text-sm`}
                            >
                              {new Date(job.startsAt).toLocaleDateString('ko-KR', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                              })}
                            </span>
                            <span
                              className={`text-xs ${isEnded ? 'text-gray-30' : 'text-gray-50'} md:text-sm`}
                            >
                              ({job.workhour}시간)
                            </span>
                          </div>
                          <div className="flex gap-[6px] h-[20px]">
                            <div className="relative w-[16px] h-[16px] sm:w-[20px] sm:h-[20px]">
                              <Image
                                src={isEnded ? '/location-closed-icon.png' : '/location-icon.png'}
                                alt="장소"
                                fill
                                className="object-contain"
                              />
                            </div>
                            <span
                              className={`text-xs ${isEnded ? 'text-gray-30' : 'text-gray-50'} md:text-sm`}
                            >
                              {job.shop.item.address1}
                            </span>
                          </div>
                        </section>
                        <section
                          className={`flex flex-col justify-between items-start md:flex-row md:items-center`}
                        >
                          <span
                            className={`font-bold text-lg md:text-2xl ${isEnded ? 'text-gray-30' : 'text-black'}`}
                          >
                            {job.hourlyPay.toLocaleString()}원
                          </span>
                          {shouldDisplayIncreaseInfo && (
                            <div
                              className={`flex justify-center items-center rounded-[20px] pt-[8px] md:pb-[8px] md:pr-[12px] md:pl-[12px] ${
                                isEnded ? 'md:bg-gray-30' : 'md:bg-red-40'
                              }`}
                            >
                              <span
                                className={`text-xs sm:text-sm ${
                                  isEnded ? 'text-gray-30' : 'text-red-40'
                                } md:text-white`}
                              >
                                기존 시급보다{' '}
                              </span>
                              <span
                                className={`text-xs md:text-sm ${
                                  isEnded ? 'text-gray-30' : 'text-red-40'
                                } md:text-white`}
                              >
                                {displayMessage}
                              </span>
                              {isEnded ? (
                                <>
                                  <Image
                                    src="/arrow-up-bold.png"
                                    alt="시급 인상"
                                    width={16}
                                    height={16}
                                    className="block md:hidden"
                                  />
                                  <Image
                                    src="/arrow-up-bold.png"
                                    alt="시급 인상"
                                    width={20}
                                    height={20}
                                    className="hidden md:block"
                                  />
                                </>
                              ) : (
                                <>
                                  <Image
                                    src="/arrow-orange.png"
                                    alt="시급 인상"
                                    width={16}
                                    height={16}
                                    className="block md:hidden"
                                  />
                                  <Image
                                    src="/arrow-up-bold.png"
                                    alt="시급 인상"
                                    width={20}
                                    height={20}
                                    className="hidden md:block"
                                  />
                                </>
                              )}
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
        </div>
      )}
    </>
  );
}
