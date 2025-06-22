'use client';

import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import RouterGuard from '@/components/common/RouterGuard';
import useAuth from '@/lib/hooks/use-auth';

// categories와 seoulcity 배열을 여기에 정의하여 전역적으로 접근 가능하게 합니다.
const categories = ['한식', '중식', '일식', '양식', '분식'];
const seoulcity = [
  '서울시 종로구',
  '서울시 중구',
  '서울시 용산구',
  '서울시 성동구',
  '서울시 광진구',
  '서울시 동대문구',
  '서울시 중랑구',
  '서울시 성북구',
  '서울시 강북구',
  '서울시 도봉구',
  '서울시 노원구',
  '서울시 은평구',
  '서울시 서대문구',
  '서울시 마포구',
  '서울시 양천구',
  '서울시 강서구',
  '서울시 구로구',
  '서울시 금천구',
  '서울시 영등포구',
  '서울시 동작구',
  '서울시 관악구',
  '서울시 서초구',
  '서울시 강남구',
  '서울시 송파구',
  '서울시 강동구',
];

interface ShopForm {
  name: string;
  category: string;
  district: string;
  detailAddress: string;
  basePay: string;
  description: string;
  imageUrl: string;
}

function Page() {
  const router = useRouter();
  const searchParams = useSearchParams(); // useSearchParams 훅 사용
  const categoryRef = useRef<HTMLDivElement>(null);
  const addressRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<ShopForm>({
    name: '',
    category: '',
    district: '',
    detailAddress: '',
    basePay: '',
    description: '',
    imageUrl: '',
  });

  const [categoryOpen, setCategoryOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false); // 편집 모드 상태
  const [shopId, setShopId] = useState<string | null>(null); // 편집할 가게의 ID

  const { updateUserData } = useAuth();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setCategoryOpen(false);
      }
      if (addressRef.current && !addressRef.current.contains(event.target as Node)) {
        setAddressOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 편집 모드 감지 및 가게 정보 로드
  useEffect(() => {
    const isEditMode = searchParams.get('editMode') === 'true'; // 쿼리 파라미터 확인
    setEditMode(isEditMode);

    if (isEditMode) {
      const editingShopData = localStorage.getItem('editingShopData');
      if (editingShopData) {
        const shop = JSON.parse(editingShopData);
        setForm({
          name: shop.name || '',
          category: shop.category || '',
          district: shop.address1 || '',
          detailAddress: shop.address2 || '',
          basePay: shop.originalHourlyPay?.toString() || '', // 숫자를 문자열로 변환
          description: shop.description || '',
          imageUrl: shop.imageUrl || '',
        });
        setShopId(shop.id); // 가게 ID 저장
        localStorage.removeItem('editingShopData'); // 사용 후 localStorage에서 데이터 삭제
      }
    }
  }, [searchParams]); // searchParams가 변경될 때마다 useEffect 실행

  // 이미지 업로드
  const handleImageUpload = async (file: File) => {
    setUploading(true);
    setError(null);

    const token = localStorage.getItem('accessToken');
    console.log('Retrieved Token:', token);
    if (!token) {
      setError('로그인이 필요합니다.');
      router.push('/login');
      setUploading(false);
      return;
    }

    try {
      const response = await fetch('https://bootcamp-api.codeit.kr/api/15-8/the-julge/images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: file.name }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('인증에 실패했습니다. 로그인 후 다시 시도해주세요.');
          router.push('/login');
          return;
        }
        throw new Error('Presigned URL 생성 실패');
      }

      const data = await response.json();
      const presignedUrl = data.item.url;

      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
      });

      if (!uploadResponse.ok) throw new Error('S3 이미지 업로드 실패');

      const cleanUrl = presignedUrl.split('?')[0];
      setForm((prev) => ({ ...prev, imageUrl: cleanUrl }));
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || '이미지 업로드 중 오류가 발생했습니다.');
      } else {
        setError('이미지 업로드 중 알 수 없는 오류가 발생했습니다.');
      }
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('파일 크기는 5MB를 초과할 수 없습니다.');
        return;
      }
      handleImageUpload(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // 가게 등록/편집 API 호출
  const handleSubmit = async () => {
    // 필수 필드 검증
    if (!form.name || !form.category || !form.district || !form.detailAddress || !form.basePay) {
      setError('모든 필수 필드를 입력해주세요.');
      return;
    }

    const token = localStorage.getItem('accessToken');
    console.log('Submit Token:', token);
    if (!token) {
      setError('로그인이 필요합니다.');
      router.push('/login');
      return;
    }

    // API 요청에 맞는 데이터 구조
    const requestBody = {
      name: form.name,
      category: form.category,
      address1: form.district,
      address2: form.detailAddress,
      description: form.description,
      imageUrl: form.imageUrl || '',
      originalHourlyPay: parseInt(form.basePay) || 0,
    };

    try {
      const url = editMode
        ? `https://bootcamp-api.codeit.kr/api/15-8/the-julge/shops/${shopId}` // 편집 모드 시 PUT 요청 URL
        : 'https://bootcamp-api.codeit.kr/api/15-8/the-julge/shops'; // 등록 모드 시 POST 요청 URL
      const method = editMode ? 'PUT' : 'POST'; // HTTP 메서드 결정

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const responseText = await response.text();
        console.log('Error Response:', responseText);
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          throw new Error(`서버가 JSON이 아닌 응답을 반환했습니다: ${responseText.slice(0, 100)}`);
        }
        if (response.status === 401) {
          setError('인증에 실패했습니다. 로그인 후 다시 시도해주세요.');
          router.push('/login');
          return;
        }
        throw new Error(
          errorData.message || (editMode ? '가게 정보 업데이트 실패' : '가게 등록 실패'),
        );
      }

      const responseData = await response.json();
      console.log(editMode ? '가게 정보 업데이트 성공:' : '가게 등록 성공:', responseData);

      // 성공적으로 등록/업데이트된 가게 정보를 localStorage에 저장
      localStorage.setItem('registeredShop', JSON.stringify(responseData.item));
      // 등록하면서 동시에 useAuth의 shop에도 저장
      const newShopData = responseData.item;
      updateUserData({ shop: newShopData });

      setShowModal(true); // 모달 표시
    } catch (err) {
      if (err instanceof Error) {
        setError(
          err.message ||
            (editMode
              ? '가게 정보 업데이트 중 오류가 발생했습니다.'
              : '가게 등록 중 오류가 발생했습니다.'),
        );
      } else {
        setError(
          editMode
            ? '가게 정보 업데이트 중 알 수 없는 오류가 발생했습니다.'
            : '가게 등록 중 알 수 없는 오류가 발생했습니다.',
        );
      }
      console.error(err);
    }
  };

  const handleClose = () => {
    if (shopId) {
      router.push('/owner/owner-store-detail'); // 소유주 메인 페이지로 이동
    } else {
      router.push('/owner'); // 가게 id 없으면 다시 owner로 보내기
    }
  };

  const handleSelect = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === 'category') setCategoryOpen(false);
    if (key === 'district') setAddressOpen(false);
  };

  // 모달의 '확인' 버튼 클릭 시 호출될 함수
  const handleModalConfirm = () => {
    setShowModal(false); // 모달 닫기
    router.push('/owner/owner-store-detail'); // 지정된 상세 페이지로 이동
  };

  const isFormValid =
    form.name && form.category && form.district && form.detailAddress && form.basePay;

  return (
    <div className="xl:px-[208px] mx-auto p-4 relative">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold">가게 정보</h1>
        <button className="text-2xl cursor-pointer" onClick={handleClose}>
          ✕
        </button>
      </div>
      {/* 가게 이름 & 분류 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-sm block mb-1">가게 이름*</label>
          <input
            className="w-full border border-[color:var(--color-gray-20)] rounded px-3 py-2"
            placeholder="입력"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="relative" ref={categoryRef}>
          <label className="text-sm block mb-1">분류*</label>
          <button
            className="w-full border border-[color:var(--color-gray-20)] rounded px-3 py-2 text-left flex justify-between items-center"
            onClick={() => setCategoryOpen((prev) => !prev)}
          >
            {form.category || '선택'}
            <ChevronDown className="w-4 h-4" />
          </button>
          {categoryOpen && (
            <ul className="absolute z-10 mt-1 w-full bg-white border border-[color:var(--color-gray-20)] rounded shadow max-h-48 overflow-y-auto">
              {categories.map((cat) => (
                <li
                  key={cat}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleSelect('category', cat)}
                >
                  {cat}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {/* 주소 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="relative" ref={addressRef}>
          <label className="text-sm block mb-1">주소*</label>
          <button
            className="w-full border border-[color:var(--color-gray-20)] rounded px-3 py-2 text-left flex justify-between items-center"
            onClick={() => setAddressOpen((prev) => !prev)}
          >
            {form.district || '선택'}
            <ChevronDown className="w-4 h-4" />
          </button>
          {addressOpen && (
            <ul className="absolute z-10 mt-1 w-full bg-white border border-[color:var(--color-gray-20)] rounded shadow max-h-48 overflow-y-auto">
              {seoulcity.map((addr) => (
                <li
                  key={addr}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleSelect('district', addr)}
                >
                  {addr}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <label className="text-sm block mb-1">상세 주소*</label>
          <input
            className="w-full border border-[color:var(--color-gray-20)] rounded px-3 py-2"
            placeholder="입력"
            value={form.detailAddress}
            onChange={(e) => setForm({ ...form, detailAddress: e.target.value })}
          />
        </div>
      </div>
      {/* 기본 시급 */}
      <div className="mb-4">
        <label className="text-sm block mb-1">기본 시급*</label>
        <div className="relative flex items-center w-1/2">
          <input
            type="number"
            className="w-full border border-[color:var(--color-gray-20)] rounded px-3 py-2"
            placeholder="입력"
            value={form.basePay}
            onChange={(e) => setForm({ ...form, basePay: e.target.value })}
          />
          <span className="absolute right-3 text-gray-500">원</span>
        </div>
      </div>
      {/* 이미지 업로드 */}
      <div className="mb-4">
        <label className="text-sm block mb-1">가게 이미지</label>
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
        />
        <div
          className="w-1/2 h-40 border border-[color:var(--color-gray-20)] rounded flex items-center justify-center bg-gray-100 text-gray-500 text-sm cursor-pointer"
          onClick={triggerFileInput}
        >
          {form.imageUrl ? (
            <img
              src={form.imageUrl}
              alt="Uploaded"
              className="w-full h-full object-cover rounded"
            />
          ) : uploading ? (
            '업로드 중...'
          ) : (
            '이미지 추가하기'
          )}
        </div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>
      {/* 설명 */}
      <div className="mb-6">
        <label className="text-sm block mb-1">가게 설명</label>
        <textarea
          className="w-full border border-[color:var(--color-gray-20)] rounded px-3 py-2"
          placeholder="입력"
          rows={4}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>
      {/* 등록/완료 버튼 */}
      <div className="flex justify-center">
        <button
          className="cursor-pointer hover:bg-orange-700 transition-colors duration-300 ease-in-out custom-button w-[108px] sm:w-[346px] h-[47px] bg-orange text-white py-2 rounded disabled:bg-gray-400"
          onClick={handleSubmit}
          disabled={uploading || !isFormValid}
        >
          {editMode ? '완료하기' : '등록하기'} {/* 편집 모드일 때 "완료하기" 표시 */}
        </button>
      </div>
      {/* 모달 */}
      {showModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg text-center w-[327px] h-[200px] flex flex-col justify-center items-center">
            <p className="text-lg font-semibold mb-6">
              {editMode ? '수정이 완료되었습니다.' : '등록이 완료되었습니다.'}{' '}
              {/* 모달 메시지 변경 */}
            </p>
            <button
              className="bg-orange text-white px-8 py-3 rounded-md hover:bg-orange-700 transition-colors"
              onClick={handleModalConfirm}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default RouterGuard(Page, ['employer']);
