import { useContext } from 'react'
import { ShopContext } from '../context/ShopContextValue'

const CatalogueNotice = () => {
  const { products, productsStatus, retryProducts } = useContext(ShopContext)

  if (productsStatus !== 'error' || products.length > 0) return null

  return (
    <div className='bg-[#F4FAFE] border-b border-[#B0D1E4]'>
      <div className='mx-auto flex max-w-[1400px] flex-col items-center gap-3 px-4 py-3 text-center sm:flex-row sm:justify-between sm:text-left'>
        <p className='text-sm font-semibold text-gray-900'>
          We couldn&apos;t load the products. Check your internet connection.
        </p>
        <button
          type='button'
          onClick={retryProducts}
          className='inline-flex items-center gap-2 rounded-full bg-[#B0D1E4] px-5 py-2 text-xs font-semibold text-gray-900 transition hover:bg-[#97c4dc] active:scale-95'
        >
          <svg className='h-4 w-4' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
            <path d='M21 12a9 9 0 1 1-2.64-6.36' />
            <path d='M21 3v6h-6' />
          </svg>
          Try again
        </button>
      </div>
    </div>
  )
}

export default CatalogueNotice
